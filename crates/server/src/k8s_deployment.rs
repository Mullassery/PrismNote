use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KubernetesConfig {
    pub cluster_name: String,
    pub namespace: String,
    pub replicas: u32,
    pub image: String,
    pub cpu_request: String,
    pub memory_request: String,
    pub cpu_limit: String,
    pub memory_limit: String,
    pub ingress_host: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DockerConfig {
    pub image_name: String,
    pub image_tag: String,
    pub port: u16,
    pub volumes: Vec<VolumeMount>,
    pub environment: Vec<EnvVar>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VolumeMount {
    pub name: String,
    pub mount_path: String,
    pub host_path: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EnvVar {
    pub name: String,
    pub value: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PodStatus {
    pub name: String,
    pub status: String,
    pub ready: bool,
    pub restart_count: u32,
    pub cpu_usage: String,
    pub memory_usage: String,
}

pub struct KubernetesManager {
    pub config: KubernetesConfig,
}

impl KubernetesManager {
    pub fn new(config: KubernetesConfig) -> Self {
        Self { config }
    }

    /// `--context` args, included only when `cluster_name` names a real
    /// kubeconfig context (empty means "use kubectl's current-context").
    fn context_args(&self) -> Vec<&str> {
        if self.config.cluster_name.is_empty() {
            vec![]
        } else {
            vec!["--context", &self.config.cluster_name]
        }
    }

    async fn run(&self, args: &[&str]) -> Result<(i32, String, String), String> {
        let mut cmd = Command::new("kubectl");
        cmd.args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let output = cmd.output().await.map_err(|e| {
            format!(
                "failed to invoke `kubectl {}`: {e} (is kubectl installed and on PATH?)",
                args.join(" ")
            )
        })?;
        Ok((
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stdout).to_string(),
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }

    async fn run_with_stdin(
        &self,
        args: &[&str],
        stdin_data: &str,
    ) -> Result<(i32, String, String), String> {
        let mut cmd = Command::new("kubectl");
        cmd.args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let mut child = cmd.spawn().map_err(|e| {
            format!(
                "failed to invoke `kubectl {}`: {e} (is kubectl installed and on PATH?)",
                args.join(" ")
            )
        })?;
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(stdin_data.as_bytes())
                .await
                .map_err(|e| format!("failed to write manifest to kubectl stdin: {e}"))?;
        }
        let output = child
            .wait_with_output()
            .await
            .map_err(|e| format!("failed waiting for kubectl: {e}"))?;
        Ok((
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stdout).to_string(),
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }

    /// Real availability check against the target cluster (not just "is the
    /// CLI present") -- mirrors `DockerExecutor::docker_available`.
    pub async fn kubectl_available(&self) -> bool {
        let mut args = self.context_args();
        args.push("cluster-info");
        matches!(self.run(&args).await, Ok((0, _, _)))
    }

    pub async fn deploy(&self) -> Result<String, String> {
        let manifest = self.generate_manifest();
        let mut args = self.context_args();
        args.extend(["apply", "-f", "-"]);
        let (code, stdout, stderr) = self.run_with_stdin(&args, &manifest).await?;
        if code != 0 {
            return Err(format!("kubectl apply failed: {stderr}"));
        }
        Ok(format!(
            "PrismNote deployed to Kubernetes cluster '{}':\n{stdout}",
            self.config.cluster_name
        ))
    }

    pub async fn get_pod_status(&self) -> Result<Vec<PodStatus>, String> {
        let mut args = self.context_args();
        args.extend([
            "get",
            "pods",
            "-n",
            &self.config.namespace,
            "-l",
            "app=prismnote",
            "-o",
            "json",
        ]);
        let (code, stdout, stderr) = self.run(&args).await?;
        if code != 0 {
            return Err(format!("kubectl get pods failed: {stderr}"));
        }
        // kubectl top requires metrics-server, which isn't guaranteed to be
        // installed on every cluster -- best-effort, not fatal to the whole
        // call if unavailable, and left as "unknown" rather than fabricated
        // when it isn't.
        let usage_by_pod = self.pod_resource_usage().await.unwrap_or_default();

        pods_from_kubectl_json(&stdout, &usage_by_pod)
    }

    async fn pod_resource_usage(
        &self,
    ) -> Result<std::collections::HashMap<String, (String, String)>, String> {
        let mut args = self.context_args();
        args.extend([
            "top",
            "pod",
            "-n",
            &self.config.namespace,
            "-l",
            "app=prismnote",
            "--no-headers",
        ]);
        let (code, stdout, stderr) = self.run(&args).await?;
        if code != 0 {
            return Err(format!("kubectl top pod unavailable: {stderr}"));
        }
        // Lines look like: "prismnote-abc123   100m   512Mi"
        Ok(stdout
            .lines()
            .filter_map(|line| {
                let cols: Vec<&str> = line.split_whitespace().collect();
                if cols.len() >= 3 {
                    Some((
                        cols[0].to_string(),
                        (cols[1].to_string(), cols[2].to_string()),
                    ))
                } else {
                    None
                }
            })
            .collect())
    }

    pub async fn scale_replicas(&self, count: u32) -> Result<String, String> {
        let mut args = self.context_args();
        let replicas_arg = format!("--replicas={count}");
        args.extend([
            "scale",
            "deployment/prismnote",
            "-n",
            &self.config.namespace,
            &replicas_arg,
        ]);
        let (code, stdout, stderr) = self.run(&args).await?;
        if code != 0 {
            return Err(format!("kubectl scale failed: {stderr}"));
        }
        Ok(if stdout.trim().is_empty() {
            format!("Scaled to {count} replicas")
        } else {
            stdout.trim().to_string()
        })
    }

    pub fn generate_manifest(&self) -> String {
        format!(
            r#"---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prismnote
  namespace: {}
spec:
  replicas: {}
  selector:
    matchLabels:
      app: prismnote
  template:
    metadata:
      labels:
        app: prismnote
    spec:
      containers:
      - name: prismnote
        image: {}
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: {}
            memory: {}
          limits:
            cpu: {}
            memory: {}
---
apiVersion: v1
kind: Service
metadata:
  name: prismnote-service
  namespace: {}
spec:
  selector:
    app: prismnote
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prismnote-ingress
  namespace: {}
spec:
  rules:
  - host: {}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prismnote-service
            port:
              number: 8000
"#,
            self.config.namespace,
            self.config.replicas,
            self.config.image,
            self.config.cpu_request,
            self.config.memory_request,
            self.config.cpu_limit,
            self.config.memory_limit,
            self.config.namespace,
            self.config.namespace,
            self.config.ingress_host
        )
    }
}

fn pods_from_kubectl_json(
    json: &str,
    usage_by_pod: &std::collections::HashMap<String, (String, String)>,
) -> Result<Vec<PodStatus>, String> {
    let parsed: Value = serde_json::from_str(json)
        .map_err(|e| format!("failed to parse kubectl get pods output: {e}"))?;
    let items = parsed
        .get("items")
        .and_then(|i| i.as_array())
        .cloned()
        .unwrap_or_default();

    Ok(items
        .iter()
        .map(|pod| {
            let name = pod
                .get("metadata")
                .and_then(|m| m.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or_default()
                .to_string();
            let status = pod
                .get("status")
                .and_then(|s| s.get("phase"))
                .and_then(|p| p.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let container_statuses = pod
                .get("status")
                .and_then(|s| s.get("containerStatuses"))
                .and_then(|c| c.as_array())
                .cloned()
                .unwrap_or_default();
            let ready = !container_statuses.is_empty()
                && container_statuses
                    .iter()
                    .all(|c| c.get("ready").and_then(|r| r.as_bool()).unwrap_or(false));
            let restart_count = container_statuses
                .iter()
                .filter_map(|c| c.get("restartCount").and_then(|r| r.as_u64()))
                .sum::<u64>() as u32;
            let (cpu_usage, memory_usage) = usage_by_pod
                .get(&name)
                .cloned()
                .unwrap_or_else(|| ("unknown".to_string(), "unknown".to_string()));

            PodStatus {
                name,
                status,
                ready,
                restart_count,
                cpu_usage,
                memory_usage,
            }
        })
        .collect())
}

pub struct DockerManager {
    pub config: DockerConfig,
}

impl DockerManager {
    pub fn new(config: DockerConfig) -> Self {
        Self { config }
    }

    pub fn generate_dockerfile() -> String {
        r#"FROM rust:latest as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/prismnote /usr/local/bin/
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["prismnote"]
"#
        .to_string()
    }

    pub fn generate_docker_compose() -> String {
        r#"version: '3.8'

services:
  prismnote:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./notebooks:/root/.prismnote/notebooks
      - ./data:/root/.prismnote/data
    environment:
      - PRISMNOTE_DIR=/root/.prismnote
      - RUST_LOG=info
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: prismnote
      POSTGRES_DB: prismnote
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
"#
        .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> KubernetesConfig {
        KubernetesConfig {
            cluster_name: String::new(),
            namespace: "default".to_string(),
            replicas: 2,
            image: "prismnote:latest".to_string(),
            cpu_request: "100m".to_string(),
            memory_request: "256Mi".to_string(),
            cpu_limit: "500m".to_string(),
            memory_limit: "512Mi".to_string(),
            ingress_host: "prismnote.example.com".to_string(),
        }
    }

    #[test]
    fn context_args_empty_when_cluster_name_unset() {
        let manager = KubernetesManager::new(test_config());
        assert!(manager.context_args().is_empty());
    }

    #[test]
    fn context_args_included_when_cluster_name_set() {
        let mut config = test_config();
        config.cluster_name = "prod-cluster".to_string();
        let manager = KubernetesManager::new(config);
        assert_eq!(manager.context_args(), vec!["--context", "prod-cluster"]);
    }

    fn fixture_pods_json() -> &'static str {
        r#"{
            "items": [
                {
                    "metadata": {"name": "prismnote-abc123"},
                    "status": {
                        "phase": "Running",
                        "containerStatuses": [{"ready": true, "restartCount": 2}]
                    }
                },
                {
                    "metadata": {"name": "prismnote-def456"},
                    "status": {
                        "phase": "Pending",
                        "containerStatuses": [{"ready": false, "restartCount": 0}]
                    }
                }
            ]
        }"#
    }

    #[test]
    fn parses_pod_status_ready_and_restart_count_from_real_kubectl_shape() {
        let mut usage = std::collections::HashMap::new();
        usage.insert(
            "prismnote-abc123".to_string(),
            ("120m".to_string(), "300Mi".to_string()),
        );

        let pods = pods_from_kubectl_json(fixture_pods_json(), &usage).unwrap();
        assert_eq!(pods.len(), 2);

        let running = pods.iter().find(|p| p.name == "prismnote-abc123").unwrap();
        assert_eq!(running.status, "Running");
        assert!(running.ready);
        assert_eq!(running.restart_count, 2);
        assert_eq!(running.cpu_usage, "120m");
        assert_eq!(running.memory_usage, "300Mi");

        let pending = pods.iter().find(|p| p.name == "prismnote-def456").unwrap();
        assert!(!pending.ready);
        assert_eq!(
            pending.cpu_usage, "unknown",
            "no metrics-server data for this pod"
        );
    }

    #[test]
    fn empty_items_list_returns_empty_pods() {
        let usage = std::collections::HashMap::new();
        let pods = pods_from_kubectl_json(r#"{"items": []}"#, &usage).unwrap();
        assert!(pods.is_empty());
    }

    #[test]
    fn malformed_json_is_a_clear_error_not_a_panic() {
        let usage = std::collections::HashMap::new();
        assert!(pods_from_kubectl_json("not json", &usage).is_err());
    }

    // ---- Real kubectl integration tests -----------------------------------
    //
    // Mirrors docker_executor.rs: skip (not fail) when kubectl isn't
    // available or isn't connected to a real cluster.

    #[tokio::test]
    async fn kubectl_not_available_produces_a_clear_error_not_a_panic() {
        let manager = KubernetesManager::new(test_config());
        if manager.kubectl_available().await {
            eprintln!(
                "SKIP kubectl_not_available_produces_a_clear_error: a real cluster IS available"
            );
            return;
        }
        let err = manager.get_pod_status().await.unwrap_err();
        assert!(
            !err.is_empty(),
            "expected a non-empty error when kubectl has no cluster connection"
        );
    }

    #[tokio::test]
    async fn deploy_against_a_real_cluster_applies_the_generated_manifest() {
        let manager = KubernetesManager::new(test_config());
        if !manager.kubectl_available().await {
            eprintln!("SKIP deploy_against_a_real_cluster: no cluster available");
            return;
        }
        let result = manager.deploy().await;
        assert!(
            result.is_ok(),
            "deploy should succeed against a real cluster: {result:?}"
        );
    }
}
