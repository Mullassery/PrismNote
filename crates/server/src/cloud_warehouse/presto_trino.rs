//! Shared client for Presto and Trino, which use the same `/v1/statement`
//! REST protocol (Trino is the actively-maintained fork of Presto and kept
//! near-total protocol compatibility) — differing mainly in the request
//! header prefix (`X-Presto-*` vs `X-Trino-*`).
//! Protocol reference: trino.io/docs/current/develop/client-protocol.html

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use serde_json::Value;

pub enum Dialect {
    Presto,
    Trino,
}

impl Dialect {
    fn header_prefix(&self) -> &'static str {
        match self {
            Dialect::Presto => "X-Presto",
            Dialect::Trino => "X-Trino",
        }
    }
}

fn base_url(conn: &CloudWarehouseConnection) -> Result<String> {
    let host = conn.host.as_deref().ok_or_else(|| anyhow!("connection is missing a host"))?;
    if host.starts_with("http://") || host.starts_with("https://") {
        Ok(match conn.port {
            Some(port) if !host.contains(&format!(":{port}")) => format!("{host}:{port}"),
            _ => host.to_string(),
        })
    } else {
        let port = conn.port.unwrap_or(8080);
        Ok(format!("http://{host}:{port}"))
    }
}

fn build_request(
    client: &reqwest::Client,
    conn: &CloudWarehouseConnection,
    dialect: &Dialect,
    base_url: &str,
    query: &str,
) -> reqwest::RequestBuilder {
    let prefix = dialect.header_prefix();
    let user = if conn.username.is_empty() { "prismnote" } else { conn.username.as_str() };
    let mut req = client
        .post(format!("{base_url}/v1/statement"))
        .header("Content-Type", "text/plain")
        .header(format!("{prefix}-User"), user)
        .body(query.to_string());
    if !conn.database.is_empty() {
        req = req.header(format!("{prefix}-Catalog"), conn.database.clone());
    }
    if let Some(token) = conn.credentials.get("access_token") {
        req = req.bearer_auth(token);
    }
    req
}

pub async fn test_connection(conn: &CloudWarehouseConnection, dialect: Dialect) -> Result<String> {
    let client = reqwest::Client::new();
    let base = base_url(conn)?;
    let name = match dialect {
        Dialect::Presto => "Presto",
        Dialect::Trino => "Trino",
    };
    let response = build_request(&client, conn, &dialect, &base, "SELECT 1")
        .send()
        .await
        .with_context(|| format!("{name} connectivity check failed"))?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(anyhow!("{name} returned {status}: {text}"));
    }
    Ok(format!("{name} connection OK"))
}

pub async fn execute_query(
    conn: &CloudWarehouseConnection,
    query: &str,
    dialect: Dialect,
) -> Result<CloudQueryResult> {
    let client = reqwest::Client::new();
    let base = base_url(conn)?;
    let started = std::time::Instant::now();

    let response = build_request(&client, conn, &dialect, &base, query)
        .send()
        .await
        .context("query submission failed")?;
    let status = response.status();
    let text = response.text().await.context("failed to read response body")?;
    if !status.is_success() {
        return Err(anyhow!("query engine returned {status}: {text}"));
    }
    let mut page: Value = serde_json::from_str(&text).context("failed to parse response as JSON")?;

    let mut columns: Vec<String> = Vec::new();
    let mut rows: Vec<Vec<Value>> = Vec::new();
    let auth_header = conn.credentials.get("access_token").cloned();

    loop {
        if let Some(error) = page.get("error") {
            let message = error["message"].as_str().unwrap_or("unknown error");
            return Err(anyhow!("query failed: {message}"));
        }

        if columns.is_empty() {
            if let Some(cols) = page["columns"].as_array() {
                columns = cols.iter().filter_map(|c| c["name"].as_str().map(String::from)).collect();
            }
        }
        if let Some(data) = page["data"].as_array() {
            rows.extend(data.iter().map(|row| row.as_array().cloned().unwrap_or_default()));
        }

        let next_uri = match page["nextUri"].as_str() {
            Some(uri) => uri.to_string(),
            None => break,
        };

        let mut req = client.get(&next_uri);
        if let Some(token) = &auth_header {
            req = req.bearer_auth(token);
        }
        let next_resp = req.send().await.context("failed to fetch next result page")?;
        let next_text = next_resp.text().await.context("failed to read next result page")?;
        page = serde_json::from_str(&next_text).context("failed to parse next result page as JSON")?;
    }

    Ok(CloudQueryResult {
        row_count: rows.len(),
        columns,
        rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        // Neither protocol's statement response exposes bytes-scanned directly
        // in a portable field across engines/connectors; not fabricating one.
        estimated_bytes_scanned: 0,
        estimated_cost_usd: 0.0,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn(server_url: &str) -> CloudWarehouseConnection {
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::Trino,
            name: "test trino".to_string(),
            host: Some(server_url.to_string()),
            port: None,
            database: "hive".to_string(),
            username: "analyst".to_string(),
            password: String::new(),
            credentials: HashMap::new(),
            region: None,
            project_id: None,
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[tokio::test]
    async fn single_page_response_is_parsed_directly() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        let mock = server
            .mock("POST", "/v1/statement")
            .match_header("x-trino-user", "analyst")
            .match_header("x-trino-catalog", "hive")
            .with_status(200)
            .with_body(
                r#"{
                    "id": "q1",
                    "columns": [{"name": "id"}, {"name": "name"}],
                    "data": [[1, "alice"], [2, "bob"]]
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query(&conn, "SELECT * FROM t", Dialect::Trino).await.unwrap();
        mock.assert_async().await;

        assert_eq!(result.columns, vec!["id".to_string(), "name".to_string()]);
        assert_eq!(result.row_count, 2);
    }

    #[tokio::test]
    async fn follows_next_uri_across_pages_and_accumulates_rows() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        let page2_url = format!("{}/v1/statement/q1/page2", server.url());

        server
            .mock("POST", "/v1/statement")
            .with_status(200)
            .with_body(format!(
                r#"{{"id": "q1", "columns": [{{"name": "n"}}], "data": [[1]], "nextUri": "{page2_url}"}}"#
            ))
            .create_async()
            .await;
        server
            .mock("GET", "/v1/statement/q1/page2")
            .with_status(200)
            .with_body(r#"{"id": "q1", "data": [[2]]}"#) // final page: no nextUri
            .create_async()
            .await;

        let result = execute_query(&conn, "SELECT n FROM t", Dialect::Trino).await.unwrap();
        assert_eq!(result.row_count, 2);
        assert_eq!(result.rows, vec![vec![serde_json::json!(1)], vec![serde_json::json!(2)]]);
    }

    #[tokio::test]
    async fn error_field_in_response_fails_the_query() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        server
            .mock("POST", "/v1/statement")
            .with_status(200)
            .with_body(r#"{"id": "q1", "error": {"message": "Table hive.default.missing does not exist"}}"#)
            .create_async()
            .await;

        let err = execute_query(&conn, "SELECT * FROM missing", Dialect::Trino).await.unwrap_err();
        assert!(err.to_string().contains("does not exist"));
    }

    #[tokio::test]
    async fn presto_dialect_uses_presto_prefixed_headers() {
        let mut server = mockito::Server::new_async().await;
        let conn = test_conn(&server.url());

        let mock = server
            .mock("POST", "/v1/statement")
            .match_header("x-presto-user", "analyst")
            .with_status(200)
            .with_body(r#"{"id": "q1", "columns": [], "data": []}"#)
            .create_async()
            .await;

        execute_query(&conn, "SELECT 1", Dialect::Presto).await.unwrap();
        mock.assert_async().await;
    }
}
