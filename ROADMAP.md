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

## 🎨 Data Explorer UX Audit (v1.1.0 → v1.1.1)

### Critical UX Gaps Identified

The Data Explorer currently feels "scary" rather than intuitive due to several design issues that create cognitive overload for new users:

#### **1. Visual Overwhelm — Dense Column Grid**
- Desktop grid uses `minmax(260px, 1fr)` resulting in 5+ cramped columns at 1440px
- Each card has multiple layers: header, stats, buttons, metadata (no clear hierarchy)
- **Impact:** New users see a wall of data cards with unclear entry point
- **Severity:** HIGH (blocks adoption)

#### **2. Unclear Information Hierarchy**
- Dataset name, row count, column count, modified date all mixed on card header
- No visual distinction between "main info" (name) and "metadata" (modified)
- Buttons (Preview, SQL, Edit, Delete) all equal visual weight but different importance
- **Impact:** Users don't know what to look at or click first
- **Severity:** HIGH

#### **3. Scary Action Complexity**
- 3–4 action buttons per card with no primary CTA designation
- No inline help text explaining what each button does
- Hovering reveals nothing; clicking is only exploration method
- **Impact:** Users fear clicking the wrong button and "breaking" something
- **Severity:** HIGH

#### **4. Poor First-Time User Experience**
- No empty state message if no datasets loaded
- No inline guidance ("Click Preview to see data", "Run SQL to query")
- "+" button to add datasets is tiny and at bottom of view
- **Impact:** Users land on explorer with zero clues how to start
- **Severity:** CRITICAL (first impression)

#### **5. Dense Metadata Display**
- Stats "Rows: 150K | Columns: 42" crammed into single line
- No visual breathing room between information layers
- Long dataset names truncated with no tooltip fallback
- **Impact:** Illegible on small screens; cluttered on large screens
- **Severity:** MEDIUM

#### **6. Confusing SQL vs Preview Distinction**
- Both "Preview" and "Run SQL" buttons on same card
- No guidance on when to use each
- Users might expect SQL to be a tab/panel, not a modal
- **Impact:** Cognitive load on decision-making
- **Severity:** MEDIUM

#### **7. Silent Search Filtering**
- Search bar at top with no results count or feedback
- No "0 results" message when filtering returns nothing
- Doesn't feel responsive or working
- **Impact:** Users wonder if search is broken
- **Severity:** MEDIUM

#### **8. No Visual Dataset Type Distinction**
- All datasets look identical (CSV, Parquet, SQL query, DataFrame)
- No icons or badges to distinguish them
- **Impact:** Users can't scan and find what they want quickly
- **Severity:** MEDIUM

### Recommended Fixes (Priority Order)

#### **Phase 1: Quick Wins** (High Impact, Low Effort) — v1.1.1
1. **Clearer visual hierarchy** — name larger + bold, metadata smaller + gray (10 min)
2. **Primary CTA per card** — make "Preview" prominent (blue), hide others in ⋮ menu (30 min)
3. **Inline help tooltips** — hover shows "Preview — See first 100 rows" (20 min)
4. **Search feedback** — show "3 datasets found" or "No results for 'xyz'" (15 min)

#### **Phase 2: Medium Effort** (High Impact) — v1.1.2 or v1.2.0
5. **Dataset type badges** — 📄 CSV, 🗃️ Parquet, 🔗 SQL Table, 🐼 DataFrame (45 min)
6. **Card spacing** — increase gap to 24px, more vertical padding (15 min)
7. **Empty state design** — large illustration + "No data sources" + CTA (30 min)

#### **Phase 3: Polish** (Nice-to-Have) — v1.2.0+
8. **Action menu redesign** — Preview (primary) + "More actions" (⋮) with Edit, Delete, Share (30 min)
9. **Column name tooltips** — show full name on truncated columns (15 min)
10. **Result count in cards** — "15 columns" label under dataset name (10 min)

### Implementation Plan

**v1.1.1 (Week of July 14, 2026)**
- [ ] Update DataExplorer.tsx card component with semantic hierarchy
  - Move stats to secondary position with smaller text
  - Make Preview button prominent (primary color)
  - Move Edit/Delete to ⋮ menu
- [ ] Add aria-label descriptions to all action buttons
- [ ] Add 3 tooltip descriptions (Preview, SQL, Menu)
- [ ] Update search logic to show result count
- [ ] Add "no results" empty state for search

**v1.1.2 (Optional – Week of July 21, 2026)**
- [ ] Add dataset type detection and badges
- [ ] Increase card spacing (gap-6)
- [ ] Design + implement empty state screen
- [ ] Add column count to card

**v1.2.0 (Q4 2026)**
- [ ] Full action menu redesign (Preview + More)
- [ ] Column name tooltips with full text
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

### Estimate

| Phase | Effort | Timeline |
|-------|--------|----------|
| Phase 1 (Quick Wins) | 1.5 hours | v1.1.1 (same release) |
| Phase 2 (Medium) | 1.5 hours | v1.1.2 or v1.2.0 |
| Phase 3 (Polish) | 1 hour | v1.2.0+ |

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
