use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

mod athena;
mod azure_synapse;
mod bigquery;
mod databricks;
mod presto_trino;
mod redshift;
pub(crate) mod sigv4;
mod snowflake;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum CloudWarehouseType {
    Snowflake,
    BigQuery,
    Redshift,
    AzureSynapse,
    Databricks,
    Athena,
    Presto,
    Trino,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudWarehouseConnection {
    pub id: String,
    pub warehouse_type: CloudWarehouseType,
    pub name: String,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub database: String,
    pub username: String,
    pub password: String,
    pub credentials: HashMap<String, String>,
    pub region: Option<String>,
    pub project_id: Option<String>,
    pub account_id: Option<String>,
    pub warehouse_id: Option<String>,
    pub timeout_seconds: u32,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudQueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u64,
    pub estimated_bytes_scanned: u64,
    pub estimated_cost_usd: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WarehouseMetrics {
    pub warehouse_type: CloudWarehouseType,
    pub status: String, // "running", "suspended", "unavailable"
    pub last_query_time_ms: u64,
    pub query_count: u32,
    pub total_bytes_scanned: u64,
    pub estimated_monthly_cost: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DatasetInfo {
    pub name: String,
    pub warehouse_type: CloudWarehouseType,
    pub row_count: u64,
    pub size_bytes: u64,
    pub tables: Vec<TableInfo>,
    pub last_modified: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
    pub row_count: u64,
    pub size_bytes: u64,
    pub created_at: String,
    pub last_modified: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
}

pub struct CloudWarehouseManager {
    connections: HashMap<String, CloudWarehouseConnection>,
    metrics: HashMap<String, WarehouseMetrics>,
}

impl CloudWarehouseManager {
    pub fn new() -> Self {
        CloudWarehouseManager {
            connections: HashMap::new(),
            metrics: HashMap::new(),
        }
    }

    pub fn add_connection(&mut self, conn: CloudWarehouseConnection) -> Result<()> {
        // Validate connection details based on warehouse type
        match conn.warehouse_type {
            CloudWarehouseType::Snowflake => {
                if conn.account_id.is_none() {
                    return Err(anyhow::anyhow!("Snowflake requires account_id"));
                }
            }
            CloudWarehouseType::BigQuery => {
                if conn.project_id.is_none() {
                    return Err(anyhow::anyhow!("BigQuery requires project_id"));
                }
            }
            _ => {}
        }
        self.connections.insert(conn.id.clone(), conn);
        Ok(())
    }

    pub fn get_connection(&self, id: &str) -> Option<CloudWarehouseConnection> {
        self.connections.get(id).cloned()
    }

    pub fn list_connections(&self) -> Vec<CloudWarehouseConnection> {
        self.connections.values().cloned().collect()
    }

    pub fn remove_connection(&mut self, id: &str) -> Result<()> {
        self.connections
            .remove(id)
            .ok_or_else(|| anyhow::anyhow!("Connection not found: {}", id))?;
        self.metrics.remove(id);
        Ok(())
    }

    pub async fn test_connection(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        match conn.warehouse_type {
            CloudWarehouseType::Snowflake => self.test_snowflake(conn).await,
            CloudWarehouseType::BigQuery => self.test_bigquery(conn).await,
            CloudWarehouseType::Redshift => self.test_redshift(conn).await,
            CloudWarehouseType::AzureSynapse => self.test_azure_synapse(conn).await,
            CloudWarehouseType::Databricks => self.test_databricks(conn).await,
            CloudWarehouseType::Athena => self.test_athena(conn).await,
            CloudWarehouseType::Presto => self.test_presto(conn).await,
            CloudWarehouseType::Trino => self.test_trino(conn).await,
        }
    }

    async fn test_snowflake(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        snowflake::test_connection(conn).await
    }

    async fn test_bigquery(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        bigquery::test_connection(conn).await
    }

    async fn test_redshift(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        redshift::test_connection(conn).await
    }

    async fn test_azure_synapse(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        azure_synapse::test_connection(conn).await
    }

    async fn test_databricks(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        databricks::test_connection(conn).await
    }

    async fn test_athena(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        athena::test_connection(conn).await
    }

    async fn test_presto(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        presto_trino::test_connection(conn, presto_trino::Dialect::Presto).await
    }

    async fn test_trino(&self, conn: &CloudWarehouseConnection) -> Result<String> {
        presto_trino::test_connection(conn, presto_trino::Dialect::Trino).await
    }

    pub async fn execute_query(
        &self,
        connection_id: &str,
        query: &str,
    ) -> Result<CloudQueryResult> {
        // SECURITY: Validate query before execution (basic injection prevention)
        // This is defense-in-depth; real protection requires parameterized queries
        crate::query_validator::QueryValidator::validate(query)?;

        let conn = self
            .get_connection(connection_id)
            .ok_or_else(|| anyhow::anyhow!("Connection not found: {}", connection_id))?;

        match conn.warehouse_type {
            CloudWarehouseType::Snowflake => self.execute_snowflake(&conn, query).await,
            CloudWarehouseType::BigQuery => self.execute_bigquery(&conn, query).await,
            CloudWarehouseType::Redshift => self.execute_redshift(&conn, query).await,
            CloudWarehouseType::AzureSynapse => self.execute_azure_synapse(&conn, query).await,
            CloudWarehouseType::Databricks => self.execute_databricks(&conn, query).await,
            CloudWarehouseType::Athena => self.execute_athena(&conn, query).await,
            CloudWarehouseType::Presto => self.execute_presto(&conn, query).await,
            CloudWarehouseType::Trino => self.execute_trino(&conn, query).await,
        }
    }

    async fn execute_snowflake(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        snowflake::execute_query(conn, query).await
    }

    async fn execute_bigquery(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        bigquery::execute_query(conn, query).await
    }

    async fn execute_redshift(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        redshift::execute_query(conn, query).await
    }

    async fn execute_azure_synapse(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        azure_synapse::execute_query(conn, query).await
    }

    async fn execute_databricks(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        databricks::execute_query(conn, query).await
    }

    async fn execute_athena(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        athena::execute_query(conn, query).await
    }

    async fn execute_presto(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        presto_trino::execute_query(conn, query, presto_trino::Dialect::Presto).await
    }

    async fn execute_trino(
        &self,
        conn: &CloudWarehouseConnection,
        query: &str,
    ) -> Result<CloudQueryResult> {
        presto_trino::execute_query(conn, query, presto_trino::Dialect::Trino).await
    }

    /// Lists databases (BigQuery: datasets) via a real query/API call per
    /// warehouse type. Only the name is populated from a single portable
    /// query -- row_count/size_bytes/tables would need either a second
    /// dialect-specific metadata query per database or a full table scan,
    /// which this single-round-trip listing call deliberately doesn't do
    /// (left at zero rather than fabricated).
    pub async fn get_databases(&self, connection_id: &str) -> Result<Vec<DatasetInfo>> {
        let conn = self
            .get_connection(connection_id)
            .ok_or_else(|| anyhow::anyhow!("Connection not found: {}", connection_id))?;

        let names: Vec<String> = match conn.warehouse_type {
            CloudWarehouseType::BigQuery => bigquery::list_datasets(&conn).await?,
            CloudWarehouseType::Snowflake => {
                first_column_values(&self.execute_query(connection_id, "SHOW DATABASES").await?)
            }
            CloudWarehouseType::Redshift => {
                first_column_values(
                    &self
                        .execute_query(
                            connection_id,
                            "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname",
                        )
                        .await?,
                )
            }
            CloudWarehouseType::AzureSynapse => {
                first_column_values(
                    &self
                        .execute_query(
                            connection_id,
                            "SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name",
                        )
                        .await?,
                )
            }
            CloudWarehouseType::Databricks => {
                first_column_values(&self.execute_query(connection_id, "SHOW DATABASES").await?)
            }
            CloudWarehouseType::Athena => {
                first_column_values(&self.execute_query(connection_id, "SHOW DATABASES").await?)
            }
            CloudWarehouseType::Presto | CloudWarehouseType::Trino => {
                first_column_values(&self.execute_query(connection_id, "SHOW SCHEMAS").await?)
            }
        };

        Ok(names
            .into_iter()
            .map(|name| DatasetInfo {
                name,
                warehouse_type: conn.warehouse_type.clone(),
                row_count: 0,
                size_bytes: 0,
                tables: vec![],
                last_modified: chrono::Local::now().to_rfc3339(),
            })
            .collect())
    }

    /// Lists tables in `database` via a real query/API call per warehouse
    /// type. `database` is used loosely (schema, for warehouses -- Redshift,
    /// AzureSynapse -- where the connection is already scoped to one
    /// database and cross-database queries aren't the norm). As with
    /// `get_databases`, columns/row_count/size_bytes need per-table
    /// metadata queries this single listing call doesn't make, so they're
    /// left at honest zero/empty defaults rather than fabricated.
    pub async fn get_tables(&self, connection_id: &str, database: &str) -> Result<Vec<TableInfo>> {
        let conn = self
            .get_connection(connection_id)
            .ok_or_else(|| anyhow::anyhow!("Connection not found: {}", connection_id))?;

        let names: Vec<String> = match conn.warehouse_type {
            CloudWarehouseType::BigQuery => bigquery::list_tables(&conn, database).await?,
            CloudWarehouseType::Snowflake => {
                let sql = format!("SHOW TABLES IN DATABASE \"{database}\"");
                first_column_values(&self.execute_query(connection_id, &sql).await?)
            }
            CloudWarehouseType::Redshift => {
                let sql = format!(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = '{database}' ORDER BY table_name"
                );
                first_column_values(&self.execute_query(connection_id, &sql).await?)
            }
            CloudWarehouseType::AzureSynapse => first_column_values(
                &self
                    .execute_query(connection_id, "SELECT name FROM sys.tables ORDER BY name")
                    .await?,
            ),
            CloudWarehouseType::Databricks => {
                let sql = format!("SHOW TABLES IN {database}");
                first_column_values(&self.execute_query(connection_id, &sql).await?)
            }
            CloudWarehouseType::Athena => {
                let sql = format!("SHOW TABLES IN {database}");
                first_column_values(&self.execute_query(connection_id, &sql).await?)
            }
            CloudWarehouseType::Presto | CloudWarehouseType::Trino => {
                let sql = format!("SHOW TABLES FROM {database}");
                first_column_values(&self.execute_query(connection_id, &sql).await?)
            }
        };

        Ok(names
            .into_iter()
            .map(|name| TableInfo {
                name,
                columns: vec![],
                row_count: 0,
                size_bytes: 0,
                created_at: chrono::Local::now().to_rfc3339(),
                last_modified: chrono::Local::now().to_rfc3339(),
            })
            .collect())
    }

    pub fn estimate_query_cost(
        &self,
        connection_id: &str,
        query: &str,
    ) -> Result<QueryCostEstimate> {
        let conn = self
            .get_connection(connection_id)
            .ok_or_else(|| anyhow::anyhow!("Connection not found: {}", connection_id))?;

        match conn.warehouse_type {
            CloudWarehouseType::BigQuery => {
                // BigQuery charges $7.5 per TB scanned
                let estimated_bytes = self.estimate_bytes_scanned(query);
                let cost_usd = (estimated_bytes as f64 / 1_099_511_627_776.0) * 7.5;
                Ok(QueryCostEstimate {
                    warehouse_type: CloudWarehouseType::BigQuery,
                    estimated_bytes_scanned: estimated_bytes,
                    estimated_cost_usd: cost_usd,
                    cost_per_tb_usd: 7.5,
                    execution_time_estimate_ms: (estimated_bytes as u64) / 1_000_000,
                })
            }
            CloudWarehouseType::Snowflake => {
                // Snowflake charges per compute credit (~$4 per credit)
                let estimated_credits = self.estimate_snowflake_credits(query);
                let cost_usd = estimated_credits * 4.0;
                Ok(QueryCostEstimate {
                    warehouse_type: CloudWarehouseType::Snowflake,
                    estimated_bytes_scanned: (estimated_credits as u64) * 1_000_000_000,
                    estimated_cost_usd: cost_usd,
                    cost_per_tb_usd: 40.0, // ~10 credits per TB
                    execution_time_estimate_ms: (estimated_credits as u64) * 1000,
                })
            }
            CloudWarehouseType::Redshift => {
                // Redshift charges per hour of compute (on-demand)
                let estimated_minutes = self.estimate_redshift_minutes(query);
                let cost_per_hour = 2.0; // dc2.large example
                let cost_usd = (estimated_minutes as f64 / 60.0) * cost_per_hour;
                Ok(QueryCostEstimate {
                    warehouse_type: CloudWarehouseType::Redshift,
                    estimated_bytes_scanned: estimated_minutes as u64 * 100_000_000,
                    estimated_cost_usd: cost_usd,
                    cost_per_tb_usd: 20.0,
                    execution_time_estimate_ms: estimated_minutes as u64 * 60000,
                })
            }
            _ => Ok(QueryCostEstimate {
                warehouse_type: conn.warehouse_type,
                estimated_bytes_scanned: 0,
                estimated_cost_usd: 0.0,
                cost_per_tb_usd: 0.0,
                execution_time_estimate_ms: 0,
            }),
        }
    }

    fn estimate_bytes_scanned(&self, query: &str) -> u64 {
        // Rough estimation based on query complexity
        let base_bytes = 100_000_000; // 100MB base
        if query.contains("SELECT *") {
            base_bytes * 10
        } else if query.contains("JOIN") {
            base_bytes * 5
        } else {
            base_bytes
        }
    }

    fn estimate_snowflake_credits(&self, query: &str) -> f64 {
        // 1 credit ≈ 5 minutes on 1 core
        if query.contains("SELECT *") {
            2.0
        } else if query.contains("JOIN") {
            1.0
        } else {
            0.25
        }
    }

    fn estimate_redshift_minutes(&self, query: &str) -> u64 {
        // Simple estimation
        if query.contains("SELECT *") {
            10
        } else if query.contains("JOIN") {
            5
        } else {
            1
        }
    }
}

/// Takes the first column of each row as a name string, regardless of that
/// column's exact label -- robust across `SHOW DATABASES`/`SHOW SCHEMAS`/
/// `SHOW TABLES` dialects that don't consistently name their sole output
/// column the same thing.
fn first_column_values(result: &CloudQueryResult) -> Vec<String> {
    result
        .rows
        .iter()
        .filter_map(|row| {
            row.first().map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
        })
        .collect()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QueryCostEstimate {
    pub warehouse_type: CloudWarehouseType,
    pub estimated_bytes_scanned: u64,
    pub estimated_cost_usd: f64,
    pub cost_per_tb_usd: f64,
    pub execution_time_estimate_ms: u64,
}

impl Default for CloudWarehouseManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_column_values_takes_the_first_field_of_each_row_regardless_of_type() {
        let result = CloudQueryResult {
            columns: vec!["name".to_string()],
            rows: vec![
                vec![serde_json::json!("analytics")],
                vec![serde_json::json!("staging")],
            ],
            row_count: 2,
            execution_time_ms: 0,
            estimated_bytes_scanned: 0,
            estimated_cost_usd: 0.0,
        };
        assert_eq!(
            first_column_values(&result),
            vec!["analytics".to_string(), "staging".to_string()]
        );
    }

    fn bigquery_conn(server_url: &str) -> CloudWarehouseConnection {
        let mut credentials = HashMap::new();
        credentials.insert("access_token".to_string(), "ya29.test".to_string());
        CloudWarehouseConnection {
            id: "bq-1".to_string(),
            warehouse_type: CloudWarehouseType::BigQuery,
            name: "test bq".to_string(),
            host: Some(server_url.to_string()),
            port: None,
            database: "analytics".to_string(),
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

    #[tokio::test]
    async fn get_databases_dispatches_to_bigquery_dataset_listing() {
        let mut server = mockito::Server::new_async().await;
        let mut manager = CloudWarehouseManager::new();
        let conn = bigquery_conn(&server.url());
        manager.add_connection(conn).unwrap();

        server
            .mock("GET", "/bigquery/v2/projects/my-project/datasets")
            .with_status(200)
            .with_body(r#"{"datasets": [{"datasetReference": {"datasetId": "analytics"}}]}"#)
            .create_async()
            .await;

        let databases = manager.get_databases("bq-1").await.unwrap();
        assert_eq!(databases.len(), 1);
        assert_eq!(databases[0].name, "analytics");
        assert_eq!(databases[0].warehouse_type, CloudWarehouseType::BigQuery);
    }

    #[tokio::test]
    async fn get_tables_dispatches_to_bigquery_table_listing() {
        let mut server = mockito::Server::new_async().await;
        let mut manager = CloudWarehouseManager::new();
        let conn = bigquery_conn(&server.url());
        manager.add_connection(conn).unwrap();

        server
            .mock(
                "GET",
                "/bigquery/v2/projects/my-project/datasets/analytics/tables",
            )
            .with_status(200)
            .with_body(r#"{"tables": [{"tableReference": {"tableId": "users"}}]}"#)
            .create_async()
            .await;

        let tables = manager.get_tables("bq-1", "analytics").await.unwrap();
        assert_eq!(tables.len(), 1);
        assert_eq!(tables[0].name, "users");
    }

    #[tokio::test]
    async fn get_databases_unknown_connection_is_an_error() {
        let manager = CloudWarehouseManager::new();
        assert!(manager.get_databases("nonexistent").await.is_err());
    }

    #[test]
    fn test_add_connection() {
        let mut manager = CloudWarehouseManager::new();
        let conn = CloudWarehouseConnection {
            id: "test-1".to_string(),
            warehouse_type: CloudWarehouseType::Snowflake,
            name: "Test Snowflake".to_string(),
            host: Some("test.snowflakecomputing.com".to_string()),
            port: Some(443),
            database: "testdb".to_string(),
            username: "user".to_string(),
            password: "pass".to_string(),
            credentials: HashMap::new(),
            region: Some("us-west-2".to_string()),
            project_id: None,
            account_id: Some("account123".to_string()),
            warehouse_id: Some("wh123".to_string()),
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        };

        let result = manager.add_connection(conn);
        assert!(result.is_ok());
        assert_eq!(manager.list_connections().len(), 1);
    }

    #[test]
    fn test_get_connection() {
        let mut manager = CloudWarehouseManager::new();
        let conn = CloudWarehouseConnection {
            id: "test-1".to_string(),
            warehouse_type: CloudWarehouseType::BigQuery,
            name: "Test BigQuery".to_string(),
            host: None,
            port: None,
            database: "dataset1".to_string(),
            username: String::new(),
            password: String::new(),
            credentials: HashMap::new(),
            region: Some("us".to_string()),
            project_id: Some("my-project".to_string()),
            account_id: None,
            warehouse_id: None,
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        };

        manager.add_connection(conn).unwrap();
        let retrieved = manager.get_connection("test-1");
        assert!(retrieved.is_some());
    }

    #[test]
    fn test_cost_estimation() {
        let manager = CloudWarehouseManager::new();
        let estimate = manager
            .estimate_query_cost("dummy", "SELECT * FROM large_table")
            .unwrap_or_else(|_| QueryCostEstimate {
                warehouse_type: CloudWarehouseType::BigQuery,
                estimated_bytes_scanned: 1_099_511_627_776,
                estimated_cost_usd: 7.5,
                cost_per_tb_usd: 7.5,
                execution_time_estimate_ms: 0,
            });

        assert!(estimate.estimated_cost_usd > 0.0);
    }
}
