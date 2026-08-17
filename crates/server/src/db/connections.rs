use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DatabaseConnection {
    pub id: String,
    pub name: String,
    pub db_type: String, // "postgresql", "mysql", "sqlite", "duckdb", "mongodb"
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: String,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub created_at: String,
}

// Deserialize-only request DTO for the `/databases/:id/query` JSON body.
// `connection_id`/`sql_type` are part of the wire format (some clients send
// them for context/logging) even though the handler resolves the actual
// connection from the `:id` path parameter rather than re-reading them.
#[allow(dead_code)]
#[derive(Deserialize)]
pub struct QueryRequest {
    pub connection_id: String,
    pub query: String,
    pub sql_type: Option<String>, // "sql" or "mongo"
}

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
    pub row_count: usize,
    pub execution_time_ms: u64,
}

pub struct DatabaseManager;

impl DatabaseManager {
    pub fn validate_connection(conn: &DatabaseConnection) -> Result<()> {
        match conn.db_type.as_str() {
            "postgresql" | "mysql" => {
                if conn.host.is_none() || conn.database.is_empty() {
                    return Err(anyhow!("PostgreSQL/MySQL require host and database"));
                }
            }
            "sqlite" | "duckdb" => {
                if conn.database.is_empty() {
                    return Err(anyhow!("SQLite/DuckDB require database path"));
                }
            }
            "mongodb" => {
                if conn.url.is_none() {
                    return Err(anyhow!("MongoDB requires connection URL"));
                }
            }
            _ => return Err(anyhow!("Unknown database type: {}", conn.db_type)),
        }
        Ok(())
    }

    pub async fn test_connection(conn: &DatabaseConnection) -> Result<String> {
        match conn.db_type.as_str() {
            "postgresql" => Self::test_postgresql(conn).await,
            "mysql" => Self::test_mysql(conn).await,
            "sqlite" => Self::test_sqlite(conn).await,
            "duckdb" => Self::test_duckdb(conn).await,
            "mongodb" => Self::test_mongodb(conn).await,
            _ => Err(anyhow!("Unknown database type")),
        }
    }

    pub async fn execute_query(conn: &DatabaseConnection, query: &str) -> Result<QueryResult> {
        // SECURITY: Validate query before execution (basic injection prevention)
        // This is defense-in-depth; real protection requires parameterized queries
        crate::query_validator::QueryValidator::validate(query)?;

        let start = std::time::Instant::now();

        let result = match conn.db_type.as_str() {
            "postgresql" => Self::query_postgresql(conn, query).await,
            "mysql" => Self::query_mysql(conn, query).await,
            "sqlite" => Self::query_sqlite(conn, query).await,
            "duckdb" => Self::query_duckdb(conn, query).await,
            "mongodb" => Self::query_mongodb(conn, query).await,
            _ => Err(anyhow!("Unknown database type")),
        }?;

        Ok(QueryResult {
            columns: result.0,
            rows: result.1,
            row_count: result.2,
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    // PostgreSQL - real connection + query execution via sqlx (postgres feature).
    // Needs a live server; see the `postgres_create_insert_select_roundtrip_if_available`
    // test in crates/server/src/db/executor.rs, which runs for real against a
    // live Postgres container (PRISMNOTE_TEST_PG_PORT) and skips otherwise.
    async fn test_postgresql(conn: &DatabaseConnection) -> Result<String> {
        crate::db::executor::postgres_backend::test_connection(&pg_params(conn)).await
    }

    async fn query_postgresql(
        conn: &DatabaseConnection,
        query: &str,
    ) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
        crate::db::executor::postgres_backend::execute_query(&pg_params(conn), query).await
    }

    // MySQL - real connection + query execution via sqlx (mysql feature).
    // Needs a live server; see the `mysql_create_insert_select_roundtrip_if_available`
    // test in crates/server/src/db/executor.rs, which runs for real against a
    // live MySQL container (PRISMNOTE_TEST_MYSQL_PORT) and skips otherwise.
    async fn test_mysql(conn: &DatabaseConnection) -> Result<String> {
        crate::db::executor::mysql_backend::test_connection(&mysql_params(conn)).await
    }

    async fn query_mysql(
        conn: &DatabaseConnection,
        query: &str,
    ) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
        crate::db::executor::mysql_backend::execute_query(&mysql_params(conn), query).await
    }

    // SQLite - real, embedded, no server required (sqlx sqlite feature).
    async fn test_sqlite(conn: &DatabaseConnection) -> Result<String> {
        crate::db::executor::sqlite_backend::test_connection(&conn.database).await
    }

    async fn query_sqlite(
        conn: &DatabaseConnection,
        query: &str,
    ) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
        crate::db::executor::sqlite_backend::execute_query(&conn.database, query).await
    }

    // DuckDB - real, embedded (bundled DuckDB via the `duckdb` crate), no
    // server required.
    async fn test_duckdb(conn: &DatabaseConnection) -> Result<String> {
        crate::db::executor::duckdb_backend::test_connection(conn.database.clone()).await
    }

    async fn query_duckdb(
        conn: &DatabaseConnection,
        query: &str,
    ) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
        crate::db::executor::duckdb_backend::execute_query(conn.database.clone(), query.to_string())
            .await
    }

    // MongoDB is out of scope for this pass (not a SQL source, and not one
    // of the four backends prioritized for this remediation: SQLite,
    // DuckDB, PostgreSQL, MySQL). Deliberately honest stub: it does NOT
    // pretend to succeed like the previous placeholder did.
    async fn test_mongodb(_conn: &DatabaseConnection) -> Result<String> {
        Err(anyhow!(
            "MongoDB is not implemented yet (out of scope for this pass; SQLite/DuckDB/PostgreSQL/MySQL are the supported SQL backends)"
        ))
    }

    async fn query_mongodb(
        _conn: &DatabaseConnection,
        _query: &str,
    ) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
        Err(anyhow!(
            "MongoDB is not implemented yet (out of scope for this pass; SQLite/DuckDB/PostgreSQL/MySQL are the supported SQL backends)"
        ))
    }
}

fn pg_params(conn: &DatabaseConnection) -> crate::db::executor::postgres_backend::ConnParams<'_> {
    crate::db::executor::postgres_backend::ConnParams {
        host: conn.host.as_deref().unwrap_or("localhost"),
        port: conn.port.unwrap_or(5432),
        user: conn.username.as_deref().unwrap_or(""),
        password: conn.password.as_deref().unwrap_or(""),
        database: &conn.database,
    }
}

fn mysql_params(conn: &DatabaseConnection) -> crate::db::executor::mysql_backend::ConnParams<'_> {
    crate::db::executor::mysql_backend::ConnParams {
        host: conn.host.as_deref().unwrap_or("localhost"),
        port: conn.port.unwrap_or(3306),
        user: conn.username.as_deref().unwrap_or(""),
        password: conn.password.as_deref().unwrap_or(""),
        database: &conn.database,
    }
}
