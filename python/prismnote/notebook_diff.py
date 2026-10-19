"""Optional semantic notebook diff/merge via nbdime.

nbdime (BSD-3) understands .ipynb structure, so output-only changes and cell
moves do not drown a Git review. This adapter shells out to the installed
nbdime CLI; it never rewrites notebooks unless `merge` is explicitly called.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


class NbdimeUnavailable(RuntimeError):
    """Raised when nbdime is not installed."""


def _command() -> list[str]:
    binary = shutil.which("nbdime")
    if binary:
        return [binary]
    try:
        import nbdime  # noqa: F401
    except ImportError as exc:
        raise NbdimeUnavailable(
            'nbdime is not installed. Install with `pip install "prismnote[nbdime]"`.'
        ) from exc
    return [sys.executable, "-m", "nbdime"]


def diff_notebooks(base: str | Path, current: str | Path) -> str:
    """Return a semantic notebook diff (human-readable)."""
    completed = subprocess.run(
        [*_command(), "diff", str(base), str(current)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode not in (0, 1):
        raise RuntimeError((completed.stderr or completed.stdout).strip()[:800])
    return completed.stdout


def merge_notebooks(
    base: str | Path,
    local: str | Path,
    remote: str | Path,
    output: str | Path | None = None,
) -> str:
    """Three-way merge notebooks and write the merged .ipynb.

    If ``output`` is omitted, writes to ``local`` (explicit merge semantics).
    """
    output = Path(output or local)
    completed = subprocess.run(
        [*_command(), "merge", "--out", str(output), str(base), str(local), str(remote)],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode not in (0, 1):
        raise RuntimeError((completed.stderr or completed.stdout).strip()[:800])
    return str(output)


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(prog="prismnote-nbdime")
    sub = parser.add_subparsers(dest="command", required=True)
    diff_parser = sub.add_parser("diff")
    diff_parser.add_argument("base")
    diff_parser.add_argument("current")
    merge_parser = sub.add_parser("merge")
    merge_parser.add_argument("base")
    merge_parser.add_argument("local")
    merge_parser.add_argument("remote")
    merge_parser.add_argument("--out", default=None)
    args = parser.parse_args(argv)
    try:
        if args.command == "diff":
            print(diff_notebooks(args.base, args.current))
        else:
            print(merge_notebooks(args.base, args.local, args.remote, args.out))
    except (NbdimeUnavailable, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = ["NbdimeUnavailable", "diff_notebooks", "main", "merge_notebooks"]
