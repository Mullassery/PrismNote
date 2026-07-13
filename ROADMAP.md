# PrismNote Development Roadmap

**Current Version:** v1.2.1  
**Last Updated:** July 14, 2026  
**Status:** ✅ v1.2.1 released · ✅ v1.3.1 Chainlit UI complete · 🔨 v1.3.0 (Data Catalog & Governance ~22/24h)

---

## 🚀 Latest Releases

### v1.2.1 (July 2026) — Premium UX Features ✅ RELEASED
- ✅ Result Caching — 256 MB in-memory cache, LRU eviction, TTL-based
- ✅ SQL Autocomplete — 30+ keywords, functions, table/column completion
- ✅ Execution History — track cell performance (duration, memory, errors)
- ✅ Query Bookmarks — save, favorite, search queries with run statistics
- ✅ Data Preview Stats — column profiling, null analysis, distributions
- ✅ Frontend Components — ExecutionHistoryPanel, QueryBookmarksPanel
- ✅ 10 new API endpoints for query intelligence

### v1.2.0 (July 2026) — Remote Deployment Ready ✅ SHIPPING
- ✅ Multi-user JWT authentication (15-min access, 7-day refresh)
- ✅ Session management with concurrent limits
- ✅ Notebook ownership & permission controls
- ✅ Email-based sharing with revocation
- ✅ RBAC with teams/groups
- ✅ Comprehensive audit logging (90-day retention)
- ✅ CORS/CSRF protection with secure cookies

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
**Status: 70% Complete (35/50 hours) — BETA READY**

#### ✅ v1.2.0-BETA Features (Shipping Threshold Reached)
- ✅ **Phase 1.1** JWT authentication (15-min access tokens, 7-day refresh, RS256)
- ✅ **Phase 1.2** Local auth (register + login endpoints, bcrypt 12-round hashing)
- ✅ **Phase 1.3** Middleware (CurrentUser extractor, 401 error handling)
- ✅ **Phase 3.1** Database schema (users, sessions, notebooks, notebook_access, audit_logs)
- ✅ **Phase 5** Frontend login/register (React + TypeScript, useAuth hook, AppWrapper)
- ✅ **Phase 2.3** Session management (concurrent limit enforcement, revocation)
- ✅ **Phase 3.2** Notebook ownership (NotebookPermission enum, access control)
- ✅ **Phase 2.1** CORS protection (SameSite=Strict, HttpOnly, Secure flags)
- ✅ **Phase 3.3** Notebook sharing (email-based invitations, revoke access)
- ✅ **Phase 3.4** RBAC integration (groups, group membership, admin controls)
- ✅ **Phase 4** Audit logging (comprehensive audit trail, 90-day retention, admin stats)

#### ⏳ Remaining for v1.2.0-FULL (22 hours)
- [ ] **Phase 6** Advanced auth (8 hours) — OAuth 2.0, LDAP, SAML
- [ ] **Documentation & Guides** (7 hours) — auth setup, deployment, migration
- [ ] **Wrap-up & Polish** (7 hours) — final testing, edge cases

**Shipping Status:** v1.2.0-beta ✅ Ready NOW (fully functional, audit-compliant)

### v1.2.1 (Q4 2026) — Premium UX Features  
**Status: 100% COMPLETE ✅ — Ready to Ship**

#### ✅ All 5 Quick Wins + UI Integration Complete
- ✅ **Result Caching** (2h) — in-memory query memoization, 256 MB, LRU eviction
  - Endpoints: `/cache/stats`, `/cache/clear`
  - <1ms response time for cached queries
- ✅ **SQL Autocomplete** (3h) — 30+ keywords, functions, smart completions
  - Endpoint: `/api/sql/complete`
  - Integrated into Monaco editor (SQL + Python magic cells)
  - Throttled to prevent server hammering
- ✅ **Execution History** (3h) — duration, memory, errors, statistics
  - Endpoints: `/notebooks/:id/cells/:cell_id/executions`, `/notebooks/:id/execution-stats`
  - New component: ExecutionHistoryPanel (shows status, duration, rows, memory, errors)
- ✅ **Query Bookmarks** (2h) — save, favorites, search, history tracking
  - Endpoints: `/queries`, `/queries/favorites`, `/queries/search`, `/queries/:id`
  - New component: QueryBookmarksPanel (manage bookmarked queries)
- ✅ **Data Preview Stats** (2h) — column profiling, null analysis, distributions
  - Endpoints: `/data/preview`, `/data/column-stats`

#### ✅ Frontend UI Integration (3h)
- ✅ SQL autocomplete wired to Monaco editor
- ✅ Execution history panel component
- ✅ Query bookmarks panel component
- ✅ TypeScript type checking passes
- ✅ Frontend builds successfully

#### API Endpoints (10 total)
- `/cache/stats`, `/cache/clear` — query result caching management
- `/sql/complete` — SQL autocomplete (30+ keywords + functions + schema)
- `/notebooks/:id/cells/:cell_id/executions`, `/notebooks/:id/execution-stats` — execution tracking
- `/queries`, `/queries/favorites`, `/queries/search`, `/queries/:id` — query bookmarks
- `/data/preview`, `/data/column-stats` — data profiling & preview stats

**Shipping Status:** v1.2.1 READY FOR RELEASE ✅
- Backend: 10 API endpoints fully implemented
- Frontend: SQL autocomplete + 2 new panel components
- Build: TypeScript ✓, Vite ✓, No compilation errors
- Next: v1.3.0 (Data Catalog & Governance, 24h) + v1.3.1 (Chainlit AI, 8h)

### v1.3.0 (Q1 2027) — Data Catalog & Governance
**~24 hours | Enterprise governance, local-first** (🔨 Phase 1-4 complete: 22/24h)

#### Data Catalog & Discovery (Phase 1-3) ✅ Full Stack
- [x] **Data Catalog** — local metadata registry in Rust (160 lines, `catalog.rs`)
  - Support: Parquet, CSV, DuckDB, Iceberg, PostgreSQL (+ Snowflake, BigQuery connectors)
  - Track: tables, columns, owners, descriptions, tags
  - REST: `POST /catalog/register`, `GET /catalog/list`, `GET /catalog/search`
- [x] **Frontend UI** — React component (DataCatalogPanel.tsx, 350 lines)
  - Two-column layout: catalog list + details panel
  - Search, filters, governance visualization
  - Integrated into command palette ("Data Catalog" command)
- [x] **Universal Search** — search all datasets (name, description, tags, columns) implemented
- [ ] **Dataset Ownership & Teams** — assign responsibility, track stewards (Phase 5)
- [ ] **Business Glossary** — centralized definitions (inspired by Snowflake Horizon) (Phase 5)

#### Query & Lineage (Intelligence) ✅ Full Stack
- [x] **Column-Level Lineage** — graph tracking in Rust (180 lines, `lineage.rs`)
  - Track: source→target transformations with operation type
  - REST: `POST /lineage/add`, `GET /lineage/:table/:column`
  - Frontend: LineageViewer modal (150 lines, LineageViewer.tsx)
- [x] **Column Impact Analysis** — downstream impact via graph traversal
- [x] **Data Lineage Visualization** — Upstream/downstream toggle, operation chain
- [ ] **Query History Extended** — duration, rows scanned, rows returned, user context (Phase 5)

#### Governance & Quality (Trust) ✅ Modules + API
- [x] **Governance Tags** — PII, sensitivity levels via `governance.rs` (260 lines)
  - Categories: Email, Phone, SSN, CreditCard, Address, Name
  - Sensitivity: Public, Internal, Confidential, Restricted
  - REST: `POST /governance/set`, `GET /governance/pii-columns`
- [x] **Quality Assertions** — SQL rule engine with severity levels
- [ ] **Sensitive Data Detection** — auto-detect patterns in data preview
- [ ] **Data Contracts** — schema validation, SLAs (OpenMetadata foundation)

#### PII Detection & Quality (Phase 4) ✅
- [x] **PII Detection Engine** — Regex patterns for Email, Phone, SSN, CreditCard, IP (pii_detector.rs, 240 lines)
- [x] **Quality Assertions** — SQL rule engine: NotNull, Unique, Positive, InRange, Pattern, Freshness (quality_assertions.rs, 200 lines)
- [x] **API Endpoints** — /pii/detect, /pii/detect-batch, /quality/score, /quality/run-checks
- [x] **Batch Detection** — Scan entire datasets with confidence scoring
- [x] **Risk Scoring** — Column-level risk (0.0-1.0) with recommendations

#### AI-Powered Features (Copilot)
- [x] **Auto Metadata Generation** — AI generates description, tags, owner suggestions (v1.3.1 Chainlit context)
- [ ] **Data Discovery Assistant** — "show customer datasets" → natural language search (Phase 5)
- [ ] **Auto Quality Checks** — AI generates test cases based on column type (Phase 5)

#### Plus Previous Databricks Features
- [ ] **AI Assistant Inside Cells** — Explain, Optimize, Generate Tests
- [ ] **Notebook Versioning** — Git-style diffs
- [ ] **Query Plan Visualizer** — DuckDB EXPLAIN as DAG
- [ ] **Multi-language Cells** — SQL, Python, Bash, JavaScript

### v1.3.1 (Q2 2027) — AI Assistant Polish with Chainlit
**~8 hours | Conversational AI interface upgrade**

#### Chainlit Integration (🚧 In Progress)
- [x] **Chainlit UI Foundation** — replace RHS AI panel with Chainlit chat interface ✅ Phase 1
- [x] **Multi-Provider LLMs** — Ollama (local), Anthropic Claude, OpenAI in unified Chainlit UI ✅ Phase 2
- [x] **Conversational Interface** — multi-turn conversations with context preservation ✅ Phase 3
- [x] **Notebook-Aware Context** — AI aware of current notebook, cells, and data ✅ Phase 2
- [x] **Message History** — persist conversations per notebook session ✅ Phase 3
- [ ] **Agent Capabilities** — streaming output, tool calling, memory management

#### Enhanced AI Features
- [ ] **AI Chat Sidebar** — dedicated right panel for AI conversations
- [ ] **Context Injection** — auto-inject current cell/DataFrame into prompts
- [ ] **Code Explanation** — explain what code does in natural language
- [ ] **Refactoring Assistant** — suggest optimizations, improvements
- [ ] **Documentation Generator** — auto-generate cell/function docstrings
- [ ] **Multi-Provider Support** — Ollama + Claude + OpenAI in Chainlit UI

#### AI Agent Capabilities
- [ ] **Data Exploration Agent** — ask questions about datasets
- [ ] **Query Builder Agent** — "show me top 10 customers by revenue"
- [ ] **Debugging Agent** — help diagnose cell errors
- [ ] **Notebook Architect** — suggest notebook structure for tasks

#### Integration with v1.3.0
- [ ] Lineage-aware AI: "show me all datasets using this column"
- [ ] Quality-aware AI: "what quality checks should we add?"
- [ ] Governance-aware AI: "which PII columns need protection?"

---

### v1.4.0 (Q2 2027) — Semantic Layer & Applications
**~22 hours | Metrics, reusability, enterprise applications**

#### Semantic Layer (MetricFlow-inspired)
- [ ] **Metric Definitions** — define once, use everywhere
  - Example: `revenue = sum(order_amount) where status='completed'`
  - Reuse in multiple notebooks, dashboards, notebooks
- [ ] **Dimension Modeling** — fact tables, dimension tables
- [ ] **Metric Lineage** — show how metrics are calculated, dependencies
- [ ] **Metric Validation** — test metric calculations across sources

#### Notebook as Application (Snowflake Streamlit-inspired)
- [ ] **Input Widgets** — dropdowns, date selectors, text inputs
- [ ] **Parameterized Notebooks** — `date_range = widget.date_picker()`
- [ ] **Non-technical User Mode** — run notebooks without editing cells

#### Reusability & Components
- [ ] **Reusable Components Library** — SQL/Python snippets, viz templates
- [ ] **Notebook Dependency Graph** — visual cell dependency DAG
- [ ] **Job Scheduling** — daily/hourly runs, retry policies, alerts
- [ ] **Cost Observatory (Local)** — CPU time, memory, query duration tracking

#### Plus Previous Features
- [ ] Git integration (version history)
- [ ] Iceberg dataset support

### v1.5.0 (Q3 2027) — Publishing & Reports
**~12 hours | Knowledge sharing**
- [ ] **Notebook Publishing** — one-click export to HTML, PDF, dashboard
- [ ] **Notebook as Interactive Report** — read-only sharing with parameter controls
- [ ] Global cross-file search
- [ ] Spark integration (if demand exists)

### v2.0.0 (Q3 2027) — Real-time & Collaboration
**Future | Team-scale analytics**
- [ ] **AI Data Analyst Mode** — natural language → SQL → insights → visualizations
- [ ] Real-time collaboration (concurrent editing)
- [ ] Notebook organization (folders, tags, collections)
- [ ] Team management and workspaces

---

## 🏆 PrismNote's Unique Positioning vs Enterprise Catalogs

### What Makes This Different

**Enterprise Catalogs (Snowflake, OpenMetadata, DataHub):**
- Require external infrastructure (servers, databases)
- Separate system from computation
- Often cloud-only or complex deployment
- Metadata divorced from data

**PrismNote Governance (v1.3.0+):**
- ✅ **Local-first** — metadata stored in same SQLite as notebooks
- ✅ **Computation-native** — catalog understands notebooks, not just datasets
- ✅ **Zero deployment** — works on laptop, single executable
- ✅ **Source-agnostic** — works with Parquet, CSV, DuckDB, Iceberg, PostgreSQL, Snowflake, BigQuery
- ✅ **Notebook-aware** — tracks lineage through NOTEBOOKS, not just tables
- ✅ **AI-first** — auto-generate metadata, tags, quality checks using Claude API
- ✅ **Privacy-first** — all metadata stays local, no cloud required

### Three-Tier Lineage Model (PrismNote-Unique)

Traditional catalogs track:
```
Table A → Table B → Table C
```

PrismNote tracks:
```
Data Source
    ↓
Notebook (extraction/transformation)
    ↓
Dataset (intermediate result)
    ↓
Notebook (analysis)
    ↓
Dashboard/Report
```

This is where most platforms fail — they don't understand notebooks as first-class computational assets.

### Roadmap Evolution

| Version | Focus | Differentiator |
|---------|-------|---|
| v1.2.0 | Auth + Audit | Multi-user ready |
| **v1.2.1** | Query Intelligence | Caching, autocomplete, history |
| **v1.3.0** | Governance | Local catalog + lineage + AI metadata |
| **v1.4.0** | Semantic Layer | Metrics + reusability |
| v1.5.0 | Publishing | Export notebooks as reports |
| v2.0+ | Team Scale | Real-time collab + workspace mgmt |

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

## 🎯 Databricks Feature Parity Roadmap

### Features Under Consideration (Prioritized)

| # | Databricks Feature | PrismNote Status | Priority | Version | Effort |
|---|---|---|---|---|---|
| 1 | Rich Cell Execution History | ⏳ Planned | 🔴 High | v1.2.1 | 3h |
| 2 | Data Preview Experience | 🟢 Partial | 🔴 High | v1.2.1 | 2h |
| 3 | AI Assistant (Explain/Optimize/Generate) | ⏳ Planned | 🔴 High | v1.3.1 (Chainlit) | 8h |
| 4 | Notebook as Application (widgets) | ⏳ Planned | 🟡 Medium | v1.4.0 | 8h |
| 5 | SQL Editor Experience | ⏳ Planned | 🔴 High | v1.2.1 | 3h |
| 6 | Built-in Visualization Builder | 🟢 Partial | 🟡 Medium | v1.2.1 | 2h |
| 7 | Notebook Versioning (Git-style diffs) | ⏳ Planned | 🟡 Medium | v1.3.0 | 4h |
| 8 | Reusable Components Library | ⏳ Planned | 🟡 Medium | v1.4.0 | 5h |
| 9 | Job Scheduling | 🟢 Partial | 🟡 Medium | v1.4.0 | 4h |
| 10 | Notebook Dependency Graph | ⏳ Planned | 🟡 Medium | v1.4.0 | 3h |
| 11 | Data Lineage (automatic) | ⏳ Planned | 🟡 Medium | v1.4.0 | 5h |
| 12 | Query Plan Visualizer | ⏳ Planned | 🟡 Medium | v1.3.0 | 2h |
| 13 | AI Data Analyst Mode | ⏳ Planned | 🟢 Low | v2.0.0 | 12h |
| 14 | Multi-language Cells | 🟢 Partial | 🟡 Medium | v1.3.0 | 3h |
| 15 | Notebook Publishing | ⏳ Planned | 🟢 Low | v1.5.0 | 4h |
| 16 | Result Caching | ⏳ Planned | 🔴 High | v1.2.1 | 2h |

### Implementation Status Legend
- 🟢 **Partial** — some features already implemented or scaffolded
- 🟡 **Planned** — designed, ready to build next
- 🔴 **Not Started** — high priority, planned soon
- 🟠 **Investigating** — technical approach being evaluated

### Quick Win Features (v1.2.1 — Next Sprint, 12 hours)
These can ship quickly and provide immediate value:
1. **Result Caching** (2h) — wrap DuckDB results with TTL
2. **SQL Autocomplete** (3h) — extend Monaco editor with DuckDB schema
3. **Execution History** (3h) — store cell run times, durations, memory
4. **Query History** (2h) — save/recall SQL queries
5. **Enhanced Preview** (2h) — add nulls %, distributions to Data Explorer

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
