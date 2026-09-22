"""Tests for prismnote.sql_validator: SQL injection / state-mutation guards.

Exercises validate_sql_query, sanitize_identifier, and safe_execute with
realistic malicious SQL payloads, not just happy-path parsing.
"""

from unittest.mock import MagicMock

import pytest

from prismnote.sql_validator import (
    validate_sql_query,
    sanitize_identifier,
    safe_execute,
)


# ---------------------------------------------------------------------------
# validate_sql_query - valid queries
# ---------------------------------------------------------------------------


class TestValidateSqlQueryAccepts:
    @pytest.mark.parametrize(
        "sql",
        [
            "SELECT * FROM users",
            "SELECT id, name FROM users WHERE age > 21 ORDER BY name LIMIT 10",
            "WITH recent AS (SELECT * FROM orders) SELECT * FROM recent",
            "select * from users",  # case-insensitive
            "  SELECT * FROM users  ",  # leading/trailing whitespace
        ],
    )
    def test_accepts_read_only_queries(self, sql):
        is_valid, error = validate_sql_query(sql)
        assert is_valid is True
        assert error == ""


# ---------------------------------------------------------------------------
# validate_sql_query - empty / malformed input
# ---------------------------------------------------------------------------


class TestValidateSqlQueryEmpty:
    @pytest.mark.parametrize("sql", ["", "   ", "\n\t"])
    def test_rejects_empty_or_whitespace_query(self, sql):
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert error == "Empty query"


# ---------------------------------------------------------------------------
# validate_sql_query - forbidden state-changing keywords
# ---------------------------------------------------------------------------


class TestValidateSqlQueryForbiddenKeywords:
    @pytest.mark.parametrize(
        "sql,keyword",
        [
            ("DROP TABLE users", "DROP"),
            ("DELETE FROM users WHERE id = 1", "DELETE"),
            ("TRUNCATE TABLE users", "TRUNCATE"),
            ("ALTER TABLE users ADD COLUMN hacked TEXT", "ALTER"),
            ("CREATE TABLE evil (id INT)", "CREATE"),
            ("INSERT INTO users (name) VALUES ('x')", "INSERT"),
            ("UPDATE users SET admin = 1", "UPDATE"),
            ("PRAGMA writable_schema = 1", "PRAGMA"),
            ("VACUUM", "VACUUM"),
            ("GRANT ALL ON users TO public", "GRANT"),
            ("REVOKE ALL ON users FROM public", "REVOKE"),
        ],
    )
    def test_rejects_forbidden_keyword(self, sql, keyword):
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert keyword in error

    def test_rejects_forbidden_keyword_embedded_via_subquery_smuggling(self):
        # A SELECT that smuggles a DROP via a stacked statement.
        sql = "SELECT * FROM users; DROP TABLE users;"
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert "DROP" in error

    def test_does_not_false_positive_on_substring_of_forbidden_word(self):
        # "update_time" contains "update" as a substring but not as a word;
        # \b word-boundary matching must not flag it.
        is_valid, error = validate_sql_query("SELECT update_time FROM users")
        assert is_valid is True


# ---------------------------------------------------------------------------
# validate_sql_query - must start with an allowed keyword
# ---------------------------------------------------------------------------


class TestValidateSqlQueryStartsWithAllowedKeyword:
    @pytest.mark.parametrize(
        "sql",
        [
            "EXEC sp_configure",
            "EXPLAIN SELECT * FROM users",
            "; SELECT * FROM users",
            "USE mydb",
        ],
    )
    def test_rejects_query_not_starting_with_select_or_with(self, sql):
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert "must start with SELECT or WITH" in error


# ---------------------------------------------------------------------------
# validate_sql_query - suspicious injection patterns
# ---------------------------------------------------------------------------


class TestValidateSqlQuerySuspiciousPatterns:
    def test_rejects_comment_after_string_injection(self):
        # Classic auth-bypass shape: close the string, comment out the rest.
        sql = "SELECT * FROM users WHERE name = ''; --"
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert "comment after string" in error

    def test_rejects_nested_comments(self):
        sql = "SELECT * FROM users /* a */ WHERE 1=1 /* b */"
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert "Nested comments" in error

    @pytest.mark.parametrize(
        "sql",
        [
            "SELECT xp_cmdshell('dir') FROM users",
            "SELECT * FROM users WHERE sp_password = 1",
            "select xp_cmdshell('dir') from users",  # lowercase input too
        ],
    )
    def test_rejects_system_procedure_call(self, sql):
        # Regression test: sql_normalized is always upper-cased before this
        # check runs, so the pattern must match upper-case xp_/sp_ or it
        # silently never fires regardless of the input's original case.
        is_valid, error = validate_sql_query(sql)
        assert is_valid is False
        assert "System procedure" in error


# ---------------------------------------------------------------------------
# sanitize_identifier
# ---------------------------------------------------------------------------


class TestSanitizeIdentifier:
    @pytest.mark.parametrize(
        "identifier",
        ["orders", "_private_table", "Table123", "col_name_2"],
    )
    def test_accepts_valid_identifiers(self, identifier):
        assert sanitize_identifier(identifier) == identifier

    @pytest.mark.parametrize(
        "identifier",
        [
            "orders; DROP TABLE users;",
            "orders--",
            "1table",  # can't start with digit
            "my table",  # space
            "orders`",
            "orders'",
            'orders"',
            "orders/*comment*/",
            "",
        ],
    )
    def test_rejects_malicious_or_invalid_identifiers(self, identifier):
        with pytest.raises(ValueError, match="Invalid identifier"):
            sanitize_identifier(identifier)


# ---------------------------------------------------------------------------
# safe_execute
# ---------------------------------------------------------------------------


class TestSafeExecute:
    def test_executes_valid_query_with_parameters(self):
        cursor = MagicMock()
        cursor.execute.return_value = "result"

        result = safe_execute("SELECT * FROM users WHERE id = ?", cursor, 42)

        cursor.execute.assert_called_once_with(
            "SELECT * FROM users WHERE id = ?", (42,)
        )
        assert result == "result"

    def test_rejects_invalid_query_before_touching_cursor(self):
        cursor = MagicMock()

        with pytest.raises(ValueError, match="Query validation failed"):
            safe_execute("DROP TABLE users", cursor)

        # The defense-in-depth point of validation is that the dangerous
        # query must never reach the database driver.
        cursor.execute.assert_not_called()

    def test_rejects_injection_payload_before_touching_cursor(self):
        cursor = MagicMock()
        malicious = "SELECT * FROM users WHERE name = ''; --"

        with pytest.raises(ValueError, match="Query validation failed"):
            safe_execute(malicious, cursor)

        cursor.execute.assert_not_called()
