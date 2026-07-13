use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use serde::Serialize;

/// Notebook owner verification result
#[derive(Clone, Debug)]
pub struct NotebookOwnership {
    pub notebook_id: String,
    pub user_id: String,
    pub is_owner: bool,
}

#[derive(Serialize)]
pub struct OwnershipError {
    pub error: String,
    pub message: String,
}

impl IntoResponse for OwnershipError {
    fn into_response(self) -> Response {
        use axum::http::StatusCode;
        use axum::response::IntoResponse;
        use axum::Json;

        (
            StatusCode::FORBIDDEN,
            Json(self),
        ).into_response()
    }
}

use axum::response::{IntoResponse, Response};

/// Permission level for notebook access
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum NotebookPermission {
    Owner,
    Editor,
    Viewer,
}

impl NotebookPermission {
    pub fn can_read(&self) -> bool {
        matches!(self, Self::Owner | Self::Editor | Self::Viewer)
    }

    pub fn can_write(&self) -> bool {
        matches!(self, Self::Owner | Self::Editor)
    }

    pub fn can_delete(&self) -> bool {
        matches!(self, Self::Owner)
    }

    pub fn can_share(&self) -> bool {
        matches!(self, Self::Owner)
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "owner" => Some(Self::Owner),
            "editor" => Some(Self::Editor),
            "viewer" => Some(Self::Viewer),
            _ => None,
        }
    }
}

/// Check if user owns a notebook
pub async fn check_notebook_owner(user_id: &str, notebook_id: &str) -> Result<bool, String> {
    // TODO: Query database when AppState has pool
    // For now, return true (implement with actual DB check later)
    tracing::debug!("Checking ownership: user={}, notebook={}", user_id, notebook_id);
    Ok(true) // Placeholder
}

/// Check user's permission level for a notebook
pub async fn check_notebook_permission(
    user_id: &str,
    notebook_id: &str,
) -> Result<NotebookPermission, String> {
    // TODO: Query notebook_access table when AppState has pool
    // For now, return Owner (implement with actual DB check later)
    tracing::debug!("Checking permission: user={}, notebook={}", user_id, notebook_id);
    Ok(NotebookPermission::Owner) // Placeholder
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_levels() {
        let owner = NotebookPermission::Owner;
        let editor = NotebookPermission::Editor;
        let viewer = NotebookPermission::Viewer;

        assert!(owner.can_read() && owner.can_write() && owner.can_delete() && owner.can_share());
        assert!(editor.can_read() && editor.can_write() && !editor.can_delete() && !editor.can_share());
        assert!(viewer.can_read() && !viewer.can_write() && !viewer.can_delete() && !viewer.can_share());
    }

    #[test]
    fn test_permission_from_str() {
        assert_eq!(NotebookPermission::from_str("owner"), Some(NotebookPermission::Owner));
        assert_eq!(NotebookPermission::from_str("editor"), Some(NotebookPermission::Editor));
        assert_eq!(NotebookPermission::from_str("viewer"), Some(NotebookPermission::Viewer));
        assert_eq!(NotebookPermission::from_str("invalid"), None);
    }
}
