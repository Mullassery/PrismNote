# PrismNote Roadmap

**Current Version:** v1.0.0  
**Last Updated:** July 2026  
**Status:** Good for local exploratory data analysis; advanced features in development

---

## Known Limitations (v1.0.0)

### 🔴 Blocking Issues
- **Cloud warehouse connectors:** README lists **8 supported warehouses but NONE are implemented**
  - ❌ BigQuery (not connected)
  - ❌ Snowflake (not connected)
  - ❌ Redshift (not connected)
  - ❌ Postgres (not connected)
  - ❌ MySQL (not connected)
  - ❌ DuckDB (read-only via local file)
  - **Impact:** Remove from README; these don't work. Only local files supported.
  - **Fix timeline:** v1.1.0 (Q3 2026) for BigQuery/Snowflake

### 🟡 Experimental Features
- **Apache Iceberg:** Listed in README but **not implemented**
  - [ ] DuckDB connector exists but Iceberg-specific features missing
  - **Impact:** Export to Parquet/CSV first
  - **Fix timeline:** v1.2.0 (Q4 2026)

- **Local AI (Ollama):** Listed as feature but **incomplete**
  - [ ] Structure exists
  - [ ] Integration not working
  - [ ] Models not tested
  - **Impact:** Claude/OpenAI integration works; Ollama won't work
  - **Fix timeline:** v1.1.0 (Q3 2026)

- **Git integration:** Mentioned in README but **not wired up**
  - [ ] Git operations not functional
  - [ ] Version history not implemented
  - **Impact:** No version control in v1.0; manual saves only
  - **Fix timeline:** v1.2.0 (Q4 2026)

- **Jobs/Deploy:** Listed in README but **not in v1.0**
  - [ ] Scheduler structure exists; not wired
  - [ ] Cloud deployment templates only
  - **Impact:** No scheduled execution; one-shot runs only
  - **Fix timeline:** v1.3.0 (Q4 2026)

- **Global search:** Mentioned in README but **only partial**
  - [ ] Notebook search works
  - [ ] Cross-file search not implemented
  - **Impact:** Search within current notebook only
  - **Fix timeline:** v1.2.0 (Q4 2026)

- **Spark integration:** Listed in README but **not working**
  - [ ] Spark session initialization incomplete
  - [ ] DataFrame passing to notebook kernel broken
  - **Impact:** Use DuckDB/Polars instead; Spark will fail
  - **Fix timeline:** v1.3.0 (Q4 2026) or later

### 🟢 Shipping/Stable (v1.0.0)
- ✅ Local-first data exploration
- ✅ Data Explorer (summary stats, distributions, types)
- ✅ No-code chart building (bar, line, scatter)
- ✅ Notebook cells (Python execution)
- ✅ SQL execution (via DuckDB)
- ✅ Parquet/CSV file import
- ✅ Jupyter compatibility (.ipynb import/export)
- ✅ Terminal access (local machine only)

### 🚫 Not Shipped
- ❌ Cloud data source connectivity
- ❌ Real-time data streaming
- ❌ Team collaboration
- ❌ Cloud deployment

---

## 🚨 🔒 SECURITY ISSUES (See SECURITY_AUDIT.md)

### CRITICAL — BLOCKING v1.2.0
**DO NOT expose to internet until fixed:**
- [ ] **Add CORS/CSRF protection** (no protection currently)
- [ ] **Add authentication/authorization** (anyone with access sees all notebooks)
- [ ] **SQL injection protection** (users can run DROP/DELETE/INSERT)

### HIGH — v1.0.1
- [ ] **Pin all dependency versions** (0 pinned, 21 floating)

### HIGH — v1.1.0
- [ ] **Input validation** (malformed notebooks, code injection)
- [ ] **File access control** (restrict to safe directories)
- [ ] **Error handling** (don't leak info in exceptions)

### MEDIUM — v1.1.0
- [ ] **Document code execution risks** (Jupyter kernel runs with app privileges)

### LOW — v1.3.0
- [ ] **Rate limiting** (prevent DoS)
- [ ] **Sandboxing for code execution** (v2.0.0)

---

## TODOs in Code
Multiple found across:
- Cloud warehouse connectors
- Ollama integration
- Git operations
- Job scheduling
- Spark integration

---

## Roadmap

### v1.0.1 (Q3 2026) — Documentation + Fixes
- [ ] Update README: Remove cloud warehouse claims (not implemented)
- [ ] Remove Spark integration claim
- [ ] Clarify "local-only" scope
- [ ] Add warnings for experimental features
- [ ] Document DuckDB as SQL engine

### v1.1.0 (Q3 2026) — Cloud + AI Integration
- [ ] BigQuery connection (read-only)
- [ ] Snowflake connection (read-only)
- [ ] Ollama integration (local models)
- [ ] Better Claude API integration

### v1.2.0 (Q4 2026) — Advanced Features
- [ ] Git integration (version history)
- [ ] Iceberg dataset support
- [ ] Global cross-file search
- [ ] Notebook organization (folders, tags)

### v1.3.0 (Q4 2026) — Automation
- [ ] Job scheduling (cron-like execution)
- [ ] Spark integration (if demand exists)
- [ ] Postgres/MySQL connections
- [ ] Redshift connection

### v2.0.0 (Q1 2027) — Team & Sharing
- [ ] Notebook sharing
- [ ] Real-time collaboration
- [ ] Cloud sync (optional)
- [ ] Access control

---

## Scope Notes

### What PrismNote Is
- Local data exploration notebook
- For individual data scientists
- Works with local files and DuckDB
- Jupyter-compatible

### What PrismNote Is NOT (v1.0.0)
- Cloud data warehouse client (not yet)
- Real-time streaming tool (not designed for it)
- Team collaboration platform (not ready)
- Production job runner (not hardened for it)
- Spark cluster manager (limited support)

---

## Not Planned
- Direct web-based hosting (cloud versions may come later)
- Mobile app
- IDE plugins
- Integration with proprietary BI tools
