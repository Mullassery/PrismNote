# Audit findings — 2026-10-19

This file records the repository-specific findings from the portfolio audit
conducted on 2026-10-19. It is documentation only; no code or release artifacts
were changed in this pass unless explicitly noted under "Implementation status".

Sources: the repository's own README/source/workflows, GitHub metadata and
Actions runs, PyPI metadata, and official competitor documentation. Claims are
marked as verified, inferred, or open questions. "Absent" means not found in the
inspected repository/docs, not proof that it cannot exist.

## What it is

Local-first, Jupyter-compatible data-science notebook with SQL warehouses, AI assistance, and Docker-sandboxed execution.

## Verified strengths

- 57k LOC; real Jupyter kernel semantics; SQLite/DuckDB/Postgres/MySQL and cloud warehouse connectors; Docker sandbox with limits; AI incl. Ollama; dbt/GitHub/Airflow/K8s/RunPod integrations; SSRF-safe previews; single binary; CI build/tests green.
- Genuine differentiator: single binary + warehouse SQL + sandboxed execution.

## Verified gaps and user-facing risks

- Linux/Windows binaries already exist in `release-assets/` but GitHub releases only ship macOS arm64; ~338 MB of duplicate binaries are committed to git.
- Frontend lint ~435 errors and Playwright e2e 57/85, non-gating; MongoDB explicit error; data-quality scoring unwired; idle kernels never evicted.
- No collaboration; PyPI package is a 26 KB wrapper.

## Direct competitors

- marimo (reactive, `.py`, SQL, AI), JupyterLab (ecosystem), Deepnote/Hex (commercial collaboration), VS Code/Positron.

## Ranked next actions

- P1: publish the existing Linux/Windows binaries; move assets to Releases/LFS (S).
- P1: fix lint/e2e gates (M).
- P2: idle kernel eviction/resource limits (M).

## Do not build

- MongoDB, CRDT collaboration, cloud SaaS; none are required for the local-first wedge.

## Evidence gaps / validation needed

- No cross-platform release test; no performance benchmark vs Jupyter; failing e2e may hide defects.

## Recommended disposition

Invest; the packaging/release gap is the main blocker, not the product.

## Implementation status

No code changes in this pass.
