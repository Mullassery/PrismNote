"""Tests for prismnote.security: path-traversal and input-validation guards.

Covers NotebookRequest (pydantic input validation) and FileAccessValidator
(filesystem path confinement) with realistic malicious inputs, not just
"does it import."
"""

import pytest
from pydantic import ValidationError

from prismnote.security import NotebookRequest, FileAccessValidator


# ---------------------------------------------------------------------------
# NotebookRequest
# ---------------------------------------------------------------------------


class TestNotebookRequestValid:
    def test_accepts_simple_alnum_name(self):
        req = NotebookRequest(notebook_name="my_notebook-1.ipynb")
        assert req.notebook_name == "my_notebook-1.ipynb"

    def test_accepts_none_content(self):
        req = NotebookRequest(notebook_name="a")
        assert req.content is None

    def test_accepts_content_at_max_length(self):
        # Field(max_length=10_000_000) - exercise the real boundary, not a stub.
        content = "x" * 10_000_000
        req = NotebookRequest(notebook_name="a", content=content)
        assert len(req.content) == 10_000_000


class TestNotebookRequestPathTraversal:
    # The validator runs two sequential checks: an allowlist of characters
    # first, then an explicit '..'/'/'/'\\' check. Since '/' and '\\' are
    # not in the allowlist ('-_.' plus alnum), any traversal payload that
    # contains a path separator is actually rejected by the *character*
    # check, not the traversal-specific one below it — the traversal check
    # is only reachable for a bare ".." with no separators at all. Both
    # paths must be verified so a future refactor that removes the
    # allowlist doesn't silently reopen traversal via separators.
    @pytest.mark.parametrize(
        "malicious_name",
        [
            "../../../etc/passwd",
            "..\\..\\windows\\system32\\config",
            "foo/../../bar",
            "notebook/../../../secret",
            "a/b",
            "a\\b",
        ],
    )
    def test_rejects_traversal_payloads_containing_separators(self, malicious_name):
        # Caught by the character allowlist (runs before the '..' check),
        # but the request is still correctly rejected either way.
        with pytest.raises(ValidationError, match="invalid characters"):
            NotebookRequest(notebook_name=malicious_name)

    def test_rejects_bare_dotdot_via_traversal_check(self):
        # No separators, so this is the one case that actually reaches
        # and exercises the dedicated "Path traversal not allowed" branch.
        with pytest.raises(ValidationError, match="Path traversal not allowed"):
            NotebookRequest(notebook_name="..")

    @pytest.mark.parametrize(
        "bad_name",
        [
            "name;DROP TABLE notebooks",
            "name$(rm -rf /)",
            "name|cat /etc/passwd",
            "name\x00.ipynb",
            "name with spaces",
            "name<script>alert(1)</script>",
        ],
    )
    def test_rejects_invalid_characters(self, bad_name):
        with pytest.raises(ValidationError, match="invalid characters"):
            NotebookRequest(notebook_name=bad_name)

    def test_rejects_empty_name(self):
        with pytest.raises(ValidationError):
            NotebookRequest(notebook_name="")

    def test_rejects_name_over_max_length(self):
        with pytest.raises(ValidationError):
            NotebookRequest(notebook_name="a" * 256)

    def test_rejects_content_over_max_length(self):
        with pytest.raises(ValidationError):
            NotebookRequest(notebook_name="a", content="x" * 10_000_001)


# ---------------------------------------------------------------------------
# FileAccessValidator
# ---------------------------------------------------------------------------


@pytest.fixture
def base_dir(tmp_path):
    d = tmp_path / "workspace"
    d.mkdir()
    return d


@pytest.fixture
def validator(base_dir):
    return FileAccessValidator(base_dir)


class TestFileAccessValidatorValidPaths:
    def test_validates_simple_relative_path(self, validator, base_dir):
        resolved = validator.validate_path("notes.json")
        assert resolved == (base_dir / "notes.json").resolve()

    def test_validates_nested_relative_path(self, validator, base_dir):
        resolved = validator.validate_path("sub/dir/notes.json")
        assert resolved == (base_dir / "sub" / "dir" / "notes.json").resolve()

    def test_validate_for_read_returns_existing_file(self, validator, base_dir):
        target = base_dir / "existing.json"
        target.write_text("{}")
        resolved = validator.validate_for_read("existing.json")
        assert resolved == target.resolve()

    def test_validate_for_write_allows_new_file_in_existing_dir(self, validator, base_dir):
        resolved = validator.validate_for_write("new_file.json")
        assert resolved.parent == base_dir.resolve()
        assert not resolved.exists()


class TestFileAccessValidatorPathTraversal:
    @pytest.mark.parametrize(
        "malicious_path",
        [
            "../secret.txt",
            "../../etc/passwd",
            "sub/../../escape.txt",
            "a/b/../../../../../../etc/passwd",
        ],
    )
    def test_rejects_relative_traversal_out_of_base_dir(self, validator, malicious_path):
        with pytest.raises(ValueError, match="escapes base directory|traversal"):
            validator.validate_path(malicious_path)

    def test_rejects_absolute_path_escaping_base_dir(self, validator):
        # (base_dir / "/etc/passwd") resolves to the absolute path itself in
        # pathlib (the right-hand absolute operand wins), which must then be
        # caught by the relative_to() containment check.
        with pytest.raises(ValueError, match="escapes base directory"):
            validator.validate_path("/etc/passwd")

    def test_validate_for_read_missing_file_raises(self, validator):
        with pytest.raises(ValueError, match="File not found"):
            validator.validate_for_read("does_not_exist.json")

    def test_validate_for_read_rejects_directory(self, validator, base_dir):
        (base_dir / "adir").mkdir()
        with pytest.raises(ValueError, match="Not a file"):
            validator.validate_for_read("adir")

    def test_validate_for_write_rejects_missing_parent(self, validator):
        with pytest.raises(ValueError, match="Parent directory doesn't exist"):
            validator.validate_for_write("missing_dir/new_file.json")

    def test_validate_for_write_rejects_traversal(self, validator):
        with pytest.raises(ValueError):
            validator.validate_for_write("../escape.json")
