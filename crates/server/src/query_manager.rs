use chrono::Local;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQuery {
    pub query_id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub query_text: String,
    pub query_type: String,
    pub tags: Option<Vec<String>>,
    pub is_favorite: bool,
    pub last_used: Option<String>,
    pub run_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl SavedQuery {
    pub fn new(user_id: String, title: String, query_text: String, query_type: String) -> Self {
        let now = Local::now().to_rfc3339();
        SavedQuery {
            query_id: Uuid::new_v4().to_string(),
            user_id,
            title,
            description: None,
            query_text,
            query_type,
            tags: None,
            is_favorite: false,
            last_used: None,
            run_count: 0,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn with_description(mut self, desc: String) -> Self {
        self.description = Some(desc);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = Some(tags);
        self
    }
}

/// Save a query
pub async fn save_query(pool: &SqlitePool, query: &SavedQuery) -> anyhow::Result<()> {
    let tags_json = query
        .tags
        .as_ref()
        .map(|t| serde_json::to_string(t).unwrap_or_default());

    let insert_query = "INSERT INTO saved_queries
                       (query_id, user_id, title, description, query_text, query_type, tags, is_favorite, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    sqlx::query(insert_query)
        .bind(&query.query_id)
        .bind(&query.user_id)
        .bind(&query.title)
        .bind(&query.description)
        .bind(&query.query_text)
        .bind(&query.query_type)
        .bind(&tags_json)
        .bind(query.is_favorite)
        .bind(&query.created_at)
        .bind(&query.updated_at)
        .execute(pool)
        .await?;

    tracing::info!("Saved query {} by user {}", query.query_id, query.user_id);
    Ok(())
}

/// Get user's saved queries
pub async fn get_user_queries(
    pool: &SqlitePool,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> anyhow::Result<(Vec<SavedQuery>, i64)> {
    let query = "SELECT query_id, user_id, title, description, query_text, query_type, tags, is_favorite, last_used, run_count, created_at, updated_at
                 FROM saved_queries
                 WHERE user_id = ?
                 ORDER BY last_used DESC NULLS LAST, created_at DESC
                 LIMIT ? OFFSET ?";

    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            String,
            String,
            Option<String>,
            bool,
            Option<String>,
            i32,
            String,
            String,
        ),
    >(query)
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let queries: Vec<SavedQuery> = rows
        .into_iter()
        .map(
            |(
                query_id,
                user_id,
                title,
                description,
                query_text,
                query_type,
                tags,
                is_favorite,
                last_used,
                run_count,
                created_at,
                updated_at,
            )| {
                let tags_vec = tags
                    .as_ref()
                    .and_then(|t| serde_json::from_str::<Vec<String>>(t).ok());

                SavedQuery {
                    query_id,
                    user_id,
                    title,
                    description,
                    query_text,
                    query_type,
                    tags: tags_vec,
                    is_favorite,
                    last_used,
                    run_count,
                    created_at,
                    updated_at,
                }
            },
        )
        .collect();

    // Get total count
    let count_query = "SELECT COUNT(*) FROM saved_queries WHERE user_id = ?";
    let total: (i64,) = sqlx::query_as(count_query)
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    Ok((queries, total.0))
}

/// Get favorite queries
pub async fn get_favorite_queries(
    pool: &SqlitePool,
    user_id: &str,
) -> anyhow::Result<Vec<SavedQuery>> {
    let query = "SELECT query_id, user_id, title, description, query_text, query_type, tags, is_favorite, last_used, run_count, created_at, updated_at
                 FROM saved_queries
                 WHERE user_id = ? AND is_favorite = 1
                 ORDER BY last_used DESC NULLS LAST
                 LIMIT 20";

    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            String,
            String,
            Option<String>,
            bool,
            Option<String>,
            i32,
            String,
            String,
        ),
    >(query)
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let queries: Vec<SavedQuery> = rows
        .into_iter()
        .map(
            |(
                query_id,
                user_id,
                title,
                description,
                query_text,
                query_type,
                tags,
                is_favorite,
                last_used,
                run_count,
                created_at,
                updated_at,
            )| {
                let tags_vec = tags
                    .as_ref()
                    .and_then(|t| serde_json::from_str::<Vec<String>>(t).ok());

                SavedQuery {
                    query_id,
                    user_id,
                    title,
                    description,
                    query_text,
                    query_type,
                    tags: tags_vec,
                    is_favorite,
                    last_used,
                    run_count,
                    created_at,
                    updated_at,
                }
            },
        )
        .collect();

    Ok(queries)
}

/// Toggle favorite status
pub async fn toggle_favorite(pool: &SqlitePool, query_id: &str) -> anyhow::Result<()> {
    let toggle_query = "UPDATE saved_queries SET is_favorite = NOT is_favorite WHERE query_id = ?";

    sqlx::query(toggle_query)
        .bind(query_id)
        .execute(pool)
        .await?;

    tracing::info!("Toggled favorite status for query {}", query_id);
    Ok(())
}

/// Update last used and increment run count
pub async fn record_query_execution(pool: &SqlitePool, query_id: &str) -> anyhow::Result<()> {
    let update_query =
        "UPDATE saved_queries SET last_used = ?, run_count = run_count + 1 WHERE query_id = ?";

    sqlx::query(update_query)
        .bind(Local::now().to_rfc3339())
        .bind(query_id)
        .execute(pool)
        .await?;

    tracing::debug!("Recorded execution for query {}", query_id);
    Ok(())
}

/// Search queries by title or tags
pub async fn search_queries(
    pool: &SqlitePool,
    user_id: &str,
    search_term: &str,
    limit: i64,
) -> anyhow::Result<Vec<SavedQuery>> {
    let search_pattern = format!("%{}%", search_term);
    let query = "SELECT query_id, user_id, title, description, query_text, query_type, tags, is_favorite, last_used, run_count, created_at, updated_at
                 FROM saved_queries
                 WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
                 ORDER BY last_used DESC NULLS LAST
                 LIMIT ?";

    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            String,
            String,
            Option<String>,
            bool,
            Option<String>,
            i32,
            String,
            String,
        ),
    >(query)
    .bind(user_id)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(&search_pattern)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let queries: Vec<SavedQuery> = rows
        .into_iter()
        .map(
            |(
                query_id,
                user_id,
                title,
                description,
                query_text,
                query_type,
                tags,
                is_favorite,
                last_used,
                run_count,
                created_at,
                updated_at,
            )| {
                let tags_vec = tags
                    .as_ref()
                    .and_then(|t| serde_json::from_str::<Vec<String>>(t).ok());

                SavedQuery {
                    query_id,
                    user_id,
                    title,
                    description,
                    query_text,
                    query_type,
                    tags: tags_vec,
                    is_favorite,
                    last_used,
                    run_count,
                    created_at,
                    updated_at,
                }
            },
        )
        .collect();

    Ok(queries)
}

/// Delete a saved query
pub async fn delete_query(pool: &SqlitePool, query_id: &str) -> anyhow::Result<()> {
    let delete_query = "DELETE FROM saved_queries WHERE query_id = ?";

    sqlx::query(delete_query)
        .bind(query_id)
        .execute(pool)
        .await?;

    tracing::info!("Deleted query {}", query_id);
    Ok(())
}
