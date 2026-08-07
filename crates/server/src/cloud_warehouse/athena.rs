//! Amazon Athena connector, using the JSON 1.1 API directly (StartQueryExecution
//! / GetQueryExecution / GetQueryResults) signed with our own SigV4
//! implementation (`sigv4.rs`) rather than pulling in the full AWS SDK.

use super::sigv4::{sign, SigV4Credentials};
use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use serde_json::json;
use std::time::Duration;

const POLL_INTERVAL: Duration = Duration::from_millis(500);
const MAX_POLL_ATTEMPTS: u32 = 60; // 30s max wait

#[derive(Debug)]
struct AthenaCreds {
    access_key_id: String,
    secret_access_key: String,
    session_token: Option<String>,
}

fn extract_creds(conn: &CloudWarehouseConnection) -> Result<AthenaCreds> {
    let access_key_id = conn
        .credentials
        .get("aws_access_key_id")
        .cloned()
        .ok_or_else(|| anyhow!("Athena connection is missing credentials.aws_access_key_id"))?;
    let secret_access_key = conn
        .credentials
        .get("aws_secret_access_key")
        .cloned()
        .ok_or_else(|| anyhow!("Athena connection is missing credentials.aws_secret_access_key"))?;
    let session_token = conn.credentials.get("aws_session_token").cloned();
    Ok(AthenaCreds { access_key_id, secret_access_key, session_token })
}

fn region(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.region.as_deref().ok_or_else(|| anyhow!("Athena connection is missing a region"))
}

fn output_location(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.credentials.get("s3_output_location").map(String::as_str).ok_or_else(|| {
        anyhow!("Athena connection is missing credentials.s3_output_location (an s3:// URI Athena writes results to)")
    })
}

/// `base_url` is the full scheme+host to send the request to (e.g.
/// `https://athena.us-east-1.amazonaws.com` in production, or a mockito
/// `http://127.0.0.1:PORT` URL in tests). SigV4 always signs the bare
/// hostname (without scheme), per spec, regardless of which scheme the
/// request is actually sent over.
async fn call(
    client: &reqwest::Client,
    conn: &CloudWarehouseConnection,
    target: &str,
    body: serde_json::Value,
    base_url: &str,
) -> Result<serde_json::Value> {
    let creds = extract_creds(conn)?;
    let reg = region(conn)?;
    let host = base_url.trim_start_matches("https://").trim_start_matches("http://").trim_end_matches('/');
    let url = format!("{base_url}/");
    let body_bytes = serde_json::to_vec(&body)?;

    let sigv4_creds = SigV4Credentials {
        access_key_id: &creds.access_key_id,
        secret_access_key: &creds.secret_access_key,
        session_token: creds.session_token.as_deref(),
        region: reg,
        service: "athena",
    };

    let signed = sign(
        "POST",
        host,
        "/",
        "",
        &[("content-type", "application/x-amz-json-1.1"), ("x-amz-target", target)],
        &body_bytes,
        &sigv4_creds,
        Utc::now(),
    );

    let mut request = client
        .post(&url)
        .header("Content-Type", "application/x-amz-json-1.1")
        .header("X-Amz-Target", target)
        .body(body_bytes);
    for (k, v) in &signed.headers {
        request = request.header(k, v);
    }

    let response = request.send().await.context("Athena request failed")?;
    let status = response.status();
    let text = response.text().await.context("failed to read Athena response body")?;
    if !status.is_success() {
        return Err(anyhow!("Athena API returned {status}: {text}"));
    }
    serde_json::from_str(&text).context("failed to parse Athena response as JSON")
}

fn production_base_url(conn: &CloudWarehouseConnection) -> Result<String> {
    Ok(format!("https://athena.{}.amazonaws.com", region(conn)?))
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    let client = reqwest::Client::new();
    let base_url = production_base_url(conn)?;
    // ListDataCatalogs is a cheap, read-only call suitable for a connectivity check.
    call(&client, conn, "AmazonAthena.ListDataCatalogs", json!({"MaxResults": 1}), &base_url).await?;
    Ok("Athena connection OK".to_string())
}

pub async fn execute_query(conn: &CloudWarehouseConnection, query: &str) -> Result<CloudQueryResult> {
    execute_query_against(conn, query, &production_base_url(conn)?).await
}

async fn execute_query_against(
    conn: &CloudWarehouseConnection,
    query: &str,
    base_url: &str,
) -> Result<CloudQueryResult> {
    let client = reqwest::Client::new();
    let started = std::time::Instant::now();

    let start_body = json!({
        "QueryString": query,
        "QueryExecutionContext": { "Database": conn.database },
        "ResultConfiguration": { "OutputLocation": output_location(conn)? },
    });
    let start_resp = call(&client, conn, "AmazonAthena.StartQueryExecution", start_body, base_url).await?;
    let query_execution_id = start_resp
        .get("QueryExecutionId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow!("Athena StartQueryExecution response missing QueryExecutionId"))?
        .to_string();

    let mut bytes_scanned = 0u64;
    let mut engine_ms = 0u64;
    let mut completed = false;
    for _ in 0..MAX_POLL_ATTEMPTS {
        let exec = call(
            &client,
            conn,
            "AmazonAthena.GetQueryExecution",
            json!({"QueryExecutionId": query_execution_id}),
            base_url,
        )
        .await?;
        let state = exec["QueryExecution"]["Status"]["State"].as_str().unwrap_or("UNKNOWN").to_string();
        match state.as_str() {
            "SUCCEEDED" => {
                bytes_scanned = exec["QueryExecution"]["Statistics"]["DataScannedInBytes"].as_u64().unwrap_or(0);
                engine_ms =
                    exec["QueryExecution"]["Statistics"]["EngineExecutionTimeInMillis"].as_u64().unwrap_or(0);
                completed = true;
                break;
            }
            "FAILED" | "CANCELLED" => {
                let reason =
                    exec["QueryExecution"]["Status"]["StateChangeReason"].as_str().unwrap_or("no reason given");
                return Err(anyhow!("Athena query {state}: {reason}"));
            }
            _ => tokio::time::sleep(POLL_INTERVAL).await,
        }
    }
    if !completed {
        return Err(anyhow!("Athena query {query_execution_id} did not complete within the poll window"));
    }

    let results = call(
        &client,
        conn,
        "AmazonAthena.GetQueryResults",
        json!({"QueryExecutionId": query_execution_id}),
        base_url,
    )
    .await?;

    let rows_json = results["ResultSet"]["Rows"].as_array().cloned().unwrap_or_default();
    let mut all_rows: Vec<Vec<serde_json::Value>> = rows_json
        .iter()
        .map(|row| {
            row["Data"]
                .as_array()
                .map(|cells| {
                    cells.iter().map(|cell| cell.get("VarCharValue").cloned().unwrap_or(serde_json::Value::Null)).collect()
                })
                .unwrap_or_default()
        })
        .collect();

    let columns: Vec<String> = results["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]
        .as_array()
        .map(|cols| cols.iter().filter_map(|c| c["Name"].as_str().map(String::from)).collect())
        .unwrap_or_default();

    // Athena's first result row is the header row (repeats the column names as
    // string values), not data — drop it if present.
    if !all_rows.is_empty() {
        let header_matches =
            all_rows[0].iter().zip(columns.iter()).all(|(cell, name)| cell.as_str() == Some(name.as_str()));
        if header_matches {
            all_rows.remove(0);
        }
    }

    let cost_per_tb = 5.0; // Athena: $5 per TB scanned (standard pricing)
    let estimated_cost_usd = (bytes_scanned as f64 / 1_099_511_627_776.0) * cost_per_tb;

    Ok(CloudQueryResult {
        row_count: all_rows.len(),
        columns,
        rows: all_rows,
        execution_time_ms: if engine_ms > 0 { engine_ms } else { started.elapsed().as_millis() as u64 },
        estimated_bytes_scanned: bytes_scanned,
        estimated_cost_usd,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn() -> CloudWarehouseConnection {
        let mut credentials = HashMap::new();
        credentials.insert("aws_access_key_id".to_string(), "AKIDEXAMPLE".to_string());
        credentials.insert("aws_secret_access_key".to_string(), "secret".to_string());
        credentials.insert("s3_output_location".to_string(), "s3://test-bucket/results/".to_string());
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::Athena,
            name: "test athena".to_string(),
            host: None,
            port: None,
            database: "default".to_string(),
            username: String::new(),
            password: String::new(),
            credentials,
            region: Some("us-east-1".to_string()),
            project_id: None,
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn missing_credentials_produce_a_clear_error_not_a_panic() {
        let mut conn = test_conn();
        conn.credentials.remove("aws_access_key_id");
        let err = extract_creds(&conn).unwrap_err();
        assert!(err.to_string().contains("aws_access_key_id"));
    }

    #[test]
    fn missing_output_location_is_a_clear_error() {
        let mut conn = test_conn();
        conn.credentials.remove("s3_output_location");
        let err = output_location(&conn).unwrap_err();
        assert!(err.to_string().contains("s3_output_location"));
    }

    #[tokio::test]
    async fn execute_query_parses_a_realistic_athena_response_and_strips_header_row() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn();

        let start_mock = server
            .mock("POST", "/")
            .match_header("x-amz-target", "AmazonAthena.StartQueryExecution")
            .with_status(200)
            .with_body(r#"{"QueryExecutionId": "abc-123"}"#)
            .create_async()
            .await;

        let get_exec_mock = server
            .mock("POST", "/")
            .match_header("x-amz-target", "AmazonAthena.GetQueryExecution")
            .with_status(200)
            .with_body(
                r#"{"QueryExecution": {"Status": {"State": "SUCCEEDED"}, "Statistics": {"DataScannedInBytes": 2048, "EngineExecutionTimeInMillis": 120}}}"#,
            )
            .create_async()
            .await;

        let get_results_mock = server
            .mock("POST", "/")
            .match_header("x-amz-target", "AmazonAthena.GetQueryResults")
            .with_status(200)
            .with_body(
                r#"{
                    "ResultSet": {
                        "ResultSetMetadata": {"ColumnInfo": [{"Name": "id"}, {"Name": "name"}]},
                        "Rows": [
                            {"Data": [{"VarCharValue": "id"}, {"VarCharValue": "name"}]},
                            {"Data": [{"VarCharValue": "1"}, {"VarCharValue": "alice"}]},
                            {"Data": [{"VarCharValue": "2"}, {"VarCharValue": "bob"}]}
                        ]
                    }
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query_against(&conn, "SELECT * FROM t", &server.url()).await.unwrap();

        start_mock.assert_async().await;
        get_exec_mock.assert_async().await;
        get_results_mock.assert_async().await;

        assert_eq!(result.columns, vec!["id".to_string(), "name".to_string()]);
        assert_eq!(result.row_count, 2); // header row stripped
        assert_eq!(result.rows[0][1], serde_json::json!("alice"));
        assert_eq!(result.estimated_bytes_scanned, 2048);
        assert!(result.estimated_cost_usd > 0.0);
    }

    #[tokio::test]
    async fn failed_query_surfaces_the_state_change_reason() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn();

        server
            .mock("POST", "/")
            .match_header("x-amz-target", "AmazonAthena.StartQueryExecution")
            .with_status(200)
            .with_body(r#"{"QueryExecutionId": "abc-123"}"#)
            .create_async()
            .await;
        server
            .mock("POST", "/")
            .match_header("x-amz-target", "AmazonAthena.GetQueryExecution")
            .with_status(200)
            .with_body(
                r#"{"QueryExecution": {"Status": {"State": "FAILED", "StateChangeReason": "SYNTAX_ERROR: line 1"}}}"#,
            )
            .create_async()
            .await;

        let err = execute_query_against(&conn, "SELECT bad syntax", &server.url()).await.unwrap_err();
        assert!(err.to_string().contains("SYNTAX_ERROR"));
    }
}
