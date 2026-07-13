# v1.2.0 Remote Deployment Implementation Plan

**Milestone:** Q4 2026 (July 13 - September 30, 2026)  
**Scope:** Complete authentication, CORS/CSRF, sessions, access control, audit trails  
**Estimated Effort:** 40-50 hours  
**Status:** IN PROGRESS

---

## Phase 1: Foundation (JWT + Local Auth) — 8 hours

### 1.1 JWT Token System ✅ (FIRST - unblocks everything)
- [x] Type definitions (already in enterprise_auth.rs)
- [ ] Implement JWT token generation (RS256 signing)
- [ ] Implement JWT token validation
- [ ] Token refresh logic
- [ ] Token expiration (15min access, 7day refresh)
- **Files:** `enterprise_auth.rs` (complete implementation)
- **Deliverable:** Working JWT tokens, can be verified by API endpoints

### 1.2 Local Authentication
- [ ] User registration endpoint (`POST /auth/register`)
- [ ] User login endpoint (`POST /auth/login`)
- [ ] Password hashing (bcrypt with 12 rounds)
- [ ] Password validation rules (min 12 chars, complexity)
- [ ] User persistence (in-memory HashMap → SQLite)
- **Files:** `enterprise_auth.rs`, `api/auth.rs` (new)
- **Deliverable:** Functional login/register with JWT tokens

### 1.3 Request Authentication Middleware
- [ ] Extract JWT from Authorization header
- [ ] Validate JWT signature and expiration
- [ ] Inject user context into request
- [ ] Handle invalid/expired tokens (401/403)
- **Files:** `middleware/auth.rs` (new)
- **Deliverable:** All API endpoints can verify user identity

---

## Phase 2: Security (CORS/CSRF + Sessions) — 8 hours

### 2.1 CORS Protection
- [ ] Configure CORS middleware
- [ ] Whitelist allowed origins (frontend URL)
- [ ] Restrict HTTP methods per endpoint
- [ ] Handle preflight requests (OPTIONS)
- [ ] Secure cookie headers (SameSite, HttpOnly)
- **Files:** `main.rs` (update router setup)
- **Deliverable:** Frontend can authenticate; cross-origin attacks blocked

### 2.2 CSRF Protection
- [ ] Generate CSRF tokens per session
- [ ] Return token in `/auth/csrf` endpoint
- [ ] Validate CSRF token in mutating requests (POST/PUT/DELETE)
- [ ] Store tokens in encrypted cookies
- **Files:** `middleware/csrf.rs` (new)
- **Deliverable:** Form-based attacks blocked

### 2.3 Session Management
- [ ] Session creation on successful auth
- [ ] Session timeout (8 hours idle, 30 days absolute)
- [ ] Session revocation on logout
- [ ] Concurrent session limits (5 per user)
- [ ] Session persistence (SQLite)
- **Files:** `enterprise_auth.rs` (extend), `db/sessions.rs` (new)
- **Deliverable:** Users stay logged in; sessions expire safely

---

## Phase 3: Access Control (RBAC + Notebook Permissions) — 12 hours

### 3.1 Database Schema
- [ ] Users table (id, email, password_hash, role, created_at)
- [ ] Sessions table (session_id, user_id, expires_at)
- [ ] Notebooks table (id, owner_id, title, created_at)
- [ ] NotebookAccess table (notebook_id, user_id, permission, created_at)
- [ ] AuditLog table (id, user_id, action, resource, timestamp)
- **Files:** `db/schema.sql` (new), `db/models.rs` (new)
- **Deliverable:** Persistent storage for all auth data

### 3.2 Notebook Ownership
- [ ] Notebooks have owner_id (must be logged-in user)
- [ ] Only owner can modify notebooks
- [ ] API enforces ownership checks
- **Files:** `api/notebooks.rs` (update)
- **Deliverable:** Users can only edit their own notebooks

### 3.3 Notebook Sharing
- [ ] Permission model: Owner, Editor, Viewer, None
- [ ] Share endpoint (`POST /notebooks/{id}/share`)
- [ ] Revoke access endpoint (`DELETE /notebooks/{id}/access/{user_id}`)
- [ ] List shared notebooks (`GET /notebooks/shared`)
- **Files:** `api/notebooks.rs` (add sharing), `db/models.rs`
- **Deliverable:** Users can share notebooks with others

### 3.4 RBAC Integration
- [ ] Map enterprise_auth roles to permissions
- [ ] Admin role: all access
- [ ] Manager role: team notebook access
- [ ] Member role: own + shared notebooks
- [ ] Guest role: view-only shared notebooks
- **Files:** `rbac.rs` (extend), `middleware/auth.rs`
- **Deliverable:** Role-based permission enforcement

---

## Phase 4: Audit Logging — 8 hours

### 4.1 Audit Log Capture
- [ ] Log all user actions: create/edit/delete notebook
- [ ] Log cell executions: who, when, success/failure
- [ ] Log authentication events: login, logout, failed attempts
- [ ] Log access control changes: permission grants/revokes
- **Files:** `db/audit_logs.rs` (new)
- **Deliverable:** Complete audit trail of all actions

### 4.2 Audit Log Queries
- [ ] Query logs by user
- [ ] Query logs by notebook
- [ ] Query logs by date range
- [ ] Export logs (CSV, JSON)
- **Files:** `api/audit.rs` (new)
- **Deliverable:** Compliance-ready audit reports

### 4.3 Log Retention
- [ ] Keep logs for 90 days by default
- [ ] Archive old logs
- [ ] Cleanup job (daily, remove >90 days)
- **Files:** `jobs/cleanup.rs` (new)
- **Deliverable:** Managed log storage

---

## Phase 5: Frontend Integration — 6 hours

### 5.1 Login Page
- [ ] Add login form to frontend
- [ ] Capture email + password
- [ ] POST to `/auth/login`
- [ ] Store JWT in localStorage
- [ ] Redirect to notebook editor
- **Files:** `frontend/src/pages/Login.tsx` (new)
- **Deliverable:** Functional login UI

### 5.2 Auth Header Injection
- [ ] Intercept all API requests
- [ ] Add `Authorization: Bearer {jwt}` header
- [ ] Handle 401/403 responses (redirect to login)
- **Files:** `frontend/src/hooks/useAuth.ts` (new), `frontend/src/api/` (update)
- **Deliverable:** All API calls authenticated

### 5.3 Protected Routes
- [ ] Wrap notebook editor with auth check
- [ ] Redirect unauthenticated users to login
- [ ] Show username in header
- [ ] Add logout button
- **Files:** `frontend/src/App.tsx` (update)
- **Deliverable:** UI respects authentication state

---

## Phase 6: Advanced Auth Providers — 8 hours (Optional for v1.2.0)

### 6.1 OAuth 2.0 (Google Workspace, Auth0)
- [ ] Implement OAuth 2.0 flow
- [ ] Exchange authorization code for token
- [ ] Fetch user info from provider
- [ ] Map provider claims to PrismNote roles
- **Files:** `enterprise_auth.rs` (complete OAuth methods)
- **Status:** Stub exists, needs implementation

### 6.2 LDAP/Active Directory
- [ ] Implement LDAP bind
- [ ] Query user attributes
- [ ] Map LDAP groups to PrismNote roles
- **Files:** `enterprise_auth.rs` (complete LDAP methods)
- **Status:** Stub exists, needs implementation

### 6.3 SAML 2.0 (Okta, OneLogin)
- [ ] Parse SAML responses
- [ ] Validate SAML assertions
- [ ] Extract user info and groups
- **Files:** `enterprise_auth.rs` (complete SAML methods)
- **Status:** Stub exists, needs implementation

---

## Build Order (Recommended Sequence)

1. **Phase 1.1 (JWT)** → Enables all other auth
2. **Phase 1.2 (Local Auth)** → Self-contained testing path
3. **Phase 3.1 (Database)** → Persistent storage (unblocks sessions + access control)
4. **Phase 1.3 (Middleware)** → All endpoints protected
5. **Phase 2.1-2.3 (CORS/CSRF/Sessions)** → Security hardening
6. **Phase 3.2-3.4 (Permissions)** → Access control
7. **Phase 4 (Audit)** → Compliance
8. **Phase 5 (Frontend)** → User-facing auth
9. **Phase 6 (Advanced)** → Optional enterprise features

---

## Dependencies Between Phases

```
JWT (1.1) ← FOUNDATION
  ↓
Database (3.1) ← STORAGE
  ↓
Sessions (2.3) + Local Auth (1.2) ← AUTHENTICATION
  ↓
Middleware (1.3) ← PROTECTION
  ↓
CORS/CSRF (2.1-2.2) + Permissions (3.2-3.4) ← SECURITY
  ↓
Audit (4) ← COMPLIANCE
  ↓
Frontend (5) ← USER EXPERIENCE
```

---

## Testing Strategy

### Unit Tests
- JWT token generation/validation
- Password hashing
- RBAC permission checks
- CSRF token generation

### Integration Tests
- Login flow end-to-end
- Notebook sharing and access control
- Audit log capture
- Session expiration

### Security Tests
- Invalid JWT should be rejected
- Expired tokens should be rejected
- CSRF tokens should be validated
- Users should not access other's notebooks

### Manual Testing
- Login with email + password
- Share notebook with another user
- View shared notebook as different user
- Verify audit logs
- Check JWT expiration

---

## Success Criteria for v1.2.0

- ✅ Users must authenticate before accessing notebooks
- ✅ Notebooks have owner; owner controls sharing
- ✅ Shared notebooks show correct permissions for each user
- ✅ CORS headers prevent browser-based attacks
- ✅ CSRF tokens protect form submissions
- ✅ Sessions expire after 8 hours inactivity
- ✅ All actions logged with user + timestamp
- ✅ Frontend has login page and respects auth state
- ✅ API returns 401 for missing auth, 403 for insufficient permissions
- ✅ Zero hardcoded credentials or secrets in code

---

## Deployment Checklist

- [ ] Enable authentication in environment (AUTH_ENABLED=true)
- [ ] Set JWT_SECRET to random 32-byte value
- [ ] Configure CORS_ORIGINS for frontend URL
- [ ] Initialize SQLite database with schema
- [ ] Set up daily cleanup job for audit logs
- [ ] Configure HTTPS (required for secure cookies)
- [ ] Test login flow in staging
- [ ] Document auth configuration for users
- [ ] Create admin user account for initial setup

---

## Timeline

- **Week 1 (Jul 14-20):** Phases 1.1-1.3 (JWT + Local Auth + Middleware)
- **Week 2 (Jul 21-27):** Phases 2 + 3.1 (Security + Database)
- **Week 3 (Jul 28-Aug 3):** Phases 3.2-3.4 (Permissions)
- **Week 4 (Aug 4-10):** Phase 4 (Audit) + Phase 5 (Frontend)
- **Week 5 (Aug 11-17):** Phase 6 (Optional) + Testing + Documentation
- **By Aug 31:** v1.2.0 Release Ready

---

## Next Action

Start Phase 1.1: JWT Token Implementation in `enterprise_auth.rs`
