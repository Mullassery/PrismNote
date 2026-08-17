use sqlx::SqlitePool;

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

/// Check if `user_id` owns `notebook_id`, against the real `notebooks`
/// table (previously this always returned `Ok(true)`, meaning any
/// authenticated user was treated as the owner of any notebook).
///
/// Notebooks are primarily stored as `.ipynb` files on disk and created via
/// an unauthenticated legacy endpoint, so most notebooks have no DB
/// ownership record at all. To avoid turning "no record yet" into "nobody
/// can ever access their own notebook" (which would be a worse regression
/// than the bug being fixed), the first authenticated user to have their
/// ownership checked against an ownerless notebook lazily claims it — one
/// `INSERT ... ON CONFLICT DO NOTHING`, so concurrent first-touches can't
/// both "win". After that, ownership is strictly enforced: every
/// subsequent caller (including a different user) is checked against the
/// real stored `owner_id`.
pub async fn check_notebook_owner(
    pool: &SqlitePool,
    user_id: &str,
    notebook_id: &str,
) -> Result<bool, String> {
    let existing: Option<String> =
        sqlx::query_scalar("SELECT owner_id FROM notebooks WHERE notebook_id = ?")
            .bind(notebook_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("failed to check notebook ownership: {e}"))?;

    if let Some(owner_id) = existing {
        return Ok(owner_id == user_id);
    }

    // No ownership record yet: lazily claim it for this user.
    let now = chrono::Local::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO notebooks (notebook_id, owner_id, title, created_at, updated_at) \
         VALUES (?, ?, ?, ?, ?) \
         ON CONFLICT(notebook_id) DO NOTHING",
    )
    .bind(notebook_id)
    .bind(user_id)
    .bind(notebook_id) // placeholder title; the real title lives in the .ipynb file
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| format!("failed to claim notebook ownership: {e}"))?;

    // Re-read: guards the race where two users' first-touch INSERTs land
    // concurrently — only one of them actually became the owner.
    let owner_id: Option<String> =
        sqlx::query_scalar("SELECT owner_id FROM notebooks WHERE notebook_id = ?")
            .bind(notebook_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("failed to verify notebook ownership: {e}"))?;

    Ok(owner_id.as_deref() == Some(user_id))
}

/// Check `user_id`'s permission level for `notebook_id` against the real
/// `notebooks`/`notebook_access` tables (previously this always returned
/// `Ok(NotebookPermission::Owner)` for every user on every notebook).
/// Fails closed: a user with neither an ownership record nor an explicit
/// `notebook_access` grant gets `Err`, not a default permission.
pub async fn check_notebook_permission(
    pool: &SqlitePool,
    user_id: &str,
    notebook_id: &str,
) -> Result<NotebookPermission, String> {
    if check_notebook_owner(pool, user_id, notebook_id).await? {
        return Ok(NotebookPermission::Owner);
    }

    let permission: Option<String> = sqlx::query_scalar(
        "SELECT permission FROM notebook_access WHERE notebook_id = ? AND user_id = ?",
    )
    .bind(notebook_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("failed to check notebook permission: {e}"))?;

    permission
        .and_then(|p| NotebookPermission::from_str(&p))
        .ok_or_else(|| "user has no access to this notebook".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query(
            "CREATE TABLE notebooks (
                notebook_id TEXT PRIMARY KEY NOT NULL,
                owner_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            "CREATE TABLE notebook_access (
                access_id TEXT PRIMARY KEY NOT NULL,
                notebook_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                permission TEXT NOT NULL,
                granted_at TEXT NOT NULL,
                UNIQUE(notebook_id, user_id)
            )",
        )
        .execute(&pool)
        .await
        .unwrap();
        pool
    }

    #[test]
    fn test_permission_levels() {
        let owner = NotebookPermission::Owner;
        let editor = NotebookPermission::Editor;
        let viewer = NotebookPermission::Viewer;

        assert!(owner.can_read() && owner.can_write() && owner.can_delete() && owner.can_share());
        assert!(
            editor.can_read() && editor.can_write() && !editor.can_delete() && !editor.can_share()
        );
        assert!(
            viewer.can_read() && !viewer.can_write() && !viewer.can_delete() && !viewer.can_share()
        );
    }

    #[test]
    fn test_permission_from_str() {
        assert_eq!(
            NotebookPermission::from_str("owner"),
            Some(NotebookPermission::Owner)
        );
        assert_eq!(
            NotebookPermission::from_str("editor"),
            Some(NotebookPermission::Editor)
        );
        assert_eq!(
            NotebookPermission::from_str("viewer"),
            Some(NotebookPermission::Viewer)
        );
        assert_eq!(NotebookPermission::from_str("invalid"), None);
    }

    #[tokio::test]
    async fn first_touch_lazily_claims_ownership() {
        let pool = test_pool().await;
        assert!(check_notebook_owner(&pool, "alice", "nb1").await.unwrap());
    }

    #[tokio::test]
    async fn a_different_user_is_not_the_owner_after_someone_else_claimed_it() {
        let pool = test_pool().await;
        assert!(check_notebook_owner(&pool, "alice", "nb1").await.unwrap());
        // Bug being fixed: this used to unconditionally return `Ok(true)`
        // for ANY user on ANY notebook.
        assert!(!check_notebook_owner(&pool, "mallory", "nb1").await.unwrap());
    }

    #[tokio::test]
    async fn shared_editor_gets_write_but_not_delete() {
        let pool = test_pool().await;
        assert!(check_notebook_owner(&pool, "alice", "nb1").await.unwrap());
        sqlx::query(
            "INSERT INTO notebook_access (access_id, notebook_id, user_id, permission, granted_at) \
             VALUES ('a1', 'nb1', 'bob', 'editor', '2026-01-01T00:00:00Z')",
        )
        .execute(&pool)
        .await
        .unwrap();

        let perm = check_notebook_permission(&pool, "bob", "nb1")
            .await
            .unwrap();
        assert_eq!(perm, NotebookPermission::Editor);
        assert!(perm.can_write() && !perm.can_delete());
    }

    #[tokio::test]
    async fn user_with_no_grant_is_denied_not_defaulted_to_owner() {
        let pool = test_pool().await;
        assert!(check_notebook_owner(&pool, "alice", "nb1").await.unwrap());
        // Bug being fixed: this used to unconditionally return
        // `Ok(NotebookPermission::Owner)` for a user with no grant at all.
        let result = check_notebook_permission(&pool, "mallory", "nb1").await;
        assert!(result.is_err());
    }
}
