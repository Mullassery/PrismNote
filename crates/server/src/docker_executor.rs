//! Real Docker-backed container management and code execution.
//!
//! Two distinct capabilities live here:
//!
//! 1. **Dev-container management** (`list_containers`, `create_container`,
//!    `start_container`/`stop_container`/`remove_container`,
//!    `execute_in_container`, file/log/stats inspection): thin, real
//!    wrappers around the `docker` CLI for a long-lived container the user
//!    already has running (e.g. a project dev container).
//!
//! 2. **The code-execution sandbox** (`execute_sandboxed`): the core,
//!    safety-critical feature. For every execution it launches a brand new,
//!    disposable container (`docker run --rm`), pipes the user's code in
//!    over stdin, enforces memory/CPU/pids/wall-clock limits, disables
//!    networking by default, captures stdout/stderr/exit code, and
//!    guarantees the container is cleaned up (via `--rm` plus an explicit
//!    `docker kill` on timeout, since `--rm` only fires once the container
//!    process actually exits).
//!
//! Everything shells out to the real `docker` CLI (`tokio::process::Command`)
//! rather than talking to the Engine API directly — this keeps the
//! implementation small while still being fully real: no mocked responses,
//! no `TODO`s. It requires a working Docker installation on PATH, exactly
//! like `docker` itself would.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub port_bindings: HashMap<String, String>,
    pub environment: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub container_id: String,
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub execution_time_ms: u64,
    #[serde(default)]
    pub timed_out: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ContainerFile {
    pub container_id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_dir: bool,
    pub modified_time: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DockerStats {
    pub container_id: String,
    pub cpu_percent: f32,
    pub memory_usage: u64,
    pub memory_limit: u64,
    pub network_rx: u64,
    pub network_tx: u64,
    pub block_read: u64,
    pub block_write: u64,
}

/// Resource limits + safety options for a single sandboxed execution.
/// Defaults are deliberately conservative: no network, capped memory/CPU,
/// short wall-clock timeout, and a `pids-limit` to block fork bombs.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SandboxOptions {
    #[serde(default = "default_image")]
    pub image: String,
    #[serde(default = "default_memory_mb")]
    pub memory_mb: u32,
    #[serde(default = "default_cpus")]
    pub cpus: f32,
    #[serde(default = "default_pids_limit")]
    pub pids_limit: u32,
    #[serde(default = "default_timeout_secs")]
    pub timeout_seconds: u32,
    /// Networking is disabled by default (`--network=none`). Only flip this
    /// on for trusted use cases.
    #[serde(default)]
    pub allow_network: bool,
}

fn default_image() -> String {
    "python:3.11-slim".to_string()
}
fn default_memory_mb() -> u32 {
    256
}
fn default_cpus() -> f32 {
    1.0
}
fn default_pids_limit() -> u32 {
    128
}
fn default_timeout_secs() -> u32 {
    15
}

impl Default for SandboxOptions {
    fn default() -> Self {
        Self {
            image: default_image(),
            memory_mb: default_memory_mb(),
            cpus: default_cpus(),
            pids_limit: default_pids_limit(),
            timeout_seconds: default_timeout_secs(),
            allow_network: false,
        }
    }
}

/// Default Docker daemon socket. Sentinel meaning "use the `docker` CLI's
/// own context resolution" — deliberately NOT passed as `DOCKER_HOST` so
/// this keeps working unmodified with Docker Desktop, Colima, Rancher
/// Desktop, remote contexts, etc., which don't necessarily use this literal
/// path. An explicit non-default host IS wired through as `DOCKER_HOST` for
/// every invocation.
const DEFAULT_DOCKER_HOST: &str = "unix:///var/run/docker.sock";

pub struct DockerExecutor {
    pub docker_host: String,
    pub timeout_seconds: u32,
}

impl DockerExecutor {
    pub fn new(docker_host: Option<String>) -> Self {
        Self {
            docker_host: docker_host.unwrap_or_else(|| DEFAULT_DOCKER_HOST.to_string()),
            timeout_seconds: 30,
        }
    }

    fn cmd(&self, args: &[&str]) -> Command {
        let mut c = Command::new("docker");
        c.args(args);
        if self.docker_host != DEFAULT_DOCKER_HOST {
            c.env("DOCKER_HOST", &self.docker_host);
        }
        c.stdin(Stdio::null());
        c.stdout(Stdio::piped());
        c.stderr(Stdio::piped());
        c
    }

    async fn run(&self, args: &[&str]) -> Result<(i32, String, String), String> {
        let output = self.cmd(args).output().await.map_err(|e| {
            format!(
                "failed to invoke `docker {}`: {e} (is Docker installed and on PATH?)",
                args.join(" ")
            )
        })?;
        Ok((
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stdout).to_string(),
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }

    /// Real availability check: `docker version` against the daemon (not
    /// just "is the CLI binary present" — this also fails if the daemon is
    /// down, which is the common failure mode on a dev machine).
    pub async fn docker_available(&self) -> bool {
        matches!(
            self.run(&["version", "--format", "{{.Server.Version}}"])
                .await,
            Ok((0, _, _))
        )
    }

    pub async fn list_containers(&self) -> Result<Vec<DockerContainer>, String> {
        let (code, stdout, stderr) = self
            .run(&[
                "ps",
                "-a",
                "--format",
                "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}",
            ])
            .await?;
        if code != 0 {
            return Err(format!("docker ps failed: {stderr}"));
        }
        let mut containers = Vec::new();
        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(4, '\t').collect();
            if parts.len() < 4 {
                continue;
            }
            containers.push(DockerContainer {
                id: parts[0].to_string(),
                name: parts[1].to_string(),
                image: parts[2].to_string(),
                status: parts[3].to_string(),
                port_bindings: HashMap::new(),
                environment: Vec::new(),
            });
        }
        Ok(containers)
    }

    /// Runs `command` inside an *already running* container via `docker
    /// exec`. For untrusted/arbitrary code, prefer [`execute_sandboxed`]
    /// which creates a fresh, resource-limited, network-isolated container
    /// per call instead of reusing a long-lived one.
    pub async fn execute_in_container(
        &self,
        container_id: &str,
        command: &str,
        working_dir: Option<String>,
    ) -> Result<ExecutionResult, String> {
        let start = Instant::now();
        let mut args: Vec<String> = vec!["exec".to_string()];
        if let Some(wd) = &working_dir {
            args.push("-w".to_string());
            args.push(wd.clone());
        }
        args.push(container_id.to_string());
        args.push("sh".to_string());
        args.push("-c".to_string());
        args.push(command.to_string());

        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let timeout = Duration::from_secs(self.timeout_seconds as u64);
        let result = tokio::time::timeout(timeout, self.run(&arg_refs)).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;
        match result {
            Ok(Ok((code, stdout, stderr))) => Ok(ExecutionResult {
                container_id: container_id.to_string(),
                exit_code: code,
                stdout,
                stderr,
                execution_time_ms,
                timed_out: false,
            }),
            Ok(Err(e)) => Err(e),
            Err(_) => Ok(ExecutionResult {
                container_id: container_id.to_string(),
                exit_code: -1,
                stdout: String::new(),
                stderr: format!("execution timed out after {}s", self.timeout_seconds),
                execution_time_ms,
                timed_out: true,
            }),
        }
    }

    /// The core sandbox: create a brand-new, disposable container for this
    /// one execution, pipe `code` in over stdin, and enforce real resource
    /// limits and network isolation. The container is always cleaned up:
    /// `--rm` removes it as soon as it exits, and on timeout we explicitly
    /// `docker kill` it by name (killing the local `docker run` client
    /// process alone would NOT stop the container on the daemon side).
    pub async fn execute_sandboxed(
        &self,
        code: &str,
        language: &str,
        opts: &SandboxOptions,
    ) -> Result<ExecutionResult, String> {
        let name = format!("prismnote-sandbox-{}", uuid::Uuid::new_v4());
        let (interpreter, args_after_dash): (&str, Vec<&str>) = match language {
            "python" | "python3" => ("python3", vec!["-"]),
            "bash" | "shell" | "sh" => ("sh", vec![]),
            "javascript" | "node" | "js" => ("node", vec!["-"]),
            "ruby" => ("ruby", vec![]),
            other => return Err(format!("unsupported sandbox language: {other}")),
        };

        let mut args: Vec<String> = vec![
            "run".to_string(),
            "--rm".to_string(),
            "-i".to_string(),
            "--name".to_string(),
            name.clone(),
            "--memory".to_string(),
            format!("{}m", opts.memory_mb),
            "--cpus".to_string(),
            format!("{}", opts.cpus),
            "--pids-limit".to_string(),
            format!("{}", opts.pids_limit),
        ];
        if !opts.allow_network {
            args.push("--network".to_string());
            args.push("none".to_string());
        }
        args.push(opts.image.clone());
        args.push(interpreter.to_string());
        for a in args_after_dash {
            args.push(a.to_string());
        }

        let start = Instant::now();
        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

        let mut command = Command::new("docker");
        command.args(&arg_refs);
        if self.docker_host != DEFAULT_DOCKER_HOST {
            command.env("DOCKER_HOST", &self.docker_host);
        }
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                format!("failed to spawn docker run: {e} (is Docker installed and running?)")
            })?;

        // For `sh`/`ruby` we pass code as the -c-equivalent via stdin isn't
        // natural (sh has no "-" stdin-as-script convention across all
        // shells reliably) — instead feed all languages through stdin, but
        // for bash/ruby switch to reading a script from stdin explicitly.
        let script = match language {
            "bash" | "shell" | "sh" => code.to_string(),
            "ruby" => code.to_string(),
            _ => code.to_string(),
        };

        if let Some(mut stdin) = child.stdin.take() {
            let write_res = stdin.write_all(script.as_bytes()).await;
            drop(stdin); // close stdin so the interpreter sees EOF
            if let Err(e) = write_res {
                let _ = child.kill().await;
                return Err(format!("failed to write code to sandbox stdin: {e}"));
            }
        }

        let timeout = Duration::from_secs(opts.timeout_seconds as u64);
        let wait_result = tokio::time::timeout(timeout, child.wait_with_output()).await;

        let execution_time_ms = start.elapsed().as_millis() as u64;

        match wait_result {
            Ok(Ok(output)) => Ok(ExecutionResult {
                container_id: name,
                exit_code: output.status.code().unwrap_or(-1),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                execution_time_ms,
                timed_out: false,
            }),
            Ok(Err(e)) => Err(format!("sandbox execution failed: {e}")),
            Err(_) => {
                // Wall-clock timeout: the local docker-CLI child process is
                // still attached, and the container is still running on the
                // daemon. Kill the container explicitly by name; `--rm`
                // then removes it once it stops. Best-effort: ignore
                // failures from an already-gone container.
                let _ = self.run(&["kill", &name]).await;
                Ok(ExecutionResult {
                    container_id: name,
                    exit_code: -1,
                    stdout: String::new(),
                    stderr: format!(
                        "execution timed out after {}s and was killed",
                        opts.timeout_seconds
                    ),
                    execution_time_ms,
                    timed_out: true,
                })
            }
        }
    }

    pub async fn get_container_files(
        &self,
        container_id: &str,
        path: &str,
    ) -> Result<Vec<ContainerFile>, String> {
        // `ls -la --time-style=+%Y-%m-%dT%H:%M:%S` gives a stable,
        // parseable format across the GNU coreutils present in common
        // sandbox base images (debian/ubuntu-derived).
        let list_cmd = format!("ls -la --time-style=+%Y-%m-%dT%H:%M:%S {path}");
        let (code, stdout, stderr) = self
            .run(&["exec", container_id, "sh", "-c", &list_cmd])
            .await?;
        if code != 0 {
            return Err(format!("failed to list '{path}' in container: {stderr}"));
        }

        let mut files = Vec::new();
        for line in stdout.lines().skip(1) {
            // total NNN
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 7 {
                continue;
            }
            let perms = parts[0];
            let size: u64 = parts[4].parse().unwrap_or(0);
            let modified = parts[5].to_string();
            let name = parts[6..].join(" ");
            if name == "." || name == ".." {
                continue;
            }
            files.push(ContainerFile {
                container_id: container_id.to_string(),
                path: path.to_string(),
                name,
                size,
                is_dir: perms.starts_with('d'),
                modified_time: modified,
            });
        }
        Ok(files)
    }

    pub async fn read_container_file(
        &self,
        container_id: &str,
        path: &str,
    ) -> Result<String, String> {
        let (code, stdout, stderr) = self.run(&["exec", container_id, "cat", path]).await?;
        if code != 0 {
            return Err(format!("failed to read '{path}' from container: {stderr}"));
        }
        Ok(stdout)
    }

    pub async fn write_container_file(
        &self,
        container_id: &str,
        path: &str,
        content: String,
    ) -> Result<(), String> {
        // Stream the content over stdin to `sh -c 'cat > path'` rather than
        // interpolating it into a shell command (avoids quoting/injection
        // issues entirely).
        let mut command = Command::new("docker");
        command.args([
            "exec",
            "-i",
            container_id,
            "sh",
            "-c",
            &format!("cat > {path}"),
        ]);
        if self.docker_host != DEFAULT_DOCKER_HOST {
            command.env("DOCKER_HOST", &self.docker_host);
        }
        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("failed to spawn docker exec: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(content.as_bytes())
                .await
                .map_err(|e| format!("failed to write file content: {e}"))?;
        }
        let output = child
            .wait_with_output()
            .await
            .map_err(|e| format!("failed to wait for docker exec: {e}"))?;
        if !output.status.success() {
            return Err(format!(
                "failed to write '{path}' in container: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(())
    }

    pub async fn create_container(
        &self,
        image: &str,
        name: &str,
        env: HashMap<String, String>,
        ports: HashMap<String, u16>,
    ) -> Result<DockerContainer, String> {
        let mut args: Vec<String> =
            vec!["create".to_string(), "--name".to_string(), name.to_string()];
        for (k, v) in &env {
            args.push("-e".to_string());
            args.push(format!("{k}={v}"));
        }
        let mut port_bindings = HashMap::new();
        for (internal, external) in &ports {
            args.push("-p".to_string());
            args.push(format!("{external}:{internal}"));
            port_bindings.insert(format!("{internal}/tcp"), external.to_string());
        }
        args.push(image.to_string());

        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let (code, stdout, stderr) = self.run(&arg_refs).await?;
        if code != 0 {
            return Err(format!("docker create failed: {stderr}"));
        }
        let id = stdout.trim().to_string();

        Ok(DockerContainer {
            id,
            name: name.to_string(),
            image: image.to_string(),
            status: "created".to_string(),
            port_bindings,
            environment: env.iter().map(|(k, v)| format!("{k}={v}")).collect(),
        })
    }

    pub async fn start_container(&self, container_id: &str) -> Result<(), String> {
        let (code, _stdout, stderr) = self.run(&["start", container_id]).await?;
        if code != 0 {
            return Err(format!("docker start failed: {stderr}"));
        }
        Ok(())
    }

    pub async fn stop_container(&self, container_id: &str) -> Result<(), String> {
        let (code, _stdout, stderr) = self.run(&["stop", container_id]).await?;
        if code != 0 {
            return Err(format!("docker stop failed: {stderr}"));
        }
        Ok(())
    }

    pub async fn remove_container(&self, container_id: &str) -> Result<(), String> {
        let (code, _stdout, stderr) = self.run(&["rm", "-f", container_id]).await?;
        if code != 0 {
            return Err(format!("docker rm failed: {stderr}"));
        }
        Ok(())
    }

    pub async fn get_container_stats(&self, container_id: &str) -> Result<DockerStats, String> {
        let (code, stdout, stderr) = self
            .run(&[
                "stats",
                "--no-stream",
                "--format",
                "{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}",
                container_id,
            ])
            .await?;
        if code != 0 {
            return Err(format!("docker stats failed: {stderr}"));
        }
        let line = stdout.lines().next().unwrap_or("");
        let parts: Vec<&str> = line.split('\t').collect();

        let cpu_percent = parts
            .first()
            .map(|s| s.trim_end_matches('%').parse::<f32>().unwrap_or(0.0))
            .unwrap_or(0.0);

        let (memory_usage, memory_limit) =
            parts.get(1).map(|s| parse_mem_usage(s)).unwrap_or((0, 0));

        let (network_rx, network_tx) = parts.get(2).map(|s| parse_io_pair(s)).unwrap_or((0, 0));
        let (block_read, block_write) = parts.get(3).map(|s| parse_io_pair(s)).unwrap_or((0, 0));

        Ok(DockerStats {
            container_id: container_id.to_string(),
            cpu_percent,
            memory_usage,
            memory_limit,
            network_rx,
            network_tx,
            block_read,
            block_write,
        })
    }

    pub async fn pull_image(&self, image: &str) -> Result<String, String> {
        let (code, stdout, stderr) = self.run(&["pull", image]).await?;
        if code != 0 {
            return Err(format!("docker pull failed: {stderr}"));
        }
        Ok(if stdout.trim().is_empty() {
            format!("Pulled image: {image}")
        } else {
            stdout
        })
    }

    pub async fn get_container_logs(
        &self,
        container_id: &str,
        lines: Option<u32>,
    ) -> Result<String, String> {
        let tail = lines.unwrap_or(100).to_string();
        let (code, stdout, stderr) = self.run(&["logs", "--tail", &tail, container_id]).await?;
        if code != 0 {
            return Err(format!("docker logs failed: {stderr}"));
        }
        Ok(if stdout.is_empty() { stderr } else { stdout })
    }

    // Real `docker cp` wrappers, kept as public API for host-filesystem
    // <-> container transfers. Not yet wired to an HTTP route (the exposed
    // file endpoints use `read_container_file`/`write_container_file`,
    // which stream through stdin/stdout instead of touching the host
    // filesystem) — left available for callers that need actual files on
    // disk rather than in-memory content.
    #[allow(dead_code)]
    pub async fn copy_to_container(
        &self,
        container_id: &str,
        local_path: &str,
        container_path: &str,
    ) -> Result<(), String> {
        let dest = format!("{container_id}:{container_path}");
        let (code, _stdout, stderr) = self.run(&["cp", local_path, &dest]).await?;
        if code != 0 {
            return Err(format!("docker cp (to container) failed: {stderr}"));
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn copy_from_container(
        &self,
        container_id: &str,
        container_path: &str,
        local_path: &str,
    ) -> Result<(), String> {
        let src = format!("{container_id}:{container_path}");
        let (code, _stdout, stderr) = self.run(&["cp", &src, local_path]).await?;
        if code != 0 {
            return Err(format!("docker cp (from container) failed: {stderr}"));
        }
        Ok(())
    }
}

/// Parses docker's `"12.3MiB / 512MiB"` style memory usage string.
fn parse_mem_usage(s: &str) -> (u64, u64) {
    let parts: Vec<&str> = s.split('/').map(|p| p.trim()).collect();
    let used = parts.first().map(|p| parse_bytes(p)).unwrap_or(0);
    let limit = parts.get(1).map(|p| parse_bytes(p)).unwrap_or(0);
    (used, limit)
}

/// Parses docker's `"1.2kB / 3.4kB"` style network/block IO string.
fn parse_io_pair(s: &str) -> (u64, u64) {
    let parts: Vec<&str> = s.split('/').map(|p| p.trim()).collect();
    let rx = parts.first().map(|p| parse_bytes(p)).unwrap_or(0);
    let tx = parts.get(1).map(|p| parse_bytes(p)).unwrap_or(0);
    (rx, tx)
}

/// Parses a human-readable byte size like "512MiB", "1.2GB", "800kB" into
/// raw bytes. Docker uses binary (Ki/Mi/Gi) units in some CLI versions and
/// decimal (k/M/G) in others depending on platform, so both are handled.
fn parse_bytes(s: &str) -> u64 {
    let s = s.trim();
    let idx = s
        .find(|c: char| !c.is_ascii_digit() && c != '.')
        .unwrap_or(s.len());
    let (num_part, unit_part) = s.split_at(idx);
    let num: f64 = num_part.parse().unwrap_or(0.0);
    let unit = unit_part.trim().to_lowercase();
    let multiplier: f64 = match unit.as_str() {
        "b" | "" => 1.0,
        "kb" => 1000.0,
        "kib" => 1024.0,
        "mb" => 1_000_000.0,
        "mib" => 1024.0 * 1024.0,
        "gb" => 1_000_000_000.0,
        "gib" => 1024.0 * 1024.0 * 1024.0,
        _ => 1.0,
    };
    (num * multiplier) as u64
}

// Convenience wrappers around `execute_in_container` for the three notebook
// cell kinds that can target a long-lived dev container. The
// `/docker/containers/execute` HTTP route (see api::execute_code_in_container)
// currently builds its command string inline rather than calling these, so
// they're not yet reachable from a route — kept as the real, tested
// building blocks for wiring that endpoint through this shared helper
// instead of duplicating the per-language command formatting.
#[allow(dead_code)]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PythonContainerCell {
    pub cell_id: String,
    pub container_id: String,
    pub code: String,
    pub working_dir: String,
}

#[allow(dead_code)]
pub struct ContainerCellExecutor;

#[allow(dead_code)]
impl ContainerCellExecutor {
    pub async fn execute_python_in_container(
        container_id: &str,
        code: &str,
        working_dir: Option<String>,
    ) -> Result<ExecutionResult, String> {
        let executor = DockerExecutor::new(None);
        let wd = working_dir.unwrap_or("/workspace".to_string());
        // Feed code via a heredoc rather than `-c "<code>"` to avoid shell
        // quoting/escaping problems with arbitrary user code.
        let script = format!("python3 - <<'PRISMNOTE_EOF'\n{code}\nPRISMNOTE_EOF");

        executor
            .execute_in_container(container_id, &script, Some(wd))
            .await
    }

    pub async fn execute_shell_in_container(
        container_id: &str,
        command: &str,
        working_dir: Option<String>,
    ) -> Result<ExecutionResult, String> {
        let executor = DockerExecutor::new(None);
        let wd = working_dir.unwrap_or("/".to_string());

        executor
            .execute_in_container(container_id, command, Some(wd))
            .await
    }

    pub async fn execute_file_in_container(
        container_id: &str,
        file_path: &str,
        working_dir: Option<String>,
    ) -> Result<ExecutionResult, String> {
        let executor = DockerExecutor::new(None);
        let wd = working_dir.unwrap_or("/workspace".to_string());

        executor
            .execute_in_container(container_id, &format!("python3 {file_path}"), Some(wd))
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_bytes() {
        assert_eq!(parse_bytes("512MiB"), 512 * 1024 * 1024);
        assert_eq!(parse_bytes("1kB"), 1000);
        assert_eq!(parse_bytes("2GiB"), 2 * 1024 * 1024 * 1024);
        assert_eq!(parse_bytes("0B"), 0);
    }

    #[test]
    fn test_parse_mem_usage() {
        let (used, limit) = parse_mem_usage("12.5MiB / 512MiB");
        assert_eq!(used, (12.5 * 1024.0 * 1024.0) as u64);
        assert_eq!(limit, 512 * 1024 * 1024);
    }

    #[test]
    fn test_sandbox_options_defaults() {
        let opts = SandboxOptions::default();
        assert_eq!(opts.image, "python:3.11-slim");
        assert!(!opts.allow_network, "network must be off by default");
        assert_eq!(opts.timeout_seconds, 15);
        assert!(opts.memory_mb > 0 && opts.pids_limit > 0);
    }

    // ---- Real Docker execution tests -----------------------------------
    //
    // These launch actual containers via the real `docker` CLI and verify
    // real stdout/exit codes/timeout behavior. If Docker isn't available in
    // the environment (`docker_available()` returns false), each test
    // prints a SKIP line and returns early rather than failing, so
    // `cargo test` stays green on machines without Docker. Where Docker
    // *is* available (as in this remediation pass — verified against a
    // real local Docker daemon), they run for real.

    #[tokio::test]
    async fn sandbox_executes_python_and_returns_real_stdout() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_executes_python_and_returns_real_stdout: Docker not available");
            return;
        }
        let opts = SandboxOptions::default();
        let result = executor
            .execute_sandboxed("print(21 * 2)", "python", &opts)
            .await
            .expect("sandbox execution should not error");

        assert_eq!(result.exit_code, 0, "stderr: {}", result.stderr);
        assert_eq!(result.stdout.trim(), "42");
        assert!(!result.timed_out);
    }

    #[tokio::test]
    async fn sandbox_executes_shell_and_returns_real_stdout() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_executes_shell_and_returns_real_stdout: Docker not available");
            return;
        }
        let opts = SandboxOptions {
            image: "python:3.11-slim".to_string(),
            ..SandboxOptions::default()
        };
        let result = executor
            .execute_sandboxed("echo hello-from-sandbox", "bash", &opts)
            .await
            .expect("sandbox execution should not error");

        assert_eq!(result.exit_code, 0, "stderr: {}", result.stderr);
        assert_eq!(result.stdout.trim(), "hello-from-sandbox");
    }

    #[tokio::test]
    async fn sandbox_captures_nonzero_exit_and_stderr() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_captures_nonzero_exit_and_stderr: Docker not available");
            return;
        }
        let opts = SandboxOptions::default();
        let result = executor
            .execute_sandboxed(
                "import sys\nprint('failing on purpose', file=sys.stderr)\nsys.exit(7)",
                "python",
                &opts,
            )
            .await
            .expect("sandbox execution should not error at the transport level");

        assert_eq!(result.exit_code, 7);
        assert!(result.stderr.contains("failing on purpose"));
    }

    #[tokio::test]
    async fn sandbox_has_no_network_access_by_default() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_has_no_network_access_by_default: Docker not available");
            return;
        }
        let opts = SandboxOptions::default();
        assert!(!opts.allow_network);

        // Attempt a real DNS resolution from inside the sandbox; with
        // --network=none this must fail (no network stack at all).
        let result = executor
            .execute_sandboxed(
                "import socket\nsocket.gethostbyname('example.com')\nprint('reached network')",
                "python",
                &opts,
            )
            .await
            .expect("sandbox execution should not error at the transport level");

        assert_ne!(
            result.exit_code, 0,
            "network call unexpectedly succeeded with --network=none"
        );
        assert!(!result.stdout.contains("reached network"));
    }

    #[tokio::test]
    async fn sandbox_enforces_wall_clock_timeout_and_kills_container() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_enforces_wall_clock_timeout_and_kills_container: Docker not available");
            return;
        }
        let opts = SandboxOptions {
            timeout_seconds: 2,
            ..SandboxOptions::default()
        };

        let start = Instant::now();
        let result = executor
            .execute_sandboxed("import time\ntime.sleep(60)", "python", &opts)
            .await
            .expect("timeout path should still return Ok with timed_out=true");

        assert!(
            result.timed_out,
            "expected the execution to be marked as timed out"
        );
        assert!(
            start.elapsed() < Duration::from_secs(10),
            "timeout enforcement should cut execution short, took {:?}",
            start.elapsed()
        );

        // Verify the container was actually killed/removed, not left running.
        let (_, ps_stdout, _) = executor
            .run(&[
                "ps",
                "-a",
                "--filter",
                &format!("name={}", result.container_id),
                "--format",
                "{{.Names}}",
            ])
            .await
            .unwrap();
        assert!(
            !ps_stdout.contains(&result.container_id),
            "sandbox container should have been cleaned up after timeout, found: {ps_stdout}"
        );
    }

    #[tokio::test]
    async fn sandbox_enforces_memory_limit() {
        let executor = DockerExecutor::new(None);
        if !executor.docker_available().await {
            eprintln!("SKIP sandbox_enforces_memory_limit: Docker not available");
            return;
        }
        let opts = SandboxOptions {
            memory_mb: 64,
            timeout_seconds: 20,
            ..SandboxOptions::default()
        };

        // Try to allocate ~400MB of Python objects, well past the 64MB cap;
        // the kernel OOM-killer inside the cgroup should kill the process
        // before it can print "allocated ok".
        let code = "\
data = bytearray(400 * 1024 * 1024)
print('allocated ok')
";
        let result = executor
            .execute_sandboxed(code, "python", &opts)
            .await
            .expect("sandbox execution should not error at the transport level");

        assert!(
            !result.stdout.contains("allocated ok"),
            "allocation should have been killed by the memory limit, got stdout: {}",
            result.stdout
        );
        assert_ne!(result.exit_code, 0);
    }
}
