//! Databricks connector using the SQL Statement Execution REST API
//! (docs.databricks.com/api/workspace/statementexecution/executestatement).
//! Auth is a personal access token (PAT) as a bearer token.

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};
use std::time::Duration;

const POLL_INTERVAL: Duration = Duration::from_millis(500);
const MAX_POLL_ATTEMPTS: u32 = 60;

fn token(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.credentials
        .get("access_token")
        .map(String::as_str)
        .or((!conn.password.is_empty()).then_some(conn.password.as_str()))
        .ok_or_else(|| anyhow!("Databricks connection is missing a personal access token (credentials.access_token or password)"))
}

fn warehouse_id(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.warehouse_id
        .as_deref()
        .ok_or_else(|| anyhow!("Databricks connection is missing warehouse_id"))
}

fn base_url(conn: &CloudWarehouseConnection) -> Result<String> {
    conn.host
        .clone()
        .ok_or_else(|| anyhow!("Databricks connection is missing host (the workspace URL)"))
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/2.0/sql/warehouses/{}",
        base_url(conn)?,
        warehouse_id(conn)?
    );
    let response = client
        .get(&url)
        .bearer_auth(token(conn)?)
        .send()
        .await
        .context("Databricks connectivity check failed")?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(anyhow!("Databricks API returned {status}: {text}"));
    }
    Ok("Databricks connection OK".to_string())
}

pub async fn execute_query(
    conn: &CloudWarehouseConnection,
    query: &str,
) -> Result<CloudQueryResult> {
    execute_query_against(conn, query, &base_url(conn)?).await
}

async fn execute_query_against(
    conn: &CloudWarehouseConnection,
    query: &str,
    base_url: &str,
) -> Result<CloudQueryResult> {
    let client = reqwest::Client::new();
    let started = std::time::Instant::now();
    let statements_url = format!("{base_url}/api/2.0/sql/statements");

    let body = json!({
        "statement": query,
        "warehouse_id": warehouse_id(conn)?,
        "catalog": conn.database,
        "wait_timeout": "0s", // always poll ourselves rather than long-poll server-side
    });

    let response = client
        .post(&statements_url)
        .bearer_auth(token(conn)?)
        .json(&body)
        .send()
        .await
        .context("Databricks statement submission failed")?;
    let status = response.status();
    let text = response
        .text()
        .await
        .context("failed to read Databricks response body")?;
    if !status.is_success() {
        return Err(anyhow!("Databricks API returned {status}: {text}"));
    }
    let mut parsed: Value =
        serde_json::from_str(&text).context("failed to parse Databricks response as JSON")?;

    let statement_id = parsed["statement_id"]
        .as_str()
        .ok_or_else(|| anyhow!("Databricks response missing statement_id"))?
        .to_string();

    let mut state = parsed["status"]["state"]
        .as_str()
        .unwrap_or("PENDING")
        .to_string();
    let mut attempts = 0;
    while matches!(state.as_str(), "PENDING" | "RUNNING") && attempts < MAX_POLL_ATTEMPTS {
        tokio::time::sleep(POLL_INTERVAL).await;
        let poll_url = format!("{base_url}/api/2.0/sql/statements/{statement_id}");
        let poll_resp = client
            .get(&poll_url)
            .bearer_auth(token(conn)?)
            .send()
            .await
            .context("Databricks poll failed")?;
        let poll_text = poll_resp
            .text()
            .await
            .context("failed to read Databricks poll response")?;
        parsed =
            serde_json::from_str(&poll_text).context("failed to parse Databricks poll response")?;
        state = parsed["status"]["state"]
            .as_str()
            .unwrap_or("UNKNOWN")
            .to_string();
        attempts += 1;
    }

    if state == "FAILED" {
        let message = parsed["status"]["error"]["message"]
            .as_str()
            .unwrap_or("no error message given");
        return Err(anyhow!("Databricks query failed: {message}"));
    }
    if state != "SUCCEEDED" {
        return Err(anyhow!(
            "Databricks query did not reach SUCCEEDED within the poll window (last state: {state})"
        ));
    }

    let columns: Vec<String> = parsed["manifest"]["schema"]["columns"]
        .as_array()
        .map(|cols| {
            cols.iter()
                .filter_map(|c| c["name"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let rows: Vec<Vec<Value>> = parsed["result"]["data_array"]
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|row| row.as_array().cloned().unwrap_or_default())
                .collect()
        })
        .unwrap_or_default();

    let bytes_scanned = 0u64; // Databricks doesn't return bytes-scanned in this API; not fabricating a number.

    Ok(CloudQueryResult {
        row_count: rows.len(),
        columns,
        rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        estimated_bytes_scanned: bytes_scanned,
        estimated_cost_usd: 0.0, // Databricks bills per-DBU on warehouse uptime, not per-query bytes; no meaningful per-query estimate here.
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn(server_url: &str) -> CloudWarehouseConnection {
        let mut credentials = HashMap::new();
        credentials.insert("access_token".to_string(), "dapi-test-token".to_string());
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::Databricks,
            name: "test databricks".to_string(),
            host: Some(server_url.to_string()),
            port: None,
            database: "main".to_string(),
            username: String::new(),
            password: String::new(),
            credentials,
            region: None,
            project_id: None,
            account_id: None,
            warehouse_id: Some("abc123".to_string()),
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn missing_token_is_a_clear_error() {
        let mut conn = test_conn("http://unused");
        conn.credentials.remove("access_token");
        assert!(token(&conn)
            .unwrap_err()
            .to_string()
            .contains("access token"));
    }

    #[test]
    fn password_field_is_accepted_as_a_pat_fallback() {
        let mut conn = test_conn("http://unused");
        conn.credentials.remove("access_token");
        conn.password = "dapi-from-password-field".to_string();
        assert_eq!(token(&conn).unwrap(), "dapi-from-password-field");
    }

    #[tokio::test]
    async fn execute_query_returns_immediately_when_already_succeeded() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        let mock = server
            .mock("POST", "/api/2.0/sql/statements")
            .match_header("authorization", "Bearer dapi-test-token")
            .with_status(200)
            .with_body(
                r#"{
                    "statement_id": "stmt-1",
                    "status": {"state": "SUCCEEDED"},
                    "manifest": {"schema": {"columns": [{"name": "id"}, {"name": "name"}]}},
                    "result": {"data_array": [["1", "alice"], ["2", "bob"]]}
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query_against(&conn, "SELECT * FROM t", &server.url())
            .await
            .unwrap();
        mock.assert_async().await;

        assert_eq!(result.columns, vec!["id".to_string(), "name".to_string()]);
        assert_eq!(result.row_count, 2);
        assert_eq!(result.rows[1][1], serde_json::json!("bob"));
    }

    #[tokio::test]
    async fn execute_query_polls_until_succeeded() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        server
            .mock("POST", "/api/2.0/sql/statements")
            .with_status(200)
            .with_body(r#"{"statement_id": "stmt-2", "status": {"state": "RUNNING"}}"#)
            .create_async()
            .await;
        server
            .mock("GET", "/api/2.0/sql/statements/stmt-2")
            .with_status(200)
            .with_body(
                r#"{
                    "statement_id": "stmt-2",
                    "status": {"state": "SUCCEEDED"},
                    "manifest": {"schema": {"columns": [{"name": "count"}]}},
                    "result": {"data_array": [["42"]]}
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query_against(&conn, "SELECT COUNT(*) FROM t", &server.url())
            .await
            .unwrap();
        assert_eq!(result.rows[0][0], serde_json::json!("42"));
    }

    #[tokio::test]
    async fn failed_query_surfaces_the_error_message() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        server
            .mock("POST", "/api/2.0/sql/statements")
            .with_status(200)
            .with_body(
                r#"{"statement_id": "stmt-3", "status": {"state": "FAILED", "error": {"message": "TABLE_OR_VIEW_NOT_FOUND"}}}"#,
            )
            .create_async()
            .await;

        let err = execute_query_against(&conn, "SELECT * FROM missing", &server.url())
            .await
            .unwrap_err();
        assert!(err.to_string().contains("TABLE_OR_VIEW_NOT_FOUND"));
    }
}
