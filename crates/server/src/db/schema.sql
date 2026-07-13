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
