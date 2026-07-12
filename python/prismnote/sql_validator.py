"""SQL query validation and sanitization."""

import re
from typing import Tuple

# SQL keywords that should not be allowed in user queries
FORBIDDEN_KEYWORDS = {
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'REPLACE',
    'GRANT', 'REVOKE', 'INSERT', 'UPDATE', 'PRAGMA', 'VACUUM'
}

# SQL keywords that are safe to allow
ALLOWED_KEYWORDS = {'SELECT', 'WITH', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'LIMIT', 'OFFSET'}


def validate_sql_query(sql: str) -> Tuple[bool, str]:
    """
    Validate SQL query for safety.
    
    Returns:
        (is_valid, error_message)
    """
    if not sql or not sql.strip():
        return False, "Empty query"
    
    # Normalize SQL for checking
    sql_normalized = sql.strip().upper()
    
    # Check for forbidden keywords (state-changing operations)
    for keyword in FORBIDDEN_KEYWORDS:
        if re.search(rf'\b{keyword}\b', sql_normalized):
            return False, f"Query contains forbidden keyword: {keyword}"
    
    # Ensure query starts with allowed keyword
    first_word = sql_normalized.split()[0] if sql_normalized.split() else ""
    if not any(first_word.startswith(kw) for kw in ALLOWED_KEYWORDS):
        return False, f"Query must start with SELECT or WITH, got: {first_word}"
    
    # Check for suspicious patterns
    suspicious_patterns = [
        (r"';.*--", "SQL injection pattern detected: comment after string"),
        (r"\*/.*\*\/", "Nested comments detected"),
        (r"xp_|sp_", "System procedure call detected"),
    ]
    
    for pattern, message in suspicious_patterns:
        if re.search(pattern, sql_normalized):
            return False, message
    
    return True, ""


def sanitize_identifier(identifier: str) -> str:
    """Sanitize table/column names (limited set of chars allowed)."""
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', identifier):
        raise ValueError(f"Invalid identifier: {identifier}")
    return identifier


def safe_execute(query: str, cursor, *args, **kwargs):
    """
    Safely execute SQL query with validation.
    
    Args:
        query: SQL query to execute
        cursor: Database cursor
        *args: Query parameters
        **kwargs: Additional options
        
    Returns:
        Cursor result
        
    Raises:
        ValueError: If query fails validation
    """
    is_valid, error = validate_sql_query(query)
    if not is_valid:
        raise ValueError(f"Query validation failed: {error}")
    
    # Execute with parameterized query (args are passed separately)
    return cursor.execute(query, args)
