#!/bin/bash
# Verify version sync across all platforms
# Usage: ./scripts/verify-version-sync.sh

set -e

echo "🔍 Checking version sync across all platforms..."
echo ""

# Extract versions from source files
CARGO_VERSION=$(grep "^version = " Cargo.toml | head -1 | awk -F'"' '{print $2}')
PYPI_VERSION=$(grep "^version = " pyproject.toml | awk -F'"' '{print $2}')

# Get latest git tag (remove 'v' prefix)
LATEST_TAG=$(git tag -l 'v*' --sort=-version:refname 2>/dev/null | head -1 | sed 's/^v//')

echo "Version Status:"
echo "  Cargo.toml:    $CARGO_VERSION"
echo "  pyproject.toml: $PYPI_VERSION"
echo "  Latest git tag: ${LATEST_TAG:-[none]}"
echo ""

# Check if all versions match
SYNC=true
ERRORS=()

if [ "$CARGO_VERSION" != "$PYPI_VERSION" ]; then
  SYNC=false
  ERRORS+=("❌ Cargo.toml ($CARGO_VERSION) ≠ pyproject.toml ($PYPI_VERSION)")
fi

if [ -n "$LATEST_TAG" ] && [ "$CARGO_VERSION" != "$LATEST_TAG" ]; then
  SYNC=false
  ERRORS+=("❌ Cargo.toml ($CARGO_VERSION) ≠ git tag (v$LATEST_TAG)")
fi

if [ -n "$LATEST_TAG" ] && [ "$PYPI_VERSION" != "$LATEST_TAG" ]; then
  SYNC=false
  ERRORS+=("❌ pyproject.toml ($PYPI_VERSION) ≠ git tag (v$LATEST_TAG)")
fi

# Report results
if [ "$SYNC" = true ]; then
  echo "✅ All versions in sync!"
  echo ""
  echo "Current version: $CARGO_VERSION"
  exit 0
else
  echo "Sync Errors:"
  for error in "${ERRORS[@]}"; do
    echo "  $error"
  done
  echo ""
  echo "❌ Version sync FAILED!"
  echo ""
  echo "Fix by updating:"
  echo "  1. Cargo.toml: version = \"$CARGO_VERSION\""
  echo "  2. pyproject.toml: version = \"$CARGO_VERSION\""
  echo "  3. git tag: git tag v$CARGO_VERSION"
  exit 1
fi
