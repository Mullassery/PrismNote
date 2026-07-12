"""User-friendly error messages for notebook operations."""


class NotebookError:
    """Notebook operation error with resolution."""
    
    def __init__(self, title: str, message: str, resolution: list = None):
        self.title = title
        self.message = message
        self.resolution = resolution or []
    
    def format(self) -> str:
        """Format error."""
        lines = [f"\n❌ {self.title}\n", f"   {self.message}\n"]
        if self.resolution:
            lines.append("   ✓ Resolution:")
            for r in self.resolution:
                lines.append(f"      • {r}")
        return "\n".join(lines)
    
    def __str__(self) -> str:
        return self.format()


# Notebook errors
NOTEBOOK_NOT_FOUND = NotebookError(
    title="Notebook Not Found",
    message="Cannot open notebook. File doesn't exist.",
    resolution=[
        "Check notebook path: ls ~/notebooks/mynotebook.ipynb",
        "Verify filename spelling (case-sensitive)",
        "Use notebook name without extension in UI",
        "Create new notebook: File > New Notebook",
    ]
)

NOTEBOOK_CORRUPTED = NotebookError(
    title="Notebook Appears Corrupted",
    message="Cannot parse notebook. Format may be invalid.",
    resolution=[
        "Check file is valid JSON: python -m json.tool notebook.ipynb",
        "Try exporting from Jupyter to re-create",
        "Restore from backup if available",
        "Manual recovery: open as text and check JSON syntax",
    ]
)

INVALID_CELL_FORMAT = NotebookError(
    title="Invalid Cell Format",
    message="Notebook contains cells in unexpected format.",
    resolution=[
        "Convert from Jupyter: jupyter nbconvert --to notebook notebook.ipynb",
        "Cells must be JSON format compatible with Jupyter",
        "Try creating cell in UI instead of manual JSON",
    ]
)

# Query errors
SQL_SYNTAX_ERROR = NotebookError(
    title="SQL Syntax Error",
    message="SQL query contains syntax error.",
    resolution=[
        "Check SQL keywords spelling",
        "Verify table and column names exist",
        "Test query in database client first",
        "Use EXPLAIN to debug complex queries",
    ]
)

TABLE_NOT_FOUND = NotebookError(
    title="Table Not Found in Database",
    message="Referenced table doesn't exist in connected database.",
    resolution=[
        "List available tables: SELECT table_name FROM information_schema.tables;",
        "Check table name spelling and capitalization",
        "Verify database connection is to correct database",
        "Ensure table permissions allow reading",
    ]
)

QUERY_TIMEOUT = NotebookError(
    title="Query Execution Timeout",
    message="Query took too long. Exceeded timeout limit.",
    resolution=[
        "Simplify query: reduce columns, add WHERE filters",
        "Add LIMIT to query: ... LIMIT 1000",
        "Check database performance (indexes, table size)",
        "Try smaller date range or filtered dataset",
    ]
)

INSUFFICIENT_PERMISSIONS = NotebookError(
    title="Insufficient Database Permissions",
    message="User doesn't have permission to access this table.",
    resolution=[
        "Contact database administrator",
        "Request READ permissions for table",
        "Check user role: SELECT current_user;",
        "Verify connection uses correct credentials",
    ]
)

# Execution errors
PYTHON_SYNTAX_ERROR = NotebookError(
    title="Python Syntax Error",
    message="Python code contains syntax error.",
    resolution=[
        "Check indentation (Python is whitespace-sensitive)",
        "Verify all parentheses, brackets, quotes are closed",
        "Test code in Python REPL first",
        "Use IDE with syntax highlighting for debugging",
    ]
)

IMPORT_ERROR = NotebookError(
    title="Cannot Import Module",
    message="Python module not found or cannot be imported.",
    resolution=[
        "Install missing package: pip install module_name",
        "Check module name spelling",
        "Verify package is Python 3 compatible",
        "Try importing in separate cell to debug",
    ]
)

CODE_EXECUTION_ERROR = NotebookError(
    title="Code Execution Failed",
    message="Python code raised an exception during execution.",
    resolution=[
        "Check error message for specific issue",
        "Add print() statements to debug",
        "Test code in Python shell first",
        "Verify input data is in expected format",
    ]
)

# File errors
FILE_ACCESS_DENIED = NotebookError(
    title="File Access Denied",
    message="Cannot read/write file. Permission issue.",
    resolution=[
        "Check file permissions: ls -la /path/to/file",
        "Make readable: chmod 644 /path/to/file",
        "Ensure path is within allowed directory",
        "Contact administrator for restricted areas",
    ]
)

FILE_NOT_FOUND_IN_PATH = NotebookError(
    title="File Path Invalid",
    message="Referenced file doesn't exist.",
    resolution=[
        "Verify path is correct: pwd shows current directory",
        "Use absolute path to avoid ambiguity",
        "Check file name spelling and extension",
        "List directory: ls /path/to/directory",
    ]
)


def get_query_error(error_type: str, detail: str) -> NotebookError:
    """Error with query-specific details."""
    return NotebookError(
        title=f"Query Error: {error_type}",
        message=detail,
        resolution=[
            "Review error message above for specifics",
            "Check query syntax and table names",
            "Test query in database client",
            "Consult database documentation",
        ]
    )


def get_execution_error(line: int, message: str) -> NotebookError:
    """Error with line number context."""
    return NotebookError(
        title=f"Execution Error at Line {line}",
        message=message,
        resolution=[
            f"Navigate to line {line} in code",
            "Review error message for specific issue",
            "Add debugging: print() before error line",
            "Check variable values and types",
        ]
    )
