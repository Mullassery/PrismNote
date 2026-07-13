-- ════════════════════════════════════════════════════════════════════════════
-- PrismNote v1.2.0 Database Schema (SQLite)
-- ════════════════════════════════════════════════════════════════════════════

-- Users table: stores authenticated users
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Member',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Sessions table: tracks active user sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    jwt_token TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notebooks table: stores notebook metadata
CREATE TABLE IF NOT EXISTS notebooks (
    notebook_id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by TEXT,
    is_public BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notebook access control: tracks who can access which notebooks
CREATE TABLE IF NOT EXISTS notebook_access (
    access_id TEXT PRIMARY KEY NOT NULL,
    notebook_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL, -- 'owner', 'editor', 'viewer'
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by TEXT,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(notebook_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(notebook_id, user_id)
);

-- Audit logs: tracks all user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'LOGIN', 'LOGOUT', 'CREATE_NOTEBOOK', 'EXECUTE_CELL', etc.
    resource_type TEXT, -- 'notebook', 'cell', 'database', etc.
    resource_id TEXT,
    result TEXT NOT NULL DEFAULT 'success', -- 'success', 'failure'
    error_message TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON metadata
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Groups: for RBAC (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS groups (
    group_id TEXT PRIMARY KEY NOT NULL,
    group_name TEXT UNIQUE NOT NULL,
    description TEXT,
    role TEXT NOT NULL DEFAULT 'Member', -- 'Admin', 'Editor', 'Viewer'
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Group membership: tracks which users belong to which groups
CREATE TABLE IF NOT EXISTS group_members (
    member_id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(group_id, user_id)
);

-- Execution history: tracks cell execution metadata (v1.2.1)
CREATE TABLE IF NOT EXISTS execution_history (
    execution_id TEXT PRIMARY KEY NOT NULL,
    notebook_id TEXT NOT NULL,
    cell_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    execution_status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout'
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_ms INTEGER NOT NULL,
    execution_count INTEGER,
    rows_affected INTEGER,
    memory_mb REAL,
    cpu_percent REAL,
    error_message TEXT,
    output_summary TEXT, -- JSON summary of outputs
    code_preview TEXT, -- First 500 chars of code
    FOREIGN KEY (notebook_id) REFERENCES notebooks(notebook_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Saved queries: bookmarks for frequently used queries (v1.2.1)
CREATE TABLE IF NOT EXISTS saved_queries (
    query_id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL DEFAULT 'sql', -- 'sql', 'python'
    tags TEXT, -- JSON array of tags
    is_favorite BOOLEAN NOT NULL DEFAULT 0,
    last_used DATETIME,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notebooks_owner_id ON notebooks(owner_id);
CREATE INDEX IF NOT EXISTS idx_notebook_access_user_id ON notebook_access(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_access_notebook_id ON notebook_access(notebook_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_role ON groups(role);
CREATE INDEX IF NOT EXISTS idx_execution_history_notebook_id ON execution_history(notebook_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_cell_id ON execution_history(cell_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_user_id ON execution_history(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_start_time ON execution_history(start_time);
CREATE INDEX IF NOT EXISTS idx_execution_history_status ON execution_history(execution_status);
CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_queries_is_favorite ON saved_queries(is_favorite);
CREATE INDEX IF NOT EXISTS idx_saved_queries_created_at ON saved_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_queries_last_used ON saved_queries(last_used);
