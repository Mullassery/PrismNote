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

- **CRITICAL, found 2026-09-27 via real-world benchmarking against real
  Jupyter: the Python kernel is a single global process shared by every
  notebook on the server, not one kernel per notebook.**
  `crates/server/src/main.rs:104` declares
  `kernel: tokio::sync::Mutex<Option<kernel::KernelManager>>` — a single
  slot in shared `AppState`, not a map keyed by notebook ID
  (`crates/server/src/api.rs` has 6 call sites reading `state.kernel`, all
  the same shared lock; `kernel_pid` is likewise one global atomic).
  Reproduced live: created notebook A, ran `x = 42` in it; created a brand
  new, unrelated notebook B that had never defined `x` anywhere; ran
  `print(x)` in notebook B — it printed `42`, notebook A's variable. Any
  two notebooks (including two different logged-in users', given the real
  JWT auth system) share one Python global namespace. This is a real
  data-isolation/security bug, not just a correctness quirk — one user's
  notebook can read another user's in-memory variables/data. **Not fixed in
  this pass**: the real fix (a `HashMap<notebook_id, KernelManager>` with
  spawn-on-first-use and some idle-eviction policy, updated across all 6
  call sites plus the pid-atomic) is a genuine multi-file architectural
  change, not a scoped bug fix — needs a dedicated session. Zero test
  coverage exists for `execute_cell`/kernel endpoints at all (no
  `crates/server/tests/` directory), which is presumably why this was never
  caught.
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
- **`PerClientRateLimiter` permanently locks out clients configured with a
  low rate limit — a self-inflicted denial-of-service bug.**
  `rate_limit.py:46` caps `tokens` at `min(self.burst_size, ...)` every
  call. `burst_size = (requests_per_minute / 60) * 10`, which is < 1.0 for
  any `requests_per_minute < 6`. Once `burst_size` itself is below 1.0, the
  bucket can never accumulate a full token no matter how much wall-clock
  time passes (verified with a simulated 3-year gap) — the client is
  rate-limited to permanent zero throughput. Documented via
  `test_low_rpm_permanently_locks_out_the_client_known_bug` in
  `tests/test_rate_limit.py`. Needs a design decision (e.g.
  `burst_size = max(1.0, rps * 10)`) rather than a one-line fix.
- **16 open Dependabot branches exist locally, unmerged** (5 cargo, 3
  github-actions, 5 npm, 5 pip — per `git branch -a`). Dependency updates,
  some of which may carry security fixes, are piling up unreviewed. Each
  needs its own review/merge.

## 2. Data-loss / correctness bugs (feature silently doesn't do what it claims)

- **Cloud storage (`CloudStorageManager`) is dead code behind a fake-success
  API.** There are *two* separate `CloudStorageManager` structs — one with
  real S3 SigV4 / GCS service-account JWT / Azure Blob Shared Key HMAC /
  Google Drive OAuth clients and real mockito-backed unit tests
  (`crates/server/src/cloud_storage.rs:1078`), one a mount-registry
  (`crates/server/src/file_manager.rs:194`) — and neither is referenced
  from `AppState`, `main.rs`, or `api.rs` (confirmed via
  `grep -rn "CloudStorageManager" crates/server/src`, zero hits outside
  each struct's own file). The actual routed handlers
  (`api::add_cloud_storage`, `list_cloud_storage`, `remove_cloud_storage` —
  `api.rs:2898,2913,2928`) are standalone stubs: `add_cloud_storage`
  returns a hardcoded `"status": "mounted"` without validating the
  provider, storing credentials, or calling any client code;
  `list_cloud_storage` always returns four hardcoded example entries
  regardless of what was "added"; `remove_cloud_storage` unconditionally
  returns `204`. **A user who submits real S3/GCS/Azure/Google Drive
  credentials gets a success response and nothing is stored, validated, or
  usable.** Wiring this up safely (credential storage/persistence design,
  `AppState` wiring, request schema, which of the two structs to keep) is a
  real feature-completion task, not a bounded fix.
- **"Insert as Cell" / "Copy as code" throws immediately in the Data
  Explorer, Data Querying panel, and Chart Builder.** `insertAsCell()` in
  `DataExplorer.tsx` and `DataPanel.tsx` (2 call sites each), and
  `insertAltair()` in `VizPane.tsx`, all call `.createNotebook()`/
  `.addCell()`/`.updateCell()` on `getNotebookState()`'s return value — but
  that function returns the plain Redux state slice (data only), not the
  action dispatchers `useNotebookStore()` provides. None of those methods
  exist on the real return type, so clicking these buttons throws
  `TypeError: store.createNotebook is not a function` the first time
  they're reached. (None of these three files even call
  `useNotebookStore()`, which is also why it shows up as an unused import.)
  The fix — call `useNotebookStore()` at each component's top level and use
  its actions — is a behavior change, not attempted yet.
  `ServerExplorer.tsx`'s equivalent `openNotebook()`, by contrast, is
  already correct.
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
- **`RelationshipMap.tsx`'s "force-directed" layout likely silently runs
  the wrong algorithm.** `applyLayout()`'s `'force-directed'` option passes
  `name: 'cose'` (cytoscape core's built-in layout) but options
  (`nodeSpacing`, `edgeLengthVal`, `directed`) that only the `cose-bilkent`
  extension recognizes — registered above via `cytoscape.use(coseLayout)`
  under the name `'cose-bilkent'`, not `'cose'`. This almost certainly runs
  plain `cose` with those three options silently ignored, not the intended
  `cose-bilkent` layout.

## 3. CI integrity (the safety net doesn't actually catch failures)

- **`tests.yml` ("Frontend Tests") cannot fail, regardless of what its
  steps actually find.** Both the lint and E2E steps swallow real failures:
  ```yaml
  - name: Run linter
    run: cd frontend && npm run lint 2>&1 || echo "Linting completed with warnings"
  - name: Run E2E tests
    run: cd frontend && npm run test:e2e 2>&1 || echo "E2E tests completed with warnings"
  ```
  What it's currently hiding:
  - `npm run lint`: **161 errors, 18 warnings** file-wide (63 of the errors
    are in `frontend/src` production code, not test scaffolding — down from
    348/435 after two typing-cleanup passes; see breakdown below).
  - `npm run test:e2e` (`--project=chromium` only): **28 passed, 57 failed**
    out of 85 (67% failure rate, 39 min runtime). Failures concentrate in
    `tests/e2e/relationship-map.spec.ts` (all 17 tests) and the
    `v1.4.0-phase-2-keyboard-stress/*` suite (most of ~40 tests) — timeouts
    waiting for `[data-testid="notebook-container"]` and similar selectors.
    Not root-caused; suggests either DOM drift from what the tests expect,
    or the dev server/app not reaching the ready state the tests assume.
    Firefox/WebKit projects have never been run (chromium only, given the
    39-minute cost for one browser already incurred).

  Removing the `|| echo` swallow would immediately turn this workflow
  permanently red until the remaining lint errors and failing E2E tests are
  fixed — recommend fixing incrementally (production-code lint errors
  first, since those aren't test scaffolding) and only then removing the
  swallow.

  Of the 63 remaining `frontend/src` lint errors: 13 are deliberately
  unfixed `no-explicit-any` (7 mark real bugs already listed above — the
  `insertAsCell`/layout issues — plus 6 in `lib/codeExecutor.ts`, see tech
  debt below); the remaining ~50 are pre-existing `react-hooks/*` rules
  (`set-state-in-effect`: 21, `immutability`: 17, `static-components`: 2,
  `refs`: 2, `preserve-manual-memoization`: 1) and `no-unused-vars`: 7 (all
  in `codeExecutor.ts`) — each requires an actual behavior/control-flow
  restructuring, not a type annotation. Left for a dedicated
  React-hooks-correctness pass.
- **Live GitHub Actions status on `main` is unverified from this
  environment.** `gh run list` / `gh api api.github.com` has timed out in
  every sandbox pass so far (network restriction). Treat the CI badge with
  caution until someone checks the Actions tab directly.

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
| `cd frontend && npm run lint` | 161 errors, 18 warnings (63 in `frontend/src` production code). |
| `cd frontend && npm test` (vitest) | 114/114 passed. |
| `cd frontend && npm run build` | Succeeds; oversized chunks (see Tech debt). |
| `cd frontend && npm run test:e2e -- --project=chromium` | 28 passed, 57 failed (39 min; Firefox/WebKit never run). |
| `python3 -m pytest tests/ -v` | 109 passed (was 2 skipped before dev-extra fix). |
| `cd frontend && npm audit` | 2 vulnerabilities (1 low, 1 moderate), down from 10. |
| `cargo audit` | Could not run — advisory DB fetch timed out (sandbox network). |
| `gh run list` / `gh api ...` | Could not run — timed out (sandbox network restriction). |
| `pre-commit run bandit --all-files` / `mypy --all-files` | Both run to completion. |
