use anyhow::{anyhow, Result};
use regex::Regex;

// SECURITY: SQL Injection prevention via query validation
// This is NOT a complete protection; use parameterized queries for actual execution.
// This layer provides defense-in-depth for obvious/common injection attempts.

const MAX_QUERY_LENGTH: usize = 100 * 1024; // 100KB limit
const MAX_QUERY_NESTING: usize = 10; // Prevent deeply nested queries

/// SQL keywords that have no legitimate use in a notebook SQL cell
/// regardless of where they appear in the query — privilege escalation and
/// server-admin operations. Ordinary DDL/DML (CREATE/DROP/ALTER/
/// INSERT/UPDATE/DELETE/TRUNCATE) is deliberately NOT in this list: these
/// connections are the user's own credentialed database/warehouse, and
/// running a `CREATE TABLE` or `INSERT` they typed themselves is core,
/// expected SQL-notebook functionality — not injection. The actual
/// injection threat this module defends against (a *second*, smuggled
/// statement appended to an otherwise-innocuous query, e.g.
/// `SELECT 1; DROP TABLE users`) is caught by `check_injection_patterns`
/// (multi-statement/semicolon detection) and `check_comment_injection`
/// below, which look at statement *position*, not just keyword presence.
const BLOCKED_KEYWORDS: &[&str] = &[
    "GRANT",
    "REVOKE",
    "DENY",
    "EXEC",
    "EXECUTE",
    // SQL Server stored procedure prefixes
    "xp_",
    "sp_",
    // Dangerous functions for exfiltration / arbitrary file access
    "OUTFILE",
    "LOAD_FILE",
    "INTO_OUTFILE",
];

pub struct QueryValidator;

impl QueryValidator {
    /// Validate a SQL query for obvious injection attempts.
    /// Returns Ok(()) if query appears safe; Err with details if dangerous.
    pub fn validate(query: &str) -> Result<()> {
        // Check length
        if query.len() > MAX_QUERY_LENGTH {
            return Err(anyhow!(
                "Query exceeds maximum length: {} > {}",
                query.len(),
                MAX_QUERY_LENGTH
            ));
        }

        // Check for empty/whitespace-only queries
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Err(anyhow!("Query is empty"));
        }

        // Strip comments to prevent bypass (-- and /* */)
        let stripped = Self::strip_comments(trimmed);

        // Check nesting depth (parentheses)
        Self::check_nesting_depth(&stripped)?;

        // Check for blocked keywords
        Self::check_blocked_keywords(&stripped)?;

        // Check for obvious injection patterns
        Self::check_injection_patterns(&stripped)?;

        // Check for comment-based injection
        Self::check_comment_injection(query)?;

        Ok(())
    }

    /// Strip SQL comments (-- and /* */) from query
    fn strip_comments(query: &str) -> String {
        let mut result = String::new();
        let mut chars = query.chars().peekable();
        let mut in_string = false;
        let mut string_char = ' ';

        while let Some(ch) = chars.next() {
            // Handle string literals (don't strip comments inside strings)
            if (ch == '\'' || ch == '"') && (result.is_empty() || !result.ends_with('\\')) {
                if !in_string {
                    in_string = true;
                    string_char = ch;
                } else if ch == string_char {
                    in_string = false;
                }
                result.push(ch);
                continue;
            }

            if in_string {
                result.push(ch);
                continue;
            }

            // Handle -- comments (line comments)
            if ch == '-' && chars.peek() == Some(&'-') {
                chars.next(); // consume second -
                              // Skip until end of line
                for c in chars.by_ref() {
                    if c == '\n' {
                        result.push('\n');
                        break;
                    }
                }
                continue;
            }

            // Handle /* */ comments (block comments)
            if ch == '/' && chars.peek() == Some(&'*') {
                chars.next(); // consume *
                let mut prev = ' ';
                for c in chars.by_ref() {
                    if prev == '*' && c == '/' {
                        break;
                    }
                    prev = c;
                }
                continue;
            }

            result.push(ch);
        }

        result
    }

    /// Check parentheses nesting depth to prevent deeply nested queries
    fn check_nesting_depth(query: &str) -> Result<()> {
        let mut depth: usize = 0;
        let mut max_depth: usize = 0;

        for ch in query.chars() {
            match ch {
                '(' => {
                    depth += 1;
                    max_depth = max_depth.max(depth);
                }
                ')' => {
                    depth = depth.saturating_sub(1);
                }
                _ => {}
            }
        }

        if max_depth > MAX_QUERY_NESTING {
            return Err(anyhow!(
                "Query nesting too deep: {} > {}",
                max_depth,
                MAX_QUERY_NESTING
            ));
        }

        if depth != 0 {
            return Err(anyhow!("Unbalanced parentheses in query"));
        }

        Ok(())
    }

    /// Check for blocked SQL keywords (create, drop, delete, etc.)
    fn check_blocked_keywords(query: &str) -> Result<()> {
        let upper = query.to_uppercase();

        // Check blocked keywords
        for keyword in BLOCKED_KEYWORDS {
            if upper.contains(keyword) {
                // Avoid false positives: check word boundaries
                let pattern = format!(r"\b{}\b", regex::escape(keyword));
                if let Ok(re) = Regex::new(&pattern) {
                    if re.is_match(&upper) {
                        return Err(anyhow!("Blocked SQL keyword found: {}", keyword));
                    }
                }
            }
        }

        Ok(())
    }

    /// Check for common SQL injection patterns
    fn check_injection_patterns(query: &str) -> Result<()> {
        // Pattern 1: OR 1=1 (classic injection)
        if query.to_uppercase().contains("OR 1=1")
            || query.to_uppercase().contains("OR '1'='1'")
            || query.to_uppercase().contains("OR TRUE")
        {
            return Err(anyhow!("Detected classic OR 1=1 injection pattern"));
        }

        // Pattern 2: Multiple statements (UNION SELECT)
        let semicolon_count = query.matches(';').count();
        if semicolon_count > 1 {
            return Err(anyhow!(
                "Detected potential multi-statement injection: {} semicolons",
                semicolon_count
            ));
        }

        // Pattern 3: SLEEP/BENCHMARK (time-based injection)
        let upper = query.to_uppercase();
        if upper.contains("SLEEP(") || upper.contains("BENCHMARK(") || upper.contains("WAITFOR") {
            return Err(anyhow!(
                "Detected time-based injection attempt (SLEEP/BENCHMARK/WAITFOR)"
            ));
        }

        // Pattern 4: Stacked queries ending with comment (comment-out rest of query)
        if query.trim().ends_with("--") || query.trim().ends_with("/*") {
            return Err(anyhow!(
                "Detected query-ending comment (potential injection technique)"
            ));
        }

        Ok(())
    }

    /// Check for comment-based injection attempts
    fn check_comment_injection(query: &str) -> Result<()> {
        // Look for suspicious patterns like:
        // ' OR '1'='1'; --
        // '; DROP TABLE users; --
        let suspicious_patterns = [
            r";\s*DROP\s",
            r";\s*DELETE\s+FROM\s",
            r";\s*UPDATE\s",
            r";\s*INSERT\s+INTO\s",
            r";\s*TRUNCATE\s",
            r";\s*ALTER\s",
            r";\s*CREATE\s",
            r"--\s*DROP",
            r"--\s*DELETE",
        ];

        let upper = query.to_uppercase();
        for pattern in &suspicious_patterns {
            if let Ok(re) = Regex::new(pattern) {
                if re.is_match(&upper) {
                    return Err(anyhow!(
                        "Detected suspicious pattern after semicolon: {}",
                        pattern
                    ));
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_select_query() {
        assert!(QueryValidator::validate("SELECT * FROM users WHERE id = 1").is_ok());
    }

    #[test]
    fn test_injection_or_1_1() {
        assert!(QueryValidator::validate("SELECT * FROM users WHERE id = 1 OR 1=1").is_err());
    }

    #[test]
    fn test_standalone_ddl_dml_is_allowed() {
        // A single statement the user directly typed against their own
        // connected database — CREATE/INSERT/UPDATE/DELETE/DROP — is
        // legitimate SQL-notebook usage and must not be blocked.
        assert!(QueryValidator::validate("DROP TABLE users").is_ok());
        assert!(QueryValidator::validate("CREATE TABLE t (id INT)").is_ok());
        assert!(QueryValidator::validate("INSERT INTO t VALUES (1)").is_ok());
        assert!(QueryValidator::validate("UPDATE t SET id = 2 WHERE id = 1").is_ok());
        assert!(QueryValidator::validate("DELETE FROM t WHERE id = 1").is_ok());
    }

    #[test]
    fn test_smuggled_stacked_statement_still_blocked() {
        // A dangerous statement smuggled in after the user's intended
        // query via a semicolon is still rejected.
        assert!(QueryValidator::validate("SELECT 1; DROP TABLE users").is_err());
        assert!(QueryValidator::validate("SELECT 1; DELETE FROM users").is_err());
    }

    #[test]
    fn test_privilege_escalation_always_blocked() {
        assert!(QueryValidator::validate("GRANT ALL ON users TO PUBLIC").is_err());
        assert!(QueryValidator::validate("EXEC xp_cmdshell 'dir'").is_err());
    }

    #[test]
    fn test_comment_stripping() {
        let query = "SELECT * FROM users -- this is a comment";
        let stripped = QueryValidator::strip_comments(query);
        assert!(!stripped.contains("--"));
    }

    #[test]
    fn test_sleep_injection() {
        assert!(QueryValidator::validate("SELECT SLEEP(5)").is_err());
    }

    #[test]
    fn test_max_length() {
        let huge = "SELECT * FROM users WHERE id = ".repeat(5000);
        assert!(QueryValidator::validate(&huge).is_err());
    }
}
