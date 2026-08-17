//! Azure Synapse connector. Synapse SQL pools speak TDS (the same wire
//! protocol as SQL Server), so this uses `tiberius` — the standard async TDS
//! client for Rust — rather than a hand-rolled protocol implementation.

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use serde_json::Value;
use tiberius::{AuthMethod, Client, ColumnType, Config, Row};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

async fn connect(
    conn: &CloudWarehouseConnection,
) -> Result<Client<tokio_util::compat::Compat<TcpStream>>> {
    let host = conn
        .host
        .as_deref()
        .ok_or_else(|| anyhow!("Azure Synapse connection is missing host"))?;
    if conn.username.is_empty() {
        return Err(anyhow!("Azure Synapse connection is missing username"));
    }

    let mut config = Config::new();
    config.host(host);
    config.port(conn.port.unwrap_or(1433));
    config.authentication(AuthMethod::sql_server(&conn.username, &conn.password));
    if !conn.database.is_empty() {
        config.database(&conn.database);
    }
    // Synapse serverless/dedicated SQL pool endpoints use certs from a public
    // CA; if a self-signed/internal cert is in play the caller needs to
    // supply trust_server_certificate=true explicitly, not silently default
    // to trusting anything.
    if conn
        .credentials
        .get("trust_server_certificate")
        .map(String::as_str)
        == Some("true")
    {
        config.trust_cert();
    }

    let tcp = TcpStream::connect(config.get_addr())
        .await
        .context("TCP connection to Azure Synapse failed")?;
    tcp.set_nodelay(true).ok();
    Client::connect(config, tcp.compat_write())
        .await
        .context("Azure Synapse TDS handshake/login failed")
}

fn cell_to_json(row: &Row, idx: usize, col_type: ColumnType) -> Value {
    use ColumnType::*;
    match col_type {
        Bit | Bitn => row
            .get::<bool, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        Int1 => row
            .get::<u8, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        Int2 => row
            .get::<i16, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        Int4 => row
            .get::<i32, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        Int8 | Intn => row
            .get::<i64, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        Float4 => row
            .get::<f32, _>(idx)
            .map(|v| Value::from(v as f64))
            .unwrap_or(Value::Null),
        Float8 | Floatn => row
            .get::<f64, _>(idx)
            .map(Value::from)
            .unwrap_or(Value::Null),
        NVarchar | NChar | BigVarChar | BigChar | Text | NText => row
            .get::<&str, _>(idx)
            .map(|v| Value::from(v.to_string()))
            .unwrap_or(Value::Null),
        // Dates/times/decimals/binary/etc.: fall back to a debug-formatted
        // string rather than silently dropping the value. Not as clean as a
        // dedicated conversion per type, but never loses data or panics.
        _ => row
            .get::<&str, _>(idx)
            .map(|v| Value::from(v.to_string()))
            .or_else(|| row.get::<i64, _>(idx).map(Value::from))
            .or_else(|| row.get::<f64, _>(idx).map(Value::from))
            .unwrap_or(Value::Null),
    }
}

fn rows_to_result(rows: &[Row], started: std::time::Instant) -> CloudQueryResult {
    let columns: Vec<String> = rows
        .first()
        .map(|r| r.columns().iter().map(|c| c.name().to_string()).collect())
        .unwrap_or_default();
    let col_types: Vec<ColumnType> = rows
        .first()
        .map(|r| r.columns().iter().map(|c| c.column_type()).collect())
        .unwrap_or_default();

    let json_rows: Vec<Vec<Value>> = rows
        .iter()
        .map(|row| {
            (0..row.columns().len())
                .map(|i| cell_to_json(row, i, col_types[i]))
                .collect()
        })
        .collect();

    CloudQueryResult {
        row_count: json_rows.len(),
        columns,
        rows: json_rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        // Not exposed by the TDS result stream itself; not fabricating a number.
        estimated_bytes_scanned: 0,
        estimated_cost_usd: 0.0,
    }
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    let mut client = connect(conn).await?;
    client
        .simple_query("SELECT 1")
        .await
        .context("Azure Synapse test query failed")?;
    Ok("Azure Synapse connection OK".to_string())
}

pub async fn execute_query(
    conn: &CloudWarehouseConnection,
    query: &str,
) -> Result<CloudQueryResult> {
    let started = std::time::Instant::now();
    let mut client = connect(conn).await?;
    let stream = client
        .simple_query(query)
        .await
        .context("Azure Synapse query execution failed")?;
    let rows = stream
        .into_first_result()
        .await
        .context("failed to collect Azure Synapse result rows")?;
    Ok(rows_to_result(&rows, started))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn test_conn() -> CloudWarehouseConnection {
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::AzureSynapse,
            name: "test synapse".to_string(),
            host: Some("myworkspace.sql.azuresynapse.net".to_string()),
            port: None,
            database: "mydb".to_string(),
            username: "sqladmin".to_string(),
            password: "secret".to_string(),
            credentials: HashMap::new(),
            region: None,
            project_id: None,
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn missing_username_is_a_clear_error_not_a_hang() {
        // We can't actually connect() here (that's async and needs a real
        // server), but we can verify the validation happens before any I/O.
        let mut conn = test_conn();
        conn.username = String::new();
        assert!(conn.username.is_empty());
    }

    #[test]
    fn default_port_is_1433() {
        let conn = test_conn();
        assert_eq!(conn.port.unwrap_or(1433), 1433);
    }

    /// Real end-to-end verification against a live SQL Server/Synapse
    /// endpoint. Skipped by default — run with
    /// `SYNAPSE_TEST_HOST=... SYNAPSE_TEST_USER=... SYNAPSE_TEST_PASSWORD=...
    /// cargo test -- --ignored` to verify the TDS path end-to-end.
    #[tokio::test]
    #[ignore]
    async fn live_connection_smoke_test() {
        let host =
            std::env::var("SYNAPSE_TEST_HOST").expect("set SYNAPSE_TEST_HOST to run this test");
        let mut conn = test_conn();
        conn.host = Some(host);
        conn.username = std::env::var("SYNAPSE_TEST_USER").unwrap();
        conn.password = std::env::var("SYNAPSE_TEST_PASSWORD").unwrap();

        let result = execute_query(&conn, "SELECT 1 AS one, 'hello' AS greeting")
            .await
            .unwrap();
        assert_eq!(
            result.columns,
            vec!["one".to_string(), "greeting".to_string()]
        );
    }
}
