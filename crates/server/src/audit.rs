use chrono;
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct AuditEvent {
    pub user_id: String,
    pub action: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub result: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub details: Option<String>,
}

impl AuditEvent {
    pub fn new(user_id: String, action: String) -> Self {
        AuditEvent {
            user_id,
            action,
            resource_type: None,
            resource_id: None,
            result: "success".to_string(),
            error_message: None,
            ip_address: None,
            user_agent: None,
            details: None,
        }
    }

    pub fn with_resource(mut self, resource_type: &str, resource_id: &str) -> Self {
        self.resource_type = Some(resource_type.to_string());
        self.resource_id = Some(resource_id.to_string());
        self
    }

    pub fn with_result(mut self, result: &str) -> Self {
        self.result = result.to_string();
        self
    }

    pub fn with_error(mut self, error: &str) -> Self {
        self.result = "failure".to_string();
        self.error_message = Some(error.to_string());
        self
    }

    pub fn with_ip_address(mut self, ip: String) -> Self {
        self.ip_address = Some(ip);
        self
    }

    pub fn with_user_agent(mut self, ua: String) -> Self {
        self.user_agent = Some(ua);
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details.to_string());
        self
    }
}

/// Log an audit event to the database
pub async fn log_event(pool: &SqlitePool, event: AuditEvent) -> anyhow::Result<()> {
    let log_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().to_rfc3339();

    let query = "INSERT INTO audit_logs (log_id, user_id, action, resource_type, resource_id, result, error_message, timestamp, ip_address, user_agent, details)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    sqlx::query(query)
        .bind(&log_id)
        .bind(&event.user_id)
        .bind(&event.action)
        .bind(&event.resource_type)
        .bind(&event.resource_id)
        .bind(&event.result)
        .bind(&event.error_message)
        .bind(&timestamp)
        .bind(&event.ip_address)
        .bind(&event.user_agent)
        .bind(&event.details)
        .execute(pool)
        .await?;

    tracing::debug!(
        "Audit log created: action={}, user={}, result={}",
        event.action,
        event.user_id,
        event.result
    );
    Ok(())
}

/// Query audit logs with optional filters
pub async fn query_logs(
    pool: &SqlitePool,
    user_id: Option<&str>,
    action: Option<&str>,
    resource_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> anyhow::Result<(Vec<serde_json::Value>, i64)> {
    let mut query = "SELECT log_id, user_id, action, resource_type, resource_id, result, error_message, timestamp, ip_address, user_agent, details FROM audit_logs WHERE 1=1".to_string();
    let mut count_query = "SELECT COUNT(*) as total FROM audit_logs WHERE 1=1".to_string();

    if let Some(uid) = user_id {
        query.push_str(&format!(" AND user_id = '{}'", uid));
        count_query.push_str(&format!(" AND user_id = '{}'", uid));
    }
    if let Some(act) = action {
        query.push_str(&format!(" AND action = '{}'", act));
        count_query.push_str(&format!(" AND action = '{}'", act));
    }
    if let Some(rt) = resource_type {
        query.push_str(&format!(" AND resource_type = '{}'", rt));
        count_query.push_str(&format!(" AND resource_type = '{}'", rt));
    }

    query.push_str(&format!(
        " ORDER BY timestamp DESC LIMIT {} OFFSET {}",
        limit, offset
    ));

    // Fetch logs
    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            Option<String>,
            String,
            Option<String>,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        ),
    >(&query)
    .fetch_all(pool)
    .await?;

    let logs: Vec<serde_json::Value> = rows.into_iter()
        .map(|(log_id, user_id, action, resource_type, resource_id, result, error_message, timestamp, ip_address, user_agent, details)| {
            json!({
                "log_id": log_id,
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "result": result,
                "error_message": error_message,
                "timestamp": timestamp,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details.and_then(|d| serde_json::from_str::<serde_json::Value>(&d).ok()),
            })
        })
        .collect();

    // Fetch total count
    let count_row = sqlx::query_as::<_, (i64,)>(&count_query)
        .fetch_one(pool)
        .await?;

    Ok((logs, count_row.0))
}

/// Cleanup old audit logs (default: 90 days)
pub async fn cleanup_old_logs(pool: &SqlitePool, days: i64) -> anyhow::Result<u64> {
    let cutoff = format!("datetime('now', '-{} days')", days);
    let query = format!("DELETE FROM audit_logs WHERE timestamp < {}", cutoff);

    let result = sqlx::query(&query).execute(pool).await?;

    tracing::info!("Cleaned up {} old audit logs", result.rows_affected());
    Ok(result.rows_affected())
}

// Common audit actions
pub const ACTION_LOGIN: &str = "LOGIN";
pub const ACTION_LOGOUT: &str = "LOGOUT";
pub const ACTION_FAILED_LOGIN: &str = "FAILED_LOGIN";
pub const ACTION_CREATE_NOTEBOOK: &str = "CREATE_NOTEBOOK";
pub const ACTION_UPDATE_NOTEBOOK: &str = "UPDATE_NOTEBOOK";
pub const ACTION_DELETE_NOTEBOOK: &str = "DELETE_NOTEBOOK";
pub const ACTION_EXECUTE_CELL: &str = "EXECUTE_CELL";
pub const ACTION_SHARE_NOTEBOOK: &str = "SHARE_NOTEBOOK";
pub const ACTION_REVOKE_ACCESS: &str = "REVOKE_ACCESS";
pub const ACTION_CREATE_GROUP: &str = "CREATE_GROUP";
pub const ACTION_ADD_GROUP_MEMBER: &str = "ADD_GROUP_MEMBER";
pub const ACTION_REMOVE_GROUP_MEMBER: &str = "REMOVE_GROUP_MEMBER";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_event_builder() {
        let event = AuditEvent::new("user123".to_string(), ACTION_LOGIN.to_string())
            .with_resource("notebook", "nb456")
            .with_ip_address("192.168.1.1".to_string())
            .with_user_agent("Mozilla/5.0".to_string());

        assert_eq!(event.user_id, "user123");
        assert_eq!(event.action, "LOGIN");
        assert_eq!(event.resource_type, Some("notebook".to_string()));
        assert_eq!(event.result, "success");
    }

    #[test]
    fn test_audit_event_with_error() {
        let event = AuditEvent::new("user123".to_string(), ACTION_LOGIN.to_string())
            .with_error("Invalid credentials");

        assert_eq!(event.result, "failure");
        assert_eq!(event.error_message, Some("Invalid credentials".to_string()));
    }
}
