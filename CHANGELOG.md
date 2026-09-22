# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Historical entries prior to this file's creation were not backfilled from
git log/commit messages — doing so from memory or inference would risk
fabricating release notes for versions that were never formally tagged as
releases. See `git log` for the real commit history, and
`docs/archive/RELEASES.md` / `docs/reference/RELEASE_SYNC_VERIFICATION.md`
for whatever pre-existing release documentation exists (not verified for
accuracy in this pass).

## [Unreleased]

### Fixed
- Bumped `sqlx` 0.7 → 0.8.6 to resolve a `cargo build`
  future-incompatibility warning (`sqlx-postgres` relied on never-type
  fallback behavior slated to become a hard error). No code changes
  required; verified `cargo build --release --all-features` (warning gone)
  and `cargo test --workspace --release` (171 passed, 0 failed, 2 ignored —
  unchanged from before the bump).
- `python/prismnote/sql_validator.py`'s system-procedure-call check
  (`xp_`/`sp_` pattern) could never match, because the pattern was
  lowercase while the string it's checked against is always upper-cased
  first — found while adding real unit test coverage for this module.
  Changed the pattern to `XP_|SP_`.
- `pyproject.toml`'s `dev` extra was missing `fastapi`/`starlette`/
  `pydantic`/`httpx`, which are only declared in `requirements-lock.txt`
  (not installed by CI's `python-tests` job, which runs
  `pip install -e ".[dev]"`). This meant `prismnote/middleware.py`
  (imports `fastapi` at module level) and the new `security.py`/
  `middleware.py` tests below would have failed to import in real CI
  despite working locally. Added those four packages to `dev`.

### Security
- Added real unit test coverage for the four previously-untested
  security-relevant Python modules (`security.py`, `sql_validator.py`,
  `rate_limit.py`, `middleware.py`) — 107 new tests using realistic
  malicious/edge-case inputs (path traversal, absolute-path escapes, SQL
  injection comment/nested-comment/system-procedure payloads, credential/
  stack-trace leak checks on FastAPI error responses). `python3 -m pytest
  tests/ -v` now runs 109 tests (was 2, both skipped) when the package is
  installed. See `ROADMAP_HONEST.md` for the two real bugs this testing
  pass found (one fixed above, one documented as a known rate-limiter
  availability bug for very-low `requests_per_minute` configurations).
- Corrected the README's "Other integrations" claim that cloud storage
  (S3/GCS/Azure Blob/Google Drive) is "real API calls, not placeholders."
  Verified the client code in `cloud_storage.rs` is real and unit-tested,
  but the actual `/cloud-storage` HTTP endpoints
  (`add_cloud_storage`/`list_cloud_storage`/`remove_cloud_storage`) are
  hardcoded stub handlers never wired to it or to the separate
  `file_manager::CloudStorageManager` mount registry — a user submitting
  real cloud credentials through this API gets a fake success response and
  no actual storage integration. Not wired up in this pass (a real
  feature-completion task, not a bounded fix); README and
  `ROADMAP_HONEST.md` corrected instead of leaving the inaccurate claim in
  place.

## [1.11.1] - 2026-09-22

### Security
- **`JWT_SECRET` no longer has a hardcoded fallback.**
  `crates/server/src/middleware/auth.rs`'s `get_jwt_secret()` used to
  return the literal string `"default-secret"` if the `JWT_SECRET`
  environment variable was unset, making every issued JWT forgeable in any
  deployment that forgot to configure it. It now fails fast — panics with
  a clear message — and the check runs once at server startup
  (`main.rs`), so a misconfigured deployment refuses to start rather than
  serving forgeable tokens. Also fixed three JWT-issuing call sites in
  `api.rs` (`auth_register`, `auth_login`, Google OAuth login) that
  hardcoded `"default-secret"` directly, bypassing `JWT_SECRET` entirely
  even when it was set — they now read the configured secret.
- **Reduced frontend `npm audit` findings from 10 to 2** via
  `npm audit fix` (no `--force`; `package.json` unchanged, only transitive
  dependency versions bumped within existing semver ranges). Remaining 2
  (`dompurify`, via `monaco-editor`) need an upstream `monaco-editor` bump,
  not attempted here.

### Fixed
- Fixed flakiness in
  `docker_executor::tests::sandbox_enforces_wall_clock_timeout_and_kills_container`:
  replaced a single immediate `docker ps -a` check (which could race the
  daemon's asynchronous container cleanup after `docker kill`) with a
  bounded poll.
- Fixed a genuine `react-hooks/exhaustive-deps` issue in
  `frontend/src/pages/Login.tsx`: the Google Sign-In script-load effect
  now calls through a ref kept current every render instead of closing
  over a stale `handleGoogleResponse`.
- Fixed `.pre-commit-config.yaml`: removed the `bandit` hook's reference to
  a nonexistent `.bandit` config file, and removed the `mypy` hook's
  dependency on `types-all`, a stub metapackage PyPI has removed.

### Changed
- Consolidated documentation: archived ~13 stale, duplicated, or fabricated
  docs (fake "MCP 2.0 Platform" roadmap/vision docs, a stale v0.4.5
  SECURITY.md, a mislabeled CONTRIBUTING.md, a fabricated
  "PRODUCTION-READY" features matrix, generic template boilerplate) to
  `docs/archive/`. See `docs/archive/README.md` for the full list and
  reasons.
- Added root `CONTRIBUTING.md`, `SECURITY.md`, `ROADMAP_HONEST.md`; moved
  `CODE_OF_CONDUCT.md` to repo root.
- Rewrote `.github/ISSUE_TEMPLATE/` (previous templates were copy-pasted
  from an unrelated project, "OpenAnchor") and fixed `pull_request_template.md`
  (referenced a non-existent `make format` target and had a stray
  `Co-Authored-By:` placeholder).
- Added `npm` ecosystem to `.github/dependabot.yml` (frontend dependencies
  were not previously covered by Dependabot).
- Moved a disabled release workflow out of the ad hoc `.github.bak/`
  directory into `docs/archive/disabled-workflows/` with an explanation of
  why it's inactive.

See `ROADMAP_HONEST.md` for the full list of known bugs, security gaps, and
untested/non-functional features found during this pass.
