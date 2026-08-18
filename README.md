# PrismNote

A Jupyter-compatible data-science notebook with a Rust backend and a React
frontend: real local SQL execution, a real sandboxed code-execution engine,
and connectors for cloud data warehouses.

[![CI](https://github.com/Mullassery/PrismNote/actions/workflows/ci.yml/badge.svg)](https://github.com/Mullassery/PrismNote/actions/workflows/ci.yml)

## What this is

- **Backend:** Rust (Axum). Serves the API, runs SQL against local and
  remote databases, and launches Docker containers for sandboxed code
  execution.
- **Frontend:** React + TypeScript (Vite). Notebook UI, SQL cells, schema
  explorer, results grid.
- The release binary embeds the built frontend, so `prismnote` is a single
  executable that serves the whole app.

## SQL execution

SQL cells run against real databases — there is no mocked or placeholder
query path:

| Backend | Status |
|---|---|
| SQLite | Real, embedded (via `sqlx`), no server required |
| DuckDB | Real, embedded (bundled DuckDB, compiled from source), no server required |
| PostgreSQL | Real, via `sqlx`; requires a reachable Postgres server |
| MySQL | Real, via `sqlx`; requires a reachable MySQL server |

All four are covered by integration tests that run genuine
`CREATE TABLE` / `INSERT` / `SELECT` round trips
(`crates/server/src/db/executor.rs`). SQLite and DuckDB tests always run.
The Postgres/MySQL tests connect to a real server and skip (rather than
fail) when one isn't reachable — point them at a running server with
`PRISMNOTE_TEST_PG_PORT` / `PRISMNOTE_TEST_MYSQL_PORT`.

MongoDB is not implemented; connecting to it returns an explicit error
rather than a fake success.

## Sandboxed code execution

`docker_executor.rs` runs untrusted code in a brand-new, disposable Docker
container per execution (`docker run --rm`):

- No network access by default (`--network=none`)
- Memory, CPU, and process-count limits enforced per run
- A wall-clock timeout that force-kills and cleans up the container
- Real stdout/stderr/exit-code capture

Requires a working Docker installation. Supported languages: Python,
Bash/shell, JavaScript (Node), Ruby.

## Cloud warehouse connectors

Real connection + query execution for Snowflake, BigQuery, Redshift, Azure
Synapse, Databricks, Athena, Presto, and Trino (`crates/server/src/cloud_warehouse/`).
AWS-signed requests (Athena, Redshift) use a real SigV4 implementation.

## Building

```bash
git clone https://github.com/Mullassery/PrismNote.git
cd PrismNote
make build
```

`make build` builds the frontend first and embeds it into the release
binary — this is the only build path that produces a binary that actually
serves the UI. Running `cargo build --release` directly will build a
backend with no frontend assets. The binary is written to
`target/release/prismnote`.

Requirements: Rust (stable), Node 20.19+ (required by Vite 8), and Docker if
you want sandboxed code execution or want to test the container-management
endpoints.

### Development

```bash
# Terminal 1: backend on http://localhost:8000
cargo run

# Terminal 2: frontend dev server on http://localhost:5173
cd frontend && npm install && npm run dev
```

### Tests

```bash
cargo test --workspace --release   # backend
cd frontend && npm test            # frontend (vitest)
```

## Project layout

```
crates/server/   Rust backend: API, SQL executors, Docker sandbox, cloud warehouse connectors
frontend/        React app (components, hooks, API clients)
python/          PyPI launcher package
docs/            architecture notes and screenshots
```

## License

Proprietary — free to use with explicit attribution. See [LICENSE](LICENSE)
for the full terms.
