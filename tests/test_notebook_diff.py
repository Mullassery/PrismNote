"""nbdime adapter tests use a fake executable."""

from __future__ import annotations

import stat
from pathlib import Path

import pytest

from prismnote.notebook_diff import diff_notebooks, merge_notebooks


def _fake(tmp_path: Path, body: str) -> Path:
    script = tmp_path / "nbdime"
    script.write_text("#!/usr/bin/env python3\n" + body)
    script.chmod(script.stat().st_mode | stat.S_IEXEC)
    return script


def test_diff_invokes_nbdime(tmp_path, monkeypatch):
    _fake(tmp_path, "print('semantic diff')\n")
    monkeypatch.setenv("PATH", str(tmp_path) + ":" + __import__("os").environ.get("PATH", ""))
    assert "semantic diff" in diff_notebooks("a.ipynb", "b.ipynb")


def test_merge_writes_output(tmp_path, monkeypatch):
    # Fake nbdime writes the requested --out file.
    _fake(
        tmp_path,
        "import sys\nargs=sys.argv\nout=args[args.index('--out')+1]\nopen(out,'w').write('{}')\n",
    )
    monkeypatch.setenv("PATH", str(tmp_path) + ":" + __import__("os").environ.get("PATH", ""))
    out = tmp_path / "merged.ipynb"
    assert merge_notebooks("b", "l", "r", out) == str(out)
    assert out.read_text() == "{}"


def test_real_nbdime_diff(tmp_path, monkeypatch):
    pytest.importorskip("nbdime")
    import nbformat

    base = tmp_path / "base.ipynb"
    current = tmp_path / "current.ipynb"
    nb = nbformat.v4.new_notebook(cells=[nbformat.v4.new_code_cell("x = 1")])
    nbformat.write(nb, base)
    nb.cells[0].source = "x = 2"
    nbformat.write(nb, current)
    text = diff_notebooks(base, current)
    assert text.strip()
