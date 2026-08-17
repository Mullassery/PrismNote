use anyhow::Result;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub user_id: String,
    pub jwt_token: String,
    pub created_at: String,
    pub expires_at: String,
    pub last_activity: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_active: bool,
}

pub struct SessionManager {
    pool: SqlitePool,
}

impl SessionManager {
    pub fn new(pool: SqlitePool) -> Self {
        SessionManager { pool }
    }

    /// Create a new session for a user
    pub async fn create_session(
        &self,
        user_id: &str,
        jwt_token: &str,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Result<SessionData> {
        let session_id = format!("sess-{}", Uuid::new_v4());
        let now = Utc::now();
        let expires_at = now + Duration::hours(8); // 8 hour idle timeout
        let max_duration = now + Duration::days(30); // 30 day absolute max

        let expiry = if expires_at < max_duration {
            expires_at
        } else {
            max_duration
        };

        sqlx::query(
            "INSERT INTO sessions (session_id, user_id, jwt_token, created_at, expires_at, last_activity, ip_address, user_agent, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&session_id)
        .bind(user_id)
        .bind(jwt_token)
        .bind(now.to_rfc3339())
        .bind(expiry.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(&ip_address)
        .bind(&user_agent)
        .execute(&self.pool)
        .await?;

        Ok(SessionData {
            session_id,
            user_id: user_id.to_string(),
            jwt_token: jwt_token.to_string(),
            created_at: now.to_rfc3339(),
            expires_at: expiry.to_rfc3339(),
            last_activity: now.to_rfc3339(),
            ip_address,
            user_agent,
            is_active: true,
        })
    }

    /// Validate a session (check if active and not expired)
    pub async fn validate_session(&self, session_id: &str) -> Result<bool> {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sessions WHERE session_id = ? AND is_active = 1 AND expires_at > datetime('now')"
        )
        .bind(session_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.0 > 0)
    }

    /// Get session by ID
    pub async fn get_session(&self, session_id: &str) -> Result<Option<SessionData>> {
        let row = sqlx::query_as::<_, (String, String, String, String, String, String, Option<String>, Option<String>, bool)>(
            "SELECT session_id, user_id, jwt_token, created_at, expires_at, last_activity, ip_address, user_agent, is_active
             FROM sessions WHERE session_id = ?"
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| SessionData {
            session_id: r.0,
            user_id: r.1,
            jwt_token: r.2,
            created_at: r.3,
            expires_at: r.4,
            last_activity: r.5,
            ip_address: r.6,
            user_agent: r.7,
            is_active: r.8,
        }))
    }

    /// Update last activity time for a session
    pub async fn update_activity(&self, session_id: &str) -> Result<()> {
        sqlx::query("UPDATE sessions SET last_activity = datetime('now') WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Revoke a session (logout)
    pub async fn revoke_session(&self, session_id: &str) -> Result<()> {
        sqlx::query("UPDATE sessions SET is_active = 0 WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Revoke all sessions for a user
    pub async fn revoke_user_sessions(&self, user_id: &str) -> Result<()> {
        sqlx::query("UPDATE sessions SET is_active = 0 WHERE user_id = ?")
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get active sessions for a user
    pub async fn get_user_sessions(&self, user_id: &str) -> Result<Vec<SessionData>> {
        let rows = sqlx::query_as::<_, (String, String, String, String, String, String, Option<String>, Option<String>, bool)>(
            "SELECT session_id, user_id, jwt_token, created_at, expires_at, last_activity, ip_address, user_agent, is_active
             FROM sessions WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')"
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| SessionData {
                session_id: r.0,
                user_id: r.1,
                jwt_token: r.2,
                created_at: r.3,
                expires_at: r.4,
                last_activity: r.5,
                ip_address: r.6,
                user_agent: r.7,
                is_active: r.8,
            })
            .collect())
    }

    /// Cleanup expired sessions (run periodically)
    pub async fn cleanup_expired(&self) -> Result<u64> {
        let result =
            sqlx::query("UPDATE sessions SET is_active = 0 WHERE expires_at <= datetime('now')")
                .execute(&self.pool)
                .await?;

        Ok(result.rows_affected())
    }

    /// Enforce concurrent session limit for a user (max N sessions)
    pub async fn enforce_session_limit(&self, user_id: &str, max_sessions: i64) -> Result<()> {
        let sessions = sqlx::query_as::<_, (String,)>(
            "SELECT session_id FROM sessions WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
             ORDER BY last_activity DESC"
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        // Revoke older sessions if limit exceeded
        if sessions.len() > max_sessions as usize {
            for session in sessions.iter().skip(max_sessions as usize) {
                self.revoke_session(&session.0).await?;
            }
        }

        Ok(())
    }
}
