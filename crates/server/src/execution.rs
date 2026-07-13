use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

/// Execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExecutionStatus {
    Success,
    Error,
    Timeout,
}

impl ExecutionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ExecutionStatus::Success => "success",
            ExecutionStatus::Error => "error",
            ExecutionStatus::Timeout => "timeout",
        }
    }
}

/// Execution metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub execution_id: String,
    pub notebook_id: String,
    pub cell_id: String,
    pub user_id: String,
    pub status: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_ms: i64,
    pub execution_count: Option<i32>,
    pub rows_affected: Option<i32>,
    pub memory_mb: Option<f64>,
    pub cpu_percent: Option<f64>,
    pub error_message: Option<String>,
    pub output_summary: Option<String>,
    pub code_preview: Option<String>,
}

impl ExecutionRecord {
    pub fn new(notebook_id: String, cell_id: String, user_id: String) -> Self {
        ExecutionRecord {
            execution_id: Uuid::new_v4().to_string(),
            notebook_id,
            cell_id,
            user_id,
            status: ExecutionStatus::Success.as_str().to_string(),
            start_time: Local::now().to_rfc3339(),
            end_time: Local::now().to_rfc3339(),
            duration_ms: 0,
            execution_count: None,
            rows_affected: None,
            memory_mb: None,
            cpu_percent: None,
            error_message: None,
            output_summary: None,
            code_preview: None,
        }
    }

    pub fn with_status(mut self, status: ExecutionStatus) -> Self {
        self.status = status.as_str().to_string();
        self
    }

    pub fn with_duration(mut self, duration_ms: i64) -> Self {
        self.duration_ms = duration_ms;
        self.end_time = Local::now().to_rfc3339();
        self
    }

    pub fn with_rows(mut self, rows: i32) -> Self {
        self.rows_affected = Some(rows);
        self
    }

    pub fn with_error(mut self, error: &str) -> Self {
        self.status = ExecutionStatus::Error.as_str().to_string();
        self.error_message = Some(error.to_string());
        self
    }

    pub fn with_memory(mut self, memory_mb: f64) -> Self {
        self.memory_mb = Some(memory_mb);
        self
    }

    pub fn with_code_preview(mut self, code: &str) -> Self {
        self.code_preview = Some(code.chars().take(500).collect());
        self
    }
}

/// Store execution record in database
pub async fn record_execution(pool: &SqlitePool, record: &ExecutionRecord) -> anyhow::Result<()> {
    let query = "INSERT INTO execution_history
                 (execution_id, notebook_id, cell_id, user_id, execution_status,
                  start_time, end_time, duration_ms, rows_affected, memory_mb,
                  error_message, code_preview)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    sqlx::query(query)
        .bind(&record.execution_id)
        .bind(&record.notebook_id)
        .bind(&record.cell_id)
        .bind(&record.user_id)
        .bind(&record.status)
        .bind(&record.start_time)
        .bind(&record.end_time)
        .bind(record.duration_ms)
        .bind(record.rows_affected)
        .bind(record.memory_mb)
        .bind(&record.error_message)
        .bind(&record.code_preview)
        .execute(pool)
        .await?;

    tracing::debug!("Recorded execution: {} for cell {}", record.execution_id, record.cell_id);
    Ok(())
}

/// Get execution history for a cell
pub async fn get_cell_history(
    pool: &SqlitePool,
    notebook_id: &str,
    cell_id: &str,
    limit: i64,
) -> anyhow::Result<Vec<ExecutionRecord>> {
    let query = "SELECT execution_id, notebook_id, cell_id, user_id, execution_status,
                        start_time, end_time, duration_ms, execution_count, rows_affected,
                        memory_mb, cpu_percent, error_message, output_summary, code_preview
                 FROM execution_history
                 WHERE notebook_id = ? AND cell_id = ?
                 ORDER BY start_time DESC
                 LIMIT ?";

    let rows = sqlx::query_as::<_, (String, String, String, String, String, String, String, i64, Option<i32>, Option<i32>, Option<f64>, Option<f64>, Option<String>, Option<String>, Option<String>)>(query)
        .bind(notebook_id)
        .bind(cell_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

    let records = rows.into_iter()
        .map(|(execution_id, notebook_id, cell_id, user_id, status, start_time, end_time, duration_ms, execution_count, rows_affected, memory_mb, cpu_percent, error_message, output_summary, code_preview)| {
            ExecutionRecord {
                execution_id,
                notebook_id,
                cell_id,
                user_id,
                status,
                start_time,
                end_time,
                duration_ms,
                execution_count,
                rows_affected,
                memory_mb,
                cpu_percent,
                error_message,
                output_summary,
                code_preview,
            }
        })
        .collect();

    Ok(records)
}

/// Get execution statistics for a notebook
pub async fn get_notebook_stats(
    pool: &SqlitePool,
    notebook_id: &str,
) -> anyhow::Result<ExecutionStats> {
    let query = "SELECT
                    COUNT(*) as total_executions,
                    SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful,
                    SUM(CASE WHEN execution_status = 'error' THEN 1 ELSE 0 END) as failed,
                    AVG(duration_ms) as avg_duration_ms,
                    MAX(duration_ms) as max_duration_ms,
                    MIN(duration_ms) as min_duration_ms,
                    AVG(memory_mb) as avg_memory_mb,
                    MAX(memory_mb) as peak_memory_mb
                 FROM execution_history
                 WHERE notebook_id = ?";

    let row = sqlx::query_as::<_, (i64, Option<i64>, Option<i64>, Option<f64>, Option<i64>, Option<i64>, Option<f64>, Option<f64>)>(query)
        .bind(notebook_id)
        .fetch_one(pool)
        .await?;

    Ok(ExecutionStats {
        total_executions: row.0,
        successful: row.1.unwrap_or(0),
        failed: row.2.unwrap_or(0),
        avg_duration_ms: row.3.unwrap_or(0.0) as i64,
        max_duration_ms: row.4,
        min_duration_ms: row.5,
        avg_memory_mb: row.6.unwrap_or(0.0),
        peak_memory_mb: row.7.unwrap_or(0.0),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStats {
    pub total_executions: i64,
    pub successful: i64,
    pub failed: i64,
    pub avg_duration_ms: i64,
    pub max_duration_ms: Option<i64>,
    pub min_duration_ms: Option<i64>,
    pub avg_memory_mb: f64,
    pub peak_memory_mb: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_execution_record_builder() {
        let record = ExecutionRecord::new("nb1".to_string(), "cell1".to_string(), "user1".to_string())
            .with_duration(1500)
            .with_rows(42)
            .with_memory(256.5);

        assert_eq!(record.duration_ms, 1500);
        assert_eq!(record.rows_affected, Some(42));
        assert_eq!(record.memory_mb, Some(256.5));
        assert_eq!(record.status, "success");
    }

    #[test]
    fn test_execution_with_error() {
        let record = ExecutionRecord::new("nb1".to_string(), "cell1".to_string(), "user1".to_string())
            .with_error("Division by zero");

        assert_eq!(record.status, "error");
        assert_eq!(record.error_message, Some("Division by zero".to_string()));
    }
}
