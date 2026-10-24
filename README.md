# PrismNote

A fast, local-first, Jupyter-compatible data-science notebook with built-in AI.

[![CI](https://github.com/Mullassery/prismnote/actions/workflows/ci.yml/badge.svg)](https://github.com/Mullassery/prismnote/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![prismnote on PyPI](https://img.shields.io/pypi/v/prismnote.svg?label=prismnote)](https://pypi.org/project/prismnote/)

## What it is

PrismNote is a data-science notebook served by a single executable: a Rust (Axum) backend, a React + TypeScript (Vite) frontend embedded in the release binary, and a thin Python launcher on PyPI that downloads the matching prebuilt server binary on first run. It executes code in 15+ languages, runs SQL against local engines and 9+ databases, sandboxes untrusted/AI-generated code in disposable Docker containers, and provides integrated code assistance via Claude, OpenAI, or a local Ollama model. The core notebook semantics (cross-cell state, real error handling, per-notebook kernel isolation, `.ipynb` import/export) are verified to match real Jupyter behavior.

## Features / Highlights

- **Jupyter-compatible kernel semantics** — cross-cell state, real tracebacks, and per-notebook kernel isolation (a regression that used to share one global Python namespace across notebooks is fixed and re-verified live).
- **SQL cells against real backends** — SQLite and DuckDB (embedded, no server), PostgreSQL and MySQL via real servers; all covered by integration tests with genuine `CREATE TABLE`/`INSERT`/`SELECT` round trips.
- **Cloud warehouse connectors** — real connection + query execution for Snowflake, BigQuery, Redshift, Azure Synapse, Databricks, Athena (real SigV4), Presto, and Trino.
- **Sandboxed code execution** — each run spawns a brand-new disposable Docker container: no network by default, memory/CPU/process limits, a wall-clock timeout, and real stdout/stderr/exit-code capture.
- **Integrated AI, privacy-friendly** — code explain/fix/complete, NL-to-SQL, and RunPod fine-tuning, all disabled until you configure a provider (including local Ollama).
- **Key integrations** — dbt (real CLI + manifest/run-result parsing), GitHub (Contents API backup/sync), Airflow REST, Kubernetes (`kubectl`), RunPod GraphQL, and real cloud-storage clients for S3/GCS/Azure Blob/Google Drive.
- **SSRF-safe link previews** — unfurl user-dropped URLs into link cards via MudFish (`prismnote[preview]`); private/loopback/link-local targets (including the cloud metadata endpoint) and non-`http(s)` schemes are rejected before any request is made.
- **Single-binary distribution** — the release build embeds the frontend; `pip install prismnote` gives you one command to run.

## Who it's for / Use cases

- Data scientists and analysts who want the Jupyter experience **plus** real SQL and warehouse access from the same notebook — no separate BI tool.
- People running **untrusted or AI-generated code** who want real container sandboxing (no network, enforced limits, timeout) rather than in-process execution.
- Local-first users who don't want a heavyweight hosted notebook platform; everything runs on your machine by default.

## What it is not

- **No prebuilt binary for Windows/Linux yet.** The published release binary is macOS Apple Silicon only; other platforms must build from source.
- **MongoDB is not implemented** (an explicit error, not fake success).
- **Data-quality scoring is not wired to real execution** — the two scoring code paths are the one integration still without a working implementation.
- **Idle kernels are never evicted** (resource management improvement, not a correctness gap).
- **Not without known gaps.** Backend tests pass (120, plus 120 frontend vitest); frontend lint has zero errors (61 advisory React Compiler warnings) and Playwright E2E passes on Chromium, Firefox and WebKit (207 tests). Remaining gaps are tracked in `docs/internal/ROADMAP_HONEST.md`.
- The PyPI metadata says `Development Status :: 5 - Production/Stable`; the repo's own docs are more honest — this is actively developed single-maintainer software, and `docs/internal/ROADMAP_HONEST.md` is the source of truth for what's broken or unverified.

## Project status

`v1.12.x` (PyPI). Active and CI-green for build/tests; the honest, current set of bugs and gaps is maintained in [docs/internal/ROADMAP_HONEST.md](docs/internal/ROADMAP_HONEST.md). Release history: [CHANGELOG.md](CHANGELOG.md) and GitHub Releases.

## Semantic notebook diff/merge

Reviewing `.ipynb` changes in Git is noisy because outputs and cell ids change.
The optional nbdime adapter gives semantic diffs and three-way merges:

```bash
pip install "prismnote[nbdime]"
python -m prismnote.notebook_diff diff base.ipynb current.ipynb
python -m prismnote.notebook_diff merge base.ipynb local.ipynb remote.ipynb --out merged.ipynb
```

It never rewrites a notebook unless `merge` is explicitly called. Output-only
changes are ignored by nbdime rather than shown as code changes.

## Installation

```bash
pip install prismnote
prismnote
```

On first run, the thin Python launcher (`python/prismnote/_cli.py`) downloads the matching prebuilt server binary from [GitHub Releases](https://github.com/Mullassery/PrismNote/releases) and execs it. As of this version the prebuilt binary is published for **macOS (Apple Silicon) only**; other platforms build from source:

```bash
git clone https://github.com/Mullassery/PrismNote.git
cd PrismNote
make build          # builds the frontend first and embeds it into the binary
```

`make build` is the only path that produces a binary that serves the UI (`target/release/prismnote`). A bare `cargo build --release` builds a backend with no frontend assets.

Requirements: Rust (stable), Node 20.19+ (Vite 8), and Docker for sandboxed code execution.

## Quick start

```bash
pip install prismnote
prismnote             # serves the app; printed URL, default http://localhost:8000
```

Create a notebook, add a SQL cell, and query, e.g., a local DuckDB file — or a Python cell and run it. Enable AI/config by copying [`.env.example`](.env.example) to `.env` (Google Sign-In and AI features are disabled until configured).

## Usage

- **SQL backends:** SQLite and DuckDB run embedded with no server required; PostgreSQL/MySQL need a reachable server. MongoDB returns an explicit not-implemented error.
- **Sandboxed languages:** Python, Bash/shell, JavaScript (Node), Ruby — each run in a fresh, limited, disposable Docker container (requires Docker).
- **Warehouse queries:** Snowflake, BigQuery, Redshift, Azure Synapse, Databricks, Athena, Presto, Trino via `crates/server/src/cloud_warehouse/`.
- **Cloud storage:** S3, GCS, Azure Blob, Google Drive clients wired to the `/cloud-storage` API (unit-tested HTTP clients; automatic notebook-backup scheduling on top is not yet built).
- **AI/MCP:** see [docs/guides/AI_MCP_INTEGRATION.md](docs/guides/AI_MCP_INTEGRATION.md) and the MCP examples in [`examples/`](examples/).
- **Development:** backend on `http://localhost:8000` (`cargo run`); frontend dev server on `http://localhost:5173` (`cd frontend && npm install && npm run dev`).

## Documentation

- [docs/README.md](docs/README.md) — documentation index
- [Getting Started](docs/guides/GETTING_STARTED.md) · [Multi-Language Support](docs/guides/MULTI_LANGUAGE_SUPPORT.md) · [Multi-Terminal](docs/guides/MULTI_TERMINAL_GUIDE.md) · [Execution Backends](docs/guides/EXECUTION_BACKENDS.md)
- [API Reference](docs/reference/API_REFERENCE.md) · [Settings](docs/reference/SETTINGS_REFERENCE.md) · [Security](SECURITY.md)
- [docs/internal/ROADMAP_HONEST.md](docs/internal/ROADMAP_HONEST.md) — verified list of what's broken, untested, or not built

## Known issues and deferred work

**Blocked / failed:**
- Publish the Linux/Windows binaries already present in `release-assets/`.
- Idle kernel eviction.

**Rejected / deferred:**
- MongoDB, CRDT collaboration, and cloud SaaS.

Full shipped/blocked/rejected detail: [`docs/internal/QUEUE_STATUS.md`](docs/internal/QUEUE_STATUS.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (dev setup, real test/lint commands) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues: report via [SECURITY.md](SECURITY.md), not public issues.

## Related projects

- [MudFish](https://github.com/Mullassery/MudFish) — Rust-native web crawling and intelligence engine; feed crawl results into notebooks and RAG pipelines
- [ClusterAudienceKit](https://github.com/Mullassery/ClusterAudienceKit) — RFM analysis, K-Means clustering, CLV, churn detection, and lookalikes for data science work
- [PyReverseETL](https://github.com/Mullassery/PyReverseETL) — quality-validated data activation with audit trail and lineage, a natural step after analysis
- [PyInferenceManager](https://github.com/Mullassery/PyInferenceManager) — multi-provider LLM inference executor, complements PrismNote's AI integration
- [MessageBirds](https://github.com/Mullassery/MessageBirds) — open-source, event-driven Customer Data & Engagement Platform (Rust + TypeScript)

[Browse all projects →](https://github.com/Mullassery?tab=repositories)

## License

Apache License 2.0. See [LICENSE](LICENSE) for the full terms.