use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AirflowDag {
    pub dag_id: String,
    pub description: Option<String>,
    pub schedule_interval: String,
    pub owner: String,
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AirflowTask {
    pub task_id: String,
    pub task_type: String,
    pub description: Option<String>,
    pub upstream_tasks: Vec<String>,
    pub downstream_tasks: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DagRun {
    pub run_id: String,
    pub dag_id: String,
    pub status: String,
    pub execution_date: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub duration_seconds: Option<f32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TaskInstance {
    pub task_id: String,
    pub dag_id: String,
    pub execution_date: String,
    pub status: String,
    pub duration_seconds: Option<f32>,
    pub log_url: Option<String>,
}

pub struct AirflowManager {
    pub airflow_url: String,
    pub api_token: Option<String>,
    /// Local path to Airflow's DAGs folder, if this backend has filesystem
    /// access to it. Airflow's REST API has no "create DAG" endpoint -- DAGs
    /// are Python files the scheduler parses from disk -- so `create_dag`
    /// can only really act when this is set.
    pub dags_folder: Option<String>,
}

impl AirflowManager {
    pub fn new(airflow_url: String, api_token: Option<String>) -> Self {
        Self {
            airflow_url,
            api_token,
            dags_folder: None,
        }
    }

    pub fn with_dags_folder(mut self, dags_folder: String) -> Self {
        self.dags_folder = Some(dags_folder);
        self
    }

    fn request(
        &self,
        client: &reqwest::Client,
        method: reqwest::Method,
        path: &str,
    ) -> reqwest::RequestBuilder {
        let url = format!("{}/api/v1{path}", self.airflow_url.trim_end_matches('/'));
        let mut req = client.request(method, url);
        if let Some(token) = &self.api_token {
            req = req.bearer_auth(token);
        }
        req
    }

    /// Airflow's REST API doesn't support creating a DAG -- DAGs are Python
    /// files the scheduler discovers from disk, not API-managed resources.
    /// The honest real implementation is to write the generated DAG file to
    /// a configured local dags folder (if this backend has filesystem access
    /// to it); without one, this returns a clear error explaining the
    /// constraint instead of pretending the API call succeeded.
    pub async fn create_dag(&self, dag: AirflowDag) -> Result<String, String> {
        let dags_folder = self.dags_folder.as_deref().ok_or_else(|| {
            "Airflow has no REST endpoint to create a DAG (DAGs are Python files scanned from disk, not an API resource). \
             Configure AirflowManager::with_dags_folder to have PrismNote write the generated DAG file there instead."
                .to_string()
        })?;

        let file_path = std::path::Path::new(dags_folder).join(format!("{}.py", dag.dag_id));
        let contents = Self::generate_python_dag(&dag.dag_id);
        std::fs::write(&file_path, contents)
            .map_err(|e| format!("failed to write DAG file to {}: {e}", file_path.display()))?;

        Ok(format!("DAG file written to {}", file_path.display()))
    }

    pub async fn list_dags(&self) -> Result<Vec<AirflowDag>, String> {
        let client = reqwest::Client::new();
        let resp = self
            .request(&client, reqwest::Method::GET, "/dags")
            .send()
            .await
            .map_err(|e| format!("Airflow list DAGs request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Airflow list DAGs failed ({status}): {body}"));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Airflow list DAGs response: {e}"))?;
        Ok(parse_dags(&json))
    }

    pub async fn trigger_dag(&self, dag_id: &str) -> Result<DagRun, String> {
        let client = reqwest::Client::new();
        let resp = self
            .request(
                &client,
                reqwest::Method::POST,
                &format!("/dags/{dag_id}/dagRuns"),
            )
            .json(&serde_json::json!({}))
            .send()
            .await
            .map_err(|e| format!("Airflow trigger DAG request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Airflow trigger of '{dag_id}' failed ({status}): {body}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Airflow trigger response: {e}"))?;
        Ok(parse_dag_run(&json, dag_id))
    }

    pub async fn get_dag_run_status(&self, dag_id: &str, run_id: &str) -> Result<DagRun, String> {
        let client = reqwest::Client::new();
        let resp = self
            .request(
                &client,
                reqwest::Method::GET,
                &format!("/dags/{dag_id}/dagRuns/{run_id}"),
            )
            .send()
            .await
            .map_err(|e| format!("Airflow get DAG run status request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Airflow get run status for '{dag_id}/{run_id}' failed ({status}): {body}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Airflow DAG run response: {e}"))?;
        Ok(parse_dag_run(&json, dag_id))
    }

    pub async fn list_tasks(&self, dag_id: &str) -> Result<Vec<AirflowTask>, String> {
        let client = reqwest::Client::new();
        let resp = self
            .request(
                &client,
                reqwest::Method::GET,
                &format!("/dags/{dag_id}/tasks"),
            )
            .send()
            .await
            .map_err(|e| format!("Airflow list tasks request failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Airflow list tasks for '{dag_id}' failed ({status}): {body}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Airflow list tasks response: {e}"))?;
        Ok(parse_tasks(&json))
    }

    pub fn generate_python_dag(dag_name: &str) -> String {
        format!(
            r#"from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {{
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['airflow@example.com'],
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}}

dag = DAG(
    '{}',
    default_args=default_args,
    description='A PrismNote-generated DAG',
    schedule_interval='@daily',
    catchup=False,
)

def extract():
    '''Extract data from source'''
    pass

def transform():
    '''Transform data'''
    pass

def load():
    '''Load data to destination'''
    pass

# Define tasks
extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract,
    dag=dag,
)

transform_task = PythonOperator(
    task_id='transform',
    python_callable=transform,
    dag=dag,
)

load_task = PythonOperator(
    task_id='load',
    python_callable=load,
    dag=dag,
)

# Set dependencies
extract_task >> transform_task >> load_task
"#,
            dag_name
        )
    }

    pub fn generate_docker_compose_airflow() -> String {
        r#"version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: airflow
      POSTGRES_PASSWORD: airflow
      POSTGRES_DB: airflow
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  airflow-webserver:
    image: apache/airflow:latest
    command: webserver
    environment:
      AIRFLOW__CORE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
      AIRFLOW__CORE__EXECUTOR: LocalExecutor
      AIRFLOW__CORE__LOAD_EXAMPLES: 'false'
    ports:
      - "8080:8080"
    volumes:
      - ./dags:/opt/airflow/dags
      - ./logs:/opt/airflow/logs
      - ./plugins:/opt/airflow/plugins
    depends_on:
      - postgres
    restart: unless-stopped

  airflow-scheduler:
    image: apache/airflow:latest
    command: scheduler
    environment:
      AIRFLOW__CORE__SQL_ALCHEMY_CONN: postgresql+psycopg2://airflow:airflow@postgres:5432/airflow
      AIRFLOW__CORE__EXECUTOR: LocalExecutor
      AIRFLOW__CORE__LOAD_EXAMPLES: 'false'
    volumes:
      - ./dags:/opt/airflow/dags
      - ./logs:/opt/airflow/logs
      - ./plugins:/opt/airflow/plugins
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
"#
        .to_string()
    }
}

fn parse_dags(json: &Value) -> Vec<AirflowDag> {
    json.get("dags")
        .and_then(|d| d.as_array())
        .map(|dags| {
            dags.iter()
                .map(|d| AirflowDag {
                    dag_id: d
                        .get("dag_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                    description: d
                        .get("description")
                        .and_then(|v| v.as_str())
                        .map(String::from),
                    schedule_interval: schedule_interval_string(d),
                    owner: d
                        .get("owners")
                        .and_then(|o| o.as_array())
                        .and_then(|o| o.first())
                        .and_then(|o| o.as_str())
                        .unwrap_or("airflow")
                        .to_string(),
                    tags: d
                        .get("tags")
                        .and_then(|t| t.as_array())
                        .map(|tags| {
                            tags.iter()
                                .filter_map(|t| {
                                    t.get("name").and_then(|n| n.as_str()).map(String::from)
                                })
                                .collect()
                        })
                        .unwrap_or_default(),
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Airflow 2.7+ represents `schedule_interval` as either a plain string
/// (`"@daily"`), a cron-expression object (`{"__type": "CronExpression",
/// "value": "0 0 * * *"}`), or `null`. Handle all three rather than
/// assuming the pre-2.7 plain-string shape.
fn schedule_interval_string(dag: &Value) -> String {
    match dag.get("schedule_interval") {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Object(_)) => dag["schedule_interval"]["value"]
            .as_str()
            .unwrap_or("unknown")
            .to_string(),
        _ => "None".to_string(),
    }
}

fn parse_dag_run(json: &Value, fallback_dag_id: &str) -> DagRun {
    let start = json.get("start_date").and_then(|v| v.as_str());
    let end = json.get("end_date").and_then(|v| v.as_str());
    let duration_seconds = match (start, end) {
        (Some(s), Some(e)) => {
            match (
                chrono::DateTime::parse_from_rfc3339(s),
                chrono::DateTime::parse_from_rfc3339(e),
            ) {
                (Ok(s), Ok(e)) => Some((e - s).num_milliseconds() as f32 / 1000.0),
                _ => None,
            }
        }
        _ => None,
    };
    DagRun {
        run_id: json
            .get("dag_run_id")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        dag_id: json
            .get("dag_id")
            .and_then(|v| v.as_str())
            .unwrap_or(fallback_dag_id)
            .to_string(),
        status: json
            .get("state")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string(),
        execution_date: json
            .get("logical_date")
            .or_else(|| json.get("execution_date"))
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        start_date: start.map(String::from),
        end_date: end.map(String::from),
        duration_seconds,
    }
}

fn parse_tasks(json: &Value) -> Vec<AirflowTask> {
    json.get("tasks")
        .and_then(|t| t.as_array())
        .map(|tasks| {
            tasks
                .iter()
                .map(|t| AirflowTask {
                    task_id: t
                        .get("task_id")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                    task_type: t
                        .get("class_ref")
                        .and_then(|c| c.get("class_name"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown")
                        .to_string(),
                    description: t.get("doc_md").and_then(|v| v.as_str()).map(String::from),
                    upstream_tasks: string_array(t, "upstream_task_ids"),
                    downstream_tasks: string_array(t, "downstream_task_ids"),
                })
                .collect()
        })
        .unwrap_or_default()
}

fn string_array(value: &Value, field: &str) -> Vec<String> {
    value
        .get(field)
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manager(server_url: &str) -> AirflowManager {
        AirflowManager::new(server_url.to_string(), Some("test-token".to_string()))
    }

    #[tokio::test]
    async fn list_dags_parses_a_realistic_airflow_response() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());

        server
            .mock("GET", "/api/v1/dags")
            .match_header("authorization", "Bearer test-token")
            .with_status(200)
            .with_body(
                r#"{"dags": [{
                    "dag_id": "etl_pipeline",
                    "description": "Nightly ETL",
                    "schedule_interval": {"__type": "CronExpression", "value": "0 2 * * *"},
                    "owners": ["data-team"],
                    "tags": [{"name": "etl"}, {"name": "nightly"}]
                }]}"#,
            )
            .create_async()
            .await;

        let dags = mgr.list_dags().await.unwrap();
        assert_eq!(dags.len(), 1);
        assert_eq!(dags[0].dag_id, "etl_pipeline");
        assert_eq!(dags[0].schedule_interval, "0 2 * * *");
        assert_eq!(dags[0].owner, "data-team");
        assert_eq!(dags[0].tags, vec!["etl".to_string(), "nightly".to_string()]);
    }

    #[tokio::test]
    async fn list_dags_handles_plain_string_schedule_interval() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());

        server
            .mock("GET", "/api/v1/dags")
            .with_status(200)
            .with_body(r#"{"dags": [{"dag_id": "d1", "schedule_interval": "@daily", "owners": [], "tags": []}]}"#)
            .create_async()
            .await;

        let dags = mgr.list_dags().await.unwrap();
        assert_eq!(dags[0].schedule_interval, "@daily");
    }

    #[tokio::test]
    async fn trigger_dag_parses_run_id_and_state() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());

        server
            .mock("POST", "/api/v1/dags/etl_pipeline/dagRuns")
            .with_status(200)
            .with_body(
                r#"{"dag_run_id": "manual__2026-01-01", "dag_id": "etl_pipeline", "state": "queued", "logical_date": "2026-01-01T00:00:00+00:00"}"#,
            )
            .create_async()
            .await;

        let run = mgr.trigger_dag("etl_pipeline").await.unwrap();
        assert_eq!(run.run_id, "manual__2026-01-01");
        assert_eq!(run.status, "queued");
        assert_eq!(run.execution_date, "2026-01-01T00:00:00+00:00");
    }

    #[tokio::test]
    async fn get_dag_run_status_computes_duration_from_start_and_end() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());

        server
            .mock("GET", "/api/v1/dags/etl_pipeline/dagRuns/run_1")
            .with_status(200)
            .with_body(
                r#"{
                    "dag_run_id": "run_1",
                    "dag_id": "etl_pipeline",
                    "state": "success",
                    "logical_date": "2026-01-01T00:00:00+00:00",
                    "start_date": "2026-01-01T00:00:00+00:00",
                    "end_date": "2026-01-01T00:02:00+00:00"
                }"#,
            )
            .create_async()
            .await;

        let run = mgr
            .get_dag_run_status("etl_pipeline", "run_1")
            .await
            .unwrap();
        assert_eq!(run.status, "success");
        assert_eq!(run.duration_seconds, Some(120.0));
    }

    #[tokio::test]
    async fn list_tasks_extracts_class_name_and_dependencies() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());

        server
            .mock("GET", "/api/v1/dags/etl_pipeline/tasks")
            .with_status(200)
            .with_body(
                r#"{"tasks": [{
                    "task_id": "extract",
                    "class_ref": {"module_path": "airflow.operators.python", "class_name": "PythonOperator"},
                    "downstream_task_ids": ["transform"],
                    "upstream_task_ids": []
                }]}"#,
            )
            .create_async()
            .await;

        let tasks = mgr.list_tasks("etl_pipeline").await.unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].task_type, "PythonOperator");
        assert_eq!(tasks[0].downstream_tasks, vec!["transform".to_string()]);
    }

    #[tokio::test]
    async fn http_error_status_is_surfaced_not_silently_swallowed() {
        let mut server = mockito::Server::new_async().await;
        let mgr = manager(&server.url());
        server
            .mock("GET", "/api/v1/dags")
            .with_status(401)
            .with_body(r#"{"detail": "Unauthorized"}"#)
            .create_async()
            .await;

        let err = mgr.list_dags().await.unwrap_err();
        assert!(err.contains("401"));
    }

    #[tokio::test]
    async fn create_dag_without_dags_folder_is_a_clear_error_not_a_fake_success() {
        let mgr = AirflowManager::new("http://unused".to_string(), None);
        let dag = AirflowDag {
            dag_id: "new_dag".to_string(),
            description: None,
            schedule_interval: "@daily".to_string(),
            owner: "airflow".to_string(),
            tags: vec![],
        };
        let err = mgr.create_dag(dag).await.unwrap_err();
        assert!(err.contains("Python files"));
    }

    #[tokio::test]
    async fn create_dag_with_dags_folder_writes_a_real_python_file() {
        let dir = tempfile::tempdir().unwrap();
        let mgr = AirflowManager::new("http://unused".to_string(), None)
            .with_dags_folder(dir.path().to_string_lossy().to_string());
        let dag = AirflowDag {
            dag_id: "new_dag".to_string(),
            description: None,
            schedule_interval: "@daily".to_string(),
            owner: "airflow".to_string(),
            tags: vec![],
        };

        let result = mgr.create_dag(dag).await.unwrap();
        assert!(result.contains("new_dag.py"));

        let written = std::fs::read_to_string(dir.path().join("new_dag.py")).unwrap();
        assert!(written.contains("DAG("));
        assert!(written.contains("'new_dag'"));
    }
}
