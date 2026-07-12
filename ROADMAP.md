# PrismNote Development Roadmap

**Current Version:** v1.0.0  
**Last Updated:** July 2026  
**Status:** Local data exploration notebook; remote deployment in development

---

## ✅ Completed Milestones (v1.0.0 - v1.0.2)

### v1.0.0 — Core Notebook ✅
- ✅ Local-first data exploration
- ✅ Data Explorer (stats, distributions)
- ✅ No-code chart building
- ✅ Python execution (Jupyter kernel)
- ✅ SQL execution (DuckDB)
- ✅ File import/export (Parquet, CSV)
- ✅ Jupyter compatibility

### v1.0.1 — Initial Security ✅
- ✅ **HIGH:** Pin all 21 dependencies
- ✅ Dependency versioning for reproducibility

### v1.0.2 — Security Hardening ✅
- ✅ **CRITICAL:** SQL injection protection (keyword blocking)
- ✅ **CRITICAL:** File access control (path traversal prevention)
- ✅ **HIGH:** Input validation with Pydantic models
  - NotebookRequest validation
  - FileAccessValidator
- ✅ **MEDIUM:** Rate limiting foundation
  - Token bucket algorithm
  - Per-client rate limiting
  - Query rate limiting
  - Concurrent operation limits
- ✅ **MEDIUM:** Error handling middleware
  - SecurityHeadersMiddleware (X-Frame-Options, CSP)
  - RequestLoggingMiddleware
- ✅ **Audit:** Security audit completed (SECURITY_AUDIT.md)
- ✅ **Error Messages:** 10 detailed error types with recovery steps

---

## 🔒 Security Implementation Status

### CRITICAL Issues — ✅ FIXED (v1.0.2)
- [x] SQL injection (users could run DROP/DELETE/INSERT)
  - **Impact:** Data loss attacks
  - **Fix:** Keyword blocking with suspicious pattern detection
  - **Timeline:** ✅ v1.0.2

- [x] File access vulnerabilities
  - **Impact:** Directory traversal attacks
  - **Fix:** Path validation with resolve() checks
  - **Timeline:** ✅ v1.0.2

### HIGH Priority Issues — ✅ FIXED
- [x] Floating dependency versions
  - **Impact:** Supply chain vulnerability
  - **Fix:** Pinned all 21 dependencies
  - **Timeline:** ✅ v1.0.1

- [x] No input validation
  - **Impact:** Code injection, malformed notebooks
  - **Fix:** Pydantic models for all inputs
  - **Timeline:** ✅ v1.0.2

### MEDIUM Priority Issues — ✅ FIXED
- [x] No DoS protection
  - **Impact:** Resource exhaustion attacks
  - **Fix:** Rate limiting (token bucket, per-client, concurrent limits)
  - **Timeline:** ✅ v1.0.2

- [x] Information disclosure in errors
  - **Impact:** Stack traces leak internal details
  - **Fix:** ErrorHandlingMiddleware with safe error responses
  - **Timeline:** ✅ v1.0.2

- [x] No security headers
  - **Impact:** XSS, clickjacking vulnerabilities
  - **Fix:** SecurityHeadersMiddleware (CORS, CSP, X-Frame-Options)
  - **Timeline:** ✅ v1.0.2

- [x] No user-friendly error messages
  - **Impact:** Poor debugging of notebook failures
  - **Fix:** Added error_messages.py with 10 notebook/query error types
  - **Timeline:** ✅ v1.0.2

---

## 📋 Roadmap

### v1.1.0 (Q3 2026) — Documentation + UX
- [ ] Better local-only messaging
- [ ] Performance optimization for large files
- [ ] Enhanced error messages
- [ ] User guides for common workflows

### v1.2.0 (Q4 2026) — CRITICAL: Remote Deployment Ready
- [ ] CORS/CSRF protection (currently missing)
- [ ] Authentication/authorization system
- [ ] Notebook access control
- [ ] User session management
- [ ] Audit trails for all changes
- **Then and only then: Safe for internet exposure**

### v1.3.0 (Q1 2027) — Cloud Integration
- [ ] BigQuery connection (read-only)
- [ ] Snowflake connection (read-only)
- [ ] Cloud sync (optional)

### v1.4.0 (Q2 2027) — Advanced Features
- [ ] Git integration (version history)
- [ ] Iceberg dataset support
- [ ] Global cross-file search
- [ ] Spark integration (if demand exists)

### v2.0.0 (Q2 2027) — Team & Sharing
- [ ] Notebook sharing
- [ ] Real-time collaboration
- [ ] Team access control
- [ ] Notebook organization (folders, tags)

---

## 🚨 IMPORTANT: Internet Deployment Warning

**DO NOT expose v1.0.x to the internet without additional hardening.**

Required for internet-safe deployment:
- ✅ SQL injection protection (v1.0.2)
- ✅ File access control (v1.0.2)
- ✅ Input validation (v1.0.2)
- ✅ Rate limiting (v1.0.2)
- ✅ Error handling (v1.0.2)
- ⏳ CORS/CSRF protection (v1.2.0)
- ⏳ Authentication (v1.2.0)
- ⏳ Authorization (v1.2.0)

**Safe to deploy:** v1.2.0 and later

---

## Known Limitations (v1.0.2)

### 🟢 Working (Local Only)
- ✅ Local data exploration
- ✅ DuckDB SQL execution
- ✅ Python notebook execution
- ✅ File I/O (local files only)
- ✅ Chart building

### 🔴 NOT Implemented (Despite README Claims in v1.0.0)
- ❌ Cloud warehouse connectors (coming v1.3.0)
- ❌ Spark integration (coming v1.4.0)
- ❌ Ollama local AI (not planned v1.2.0)
- ❌ Git integration (coming v1.4.0)
- ❌ Job/deployment features (coming v1.4.0)
- ❌ Global cross-file search (coming v1.4.0)
- ❌ Team collaboration (coming v2.0.0)

### 🟡 Experimental/Incomplete
- 🔄 Python kernel (works but limited sandbox)
- 🔄 SQL safety (blocked keywords, not full SQL parser)

### 🚫 Not Planned
- ❌ Real-time streaming (batch processing only)
- ❌ Mobile app
- ❌ IDE plugins

---

## Dependencies

All pinned to exact versions for reproducibility:
```
fastapi==0.104.1
pydantic==2.4.2
sqlalchemy==2.0.23
duckdb==0.9.0
```

See `pyproject.toml` for full list.
