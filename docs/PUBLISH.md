# PrismNote v1.5.0 PyPI Publication Guide

## Prerequisites

Ensure you have these installed:
```bash
# Rust toolchain (for compiling Rust backend)
rustup --version

# Python build tools
pip install build maturin twine

# Node.js (for building frontend assets)
node --version
npm --version
```

## Step 1: Build the Python Package

```bash
cd /path/to/prismnote

# Build Rust extension + Python wheel
maturin build --release

# This creates wheels in dist/ for your current Python version
```

## Step 2: Build Source Distribution (Optional)

```bash
# Create platform-independent source distribution
python -m build --sdist

# This creates a .tar.gz in dist/
```

## Step 3: Verify Build

```bash
# List generated distributions
ls -lh dist/

# Should see:
# - prismnote-1.5.0-cp*.whl (wheel for your Python version)
# - prismnote-1.5.0.tar.gz (source, if you ran step 2)
```

## Step 4: Upload to PyPI

### Option A: Using API Token (Recommended)

```bash
export PYPI_API_TOKEN="pypi-AgEIcHlwaS5vcmcCJGM2ZWE1MWJjLWFiZDktNDFmZS1iZTc2LWQ1NjJiMWM4ZmVhYQACKlszLCJiNTY4MmY2NS02ZjFlLTRjNDktYmFlYi0xN2RhNmM5ZGM3ZDAiXQAABiDKNNHRaNn35oX--eg7tV72BsmBmtYOPZ08yfYoH4IO4A"

twine upload dist/* -u __token__ -p $PYPI_API_TOKEN
```

### Option B: Using .pypirc

Create `~/.pypirc`:
```ini
[distutils]
index-servers =
    pypi

[pypi]
repository = https://upload.pypi.org/legacy/
username = __token__
password = pypi-AgEIcHlwaS5vcmcCJGM2ZWE1MWJjLWFiZDktNDFmZS1iZTc2LWQ1NjJiMWM4ZmVhYQACKlszLCJiNTY4MmY2NS02ZjFlLTRjNDktYmFlYi0xN2RhNmM5ZGM3ZDAiXQAABiDKNNHRaNn35oX--eg7tV72BsmBmtYOPZ08yfYoH4IO4A
```

Then run:
```bash
twine upload dist/
```

## Step 5: Verify Publication

```bash
# Wait ~1 minute for PyPI to index
pip install --upgrade prismnote==1.5.0

# Verify features
prismnote --version
```

## What's in v1.5.0?

- **Phase 2.1:** ER Diagram support (visual schema relationships)
- **Phase 2.2:** SQL multi-dialect support (10 dialects: PostgreSQL, MySQL, SQLite, DuckDB, Snowflake, BigQuery, T-SQL, Oracle, Redshift, Databricks)
- SQL connection picker in notebook cells
- Dialect-specific error parsing with helpful hints
- Query result pagination and export (CSV/JSON)
- Improved cell language selection (Python/SQL/R/JavaScript)

## Notes

- The Python wrapper automatically downloads the prebuilt server binary on first run
- No additional dependencies required beyond those in `pyproject.toml`
- All optional features (cloud databases, AI) are behind optional dependency groups
- See `pyproject.toml` for installation profiles: `pip install prismnote[cloud]`, `pip install prismnote[spark]`, etc.

## Troubleshooting

| Error | Solution |
|-------|----------|
| `maturin failed: Cannot import 'maturin.build'` | Run `pip install maturin` in your environment |
| `Rust compiler not found` | Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `twine upload fails with 403` | Verify PyPI token is valid and not expired |
| `Build fails: missing Node.js` | Install Node.js and npm for frontend assets |

## Next Steps After Publication

1. Tag the release on GitHub: `git tag v1.5.0 && git push origin v1.5.0`
2. Create a GitHub Release with the changelog
3. Update project README with installation instructions
4. Announce on social channels / project discussions
