# PrismNote — Product Vision

## Mission

**To make data exploration and analysis faster, more intuitive, and more powerful than traditional notebooks — while keeping data local and code-first.**

## The Insight

Data scientists spend 40% of their time writing boilerplate code (`df.head()`, `df.describe()`, `df.info()`, matplotlib setup, etc.). Meanwhile, they context-switch between notebooks, data explorers, dashboards, and analytics tools to answer simple questions like "what does this column look like?" or "are there duplicates?"

**PrismNote eliminates this context switching by embedding data exploration, SQL querying, visualization, governance, and AI reasoning into a single, high-performance notebook environment.**

## Core Principles

### 1. **Code First, Exploration Always**
Write Python or SQL when you need precision. Explore visually when you need speed. No artificial separation.

```python
# In the same notebook, both work together:
import pandas as pd
df = pd.read_parquet("users.parquet")

# Then explore visually (no code needed) → schema + stats + histograms
# Then query in SQL (10 dialects) → results appear instantly
# Then ask AI → "Why do these users have NULL emails?"
```

### 2. **Your Data Stays on Your Machine**
- Runs entirely locally (Rust backend, Python kernel, React frontend in a single binary)
- No cloud uploads, no SaaS, no account required
- AI via Ollama works offline
- Option to connect to cloud data warehouses (BigQuery, Snowflake, etc.) — **your choice**

### 3. **Speed Over Perfection**
- Instant schema browsing (no `INFORMATION_SCHEMA` queries needed)
- Real-time chart building (no matplotlib boilerplate)
- One-click data quality checks (automated NULL/duplicate detection)
- Chainlit AI reasoning with notebook context (not a generic chatbot)

### 4. **SQL as a First-Class Citizen**
Data lives in databases. PrismNote connects to 10 SQL dialects (PostgreSQL, MySQL, BigQuery, Snowflake, DuckDB, SQLite, Redshift, Databricks, T-SQL, Oracle) and treats SQL queries the same way as Python cells — syntax highlighting, result pagination, error hints, and export to CSV/JSON.

### 5. **Governance Without Friction**
Built-in data quality scoring, PII detection, and lineage tracking. Know your data's health at a glance — not through compliance tools.

### 6. **Jupyter-Compatible, Not Locked In**
Export notebooks as `.ipynb` or `.py` scripts. Use `.ipynb` files from Jupyter. No vendor lock-in.

---

## What PrismNote Does

### **For Data Exploration**
- **Visual schema browser** — Click a table, see columns + types + stats instantly
- **One-click profiling** — Min/max/distinct counts, NULL%, mode, histogram
- **Smart sampling** — Automatically load 10K rows for large datasets (configurable)
- **Search everything** — Global search across cell outputs, tables, and notebooks

### **For SQL Analysis**
- **10 SQL dialects** — Write `SELECT` against PostgreSQL, Snowflake, BigQuery, etc.
- **Connection picker** — Easily switch databases within a notebook
- **Query result export** — Download as CSV/JSON, copy to clipboard as TSV
- **Dialect-aware error hints** — "ORA-00904: invalid column name" → suggests closest match
- **Query cost estimation** — Shows estimated BigQuery scan size or Snowflake credits before execution

### **For Python Development**
- **Familiar Jupyter notebook** — Markdown cells, code cells, inline outputs
- **Multi-language support** — Python, SQL, JavaScript (R coming)
- **AI-powered code assist** — ⌘K to rewrite, Fix/Explain buttons
- **Inline data explorer** — Render DataFrames as interactive tables with sorting/filtering

### **For Governance & Quality**
- **Automatic PII detection** — Flags emails, phone numbers, SSNs
- **Data quality scoring** — Composite metric (0–100) per dataset
- **Lineage tracking** — See which tables/columns feed into your analysis
- **Audit logs** — Who touched what, and when (optional)

### **For Collaboration & Sharing**
- **Real-time collaboration** — Multiple users in the same notebook (coming v1.7)
- **Export dashboards** — Build interactive dashboards with filters and drill-down (Rill integration)
- **Share as web link** — Publish read-only notebooks with live data (coming v1.8)
- **Version history** — Roll back to previous notebook states (Git-backed)

### **For AI-Powered Insight**
- **AI Agent with web search** — Ask questions about your data with real-time context
- **Tavily API integration** — Agent can search the web for context (exchange rates, news, benchmarks)
- **Chainlit chat panel** — Conversational reasoning with your notebook's state
- **Plan vs. Act modes** — Review agent's plan before it runs code

---

## Technical Architecture

### **Frontend: React + Zustand + Monaco**
- Modern, responsive UI with dark/light themes
- Monaco editor for SQL + Python + JavaScript + R syntax highlighting
- Zustand for state management (notebook cells, outputs, connection state)
- Real-time collaboration via WebSocket (coming v1.7)

### **Backend: Axum (Rust) + Tokio**
- Single-binary deployment (no Node.js, no Python required for end-users)
- Type-safe HTTP handlers for notebook operations, SQL execution, file I/O
- Streaming API responses for long-running queries
- Database connection pooling (sqlx for async queries)

### **Execution Engine: Multiple Kernels**
- **Python:** IPython kernel (standard Jupyter)
- **SQL:** Direct database connections (10 dialects via sqlx + specific drivers)
- **JavaScript:** V8 JavaScript engine (coming v1.7)
- **R:** R kernel via RServe (coming v1.8)

### **Data Storage: Pluggable Backends**
- Notebooks stored as `.ipynb` (Jupyter-compatible)
- Settings in `~/.prismnote/ai_config.json`
- Optional PostgreSQL/SQLite for audit logs and lineage (coming v1.7)

---

## Roadmap: From v1.6 to v2.0

### **v1.6 (Current)**
- ✅ Tavily API integration for AI Agent web search
- ✅ Expanded Settings with Execution & Search preferences
- ✅ 10 SQL dialects + multi-language support
- ✅ Visual data exploration with profiling
- ✅ Chainlit AI Agent (plan + act modes)

### **v1.7 (Q3 2026)**
- Real-time collaboration (WebSocket, conflict resolution)
- R kernel + JavaScript execution
- Advanced autocomplete (table/column names from connected databases)
- Lineage tracking UI (data flow visualization)
- Audit logs (who ran what, when)

### **v1.8 (Q4 2026)**
- Shareable read-only notebooks (public link, live data)
- Advanced dashboard builder (filters, drill-down, scheduled exports)
- Rill Data integration (polished dashboards)
- Query scheduling (run notebooks on a cron)

### **v2.0 (Q1 2027)**
- Distributed execution (multi-user, multi-kernel)
- Enterprise features: RBAC, SSO, audit
- Desktop app (Tauri) with offline-first sync
- Notebook templates (data onboarding, common analyses)

---

## Core Capabilities

| Feature | PrismNote |
|---------|-----------|
| Local first (no cloud) | ✓ |
| SQL first-class (10 dialects) | ✓ |
| Visual data exploration | ✓ |
| AI with context (Claude, OpenAI, Ollama) | ✓ |
| Governance built-in (PII detection, lineage) | ✓ |
| Single binary (one download) | ✓ |
| Jupyter-compatible (.ipynb export) | ✓ |
| Multi-terminal splits (DevOps/ROS) | ✓ |
| 15+ programming languages | ✓ |
| Real-time collaboration-ready | ✓ |

**PrismNote delivers:** Local-first power + professional-grade SQL + intuitive data exploration + AI reasoning + governance — all in one production-ready tool.

---

## Success Metrics

### **Product**
- 50K+ weekly active users (end of 2026)
- 4.5+ star rating on GitHub (500+ stars)
- <2 second notebook load time
- <100ms query execution for typical datasets

### **Community**
- 100+ community extensions/integrations
- 500+ GitHub PRs from contributors
- Active discussions on GitHub (Discussions > Issues)

### **Business** (if monetizing)
- Enterprise tier with SSO, RBAC, audit logs
- Managed hosting option (SaaS) for teams that want it
- API marketplace (connect external data sources)

---

## The End State: What Does "Done" Look Like?

In 3 years, a data scientist or analyst should:

1. **Open PrismNote** in a browser or desktop app
2. **Connect a data source** (upload CSV, connect to database, load from cloud)
3. **Explore visually** — Click to browse schema, statistics, charts (no code needed)
4. **Write code when needed** — Python, SQL, JavaScript in the same notebook
5. **Ask AI** — "What's driving churn in Q3?" → AI searches your data + the web → answers
6. **Govern automatically** — See data quality score, PII flags, lineage
7. **Share or export** — Dashboard link, notebook download, or `.ipynb` for Jupyter

All in a **single, fast, beautiful app that runs on their machine.**

No context switching. No tool fatigue. Just data exploration that _feels_ intuitive.

---

## Call to Action

If you believe data science should be faster, smarter, and more accessible:

- ⭐ **Star the repo** on GitHub — helps others discover it
- 🐛 **Report issues** — what's broken or confusing?
- 💡 **Suggest features** — what would save you time?
- 🤝 **Contribute** — PRs welcome (check CONTRIBUTING.md)
- 📢 **Spread the word** — tweet, blog, tell your data team

PrismNote is built for you. Let's make data exploration great.
