//! Google BigQuery connector using the REST API v2 `jobs/query` endpoint
//! (cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query).
//! Auth is a bearer OAuth2 access token supplied by the caller via
//! `credentials.access_token` — obtaining/refreshing that token (e.g. via a
//! service-account JWT exchange) is left to whatever calls this connector,
//! since PrismNote doesn't currently store GCP service-account keys anywhere.

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};

fn access_token(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.credentials
        .get("access_token")
        .map(String::as_str)
        .ok_or_else(|| anyhow!("BigQuery connection is missing credentials.access_token"))
}

fn project_id(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.project_id
        .as_deref()
        .ok_or_else(|| anyhow!("BigQuery connection is missing project_id"))
}

fn base_url(conn: &CloudWarehouseConnection) -> String {
    conn.host
        .clone()
        .unwrap_or_else(|| "https://bigquery.googleapis.com".to_string())
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bigquery/v2/projects/{}/datasets?maxResults=1",
        base_url(conn),
        project_id(conn)?
    );
    let response = client
        .get(&url)
        .bearer_auth(access_token(conn)?)
        .send()
        .await
        .context("BigQuery connectivity check failed")?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(anyhow!("BigQuery API returned {status}: {text}"));
    }
    Ok("BigQuery connection OK".to_string())
}

pub async fn execute_query(
    conn: &CloudWarehouseConnection,
    query: &str,
) -> Result<CloudQueryResult> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/bigquery/v2/projects/{}/queries",
        base_url(conn),
        project_id(conn)?
    );

    let body = json!({
        "query": query,
        "useLegacySql": false,
        "timeoutMs": conn.timeout_seconds.saturating_mul(1000),
    });

    let started = std::time::Instant::now();
    let response = client
        .post(&url)
        .bearer_auth(access_token(conn)?)
        .json(&body)
        .send()
        .await
        .context("BigQuery query request failed")?;

    let status = response.status();
    let text = response
        .text()
        .await
        .context("failed to read BigQuery response body")?;
    if !status.is_success() {
        return Err(anyhow!("BigQuery API returned {status}: {text}"));
    }
    let parsed: Value =
        serde_json::from_str(&text).context("failed to parse BigQuery response as JSON")?;

    if let Some(errors) = parsed.get("errors").and_then(|e| e.as_array()) {
        if !errors.is_empty() {
            let messages: Vec<String> = errors
                .iter()
                .filter_map(|e| e["message"].as_str().map(String::from))
                .collect();
            return Err(anyhow!("BigQuery query error: {}", messages.join("; ")));
        }
    }
    if parsed.get("jobComplete").and_then(|v| v.as_bool()) == Some(false) {
        return Err(anyhow!(
            "BigQuery query did not complete synchronously within timeoutMs; polling getQueryResults is not yet implemented"
        ));
    }

    let columns: Vec<String> = parsed["schema"]["fields"]
        .as_array()
        .map(|fields| {
            fields
                .iter()
                .filter_map(|f| f["name"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let rows: Vec<Vec<Value>> = parsed["rows"]
        .as_array()
        .map(|rows| {
            rows.iter()
                .map(|row| {
                    row["f"]
                        .as_array()
                        .map(|cells| cells.iter().map(|c| c["v"].clone()).collect())
                        .unwrap_or_default()
                })
                .collect()
        })
        .unwrap_or_default();

    let bytes_processed: u64 = parsed["totalBytesProcessed"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let cost_per_tb = 6.25; // BigQuery on-demand pricing: $6.25/TB as of this writing
    let estimated_cost_usd = (bytes_processed as f64 / 1_099_511_627_776.0) * cost_per_tb;

    Ok(CloudQueryResult {
        row_count: rows.len(),
        columns,
        rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        estimated_bytes_scanned: bytes_processed,
        estimated_cost_usd,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn(server_url: &str) -> CloudWarehouseConnection {
        let mut credentials = HashMap::new();
        credentials.insert("access_token".to_string(), "ya29.test-token".to_string());
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::BigQuery,
            name: "test bq".to_string(),
            host: Some(server_url.to_string()),
            port: None,
            database: "my_dataset".to_string(),
            username: String::new(),
            password: String::new(),
            credentials,
            region: None,
            project_id: Some("my-project".to_string()),
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn missing_access_token_is_a_clear_error() {
        let mut conn = test_conn("http://unused");
        conn.credentials.remove("access_token");
        assert!(access_token(&conn)
            .unwrap_err()
            .to_string()
            .contains("access_token"));
    }

    #[tokio::test]
    async fn execute_query_parses_columns_and_rows_from_a_realistic_response() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        let mock = server
            .mock("POST", "/bigquery/v2/projects/my-project/queries")
            .match_header("authorization", "Bearer ya29.test-token")
            .with_status(200)
            .with_body(
                r#"{
                    "jobComplete": true,
                    "totalBytesProcessed": "104857600",
                    "schema": {"fields": [{"name": "id", "type": "INTEGER"}, {"name": "email", "type": "STRING"}]},
                    "rows": [
                        {"f": [{"v": "1"}, {"v": "a@example.com"}]},
                        {"f": [{"v": "2"}, {"v": "b@example.com"}]}
                    ]
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query(&conn, "SELECT id, email FROM users")
            .await
            .unwrap();
        mock.assert_async().await;

        assert_eq!(result.columns, vec!["id".to_string(), "email".to_string()]);
        assert_eq!(result.row_count, 2);
        assert_eq!(result.rows[1][1], serde_json::json!("b@example.com"));
        assert_eq!(result.estimated_bytes_scanned, 104_857_600);
        assert!(result.estimated_cost_usd > 0.0);
    }

    #[tokio::test]
    async fn query_error_response_surfaces_the_bigquery_message() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        server
            .mock("POST", "/bigquery/v2/projects/my-project/queries")
            .with_status(200)
            .with_body(r#"{"errors": [{"message": "Table not found: users"}]}"#)
            .create_async()
            .await;

        let err = execute_query(&conn, "SELECT * FROM users")
            .await
            .unwrap_err();
        assert!(err.to_string().contains("Table not found"));
    }

    #[tokio::test]
    async fn http_error_status_is_surfaced_not_silently_swallowed() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        server
            .mock("POST", "/bigquery/v2/projects/my-project/queries")
            .with_status(401)
            .with_body(r#"{"error": {"message": "Invalid Credentials"}}"#)
            .create_async()
            .await;

        let err = execute_query(&conn, "SELECT 1").await.unwrap_err();
        assert!(err.to_string().contains("401"));
    }
}
