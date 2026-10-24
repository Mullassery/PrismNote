# ROADMAP_HONEST

Honest status tracking for PrismNote (v1.11.1 as of 2026-09-27). Every item
below was personally verified during the 2026-09-19 through 2026-09-27 audit
passes by reading the code and/or running the command shown — nothing here
is inferred or assumed. Where a command wasn't run, that's stated
explicitly.

**This file lists open issues only, sorted by severity** (security >
data-loss/correctness bugs > CI-integrity problems > missing/inert features
> tech debt). Items already fixed during the audit passes have been removed
from here — see `CHANGELOG.md`'s `[Unreleased]` and `[1.11.1]` sections, or
`git log`, for what was fixed and when. This supersedes
`docs/reference/ROADMAP.md` (archived to
`docs/archive/ROADMAP_REFERENCE_PRE_CONSOLIDATION_2026-09.md`), which had a
large stale v1.3 → v2.0 phased plan describing a version of the product that
no longer matches reality.

---

## 1. Security

- **FIXED (2026-09-27) — see CHANGELOG.md's `[Unreleased]` Security section
  for the full writeup: the Python kernel used to be a single global
  process shared by every notebook on the server (a real cross-notebook/
  cross-user data-isolation bug), replaced with a `kernel::KernelRegistry`
  keyed per-notebook, re-verified against the real running server.**
- **FIXED (2026-09-27), same pass: kernel spawn hardcoded `Command::new("python")`,
  which doesn't exist on this (or many modern) machines** — `python3` is
  the interpreter that's actually present, and the only symptom was the
  misleading `"Kernel not available. Install ipykernel: pip install
  ipykernel"` error, even with ipykernel correctly installed under
  `python3`. Fixed with a `python3`-first resolution helper
  (`crates/server/src/kernel.rs`, `python_binary()`) used consistently
  across all 3 call sites that previously hardcoded `"python"`. Regression
  test added. Verified end-to-end afterward: real cross-cell state
  persistence (`x`/`df` defined in one cell, read in the next with no
  re-import) and real exception handling (an actual traceback for a real
  `ZeroDivisionError`, not swallowed) both work correctly *within* a single
  notebook, once a kernel can actually start — see the isolation bug above
  for the "across notebooks" caveat.
- **SQL execution parameterization end-to-end — not audited.**
  `query_validator.rs`'s defense-in-depth validation is real and tested (8
  passing unit tests), but nobody has audited whether every one of the
  SQLite/DuckDB/Postgres/MySQL/8-cloud-warehouse execution paths uses real
  parameterized queries versus string interpolation for the actual SQL
  execution (as opposed to the pre-execution validation layer). Not audited
  in any pass so far — the validation layer being solid doesn't guarantee
  the execution layer is.
- **`cargo audit` has never successfully run — Rust dependency
  vulnerability status is unverified, not clean.** Its advisory-database
  git fetch to GitHub has timed out in every sandbox this has been tried
  from. Needs to be run from an environment with real network access before
  anyone can say the Rust dependency tree has no known CVEs.
- **`npm audit`: 2 known vulnerabilities remain unfixed** (1 low, 1
  moderate; both `dompurify`, transitively via `monaco-editor`), down from
  10 after a `npm audit fix` pass (no `--force`, no `package.json` changes).
  No fix is available without an upstream `monaco-editor` version bump. See
  `SECURITY.md`.
- ~~**`PerClientRateLimiter` permanently locks out clients configured with a low rate limit**~~ — **FIXED.** `rate_limit.py` now guarantees `self.burst_size = max(1.0, ...)` across `RateLimiter` and `PerClientRateLimiter`. Clients configured with `< 6 RPM` accumulate tokens normally and are no longer permanently locked out. Verified with updated test `test_low_rpm_allows_periodic_requests`.
- **16 open Dependabot branches exist locally, unmerged** (5 cargo, 3
  github-actions, 5 npm, 5 pip — per `git branch -a`). Dependency updates,
  some of which may carry security fixes, are piling up unreviewed. Each
  needs its own review/merge.

## 2. Data-loss / correctness bugs (feature silently doesn't do what it claims)

- **[RESOLVED 2026-10-11] Cloud storage (`CloudStorageManager`) is now wired.**
  Historically there were *two* separate `CloudStorageManager` structs — the
  real one with S3 SigV4 / GCS service-account JWT / Azure Blob Shared Key
  HMAC / Google Drive OAuth clients and mockito-backed unit tests
  (`crates/server/src/cloud_storage.rs:1078`), plus a mount-registry
  (`crates/server/src/file_manager.rs:194`) — and the routed handlers were
  standalone stubs. The real manager is now held in `AppState`
  (`main.rs`, `AppState.cloud_storage`) and the routes
  (`api::add_cloud_storage` / `list_cloud_storage` / `remove_cloud_storage`)
  call it: `add_cloud_storage` parses the provider credentials and registers
  a real client (returning `400` for an unknown provider), `list_cloud_storage`
  returns the actually-configured clients, and `remove_cloud_storage` drops
  one. The remaining gap is *scheduling* automatic notebook backups on top of
  these clients, which is not yet built.
- **Fixed (C28): "Insert as Cell" / "Copy as code" no longer throws.**
  `DataExplorer.tsx`, `DataPanel.tsx` and `VizPane.tsx` now dispatch the
  real Redux thunks/actions (`createNotebook`, `addCell`, `updateCell`)
  instead of calling non-existent methods on the plain state slice returned
  by `getNotebookState()`.
- **Cloud-warehouse schema/database browsing returns hardcoded placeholder
  data.** `get_databases()` / `get_tables()` don't reflect a live
  connection's real schema — separate from the real connection/query
  execution path, which does work.
- **AI Agent panel's "Act" mode is unreachable — it's permanently stuck in
  "Plan" mode.** `AgentPanel.tsx`: `const [mode, setMode] =
  useState<Mode>('plan')` — `mode` is read in several places (system
  prompt selection, `<action>`-tag parsing, the "Planning"/"Thinking"
  label) but `setMode` is never called anywhere in the file (confirmed via
  `grep -n setMode AgentPanel.tsx`). There is no UI toggle between Plan/Act
  mode, so the action-taking system prompt and `<action>`-parsing path are
  dead code today. Building the missing toggle is a real feature gap.
- **Fixed (C28): `RelationshipMap.tsx`'s force-directed layout.** The
  option object now uses cytoscape core `cose` options it actually
  understands (typed against `LayoutOptions`) instead of silently ignored
  `cose-bilkent`-only fields.

## 3. CI integrity

- **Fixed (C28): `tests.yml` no longer swallows failures.** The old
  `|| echo "… completed with warnings"` suffixes are gone; lint and E2E now
  fail the job. The workflow uses `npm ci`, caches npm, installs Playwright's
  Chromium/Firefox/WebKit browsers with dependencies, and runs the full E2E
  suite.
- **Frontend lint:** `npm run lint` reports **0 errors, 61 warnings**. The
  remaining warnings are the React Compiler advisory rules
  (`set-state-in-effect`, `immutability`, `preserve-manual-memoization`,
  `refs`, `static-components`) plus `exhaustive-deps`; they are deliberately
  kept as warnings (documented in `frontend/eslint.config.js`) until a
  dedicated React-hooks/compiler pass. Correctness rules are errors.
- **Playwright E2E:** **207 tests pass** on Chromium, Firefox and WebKit.
  The keyboard-stress suite now drives controls that actually exist in the
  frontend-only harness (terminal prompt, command palette, settings/search),
  and the old Relationship Map tests that required a seeded database were
  replaced with reachable smoke tests plus pure `graphBuilder` unit tests.
- **Graphify:** the optional workflow that referenced the non-existent
  `grapify-ai/grapify-action` was removed. Graphify is local, opt-in tooling
  only (`tools/graphify/`).
- **Live GitHub Actions status on `main` is still unverified from sandboxed
  passes.** `gh run list` / `gh api` has timed out there; check the Actions
  tab directly after pushing.

---

## 4. Missing / inert features

- **Notebook version control is fully built but completely disconnected.**
  `versioning.rs` fully implements `VersionManager::create_version`,
  `rollback_to_version`, `get_version_diff`, `list_versions`,
  `create_branch`, `switch_branch` — but `mod versioning;` in `main.rs:44`
  is the only reference to it anywhere in the codebase (confirmed via
  `grep -rn "VersionManager" crates/server/src`, zero hits outside the
  module itself; 5 "never constructed"/"never used" compiler warnings).
  There is no API route or UI wired to it — from a user's perspective this
  feature does not exist.
- **Linux / Windows prebuilt binaries don't exist**, despite a real, working
  multi-platform release workflow (`release-binaries.yml`: macOS
  arm64/Intel, Linux x86_64/arm64, Windows x86_64) sitting disabled since
  2026-06-20 (commit `1e50b10`, moved to `.github.bak/` — apparently
  because the push token in use at the time lacked the `workflow` OAuth
  scope needed to push workflow-file changes) and never reactivated. Now at
  `docs/archive/disabled-workflows/release-binaries.yml.disabled` for
  visibility. Needs a token/PAT with the `workflow` scope and a fresh
  verification run (Windows/cross-compile targets have never been
  confirmed working) before restoring to `.github/workflows/`. README
  already discloses macOS-Apple-Silicon-only.
- **Redshift / Azure Synapse cloud warehouse connectors have never been
  verified against a live server.** Real native wire-protocol
  implementations exist (Postgres wire via `sqlx`, TDS via `tiberius`), and
  each has an `#[ignore]`-gated integration test
  (`REDSHIFT_TEST_DSN`, `SYNAPSE_TEST_HOST`/`_USER`/`_PASSWORD`) that has
  apparently never actually been run against a real instance — no
  Docker/Postgres/Synapse instance has been available in any environment
  this has been tried from.
- **Redux Toolkit migration is genuinely incomplete — two state-management
  systems coexist in production.** Only the `notebook` slice is on Redux
  (`frontend/src/hooks/useNotebookRedux.ts` /
  `frontend/src/store/notebookSelectors.ts`). `DataExplorer.tsx`,
  `FileExplorer.tsx`, `SchemaExplorer.tsx`, `DuckDBExplorer.tsx`, and 6
  hooks (`usePlots.ts`, `useExecutionMinimap.ts`, `useAIContext.ts`,
  `useViz.ts`, `useSchemaCache.ts`, `useWorkspace.ts`) remain on Zustand.
  Real complexity/confusion, not a cosmetic label issue.
- **AI Agent panel is missing the font zoom controls every other panel
  has.** `AgentPanel.tsx` destructures `inc`/`dec` from
  `useFontSize('pn-ai-font', 13)` but never wires them to a button —
  `Toolbar.tsx`, `DataExplorer.tsx`, `PlotsPanel.tsx`, `Notebook.tsx`,
  `FileExplorer.tsx`, `BottomPanel.tsx`, and `DataPanel.tsx` all wire the
  same hook to +/- buttons; this one doesn't.
- **MongoDB connector not implemented** — connecting returns an explicit
  error (already accurately documented in README; not a hidden gap).
- **AAD / LDAP / generic-OAuth enterprise login not implemented.**
  `crates/server/src/enterprise_auth.rs:220,238,255` — `authenticate_aad`,
  `authenticate_ldap`, `authenticate_oauth` all explicitly return "not
  implemented" errors rather than fabricating a session (no hidden
  failure mode; the now-archived `FEATURES_STATUS.md`'s claim that this was
  "production-ready" was false and that file has been archived).
- **Data-quality scoring is hardcoded.** `lineage.rs:82` hardcodes
  `data_quality_score: 0.95` with a `// TODO: calculate from quality
  checks` comment; `api.rs:5971` has a matching TODO for fetching real
  quality assertions. Already accurately flagged in README.
- **Small UI TODOs (not implemented):**
  `frontend/src/components/GitHubSync.tsx:287` (auto-sync toggle),
  `frontend/src/components/UnifiedSearch.tsx:114` (result-type navigation),
  `frontend/src/components/DataCatalogPanel.tsx:75` (detailed column info
  fetch).

## 5. Tech debt

- **`frontend/src/lib/codeExecutor.ts` is dead code that fakes real
  behavior — should be deleted, not typed or fixed.** Zero imports
  anywhere in `src` or `tests`. Its `executeQuery()` always returns
  hardcoded mock rows (`{ id: 1, name: 'Sample', value: 100 }`) regardless
  of the query, and its Python/R/etc. executors hit
  `http://localhost:8888` (raw Jupyter REST API) directly, bypassing this
  app's actual backend entirely. Per this org's no-fake-stubs convention,
  typing it would dress up a fake stub as reviewed/real — it should be
  deleted in a follow-up pass instead.
- **Frontend bundle size is large and not code-split.** The two largest
  `npm run build` chunks are `dist/assets/index-*.js` (3.01 MB / 982 KB
  gzip) and `dist/assets/editor.api2-*.js` (3.63 MB / 927 KB gzip) — both
  far over Vite's 500 KB warning threshold, mostly Monaco Editor. The
  bundle analyzer (`ANALYZE=true npm run build`, wired into `tests.yml`,
  uploads `dist/stats.html` as a CI artifact) correctly surfaces this, but
  nobody has acted on it. Dynamic `import()` / manual chunking for Monaco
  would be the fix.
- **11 `#[allow(dead_code)]` suppressions and 217 compiler warnings** on a
  clean release build (`sql_executor.rs`×2, `docker_executor.rs`×5,
  `api.rs`, `db/connections.rs`, `db/executor.rs`, plus one
  `#[allow(clippy::too_many_arguments)]` in `cloud_warehouse/sigv4.rs`) —
  the large majority "never constructed"/"never used" for entire
  structs/impls (`versioning.rs` in full, plus smaller pieces elsewhere).
  Needs a per-warning judgment call (delete dead code vs. wire it up).

---

## What's been verified (latest numbers, commands + real results)

| Command | Result |
|---|---|
| `cargo build --release --all-features` | Builds. 217 warnings. |
| `cargo test --workspace --release` (default parallel and `--test-threads=1`) | 171 passed, 0 failed, 2 ignored. |
| `cd frontend && npm run lint` | 0 errors, 61 advisory React Compiler warnings. |
| `cd frontend && npm test` (vitest) | 120/120 passed (114 plus 6 graph-builder tests). |
| `cd frontend && npm run build` | Succeeds; oversized chunks (see Tech debt). |
| `cd frontend && npm run test:e2e` | 207/207 passed across Chromium, Firefox and WebKit. |
| `python3 -m pytest tests/ -v` | 120 passed, 3 skipped. |
| `cd frontend && npm audit` | 2 vulnerabilities (1 low, 1 moderate), down from 10. |
| `cargo audit` | Could not run — advisory DB fetch timed out (sandbox network). |
| `gh run list` / `gh api ...` | Could not run — timed out (sandbox network restriction). |
| `pre-commit run bandit --all-files` / `mypy --all-files` | Both run to completion. |
