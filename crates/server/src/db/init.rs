use anyhow::Result;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

pub async fn initialize_database(db_path: &str) -> Result<SqlitePool> {
    // Ensure directory exists
    if let Some(parent) = std::path::Path::new(db_path).parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Create connection options
    let connection_string = format!("sqlite://{}", db_path);
    let connect_options =
        SqliteConnectOptions::from_str(&connection_string)?.create_if_missing(true);

    // Create connection pool
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_options)
        .await?;

    // Run migrations (schema creation)
    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    // Create schema (idempotent - uses IF NOT EXISTS)
    let schema = include_str!("schema.sql");

    // Split into individual statements and execute each
    for statement in schema.split(';') {
        let trimmed = statement.trim();
        if !trimmed.is_empty() {
            sqlx::query(trimmed).execute(pool).await?;
        }
    }

    tracing::info!("Database migrations completed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_initialization() {
        let db_path = "/tmp/test_prismnote.db";
        // Clean up before test
        let _ = std::fs::remove_file(db_path);

        let pool = initialize_database(db_path)
            .await
            .expect("Failed to initialize database");

        // Verify tables were created
        let result: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(&pool)
            .await
            .expect("Failed to query users table");

        assert_eq!(result.0, 0, "Users table should be empty after creation");

        // Clean up
        std::fs::remove_file(db_path).ok();
    }
}
