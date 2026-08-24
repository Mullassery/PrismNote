//! Real dbt-backed project introspection and execution.
//!
//! Shells out to the real `dbt` CLI (`tokio::process::Command`), the same
//! approach `docker_executor.rs` uses for Docker: no mocked responses. dbt
//! itself writes `target/manifest.json` (after `dbt parse`/`run`/`test`) and
//! `target/run_results.json` (after `run`/`test`), and those are parsed for
//! real rather than re-deriving the same information by hand.
//!
//! `dbt parse` deliberately does not connect to the warehouse (only `run`,
//! `test`, and `docs generate` do), so `list_models`/`get_lineage` work
//! without live warehouse credentials as long as `profiles.yml` parses.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Instant;
use tokio::process::Command;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbtProject {
    pub name: String,
    pub path: String,
    pub profiles_dir: String,
    pub target: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbtModel {
    pub name: String,
    pub path: String,
    pub model_type: String,
    pub description: Option<String>,
    pub columns: Vec<DbtColumn>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbtColumn {
    pub name: String,
    pub data_type: String,
    pub description: Option<String>,
    pub tests: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbtTest {
    pub name: String,
    pub model: String,
    pub test_type: String,
    pub status: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DbtRunResult {
    pub run_id: String,
    pub status: String,
    pub models_run: usize,
    pub tests_run: usize,
    pub tests_passed: usize,
    pub tests_failed: usize,
    pub execution_time_seconds: f32,
}

pub struct DbtManager {
    pub project: DbtProject,
}

impl DbtManager {
    pub fn new(project: DbtProject) -> Self {
        Self { project }
    }

    fn cmd(&self, args: &[&str]) -> Command {
        let mut c = Command::new("dbt");
        c.current_dir(&self.project.path);
        c.args(["--profiles-dir", &self.project.profiles_dir]);
        c.args(["--target", &self.project.target]);
        c.args(args);
        c.stdin(Stdio::null());
        c.stdout(Stdio::piped());
        c.stderr(Stdio::piped());
        c
    }

    async fn run(&self, args: &[&str]) -> Result<(i32, String, String), String> {
        let output = self.cmd(args).output().await.map_err(|e| {
            format!(
                "failed to invoke `dbt {}`: {e} (is dbt installed and on PATH?)",
                args.join(" ")
            )
        })?;
        Ok((
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stdout).to_string(),
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }

    /// Real availability check, mirroring `DockerExecutor::docker_available`.
    pub async fn dbt_available(&self) -> bool {
        matches!(
            Command::new("dbt").arg("--version").output().await,
            Ok(o) if o.status.success()
        )
    }

    fn manifest_path(&self) -> PathBuf {
        Path::new(&self.project.path)
            .join("target")
            .join("manifest.json")
    }

    fn run_results_path(&self) -> PathBuf {
        Path::new(&self.project.path)
            .join("target")
            .join("run_results.json")
    }

    /// Parses the project via `dbt parse` (no warehouse connection required)
    /// and reads the resulting `manifest.json` for model + column metadata.
    pub async fn list_models(&self) -> Result<Vec<DbtModel>, String> {
        let (code, _stdout, stderr) = self.run(&["parse", "--quiet"]).await?;
        if code != 0 {
            return Err(format!("dbt parse failed: {stderr}"));
        }
        let manifest = std::fs::read_to_string(self.manifest_path())
            .map_err(|e| format!("dbt parse succeeded but manifest.json could not be read: {e}"))?;
        parse_models_from_manifest(&manifest)
    }

    pub async fn run_dbt(&self, selector: Option<String>) -> Result<DbtRunResult, String> {
        let start = Instant::now();
        let mut args = vec!["run"];
        if let Some(sel) = &selector {
            args.push("--select");
            args.push(sel);
        }
        let (code, _stdout, stderr) = self.run(&args).await?;
        let wallclock_seconds = start.elapsed().as_secs_f32();

        let run_results = std::fs::read_to_string(self.run_results_path()).map_err(|e| {
            format!("dbt run finished (exit {code}) but run_results.json could not be read: {e}. stderr: {stderr}")
        })?;
        let parsed = parse_run_results(&run_results)?;
        let failed = parsed
            .results
            .iter()
            .filter(|r| r.status == "error" || r.status == "fail")
            .count();

        Ok(DbtRunResult {
            run_id: format!("dbt-run-{}", uuid::Uuid::new_v4()),
            status: if code == 0 && failed == 0 {
                "success".to_string()
            } else {
                "error".to_string()
            },
            models_run: parsed.results.len(),
            // A plain `dbt run` doesn't execute tests (that's `dbt test` /
            // `dbt build`) -- run_results.json genuinely has no test rows
            // here, so these stay at 0 rather than inventing a number.
            tests_run: 0,
            tests_passed: 0,
            tests_failed: 0,
            execution_time_seconds: if parsed.elapsed_seconds > 0.0 {
                parsed.elapsed_seconds
            } else {
                wallclock_seconds
            },
        })
    }

    pub async fn run_tests(&self) -> Result<Vec<DbtTest>, String> {
        let (code, _stdout, stderr) = self.run(&["test"]).await?;

        let run_results = std::fs::read_to_string(self.run_results_path()).map_err(|e| {
            format!("dbt test finished (exit {code}) but run_results.json could not be read: {e}. stderr: {stderr}")
        })?;
        let parsed = parse_run_results(&run_results)?;

        let manifest = std::fs::read_to_string(self.manifest_path())
            .map_err(|e| format!("dbt test finished but manifest.json could not be read: {e}"))?;
        let metadata = parse_test_metadata(&manifest)?;

        Ok(parsed
            .results
            .into_iter()
            .map(|r| {
                let meta = metadata.get(&r.unique_id).cloned().unwrap_or_default();
                DbtTest {
                    name: if meta.name.is_empty() {
                        r.unique_id.clone()
                    } else {
                        meta.name
                    },
                    model: meta.model,
                    test_type: meta.test_type,
                    status: normalize_test_status(&r.status),
                }
            })
            .collect())
    }

    /// Runs `dbt docs generate` (this step *does* connect to the warehouse,
    /// since column types come from `catalog.json` introspection) and
    /// returns the path to the generated site.
    pub async fn generate_docs(&self) -> Result<String, String> {
        let (code, stdout, stderr) = self.run(&["docs", "generate", "--quiet"]).await?;
        if code != 0 {
            return Err(format!("dbt docs generate failed: {stderr}"));
        }
        let index_path = Path::new(&self.project.path)
            .join("target")
            .join("index.html");
        if index_path.exists() {
            Ok(format!("dbt docs generated: {}", index_path.display()))
        } else if stdout.trim().is_empty() {
            Ok("dbt docs generated".to_string())
        } else {
            Ok(stdout)
        }
    }

    /// Reads `manifest.json` (from a prior `list_models`/`dbt parse` call)
    /// and returns the model's immediate upstream/downstream dependencies as
    /// a JSON graph, via dbt's own `parent_map`/`child_map`.
    pub async fn get_lineage(&self, model: &str) -> Result<String, String> {
        let manifest = std::fs::read_to_string(self.manifest_path()).map_err(|e| {
            format!(
                "failed to read manifest.json (call list_models() or run `dbt parse` first): {e}"
            )
        })?;
        parse_lineage(&manifest, model)
    }

    pub fn generate_profiles_yml() -> String {
        r#"prismnote:
  outputs:
    dev:
      type: postgres
      host: localhost
      user: postgres
      password: password
      port: 5432
      dbname: analytics
      schema: dbt_dev
      threads: 4
    prod:
      type: postgres
      host: prod-db.example.com
      user: dbt_prod
      password: [password]
      port: 5432
      dbname: analytics
      schema: dbt_prod
      threads: 8
  target: dev
"#
        .to_string()
    }

    pub fn generate_dbt_project_yml(project_name: &str) -> String {
        format!(
            r#"name: '{}'
version: '1.0.0'
config-version: 2

profile: 'prismnote'
model-paths: ["models"]
analysis-paths: ["analysis"]
test-paths: ["tests"]
data-paths: ["data"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]
target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  {}:
    materialized: view
"#,
            project_name, project_name
        )
    }
}

fn normalize_test_status(dbt_status: &str) -> String {
    match dbt_status {
        "pass" | "success" => "pass".to_string(),
        "fail" | "error" => "fail".to_string(),
        "warn" => "warn".to_string(),
        "skipped" => "skipped".to_string(),
        other => other.to_string(),
    }
}

struct RunResultRow {
    unique_id: String,
    status: String,
}

struct ParsedRunResults {
    results: Vec<RunResultRow>,
    elapsed_seconds: f32,
}

/// Parses dbt's `target/run_results.json` (written after `run`/`test`/`build`).
fn parse_run_results(run_results_json: &str) -> Result<ParsedRunResults, String> {
    let v: Value = serde_json::from_str(run_results_json)
        .map_err(|e| format!("invalid run_results.json: {e}"))?;
    let results = v
        .get("results")
        .and_then(|r| r.as_array())
        .ok_or("run_results.json missing 'results'")?;

    let elapsed_seconds = v
        .get("elapsed_time")
        .and_then(|e| e.as_f64())
        .unwrap_or(0.0) as f32;

    let rows = results
        .iter()
        .map(|r| RunResultRow {
            unique_id: r
                .get("unique_id")
                .and_then(|u| u.as_str())
                .unwrap_or_default()
                .to_string(),
            status: r
                .get("status")
                .and_then(|s| s.as_str())
                .unwrap_or_default()
                .to_string(),
        })
        .collect();

    Ok(ParsedRunResults {
        results: rows,
        elapsed_seconds,
    })
}

/// Parses dbt's `target/manifest.json` `nodes` map for model + column info,
/// cross-referencing test nodes to populate `DbtColumn::tests`.
fn parse_models_from_manifest(manifest_json: &str) -> Result<Vec<DbtModel>, String> {
    let v: Value =
        serde_json::from_str(manifest_json).map_err(|e| format!("invalid manifest.json: {e}"))?;
    let nodes = v
        .get("nodes")
        .and_then(|n| n.as_object())
        .ok_or("manifest.json missing 'nodes'")?;

    // (model_unique_id, column_name) -> test type names, from generic test nodes.
    let mut tests_by_model_column: HashMap<(String, String), Vec<String>> = HashMap::new();
    for node in nodes.values() {
        if node.get("resource_type").and_then(|r| r.as_str()) != Some("test") {
            continue;
        }
        let column_name = node
            .get("column_name")
            .and_then(|c| c.as_str())
            .unwrap_or_default()
            .to_string();
        if column_name.is_empty() {
            continue;
        }
        let test_type = node
            .get("test_metadata")
            .and_then(|m| m.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or("custom")
            .to_string();
        let depends_on_models = node
            .get("depends_on")
            .and_then(|d| d.get("nodes"))
            .and_then(|n| n.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str())
                    .filter(|s| s.starts_with("model."))
                    .map(|s| s.to_string())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        for model_id in depends_on_models {
            tests_by_model_column
                .entry((model_id, column_name.clone()))
                .or_default()
                .push(test_type.clone());
        }
    }

    let mut models: Vec<DbtModel> = nodes
        .iter()
        .filter(|(_, node)| node.get("resource_type").and_then(|r| r.as_str()) == Some("model"))
        .map(|(id, node)| {
            let name = node
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or_default()
                .to_string();
            let path = node
                .get("original_file_path")
                .and_then(|p| p.as_str())
                .unwrap_or_default()
                .to_string();
            let model_type = node
                .get("config")
                .and_then(|c| c.get("materialized"))
                .and_then(|m| m.as_str())
                .unwrap_or("view")
                .to_string();
            let description = node
                .get("description")
                .and_then(|d| d.as_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());

            let columns = node
                .get("columns")
                .and_then(|c| c.as_object())
                .map(|cols| {
                    cols.iter()
                        .map(|(col_name, col)| DbtColumn {
                            name: col_name.clone(),
                            data_type: col
                                .get("data_type")
                                .and_then(|d| d.as_str())
                                .unwrap_or("unknown")
                                .to_string(),
                            description: col
                                .get("description")
                                .and_then(|d| d.as_str())
                                .filter(|s| !s.is_empty())
                                .map(|s| s.to_string()),
                            tests: tests_by_model_column
                                .get(&(id.clone(), col_name.clone()))
                                .cloned()
                                .unwrap_or_default(),
                        })
                        .collect()
                })
                .unwrap_or_default();

            DbtModel {
                name,
                path,
                model_type,
                description,
                columns,
            }
        })
        .collect();

    models.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(models)
}

#[derive(Clone, Default)]
struct TestMeta {
    name: String,
    model: String,
    test_type: String,
}

/// Maps test unique_id -> (readable name, owning model name, test type).
fn parse_test_metadata(manifest_json: &str) -> Result<HashMap<String, TestMeta>, String> {
    let v: Value =
        serde_json::from_str(manifest_json).map_err(|e| format!("invalid manifest.json: {e}"))?;
    let nodes = v
        .get("nodes")
        .and_then(|n| n.as_object())
        .ok_or("manifest.json missing 'nodes'")?;

    let model_names: HashMap<String, String> = nodes
        .iter()
        .filter(|(_, node)| node.get("resource_type").and_then(|r| r.as_str()) == Some("model"))
        .filter_map(|(id, node)| {
            node.get("name")
                .and_then(|n| n.as_str())
                .map(|n| (id.clone(), n.to_string()))
        })
        .collect();

    let mut out = HashMap::new();
    for (id, node) in nodes.iter() {
        if node.get("resource_type").and_then(|r| r.as_str()) != Some("test") {
            continue;
        }
        let test_type = node
            .get("test_metadata")
            .and_then(|m| m.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or("custom")
            .to_string();
        let model = node
            .get("depends_on")
            .and_then(|d| d.get("nodes"))
            .and_then(|n| n.as_array())
            .and_then(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str())
                    .find(|s| s.starts_with("model."))
                    .and_then(|mid| model_names.get(mid).cloned())
            })
            .unwrap_or_default();
        let name = node
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or(id.as_str())
            .to_string();
        out.insert(
            id.clone(),
            TestMeta {
                name,
                model,
                test_type,
            },
        );
    }
    Ok(out)
}

/// Builds a JSON lineage graph `{ model, upstream, downstream }` from
/// manifest.json's `parent_map`/`child_map`, resolving unique_ids to names.
fn parse_lineage(manifest_json: &str, model_name: &str) -> Result<String, String> {
    let v: Value =
        serde_json::from_str(manifest_json).map_err(|e| format!("invalid manifest.json: {e}"))?;
    let nodes = v
        .get("nodes")
        .and_then(|n| n.as_object())
        .ok_or("manifest.json missing 'nodes'")?;

    let model_id = nodes
        .iter()
        .find(|(_, node)| {
            node.get("resource_type").and_then(|r| r.as_str()) == Some("model")
                && node.get("name").and_then(|n| n.as_str()) == Some(model_name)
        })
        .map(|(id, _)| id.clone())
        .ok_or_else(|| format!("model '{model_name}' not found in manifest.json"))?;

    let id_to_name = |id: &str| -> String {
        nodes
            .get(id)
            .and_then(|n| n.get("name"))
            .and_then(|n| n.as_str())
            .unwrap_or(id)
            .to_string()
    };

    let upstream: Vec<String> = v
        .get("parent_map")
        .and_then(|m| m.get(&model_id))
        .and_then(|a| a.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str())
                .map(id_to_name)
                .collect()
        })
        .unwrap_or_default();
    let downstream: Vec<String> = v
        .get("child_map")
        .and_then(|m| m.get(&model_id))
        .and_then(|a| a.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str())
                .map(id_to_name)
                .collect()
        })
        .unwrap_or_default();

    serde_json::to_string(&serde_json::json!({
        "model": model_name,
        "upstream": upstream,
        "downstream": downstream,
    }))
    .map_err(|e| format!("failed to serialize lineage graph: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A small, hand-written but structurally real dbt manifest.json:
    /// stg_users (staging model, 1 documented column with a `unique` test)
    /// feeding dim_users (downstream model).
    fn fixture_manifest() -> &'static str {
        r#"{
            "nodes": {
                "model.proj.stg_users": {
                    "resource_type": "model",
                    "name": "stg_users",
                    "original_file_path": "models/staging/stg_users.sql",
                    "description": "Staged raw users",
                    "config": {"materialized": "view"},
                    "columns": {
                        "user_id": {"name": "user_id", "data_type": "integer", "description": "Primary key"}
                    }
                },
                "model.proj.dim_users": {
                    "resource_type": "model",
                    "name": "dim_users",
                    "original_file_path": "models/marts/dim_users.sql",
                    "description": "",
                    "config": {"materialized": "table"},
                    "columns": {
                        "user_id": {"name": "user_id", "data_type": "integer", "description": ""}
                    }
                },
                "test.proj.unique_dim_users_user_id.abc123": {
                    "resource_type": "test",
                    "name": "unique_dim_users_user_id",
                    "column_name": "user_id",
                    "test_metadata": {"name": "unique"},
                    "depends_on": {"nodes": ["model.proj.dim_users"]}
                }
            },
            "parent_map": {
                "model.proj.dim_users": ["model.proj.stg_users"],
                "model.proj.stg_users": []
            },
            "child_map": {
                "model.proj.stg_users": ["model.proj.dim_users"],
                "model.proj.dim_users": []
            }
        }"#
    }

    fn fixture_run_results() -> &'static str {
        r#"{
            "elapsed_time": 12.5,
            "results": [
                {"unique_id": "model.proj.stg_users", "status": "success"},
                {"unique_id": "model.proj.dim_users", "status": "success"},
                {"unique_id": "test.proj.unique_dim_users_user_id.abc123", "status": "pass"}
            ]
        }"#
    }

    #[test]
    fn parses_models_and_links_column_tests() {
        let models = parse_models_from_manifest(fixture_manifest()).unwrap();
        assert_eq!(models.len(), 2);

        let dim_users = models.iter().find(|m| m.name == "dim_users").unwrap();
        assert_eq!(dim_users.model_type, "table");
        assert_eq!(dim_users.path, "models/marts/dim_users.sql");
        assert!(
            dim_users.description.is_none(),
            "empty description should map to None"
        );

        let user_id_col = dim_users
            .columns
            .iter()
            .find(|c| c.name == "user_id")
            .unwrap();
        assert_eq!(user_id_col.data_type, "integer");
        assert_eq!(user_id_col.tests, vec!["unique".to_string()]);

        let stg_users = models.iter().find(|m| m.name == "stg_users").unwrap();
        assert_eq!(stg_users.description.as_deref(), Some("Staged raw users"));
        // stg_users.user_id has no test node depending on it, so no tests linked.
        assert!(stg_users.columns[0].tests.is_empty());
    }

    #[test]
    fn parses_run_results_with_elapsed_time() {
        let parsed = parse_run_results(fixture_run_results()).unwrap();
        assert_eq!(parsed.results.len(), 3);
        assert_eq!(parsed.elapsed_seconds, 12.5);
        assert!(parsed
            .results
            .iter()
            .all(|r| r.status == "success" || r.status == "pass"));
    }

    #[test]
    fn parses_test_metadata_linking_model_and_type() {
        let metadata = parse_test_metadata(fixture_manifest()).unwrap();
        let meta = metadata
            .get("test.proj.unique_dim_users_user_id.abc123")
            .unwrap();
        assert_eq!(meta.model, "dim_users");
        assert_eq!(meta.test_type, "unique");
        assert_eq!(meta.name, "unique_dim_users_user_id");
    }

    #[test]
    fn builds_lineage_graph_for_downstream_model() {
        let lineage = parse_lineage(fixture_manifest(), "dim_users").unwrap();
        let v: Value = serde_json::from_str(&lineage).unwrap();
        assert_eq!(v["model"], "dim_users");
        assert_eq!(v["upstream"], serde_json::json!(["stg_users"]));
        assert_eq!(v["downstream"], serde_json::json!([]));
    }

    #[test]
    fn builds_lineage_graph_for_upstream_model() {
        let lineage = parse_lineage(fixture_manifest(), "stg_users").unwrap();
        let v: Value = serde_json::from_str(&lineage).unwrap();
        assert_eq!(v["upstream"], serde_json::json!([]));
        assert_eq!(v["downstream"], serde_json::json!(["dim_users"]));
    }

    #[test]
    fn lineage_errors_on_unknown_model() {
        let err = parse_lineage(fixture_manifest(), "nonexistent_model").unwrap_err();
        assert!(err.contains("nonexistent_model"));
    }

    #[test]
    fn rejects_malformed_manifest() {
        assert!(parse_models_from_manifest("not json").is_err());
        assert!(parse_run_results("{}").is_err()); // missing 'results'
    }

    fn test_project() -> DbtProject {
        DbtProject {
            name: "proj".to_string(),
            path: "/tmp/nonexistent-dbt-project".to_string(),
            profiles_dir: "/tmp".to_string(),
            target: "dev".to_string(),
        }
    }

    // ---- Real dbt CLI integration tests ---------------------------------
    //
    // Mirrors docker_executor.rs: skip (not fail) when the real `dbt`
    // binary isn't on PATH, so `cargo test` stays green without it.

    #[tokio::test]
    async fn dbt_not_installed_produces_clear_error() {
        let manager = DbtManager::new(test_project());
        if manager.dbt_available().await {
            eprintln!("SKIP dbt_not_installed_produces_clear_error: dbt IS available");
            return;
        }
        let err = manager.list_models().await.unwrap_err();
        assert!(
            err.contains("dbt") || err.contains("is dbt installed"),
            "expected a clear 'dbt not found' style error, got: {err}"
        );
    }
}
