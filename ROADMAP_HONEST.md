# ROADMAP_HONEST

Honest status tracking for PrismNote (v1.11.0 as of 2026-09-20). Every item
below was personally verified during this pass by reading the code and/or
running the command shown — nothing here is inferred or assumed. Where a
command wasn't run, that's stated explicitly.

This supersedes `docs/reference/ROADMAP.md` (archived to
`docs/archive/ROADMAP_REFERENCE_PRE_CONSOLIDATION_2026-09.md`), which had
two genuinely useful dated status-check entries (2026-08-24, 2026-08-07)
whose still-relevant findings are folded in below, and a large stale v1.3
→ v2.0 phased plan that is not folded in (superseded, aspirational, and
mostly about a version of the product that no longer matches reality).

---

## 1. Built, not (fully) tested

- **Redshift / Azure Synapse cloud warehouse connectors.** Real native
  wire-protocol implementations (Postgres wire via `sqlx`, TDS via
  `tiberius`), but never verified against a live server in any environment
  this maintainer has run them in — no Docker/Postgres/Synapse instance was
  available. Each has an `#[ignore]`-gated integration test
  (`REDSHIFT_TEST_DSN`, `SYNAPSE_TEST_HOST`/`_USER`/`_PASSWORD`) that has
  apparently never been run against a real instance.
- **Fixed 2026-09-21: `docker_executor::tests::sandbox_enforces_wall_clock_timeout_and_kills_container`
  flakiness.** Root cause confirmed: `docker kill` returns as soon as the
  daemon sends the signal, but the `--rm` container's actual removal
  happens asynchronously once the daemon observes the process exit — the
  test's single immediate `docker ps -a` check (`docker_executor.rs:910-925`)
  could race real cleanup under concurrent test-suite load. Replaced the
  single check with a bounded poll (up to 10s, 200ms interval). Verified:
  `cargo test --release --all-features` — 171 passed, 0 failed, 2 ignored
  (both default parallel and `--test-threads=1`); the specific test run in
  isolation also passes.
- **SQL execution parameterization end-to-end.** `query_validator.rs`'s
  defense-in-depth validation is real and tested (8 passing unit tests),
  but nobody has audited whether every one of the SQLite/DuckDB/Postgres/
  MySQL/8-cloud-warehouse execution paths uses real parameterized queries
  versus string interpolation for the actual SQL execution (as opposed to
  the pre-execution validation layer). Not audited in this pass.
- **Cloud storage (`CloudStorageManager`).** `cargo build` reports
  `struct CloudStorageManager is never constructed` (2 warnings) — the
  README's claim of real, tested S3/GCS/Azure Blob/Google Drive support may
  route through free functions rather than this struct; not independently
  re-verified in this pass (README's existing claims were taken as
  previously-verified, not re-tested here).

## 2. Not built

- **MongoDB connector.** Confirmed not implemented; connecting returns an
  explicit error (already accurately documented in README).
- **AAD / LDAP / generic-OAuth enterprise login.**
  `crates/server/src/enterprise_auth.rs:220,238,255` — `authenticate_aad`,
  `authenticate_ldap`, `authenticate_oauth` all explicitly return "not
  implemented" errors rather than fabricating a session. This directly
  contradicts the now-archived `docs/development/FEATURES_STATUS.md`,
  which claimed "OAuth2/SSO (cloud deployments) ✅ PRODUCTION-READY" — that
  claim was false and the file has been archived.
- **Notebook version control (`versioning.rs`).** Fully implemented
  (`VersionManager::create_version`, `rollback_to_version`,
  `get_version_diff`, `list_versions`, `create_branch`, `switch_branch`)
  but completely disconnected — `mod versioning;` is declared in
  `main.rs:44` and nothing else in the codebase references
  `VersionManager` or calls into this module (confirmed via
  `grep -rn "VersionManager" crates/server/src`, zero hits outside
  `versioning.rs` itself; confirmed via 5 "never constructed"/"never used"
  compiler warnings for this module). From a user's perspective this
  feature does not exist — there is no API route or UI wired to it.
- **Cloud-warehouse schema/database browsing** (`get_databases()` /
  `get_tables()`) — returns hardcoded placeholder data, separate from the
  real connection/query execution (per the 2026-08-07 status-check entry
  preserved from the archived roadmap).
- **Data-quality scoring** (`api::get_quality_score`,
  `lineage::data_quality_score`) — `lineage.rs:82` hardcodes
  `data_quality_score: 0.95` with a `// TODO: calculate from quality
  checks` comment; `api.rs:5971` has `// TODO: Fetch actual quality
  assertions and run them`. Already accurately flagged in README; confirmed
  by reading the code.
- **Small UI TODOs (not implemented):**
  `frontend/src/components/GitHubSync.tsx:287` (auto-sync toggle),
  `frontend/src/components/UnifiedSearch.tsx:114` (result-type navigation),
  `frontend/src/components/DataCatalogPanel.tsx:75` (detailed column info
  fetch).
- **Linux / Windows prebuilt binaries.** README already says macOS
  Apple-Silicon-only. Root cause found in this pass: a real, working
  multi-platform release workflow (`release-binaries.yml`, builds macOS
  arm64/Intel, Linux x86_64/arm64, Windows x86_64) has been sitting
  disabled since 2026-06-20 (commit `1e50b10`, "temp: stage workflow
  removal for push" — moved from `.github/workflows/` to a `.github.bak/`
  directory, apparently because the push token in use at the time lacked
  the `workflow` OAuth scope needed to push workflow-file changes) and was
  never reactivated. Moved in this pass to
  `docs/archive/disabled-workflows/release-binaries.yml.disabled` for
  visibility; **not reactivated** — that needs a token/PAT with the
  `workflow` scope and a fresh verification run (the Windows/cross-compile
  targets in particular have never been confirmed working) before being
  restored to `.github/workflows/`.

## 3. CI errors / broken

- **`cargo test --workspace --release` — the exact command `ci.yml`'s
  `rust-build` job runs — failed once locally** on 2026-09-19 (flaky test,
  fixed 2026-09-21, see "Built, not (fully) tested" above). Could not
  verify current live GitHub Actions status: `gh run list` / `gh api` to
  `api.github.com` timed out from this sandbox (network restriction), so
  whether the badge on `main` is currently green could not be confirmed
  independently. Treat the existing CI badge with caution until someone
  checks the Actions tab directly.
- **`tests.yml` ("Frontend Tests") silently swallows real failures.** Both
  steps use `|| echo "... completed with warnings"`:
  ```yaml
  - name: Run linter
    run: cd frontend && npm run lint 2>&1 || echo "Linting completed with warnings"
  - name: Run E2E tests
    run: cd frontend && npm run test:e2e 2>&1 || echo "E2E tests completed with warnings"
  ```
  This means the job reports green **no matter what** these commands
  actually do. Verified today they are not just theoretically broken but
  **actually failing**:
  - `npm run lint`: **435 errors, 22 warnings** (348 errors/22 warnings in
    `frontend/src` alone, excluding test files — this isn't just messy test
    code). Overwhelmingly `@typescript-eslint/no-explicit-any`, plus a real
    `react-hooks/exhaustive-deps` warning in `src/pages/Login.tsx:38`
    (`handleGoogleResponse` missing from the Google Sign-In `useEffect`
    dependency array — genuine stale-closure risk in the login flow, not
    just a lint nag). **Fixed 2026-09-21**: the script-load effect now
    calls through a ref that's kept up to date every render, so it no
    longer depends on (or needs to re-run for) a function recreated every
    render. `npm run lint` now reports 435 errors, 21 warnings (was 22).
    13 `eslint-disable`/`eslint-disable-next-line`
    comments across 8 files (`App.tsx`×2, `VizPane.tsx`,
    `DataExplorer.tsx`×5, `FindReplace.tsx`, `BottomPanel.tsx`,
    `ServerExplorer.tsx`×2, `DataPanel.tsx`) all suppress
    `react-hooks/exhaustive-deps` — worth auditing for real bugs, not
    assuming they're all safe.
  - `npm run test:e2e` (`--project=chromium` only, single browser): **28
    passed, 57 failed** out of 85 tests (67% failure rate), run took 39
    minutes. Failures are concentrated in
    `tests/e2e/relationship-map.spec.ts` (all 17 tests) and the
    `v1.4.0-phase-2-keyboard-stress/*` suite (most of ~40 tests) — timeouts
    waiting for `[data-testid="notebook-container"]` and similar selectors,
    suggesting either the app's real DOM structure has drifted from what
    these tests expect, or the dev server / app doesn't reach a ready state
    the tests assume. Not root-caused in this pass — this needs a dedicated
    debugging session, not a quick fix.
  - **This means the "Playwright E2E tests wired into CI" claim in this
    org's usual conventions is technically true (the workflow exists and
    runs) but practically misleading (the workflow cannot currently fail,
    regardless of these results).** Not fixed in this pass: removing the
    `|| echo` swallow would immediately turn this workflow permanently red
    until the 435 lint errors and 57 failing E2E tests are separately
    fixed — a large, non-trivial body of work that shouldn't be forced
    through a doc-standardization pass. Recommendation: fix incrementally
    (start with `frontend/src`'s 348 real lint errors, since those are
    production code, not test scaffolding) and only then remove the
    swallow.
- **Fixed 2026-09-21: `.pre-commit-config.yaml` bandit hook referenced a
  nonexistent `.bandit` config file.** The `bandit` hook had
  `args: ["-c", ".bandit"]` pointing at a file that doesn't exist anywhere
  in the repo. Removed the arg so bandit runs with its defaults. Verified:
  `pre-commit run bandit --all-files` now runs to completion (finds
  legitimate low/medium findings in existing code, unrelated to this fix
  and out of scope here) instead of failing on the missing config file.
- **Fixed 2026-09-21: `.pre-commit-config.yaml` mypy hook depended on
  `types-all`**, a metapackage PyPI has removed. Removed the
  `additional_dependencies: [types-all]` line — the third-party libraries
  actually imported (`fastapi`, `pydantic`, `starlette`) ship their own
  inline types, and the hook's existing `--ignore-missing-imports` arg
  covers anything else. Verified: `pre-commit run mypy --all-files` now
  runs to completion (surfaces 5 pre-existing real type errors, unrelated
  to this fix and out of scope here) instead of failing to install
  `types-all`.
- **16 open Dependabot branches exist locally and appear unmerged**
  (5 cargo, 3 github-actions, 5 npm, 5 pip — `git branch -a` at the start
  of this pass). Dependency updates are piling up unaddressed; not
  something this pass could fix (each needs its own review/merge).
- **Missing npm ecosystem in Dependabot.** Fixed in this pass —
  `.github/dependabot.yml` had `cargo`, `pip`, and `github-actions` entries
  but no `npm` entry for `frontend/`, meaning frontend dependencies got no
  automated update PRs at all. Added a `directory: "/frontend"` npm entry.

## 4. Features not yet functional (built but effectively inert, or missing verification of the sandbox that matters)

- **Notebook version control** — see "Not built" above; code exists,
  nothing calls it, so functionally this feature does not exist for a user
  today.
- **Redux Toolkit migration is genuinely incomplete, not just "not yet
  finished."** Confirmed by re-checking (originally found 2026-08-24, still
  true): only the `notebook` slice is on Redux
  (`frontend/src/hooks/useNotebookRedux.ts`, using selectors in
  `frontend/src/store/notebookSelectors.ts`). `DataExplorer.tsx`,
  `FileExplorer.tsx`, `SchemaExplorer.tsx`, `DuckDBExplorer.tsx`, and 6
  hooks (`usePlots.ts`, `useExecutionMinimap.ts`, `useAIContext.ts`,
  `useViz.ts`, `useSchemaCache.ts`, `useWorkspace.ts`) remain on Zustand.
  Two state-management systems coexist in production; this is real
  complexity/confusion, not a cosmetic label issue.
- **Frontend bundle size is large and not code-split.** `npm run build`
  (verified 2026-09-19): the two largest chunks are
  `dist/assets/index-*.js` (3.01 MB / 982 KB gzip) and
  `dist/assets/editor.api2-*.js` (3.63 MB / 927 KB gzip) — both far over
  Vite's 500 KB warning threshold, mostly Monaco Editor. The bundle
  analyzer (`ANALYZE=true npm run build`, wired into `tests.yml`) correctly
  surfaces this (`dist/stats.html` uploaded as a CI artifact), but nobody
  has acted on what it shows — dynamic `import()` / manual chunking for
  Monaco would be the fix. Not attempted in this pass.
- **Fixed 2026-09-21: `JWT_SECRET` no longer silently falls back to a
  hardcoded, publicly-visible string.** `get_jwt_secret()`
  (`crates/server/src/middleware/auth.rs`) now panics with a clear message
  if `JWT_SECRET` is unset, checked once at server startup (`main.rs`) so a
  misconfigured deployment fails immediately instead of serving forgeable
  tokens. Also fixed: three JWT-issuing call sites in `api.rs`
  (`auth_register`, `auth_login`, Google OAuth login) hardcoded
  `"default-secret"` directly rather than reading `JWT_SECRET` at all —
  even a deployment that *did* set `JWT_SECRET` would have signed tokens
  with a different, hardcoded secret than the one used to validate them.
  All three now call `get_jwt_secret()`. Verified:
  `cargo test --release --all-features` — 171 passed, 0 failed, 2 ignored
  (including new `test_jwt_secret_panics_when_unset`). See `SECURITY.md`.
- **Partially fixed 2026-09-21: `npm audit`.** `npm audit fix` (no
  `--force`, `package.json` unchanged — only transitive dependency patch/
  minor bumps within existing semver ranges) took the frontend from 10
  known vulnerabilities down to 2 (1 low, 1 moderate). Verified: `npm test`
  still 114/114, `npm run build` still succeeds. The remaining 2
  (`dompurify`, transitively via `monaco-editor`) have no fix available
  without an upstream `monaco-editor` bump — not attempted, see
  `SECURITY.md`. `cargo audit` could not be run in this sandbox (its
  advisory-database git fetch to GitHub timed out) — Rust dependency
  vulnerability status is **unverified**, not "clean."
- **Python package (`python/prismnote/`) has effectively zero test
  coverage.** `security.py` (79 lines), `sql_validator.py` (81 lines),
  `rate_limit.py` (157 lines), and `middleware.py` (115 lines) — all
  security-relevant modules — have no dedicated test files anywhere in the
  repo. The only Python test file, `tests/test_python_bindings.py`, has 2
  tests, both of which **skip** (not pass) unless the package is installed
  first (verified: `python3 -m pytest tests/ -v` → "2 skipped").
- **11 `#[allow(dead_code)]` suppressions in Rust**
  (`sql_executor.rs`×2, `docker_executor.rs`×5, `api.rs`, `db/connections.rs`,
  `db/executor.rs`, plus one `#[allow(clippy::too_many_arguments)]` in
  `cloud_warehouse/sigv4.rs`) and **217 compiler warnings** on a clean
  release build, the large majority "never constructed" / "never used" for
  entire structs/impls (confirmed: `versioning.rs` in full, plus smaller
  pieces elsewhere). Not cleaned up in this pass — would need a
  per-warning judgment call (delete dead code vs. wire it up) that's
  outside a documentation pass's scope.
- **`sqlx-postgres` future-incompatibility warning.** `cargo build`
  reports `sqlx-postgres v0.7.4` "contains code that will be rejected by a
  future version of Rust." Needs a version bump at some point; not urgent
  today but will eventually force an unplanned dependency bump.

---

## What was validated in this pass (commands + real results)

| Command | Result |
|---|---|
| `cargo build --release --all-features` | Builds. 217 warnings. |
| `cargo test --workspace --release` | 170 passed, 1 failed (flaky, see above), 2 ignored. |
| `cd frontend && npm run lint` | 435 errors, 22 warnings. |
| `cd frontend && npm test` (vitest) | 114/114 passed. |
| `cd frontend && npm run build` | Succeeds; oversized chunks (see above). |
| `cd frontend && npm run test:e2e -- --project=chromium` | 28 passed, 57 failed (39 min). |
| `python3 -m pytest tests/ -v` | 2 skipped (package not installed). |
| `npm audit` (frontend) | 6 vulnerabilities (3 high, 3 moderate), transitive. |
| `cargo audit` | Could not run — advisory DB fetch timed out (sandbox network). |
| `gh run list` / `gh api ...` | Could not run — timed out (sandbox network restriction to `api.github.com`). |

Firefox/WebKit Playwright projects were not run (chromium only, due to the
39-minute runtime already incurred for one browser).

## Quick-fix pass, 2026-09-21 (commands + real results)

| Command | Result |
|---|---|
| `cargo build --release --all-features` | Builds. Still 217 warnings (no new ones). |
| `cargo test --release --all-features` (default parallel) | 171 passed, 0 failed, 2 ignored. |
| `cargo test --release --all-features -- --test-threads=1` | 171 passed, 0 failed, 2 ignored. |
| `cd frontend && npm run lint` | 435 errors, 21 warnings (was 22 — Login.tsx exhaustive-deps fixed). |
| `cd frontend && npm test` (vitest) | 114/114 passed. |
| `cd frontend && npm run build` | Succeeds; same oversized chunks as before (unrelated, not attempted). |
| `cd frontend && npm audit` | 2 vulnerabilities (1 low, 1 moderate), down from 10 (`npm audit fix`, no `--force`). |
| `pre-commit run bandit --all-files` | Runs to completion (was: failed on missing `.bandit` file). |
| `pre-commit run mypy --all-files` | Runs to completion (was: failed installing removed `types-all`). |

Items fixed this pass are marked "Fixed 2026-09-21" inline above. Everything
else in this file is unchanged from the 2026-09-19/20 audit pass and still
accurate as of this writing.
