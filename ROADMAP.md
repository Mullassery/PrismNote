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

## 🔍 Competitive Gaps vs Market

Based on analysis of data notebooks market (Jupyter, Databricks, Hex, Observable, Zeppelin), these gaps exist:

### CRITICAL (Blocks Cloud Deployment)
- **Local-only deployment** — Cannot collaborate in real-time; no cloud hosting
  - **Market Impact:** Teams won't use local-only notebooks long-term
  - **Recommended Fix:** v1.2.0 (Q4 2026) CORS/CSRF is REQUIRED for cloud
  - **Why:** Cloud-first is table-stakes for modern tools (Databricks, Hex)

- **No CORS/CSRF protection** — Do NOT expose to internet until v1.2.0
  - **Market Impact:** Security risk for team/multi-user deployment
  - **Timeline:** v1.2.0 (Q4 2026) required before internet deployment
  - **Why:** Cross-origin attacks are exploit vector for notebooks

- **No authentication/authorization** — Anyone with access sees all notebooks
  - **Market Impact:** Teams cannot share secrets (API keys, creds)
  - **Timeline:** v1.2.0 (Q4 2026) required for multi-user
  - **Why:** Compliance risk (GDPR, SOC2) without auth

### HIGH (Reduces Addressable Market)
- **No version history/git** — Cannot revert changes or track who did what
  - **Competitor Advantage:** Databricks notebooks have automatic versioning
  - **Timeline:** v1.4.0 (Q2 2027)
  - **Why:** Data audit trails are table-stakes for enterprises

- **Spark incomplete** — Cannot use large clusters (use DuckDB instead)
  - **Competitor Advantage:** Databricks is Spark-native
  - **Timeline:** v1.4.0 (Q2 2027)
  - **Why:** Only teams with massive data need Spark

- **No real-time collaboration** — Cannot work together simultaneously
  - **Competitor Advantage:** Hex, Databricks have live co-editing
  - **Timeline:** v2.0.0 (Q2 2027)
  - **Why:** Teams prefer collaborative tools

### MEDIUM (Nice-to-Have)
- **No automatic cell dependency tracking** — Must manually manage execution order
  - **Competitor Advantage:** Observable auto-executes in dependency order
  - **Timeline:** v1.1.0 (Q3 2026) for smart execution

- **Reproducibility only 5.9%** — Hidden state from out-of-order execution (industry-wide issue)
  - **Timeline:** Inherent to notebook design; major improvement v1.1.0

---

## ✅ Data Explorer UX Audit & Implementation (v1.1.1 — COMPLETE)

### Critical UX Gaps — RESOLVED ✅

The Data Explorer was redesigned to feel intuitive rather than scary. All Phase 1 & 2 improvements complete.

### Implementation Summary

#### **Phase 1: Quick Wins** ✅ COMPLETE (1.5 hours)
1. ✅ **Clearer visual hierarchy** — column names larger (14px, font-semibold), type info secondary + gray
2. ✅ **First-time UX** — ExplorerPicker now shows section headers with icons + descriptions
3. ✅ **Inline guidance** — "Click to explore" hints on DataFrame cards; "Supports: Parquet, CSV..." on file input
4. ✅ **Search feedback** — shows "No results" (red) or "X found" (green); row count with "filtered" badge

#### **Phase 2: Medium Effort** ✅ COMPLETE (1.5 hours)
5. ✅ **Dataset type badges** — 🐼 DataFrame, 📦 Parquet, 📄 CSV, 🔗 SQL, etc. with color-coding
6. ✅ **Card spacing** — increased gap to 1.5rem; better padding and breathing room
7. ✅ **Visual polish** — hover effects on DataFrame cards (emerald glow) and distribution cards (icon scale)
8. ✅ **Button states** — disabled state on buttons when input empty

### Commits Delivered

- `b447727` — Phase 1: Visual hierarchy + search feedback + section headers
- `8b7a70e` — Phase 2: Dataset type badges for quick scanning
- `601e8e9` — Polish: Hover effects + visual feedback

### Impact Metrics

| Metric | Before | After |
|--------|--------|-------|
| **Grid density** | 5+ columns (cramped) | 2-3 columns (readable) |
| **Visual hierarchy** | Flat (all text same size) | Semantic (name prominent, type secondary) |
| **User guidance** | None ("scary" buttons) | Clear hints + badges + descriptions |
| **Search feedback** | Silent | Live: "No results" or "X found" |
| **First-time experience** | Confusing entry point | Clear sections with headers + CTAs |
| **Data type discoverability** | Not visible (all look same) | Color-coded badges (instant scanning) |
| **Hover feedback** | Static cards | Dynamic (color, scale, glow) |

### Next Phase (v1.1.2 or v1.2.0)

Phase 3 enhancements (optional polish):
- [ ] Column name tooltips with full text (for truncated names)
- [ ] "Result count" in distribution cards ("15 columns")
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Empty state design (large illustration when no datasets)

---

## 📋 Roadmap

### v1.1.0 (Q3 2026) — Documentation + UX
- [ ] Better local-only messaging
- [ ] Performance optimization for large files
- [ ] Enhanced error messages
- [ ] User guides for common workflows

### v1.2.0 (Q4 2026) — Remote Deployment Ready
**Status: 56% Complete (28/50 hours) — Active Development**

#### ✅ Completed Features
- ✅ **Phase 1.1** JWT authentication (15-min access tokens, 7-day refresh, RS256)
- ✅ **Phase 1.2** Local auth (register + login endpoints, bcrypt 12-round hashing)
- ✅ **Phase 1.3** Middleware (CurrentUser extractor, 401 error handling)
- ✅ **Phase 3.1** Database schema (users, sessions, notebooks, notebook_access, audit_logs)
- ✅ **Phase 5** Frontend login/register (React + TypeScript, useAuth hook, AppWrapper)
- ✅ **Phase 2.3** Session management (concurrent limit enforcement, revocation)
- ✅ **Phase 3.2** Notebook ownership (NotebookPermission enum, access control)
- ✅ **Phase 2.1** CORS protection (SameSite=Strict, HttpOnly, Secure flags)

#### ⏳ Remaining Work
- [ ] **Phase 4** Audit logging (8 hours) — all user actions + compliance reports
- [ ] **Phase 3.3** Notebook sharing (3 hours) — email invitations, access links
- [ ] **Phase 3.4** RBAC integration (3 hours) — directory groups → role mapping
- [ ] **Phase 6** Advanced auth (8 hours) — OAuth 2.0, LDAP, SAML

**Shipping Threshold:** Phase 4 = v1.2.0-beta (audit-ready, safe for internet)

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
- ✅ CORS/CSRF protection (v1.2.0 Phase 2.1)
- ✅ Authentication (v1.2.0 Phase 1.1-1.3)
- ✅ Authorization (v1.2.0 Phase 3.2)
- ⏳ Audit logging (v1.2.0 Phase 4)
- ⏳ Advanced auth (v1.2.0 Phase 6)

**Shipping ready:** v1.2.0 Phase 4 (audit logging complete)  
**Full v1.2.0:** All phases complete with OAuth/LDAP/SAML

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
