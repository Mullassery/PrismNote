# GitHub Actions CI/CD Workflows

This directory contains all CI/CD workflow configurations for PrismNote.

## Workflows Overview

### 1. **ci.yml** - Main Build & Test Pipeline
**Triggers:** Push to main/develop, Pull requests to main

**Jobs:**
- **Rust Build & Test** - Compiles and tests Rust backend
  - Runs on Ubuntu
  - Uses stable Rust toolchain
  - Builds with all features
  - Runs full test suite
  - Caches dependencies with sccache

- **Python Tests** - Tests Python package across versions
  - Runs on Ubuntu
  - Tests Python 3.10, 3.11, 3.12 (matrix)
  - Installs build dependencies
  - Installs Python package in development mode
  - Discovers and runs pytest tests

**Status Checks:**
- ✅ Rust must compile and pass tests
- ✅ Python must pass pytest on all versions

### 2. **tests.yml** - Frontend E2E Tests
**Triggers:** Push to main/develop (frontend paths), Pull requests to main (frontend paths)

**Jobs:**
- **Frontend E2E Tests** - Validates React UI
  - Runs on Ubuntu
  - Node 18 environment
  - ESLint linting
  - TypeScript compilation
  - Vite build
  - Playwright E2E tests

**Path Filters:**
```
frontend/**         # Only run on frontend changes
.github/workflows/tests.yml  # Also run if this workflow changes
```

**Status Checks:**
- ✅ Linter passes (or warnings logged)
- ✅ Build succeeds
- ✅ E2E tests pass

---

## Workflow Details

### Rust Build & Test

```yaml
# Uses dtolnay/rust-toolchain@stable (latest stable Rust)
# Features: All features enabled (--all-features)
# Commands:
#   - cargo build --release --all-features
#   - cargo test --release --all-features
```

**Requirements:**
- Rust project in `/crates` directory
- `Cargo.toml` workspace configuration
- Tests in `#[test]` or `tests/` directory

---

### Python Tests

```yaml
# Matrix: Python 3.10, 3.11, 3.12
# Install: pip install -e ".[dev]"
# Test: pytest tests/ -v --tb=short
```

**Requirements:**
- Python package in `/python` directory
- `pyproject.toml` with `[dev]` extra
- Pytest configuration (pytest.ini or pyproject.toml)
- Tests discoverable by pytest

---

### Frontend Tests

```yaml
# Node.js 18 environment
# Steps:
#   1. npm install
#   2. npm run lint (ESLint)
#   3. npm run build (TypeScript + Vite)
#   4. npm run test:e2e (Playwright)
```

**Requirements:**
- React frontend in `/frontend` directory
- `package.json` with scripts
- ESLint configuration
- Playwright configuration

---

## Troubleshooting

### Rust Build Fails

**Error:** `could not find Cargo.toml`
- **Fix:** Ensure `Cargo.toml` exists in root with workspace configuration
- **Check:** `ls -la Cargo.toml`

**Error:** Tests panic or timeout
- **Fix:** Check test code for infinite loops or resource issues
- **Check:** `cargo test -- --nocapture` to see output locally

### Python Tests Fail

**Error:** `ModuleNotFoundError: No module named 'xyz'`
- **Fix:** Add missing package to `pyproject.toml` `[dev]` extra
- **Check:** `pip install -e ".[dev]"` locally

**Error:** `pytest: command not found`
- **Fix:** Ensure `pytest` is in `[dev]` extra dependencies
- **Check:** `pip list | grep pytest`

### Frontend Tests Fail

**Error:** `npm: command not found`
- **Fix:** Node 18 setup may have failed
- **Check:** GitHub Actions runner logs

**Error:** ESLint errors
- **Fix:** Run locally: `cd frontend && npm run lint`
- **Check:** Fix errors before pushing

**Error:** Build fails
- **Fix:** TypeScript compilation issue
- **Check:** `cd frontend && npm run build` locally

---

## Local Testing

Run workflows locally to debug before pushing:

### Rust Tests
```bash
cargo build --release --all-features
cargo test --release --all-features
```

### Python Tests
```bash
cd python
pip install -e ".[dev]"
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm install
npm run lint
npm run build
npm run test:e2e
```

---

## Performance Tips

### Caching
- Rust: Automatically cached by `Swatinem/rust-cache@v2`
- Python: pip caches automatically
- Node: npm caches automatically

### Optimization
- Use matrix for parallel testing (Python versions)
- Frontend tests run on file change (path filter)
- Rust cache pre-built dependencies

---

## Adding New Workflows

1. Create `new-workflow.yml` in this directory
2. Follow GitHub Actions syntax
3. Use consistent naming
4. Add clear documentation in file header
5. Commit and test

Template:
```yaml
name: My Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  my-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: My step
        run: echo "Hello"
```

---

## CI/CD Status Badge

Add to README.md:
```markdown
[![Tests](https://github.com/Mullassery/prismnote/actions/workflows/ci.yml/badge.svg)](https://github.com/Mullassery/prismnote/actions/workflows/ci.yml)
```

---

## Monitoring

### View Workflow Runs
- GitHub: https://github.com/Mullassery/prismnote/actions
- Filters: Branch, Status, Workflow

### Failed Workflow Debugging
1. Click on failed workflow
2. Expand failed step
3. Check error message and logs
4. Fix locally and push again

---

## Best Practices

✅ **Keep workflows simple** - One job per concern
✅ **Use matrix for variations** - Test multiple versions
✅ **Cache dependencies** - Speed up runs
✅ **Clear step names** - Easy to identify failures
✅ **Test locally first** - Before pushing
✅ **Set up path filters** - Reduce unnecessary runs
✅ **Use recent actions** - Security and features
✅ **Log important steps** - Help with debugging

---

## Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Rust Toolchain Action](https://github.com/dtolnay/rust-toolchain)
- [Setup Node Action](https://github.com/actions/setup-node)
- [Setup Python Action](https://github.com/actions/setup-python)

---

**Last Updated:** 2026-07-29  
**Status:** ✅ All workflows fixed and operational
