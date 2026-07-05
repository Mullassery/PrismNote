# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

PrismNote is a full-stack data science notebook: Rust backend + React frontend + Python kernel. Multi-crate workspace with separate `pyproject.toml` files for package distribution.

**Directory structure**:
- `crates/server/` — Rust Axum web server (HTTP API, WebSocket for notebook cells, Data Explorer)
- `frontend/` — React 18 + TypeScript (Vite build, VSCode layout)
- `python/` — Pure Python launcher (`_cli.py`) and kernel integration
- `Cargo.toml` — Workspace root (version 0.4.5)
- `pyproject.toml` — Python package root (version 0.4.5, setuptools entry point)

**Version consistency**: Both Cargo.toml and root pyproject.toml must stay in sync (currently 0.4.5). Python `pyproject.toml` entry point is `prismnote = "prismnote._cli:main"`, which downloads and launches the prebuilt server binary.

**Backend layers** (`crates/server/`):
- `main.rs` — Axum server setup, CORS, WebSocket upgrade, static file serving
- `api/` — REST endpoints (notebook save/load, execute cell, Data Explorer queries)
- `kernel/` — Python kernel spawning (ipykernel subprocess over ZeroMQ)
- `explorer/` — Data Explorer: file/table discovery, query execution, result streaming
- `ai/` — AI completions (Ollama local, Claude/OpenAI remote)
- `storage/` — Notebook `.ipynb` I/O, metadata

**Frontend layers** (`frontend/src/`):
- `components/` — Notebook editor, Data Explorer grid, chart builder, terminal
- `hooks/` — WebSocket connection lifecycle, cell execution state
- `utils/` — DuckDB query planner, Parquet/CSV parser
- Cursor/VSCode layout: left sidebar (file explorer), center (notebook), right (data explorer)

**Python layer**:
- `_cli.py` — Thin entry point; on first run downloads `~/.prismnote/server` binary from GitHub releases
- No Python code in the UI — all logic in Rust/React

## Build & Dev Commands

**Backend only** (for server fixes, API changes):
```bash
cargo run --release              # HTTP server on :8000
cargo test -p server --release   # Backend tests
cargo clippy --workspace
cargo fmt
```

**Full stack** (for UI work):
```bash
# Terminal 1: Backend
cargo run

# Terminal 2: Frontend
cd frontend && npm install && npm run dev   # Vite dev server on :5173
# Then navigate to http://localhost:5173
```

**Build release binary**:
```bash
cargo build --release --bin server
# Output: target/release/prismnote (macOS/Linux)
```

**Python distribution**:
```bash
# Must happen AFTER cargo build --release
maturin build --release         # Cross-compile wheels; uses prebuilt binaries
# Outputs: dist/*.whl
```

**Run tests**:
```bash
cargo test --workspace --release       # All tests
cargo test -p server --release cell    # Filter by test name pattern
cd frontend && npm test                 # Jest (currently empty)
```

## Important Implementation Details

- **Python kernel**: Spawned as subprocess (ipykernel). Communication via ZeroMQ (tcp://127.0.0.1:5555 by default). Cell execution async-safe via tokio + blocking::unblock for subprocess I/O.
- **Data Explorer**: Lazy evaluation — metadata (schema, row count) fetched on table select. Data only transferred when user scrolls or applies filters. Uses DuckDB for Iceberg/Delta support.
- **File download flow**: Browser → Axum static serve (range requests supported). Large files streamed, not buffered.
- **WebSocket**: One connection per notebook. Cell execution sends progress events (`cell_queued`, `cell_running`, `cell_complete`). Frontend re-renders on each event.
- **Chart no-code builder**: Detects numeric/categorical columns, suggests aggregations (COUNT, SUM, AVG). Chart config stored as JSON in cell metadata.
- **AI features**: Optional — requires `anthropic` or `openai` Python package in kernel environment. Default: Ollama local (requires separate Ollama install).
- **Storage**: Notebooks stored as `.ipynb` (Jupyter format). Metadata (explorer state, AI provider) in `.prismnote-meta.json` alongside notebook.

## Dual pyproject.toml Note

The root `pyproject.toml` wraps the Rust server binary. The `python/pyproject.toml` (generated during package build) defines the Python API surface if the package grows beyond a CLI launcher. Both must have matching version strings.
