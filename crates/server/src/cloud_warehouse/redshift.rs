//! Amazon Redshift connector. Redshift speaks the PostgreSQL wire protocol
//! for standard SQL (it's a fork of Postgres 8), so this uses sqlx's real
//! Postgres driver rather than a hand-rolled client. sqlx is normally used
//! with compile-time-known row types; since connections here are dynamic
//! (any warehouse, any query), rows are mapped to serde_json::Value at
//! runtime based on each column's reported Postgres type.

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use serde_json::Value;
use sqlx::postgres::{PgPoolOptions, PgRow};
use sqlx::{Column, Row, TypeInfo};

fn build_dsn(conn: &CloudWarehouseConnection) -> Result<String> {
    let host = conn
        .host
        .as_deref()
        .ok_or_else(|| anyhow!("Redshift connection is missing host"))?;
    let port = conn.port.unwrap_or(5439);
    if conn.username.is_empty() {
        return Err(anyhow!("Redshift connection is missing username"));
    }
    Ok(format!(
        "postgres://{}:{}@{}:{}/{}",
        urlencoding::encode(&conn.username),
        urlencoding::encode(&conn.password),
        host,
        port,
        urlencoding::encode(&conn.database),
    ))
}

/// Convert a single cell to a serde_json::Value based on its Postgres type
/// name, since sqlx requires the Rust type to be known at the call site and
/// we don't know column types until runtime.
fn cell_to_json(row: &PgRow, idx: usize, type_name: &str) -> Value {
    match type_name {
        "INT2" => row
            .try_get::<Option<i16>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
        "INT4" => row
            .try_get::<Option<i32>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
        "INT8" => row
            .try_get::<Option<i64>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
        "FLOAT4" => row
            .try_get::<Option<f32>, _>(idx)
            .ok()
            .flatten()
            .map(|v| Value::from(v as f64))
            .unwrap_or(Value::Null),
        "FLOAT8" => row
            .try_get::<Option<f64>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
        "BOOL" => row
            .try_get::<Option<bool>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
        "NUMERIC" => row
            .try_get::<Option<sqlx::types::BigDecimal>, _>(idx)
            .ok()
            .flatten()
            .map(|v| Value::from(v.to_string()))
            .unwrap_or(Value::Null),
        "JSON" | "JSONB" => row
            .try_get::<Option<Value>, _>(idx)
            .ok()
            .flatten()
            .unwrap_or(Value::Null),
        "TIMESTAMP" | "TIMESTAMPTZ" => row
            .try_get::<Option<chrono::NaiveDateTime>, _>(idx)
            .ok()
            .flatten()
            .map(|v| Value::from(v.to_string()))
            .unwrap_or(Value::Null),
        "DATE" => row
            .try_get::<Option<chrono::NaiveDate>, _>(idx)
            .ok()
            .flatten()
            .map(|v| Value::from(v.to_string()))
            .unwrap_or(Value::Null),
        // TEXT, VARCHAR, BPCHAR, and anything else not special-cased above:
        // fall back to the text representation, which Postgres/Redshift can
        // return for virtually any type.
        _ => row
            .try_get::<Option<String>, _>(idx)
            .ok()
            .flatten()
            .map(Value::from)
            .unwrap_or(Value::Null),
    }
}

fn rows_to_result(rows: &[PgRow], started: std::time::Instant) -> CloudQueryResult {
    let columns: Vec<String> = rows
        .first()
        .map(|r| r.columns().iter().map(|c| c.name().to_string()).collect())
        .unwrap_or_default();
    let type_names: Vec<String> = rows
        .first()
        .map(|r| {
            r.columns()
                .iter()
                .map(|c| c.type_info().name().to_string())
                .collect()
        })
        .unwrap_or_default();

    let json_rows: Vec<Vec<Value>> = rows
        .iter()
        .map(|row| {
            (0..row.columns().len())
                .map(|i| cell_to_json(row, i, &type_names[i]))
                .collect()
        })
        .collect();

    CloudQueryResult {
        row_count: json_rows.len(),
        columns,
        rows: json_rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        // Not exposed by the standard Postgres wire protocol without querying
        // Redshift's system tables separately; not fabricating a number.
        estimated_bytes_scanned: 0,
        estimated_cost_usd: 0.0,
    }
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    let dsn = build_dsn(conn)?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(
            conn.timeout_seconds.max(1) as u64
        ))
        .connect(&dsn)
        .await
        .context("Redshift connection failed")?;
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .context("Redshift test query failed")?;
    pool.close().await;
    Ok("Redshift connection OK".to_string())
}

pub async fn execute_query(
    conn: &CloudWarehouseConnection,
    query: &str,
) -> Result<CloudQueryResult> {
    let dsn = build_dsn(conn)?;
    let started = std::time::Instant::now();
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(
            conn.timeout_seconds.max(1) as u64
        ))
        .connect(&dsn)
        .await
        .context("Redshift connection failed")?;

    let rows = sqlx::query(query)
        .fetch_all(&pool)
        .await
        .context("Redshift query execution failed")?;
    pool.close().await;

    Ok(rows_to_result(&rows, started))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn() -> CloudWarehouseConnection {
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::Redshift,
            name: "test redshift".to_string(),
            host: Some("my-cluster.abc123.us-east-1.redshift.amazonaws.com".to_string()),
            port: Some(5439),
            database: "analytics".to_string(),
            username: "admin".to_string(),
            password: "p@ss/word".to_string(), // deliberately contains chars that need URL-encoding
            credentials: HashMap::new(),
            region: Some("us-east-1".to_string()),
            project_id: None,
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn dsn_url_encodes_special_characters_in_credentials() {
        let dsn = build_dsn(&test_conn()).unwrap();
        // '@' and '/' in the password must be percent-encoded or they'd be
        // misparsed as DSN delimiters.
        assert!(
            dsn.contains("p%40ss%2Fword"),
            "password not properly URL-encoded in DSN: {dsn}"
        );
        assert!(dsn.starts_with("postgres://admin:"));
        assert!(dsn.ends_with("/analytics"));
    }

    #[test]
    fn missing_host_is_a_clear_error() {
        let mut conn = test_conn();
        conn.host = None;
        assert!(build_dsn(&conn).unwrap_err().to_string().contains("host"));
    }

    /// Real end-to-end verification against a live Postgres/Redshift instance.
    /// Skipped by default (no Docker/Postgres available in this environment) —
    /// run with `REDSHIFT_TEST_DSN=postgres://... cargo test -- --ignored`
    /// against a real Postgres or Redshift cluster to verify the wire-protocol
    /// path end-to-end before relying on this in production.
    #[tokio::test]
    #[ignore]
    async fn live_connection_smoke_test() {
        let dsn =
            std::env::var("REDSHIFT_TEST_DSN").expect("set REDSHIFT_TEST_DSN to run this test");
        let pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&dsn)
            .await
            .unwrap();
        let rows = sqlx::query("SELECT 1 AS one, 'hello' AS greeting")
            .fetch_all(&pool)
            .await
            .unwrap();
        let result = rows_to_result(&rows, std::time::Instant::now());
        assert_eq!(
            result.columns,
            vec!["one".to_string(), "greeting".to_string()]
        );
        assert_eq!(result.rows[0][1], serde_json::json!("hello"));
    }
}
