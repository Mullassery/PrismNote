# Contributing to PrismNote

PrismNote is a Rust (Axum) backend + React/TypeScript (Vite) frontend, with a
thin Python package (`python/`) that downloads and launches the prebuilt
server binary. This doc covers real, verified dev setup and test commands —
if a command below doesn't work for you, that's a bug in this doc, please
open an issue.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Development setup

Requirements verified against this repo as of 2026-09-19:

- Rust (the pinned toolchain is `1.97`, see `rust-toolchain.toml`)
- Node 20.19+ (Vite 8 requirement stated in the frontend `package.json`
  engines/README; tested here with Node 26.5.0)
- Docker, only if you're working on `docker_executor.rs` or the sandboxed
  code-execution endpoints
- Python 3.9+ for the `python/` launcher package and `tests/`

```bash
git clone https://github.com/Mullassery/prismnote.git
cd prismnote

# Terminal 1: backend
cargo run

# Terminal 2: frontend dev server
cd frontend && npm install && npm run dev
```

Frontend dev server: http://localhost:5173. Backend: http://localhost:8000.

To build the single self-contained release binary (frontend embedded via
`rust-embed`), use `make build`, not `cargo build --release` directly — see
the comment in the `Makefile` for why (`cargo build` alone produces a binary
that serves no UI).

## Running the test suites (verified commands and real results as of this pass)

```bash
# Rust — 170 passed, 1 failed in our run: docker_executor::tests::
# sandbox_enforces_wall_clock_timeout_and_kills_container is flaky under
# concurrent test load (passes in isolation). See ROADMAP_HONEST.md.
cargo test --workspace --release

# Frontend unit tests (vitest) — 114/114 passed in our run
cd frontend && npm test

# Frontend E2E (Playwright) — requires browsers installed:
cd frontend && npx playwright install --with-deps chromium
npm run test:e2e

# Python — only 2 trivial import tests exist today (tests/test_python_bindings.py),
# and both SKIP unless the package is installed first (pip install -e ".[dev]").
# There is no unit-test coverage for python/prismnote/{security,sql_validator,
# rate_limit,middleware}.py.
python3 -m pytest tests/ -v
```

## Linting and formatting (verified — lint is currently broken, see below)

```bash
# Rust
cargo fmt --all
cargo clippy --all-targets

# Frontend
cd frontend && npm run lint      # currently fails: 435 errors, 22 warnings
                                  # (mostly @typescript-eslint/no-explicit-any
                                  # in tests/e2e/**). Do not assume `npm run
                                  # lint` is clean before you start — it is not.

# Python
ruff check .
```

`make lint` runs the Rust and frontend linters together; `make fmt` /
`make fmt-check` cover formatting.

## Before submitting a PR

1. Run the tests above for the area you touched and report real results in
   your PR description — do not claim "tests pass" without having run them.
2. Run `cargo fmt --all` and `cargo clippy --all-targets` for Rust changes.
3. If you touch `frontend/`, run `npm run lint` and fix warnings/errors you
   introduce — the existing 435 errors are pre-existing debt (tracked in
   `ROADMAP_HONEST.md`), not something you're required to fix, but don't add
   to the pile.
4. Update `README.md` / `ROADMAP_HONEST.md` if your change makes a documented
   "not built" / "broken" item work, or breaks something documented as
   working. Do not describe untested code as working.
5. Squash/organize commits into something reviewable; write a clear PR
   description of what changed and why.

## Reporting bugs / requesting features

Use the GitHub issue templates (`.github/ISSUE_TEMPLATE/`). Include real
repro steps and your environment (OS, Rust/Node/Python versions).

## License

By contributing, you agree your contributions are licensed under the
project's [Apache License 2.0](LICENSE).
