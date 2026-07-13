<div align="center">

# ◆ PrismNote

**A modern data science notebook that makes exploring and understanding data faster than writing code.**

No more `df.head()` → Explore data visually · Build charts without coding · Automatic governance & quality checks · Local AI assistant — all in one tool.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PyPI](https://img.shields.io/pypi/v/prismnote.svg)](https://pypi.org/project/prismnote/)
[![Python](https://img.shields.io/pypi/pyversions/prismnote.svg)](https://pypi.org/project/prismnote/)
[![Built with Rust](https://img.shields.io/badge/engine-Rust-orange.svg)](https://www.rust-lang.org/)
[![GitHub stars](https://img.shields.io/github/stars/Mullassery/prismnote?style=social)](https://github.com/Mullassery/prismnote/stargazers)

### ⭐ If PrismNote saves you time, please [**star the repo**](https://github.com/Mullassery/prismnote) — it genuinely helps others discover it.

<img src="docs/screenshots/02_notebook_dark.png" alt="PrismNote" width="820">

</div>

---

## The Problem PrismNote Solves

You're deep in analysis. You need to understand a new dataset, build a quick chart, or verify data quality. In Jupyter, that means:
- Writing `df.head()`, `df.describe()`, `df.info()` repeatedly
- Building matplotlib/plotly code from scratch for each chart
- Manually checking for NULL values, duplicates, and data quality issues
- Switching between tools to share results or trace where data came from

**PrismNote eliminates this friction.** Open any data file or DataFrame, explore it visually with instant statistics and charts, verify quality automatically, and share interactive dashboards — all without leaving the notebook.

- **🔍 Explore faster than writing code** — Click a file, see schema + statistics + histograms instantly. No `df.describe()` needed.
- **🔒 Your data stays on your machine** — Everything runs locally. No cloud uploads, no account required. (AI via Ollama works offline.)
- **⚡ Instant setup** — Single binary, one command. Works on Mac, Linux, Windows. No Docker, no dependencies to wrangle.
- **📊 Build dashboards in minutes** — No-code chart builder for exploratory work. Rill Data integration for polished, shareable dashboards.
- **🤖 AI that understands your notebook** — Chainlit AI assistant knows your data, cells, and context. Fix errors, explore ideas, get suggestions.

---

## What's New in v1.3.0 — Working with Data at Scale

**v1.3.0 adds the tools you need when working with sensitive data, collaborating with others, or building production-grade analyses.**

### 📊 Build Real Dashboards (Not Just Plots)
Create interactive dashboards with filters, drill-down, and multiple chart types — then share them via URL. Finally, a chart builder that doesn't feel like a hack.

### 🗂️ Find & Understand Your Data
A data catalog that actually lists what you have. Search by name, find columns with PII, trace where data comes from, and see what depends on what.

### 🔐 Governance Without the Paperwork
Automatically detects sensitive data (emails, phone numbers, SSNs). Classify data as Public/Internal/Confidential/Restricted. Know your data quality score (0-100) at a glance.

### 🤖 Talk to Your Data
Instead of scrolling through notebooks, ask Chainlit AI about your data. It understands what's in each cell, remembers the conversation, and suggests next steps.

[Full v1.3.0 changelog →](./RELEASES.md)

---

## Get Started in 30 Seconds

Pick your favorite package manager. That's it.

**pip** (most people):
```bash
pip install prismnote
prismnote
# Browser opens to http://localhost:8000
```

**uv** (if you use uv):
```bash
uv tool install prismnote
prismnote
```

**Homebrew** (macOS/Linux):
```bash
brew tap Mullassery/prismnote
brew install prismnote
prismnote
```

**No dependencies, no setup.** The entire app — Rust backend, Python kernel, React frontend — comes in one binary. Everything runs on your machine.

**First time?** The browser opens automatically to http://localhost:8000. 
- Click **Open Data Explorer** (⌘E) to load a CSV or Parquet file
- Click **New Notebook** to start coding
- Press **⌘,** anytime to configure AI or database connections

### Build from Source (for developers)

If you want to modify PrismNote or a binary isn't available for your platform:

**Requirements:** Rust, Node 18+, Python 3.8+

```bash
# Clone the repo
git clone https://github.com/Mullassery/prismnote.git
cd prismnote

# Install Python deps
pip install ipykernel pandas matplotlib rich duckdb

# Terminal 1: Start the backend (http://localhost:8000)
cargo run

# Terminal 2: Start the frontend dev server (http://localhost:5173)
cd frontend && npm install && npm run dev
```

Then open http://localhost:5173 in your browser.

---

## How It Actually Works — Explore Data the Fast Way

### 🔍 Open Any Data, See It Instantly
Double-click a Parquet, CSV, or database table. You immediately see:
- **Full column breakdown** — data type, nulls, unique values, top 10 samples
- **Histograms & distributions** — understand skew, outliers, ranges at a glance
- **Statistics** — mean, median, std dev, quartiles (no `df.describe()` needed)
- **Lineage** — which notebook cells created this data, which use it

Scroll through millions of rows fast. Filter, sort, search — it all happens server-side.

**Supports:** CSV, Parquet, JSON, Arrow, Apache Iceberg, DuckDB queries, live DataFrames.

**One-click reproducibility:** "Copy as code" gives you the pandas equivalent. Paste it into a cell and run it.

### 📊 Build Charts Without Writing Code
**Quick exploration:** Drag-and-drop chart builder. Pick dimensions, pick measures, pick a viz type (bar/line/area/scatter/heatmap/pie). Click render. Then export PNG or copy the Altair code.

**Production dashboards:** Use Rill Data to build interactive, polished dashboards with multiple charts, filters, and drill-down. Share via URL or embed in your app. Automatically refresh data on schedule.

**Plot gallery:** Every chart you create is auto-collected in a filmstrip. Zoom, pan, export SVG/PNG, re-use or remix.

### 🔐 Know What Data You Have (and What to Do With It)
**Data Catalog:** See all your tables & columns in one searchable place. Know row counts, owners, when data was last updated.

**Automatic PII Detection:** Scans your columns for emails, phone numbers, SSNs, credit cards. Flags which datasets need restricted access.

**Quality Checks:** Run SQL-based assertions (NOT NULL, UNIQUE, ranges, patterns, freshness). Get a quality score (0-100) per table. Know instantly when data gets bad.

**Sensitivity Classification:** Tag data as Public/Internal/Confidential/Restricted. Helps you comply with privacy laws and company policy.

**Column Lineage:** See where a column comes from, and what cells/dashboards depend on it. Great for impact analysis — change the source, see what breaks.

### 🤖 AI That Understands Your Work
**Chainlit AI Chat:** Ask questions about your data, get explanations, brainstorm next steps. The AI remembers your conversation and knows which notebook you're in.

**Your choice of AI:** Use **Ollama** (free, runs on your machine, completely private), **Claude** (fast and accurate), or **OpenAI**. Switch anytime in Settings.

**Quick AI fixes:**
- Hit ⌘K in a cell to auto-complete code or refactor
- Error? Click "Fix with AI" to get a suggestion
- Explain confusing code without leaving the editor
- Get inline autocomplete as you type

### 📓 Notebook That Doesn't Get in Your Way
**One kernel, all your cells:** Define a variable once, use it everywhere. Interrupt long-running cells, restart when you need a fresh slate.

**Work the way you want:**
- **Python** cells for data munging
- **SQL** cells (DuckDB) for fast queries  
- **Shell** cells (`!ls`, `!curl`) for system commands
- **Markdown** cells for notes
- **Input widgets** that trigger re-runs

**Smart formatting:** Paste messy code → it auto-formats with Black. Hit ⇧⌥F to reformat any cell.

**Errors that make sense:** Instead of a stack trace, you get a plain-English explanation and line markers in the editor.

### ⚡ Write SQL Faster
**SQL autocomplete:** Start typing a query and see suggestions for keywords, functions, table names, and columns. Context-aware.

**Save & reuse queries:** Bookmark queries you use often. Mark favorites. Search by name. Paste them into cells later.

**Instant query replay:** Results cached in memory (256 MB). Run the same query twice → second time is instant.

**See what slows you down:** Track how long each cell takes to run, memory used, row counts. Spot the bottlenecks.

### 🗄️ Query Any Database
Connect to your data wherever it lives:
- **Local:** SQLite, DuckDB (files or in-memory)
- **On your server:** PostgreSQL, MySQL
- **Data warehouses:** Snowflake, BigQuery, Redshift, Databricks, Athena, Trino, Presto, Synapse

PrismNote uses open-source drivers you control. No proprietary code bundled. See [CONNECTORS.md](CONNECTORS.md) for setup.

### ⚙️ Turn Notebooks into Workflows
**Run on a schedule:** Execute a notebook daily, hourly, or on-demand. See run history and logs. Integrates with Airflow.

**Git built-in:** Init a repo, commit, push, pull — all from the UI. Your notebook stays sync'd with GitHub.

**Deploy anywhere:** Generate Docker compose files, Kubernetes YAML, or Fly.io config. Takes 30 seconds to move from local to production.

---

## How PrismNote Compares to Other Tools

**The short version:** JupyterLab is great for coding. PyCharm is great for IDEs. PrismNote is great for data exploration + AI + charts + governance.

Think of it this way:
- Use **JupyterLab** if you spend 80% writing Python code and 20% exploring data
- Use **PrismNote** if you spend 50% exploring data, 30% writing code, and 20% building charts/dashboards
- Use **PyCharm** if you're building a Python application with databases

Here's the detailed comparison:

> ✅ built-in · ⚠️ via extension / partial / paid · ❌ not available · 🔜 on the roadmap

| Feature | PrismNote | JupyterLab | Apache Zeppelin | PyCharm (Pro) |
|---|:---:|:---:|:---:|:---:|
| Type | Notebook (web) | Notebook (web) | Notebook (web) | Desktop IDE |
| Engine / runtime | Rust + Python kernel | Python (Jupyter) | JVM + interpreters | JetBrains (JVM) + Python |
| `.ipynb` format (native) | ✅ | ✅ | ⚠️ (own format) | ✅ |
| **Built-in Data Explorer** (grid, sort/filter) | ✅ | ⚠️ | ⚠️ (basic) | ✅ (DataFrame viewer) |
| Column profiling, `describe()` & **lineage** | ✅ | ❌ | ❌ | ⚠️ (column stats) |
| Open-format explorer (Parquet/CSV/**Iceberg**) | ✅ (DuckDB) | ⚠️ (code) | ⚠️ (code) | ⚠️ (DB tools/CSV) |
| No-code chart builder | ✅ (Vega-Lite) | ❌ (code) | ✅ (on SQL) | ⚠️ (viewer charts) |
| In-process SQL (DuckDB) + magics | ✅ | ⚠️ | ✅ | ⚠️ (DB tools) |
| AI: in-cell edit / fix / explain / agent | ✅ (Ollama/Claude/OpenAI) | ⚠️ (Jupyter AI) | ❌ | ⚠️ (AI Assistant, paid) |
| AI inline autocomplete | ✅ | ⚠️ | ❌ | ✅ |
| Code auto-format (Black) | ✅ | ⚠️ | ❌ | ✅ |
| Variable explorer | ✅ | ⚠️ | ❌ | ✅ |
| Scheduled jobs (built-in) | ✅ | ❌ (external) | ✅ (cron) | ❌ |
| Git integration (UI) | ✅ | ⚠️ (jupyterlab-git) | ⚠️ | ✅ (excellent) |
| Cloud deploy artifacts (Docker/k8s/Fly) | ✅ | ❌ | ❌ | ⚠️ (plugins) |
| Real-time collaboration | 🔜 | ✅ | ⚠️ | ✅ (Code With Me) |
| Multi-language interpreters | ⚠️ (Python/SQL/shell) | ✅ (many kernels) | ✅ (many) | ⚠️ (Python focus) |
| Install | pip / uv / **single binary** | pip / conda | download + JVM | IDE download |
| License | MIT | BSD-3 | Apache-2.0 | Proprietary (Pro) |

**In short:** choose **JupyterLab** for its vast kernel/extension ecosystem and real-time
collaboration, **Zeppelin** for JVM/Spark-centric multi-interpreter workloads, **PyCharm**
for a full desktop IDE with deep refactoring and DB tools (paid Pro), and **PrismNote**
when you want fast, no-setup **data exploration + charts + local AI** in one free,
open-source local binary. See also [ZEPPELIN_COMPARISON.md](ZEPPELIN_COMPARISON.md) and
[NOTEBOOK_COMPARISON_MATRIX.md](NOTEBOOK_COMPARISON_MATRIX.md).

---

## Set Up Your AI Assistant (Optional)

By default, PrismNote has no AI configured. Pick one:

### Private & Free — Ollama (Recommended)
Use a local AI model that runs on your machine. Completely private, free, offline.

```bash
# Install Ollama from https://ollama.com
# Pull a coding model (qwen2.5-coder is fast and good)
ollama pull qwen2.5-coder

# When running PrismNote, start Ollama with:
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

Then open PrismNote Settings (⌘,) → AI Provider → select "Ollama"

### Fast & Cloud — Claude or OpenAI
Want faster responses? Use Claude or OpenAI instead.

**Via Settings:**
1. Open PrismNote
2. Press ⌘, (Settings)
3. Click "AI Provider"
4. Paste your API key (stored locally, never sent to our servers)

**Via environment variables:**
```bash
export PRISMNOTE_AI_PROVIDER=claude      # or openai / ollama
export ANTHROPIC_API_KEY=sk-ant-...      # or OPENAI_API_KEY=sk-...
prismnote
```

Your API keys are stored in `~/.prismnote/ai_config.json` and never leave your machine.

---

## Essential Keyboard Shortcuts

| Shortcut | What it does |
|---|---|
| `⌘E` | 🔍 Open Data Explorer — load a file or table |
| `⌘N` | 📝 New notebook |
| `⌘S` | 💾 Save |
| `⇧⌘↵` | ▶️ Run all cells |
| `⇧↵` | ▶️ Run current cell |
| `⌘K` | 🤖 In cell: AI autocomplete / refactor. Globally: search |
| `⌘,` | ⚙️ Settings (configure AI, databases, theme) |
| `⇧⌘P` | 🎯 Command palette (everything else) |
| `⇧⌥F` | 🧹 Auto-format cell with Black |

*(`⌘` = Cmd on Mac, `Ctrl` on Windows/Linux)*

---

## Why It's Fast (and Why You Should Care)

PrismNote runs as a **single native binary** — no virtual machine, no startup delays, no memory overhead.

**What that means for you:**
- Click and it opens instantly (not 30 seconds of startup)
- Data exploration runs server-side (scroll millions of rows, not your browser's memory)
- AI responses are fast (local Ollama doesn't need network)
- Works offline (except API-based AI)

**Architecture** (for nerds):
- **Frontend:** React in your browser (runs locally, talks to backend over HTTP/WebSocket)
- **Backend:** Rust with Axum (fast, low overhead, instant startup)
- **Kernel:** One long-lived Python process (state carries across cells like Jupyter)

Everything runs on your machine. Nothing leaves except what you explicitly send to Claude/OpenAI.

---

## Deploy Your Notebook to Production

Built a notebook that your team needs to run daily? Deploy it in 2 minutes.

**In PrismNote:**
1. Click **Deploy to Cloud**
2. Choose your platform (Docker, Kubernetes, Fly.io)
3. Download the config files
4. Run them in your cloud

```bash
# Docker Compose (simplest)
docker compose up -d

# Kubernetes
kubectl apply -f k8s.yaml

# Fly.io (easiest if you like Fly)
fly launch --copy-config --now
```

Your notebook becomes a scheduled job. Logs are saved. Errors are emailed to you. Same notebook code you tested locally.

---

## Project layout

```
crates/server/   Rust backend (api, kernel, explore, jobs, db, ws, deploy, git…)
frontend/        React app (components, hooks, api clients)
python/          PyPI launcher package (prismnote)
docs/            screenshots & comparison docs
```

Further reading: [CONNECTORS.md](CONNECTORS.md) ·
[ZEPPELIN_COMPARISON.md](ZEPPELIN_COMPARISON.md) ·
[DATABRICKS_COMPARISON.md](DATABRICKS_COMPARISON.md) ·
[NOTEBOOK_COMPARISON_MATRIX.md](NOTEBOOK_COMPARISON_MATRIX.md)

---

## What's Coming Next (v1.4.0)

**Team collaboration:**
- Real-time co-editing (multiple people in one notebook at once)
- Comments on cells + threaded discussion
- Sharing with view-only / edit permissions

**Notebook superpowers:**
- Reactive execution (change a variable, dependent cells auto-run)
- Cell parameters (render a notebook with different inputs)
- Run multiple notebooks as a pipeline (dependency order)

**Deeper analytics:**
- Spark integration for distributed compute
- Column profiling improvements (more stats, cardinality estimation)
- Cost tracking for cloud queries

---

## How to Help (Three Easy Ways)

**1. Star the repo** — The easiest way to help. It boosts visibility and tells GitHub this project matters.

**2. Report bugs** — Found something broken? [Open an issue](https://github.com/Mullassery/prismnote/issues) with:
- What you were doing
- What you expected
- What happened instead

**3. Code contributions** — Want to add a feature or fix a bug?

First, [open an issue](https://github.com/Mullassery/prismnote/issues) to discuss your idea. Then:

```bash
git clone https://github.com/Mullassery/prismnote.git
cd prismnote

# Backend
cargo run

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

Before pushing, run tests:
```bash
cargo check && cargo test
cd frontend && npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Getting Help

**🤔 How do I...?**
- [README](./README.md) — You're reading it
- [CONNECTORS.md](./CONNECTORS.md) — Connect to databases
- [Command palette](https://github.com/Mullassery/prismnote) (⇧⌘P) — search for features

**🐛 Something's broken**
- [Report an issue](https://github.com/Mullassery/prismnote/issues) with details
- Include your OS, PrismNote version (`prismnote --version`)
- Paste error messages and steps to reproduce

**💬 Chat with the community**
- [GitHub Discussions](https://github.com/Mullassery/prismnote/discussions) — ask questions, share ideas
- [Issues](https://github.com/Mullassery/prismnote/issues) — bugs and features

**📖 Deep dives**
- [Connectors guide](./CONNECTORS.md) — SQL databases, data warehouses, files
- [Full API docs](./docs/API.md)
- [v1.3.0 release notes](./RELEASES.md)

---

## License

[MIT](LICENSE) © Georgi Mammen Mullassery

**TLDR:** Free to use, modify, and distribute. Give credit.

## Your Data is Safe

**Local by default** — Everything runs on your machine. Your data never leaves unless you explicitly send it to a cloud warehouse or AI API.

**Protected by default:**
- SQL injection blocks dangerous commands
- File access is restricted to your notebook directories
- Rate limiting prevents abuse
- Security headers protect against common web attacks

**API keys stay local:**
- Claude/OpenAI keys stored in `~/.prismnote/` (not on our servers)
- Database passwords encrypted
- No telemetry or tracking

**⚠️ Before deploying to the internet:**
If you're running PrismNote on a shared server or over the internet, enable authentication first. See [ROADMAP.md](ROADMAP.md) for the full security guide.

**Questions?** See [CONTRIBUTING.md](CONTRIBUTING.md) for security reporting.
