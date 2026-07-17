"""Test Python bindings for PrismNote Rust core."""

import pytest


def test_prismnote_import():
    """Verify Python bindings are accessible."""
    try:
        import prismnote
        assert prismnote is not None
    except ImportError:
        pytest.skip("prismnote bindings not built yet (run maturin develop)")


def test_prismnote_version():
    """Verify version is set."""
    try:
        import prismnote
        assert hasattr(prismnote, "__version__")
    except ImportError:
        pytest.skip("prismnote bindings not built yet")
