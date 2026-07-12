"""Security utilities for input validation and safe file access."""

from pathlib import Path
from typing import Optional
from pydantic import BaseModel, field_validator, Field


class NotebookRequest(BaseModel):
    """Validated notebook request."""
    
    notebook_name: str = Field(min_length=1, max_length=255)
    content: Optional[str] = Field(default=None, max_length=10_000_000)
    
    @field_validator('notebook_name')
    def validate_notebook_name(cls, v):
        # Only allow alphanumeric, dash, underscore
        if not all(c.isalnum() or c in '-_.' for c in v):
            raise ValueError('Notebook name contains invalid characters')
        # Prevent path traversal
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Path traversal not allowed')
        return v


class FileAccessValidator:
    """Validate file access to prevent path traversal."""
    
    def __init__(self, base_dir: Path):
        """
        Initialize with base directory for file operations.
        
        Args:
            base_dir: Base directory where files are stored
        """
        self.base_dir = base_dir.resolve()
    
    def validate_path(self, user_path: str) -> Path:
        """
        Validate that user path is within base_dir.
        
        Args:
            user_path: Path provided by user
            
        Returns:
            Validated Path object
            
        Raises:
            ValueError: If path escapes base_dir
        """
        # Resolve to absolute path
        resolved_path = (self.base_dir / user_path).resolve()
        
        # Ensure resolved path is within base_dir
        try:
            resolved_path.relative_to(self.base_dir)
        except ValueError:
            raise ValueError(f"Path escapes base directory: {user_path}")
        
        # Prevent directory traversal attacks
        if '..' in str(user_path):
            raise ValueError("Directory traversal not allowed")
        
        return resolved_path
    
    def validate_for_read(self, user_path: str) -> Path:
        """Validate path for reading (must exist)."""
        path = self.validate_path(user_path)
        if not path.exists():
            raise ValueError(f"File not found: {user_path}")
        if not path.is_file():
            raise ValueError(f"Not a file: {user_path}")
        return path
    
    def validate_for_write(self, user_path: str) -> Path:
        """Validate path for writing (parent must exist)."""
        path = self.validate_path(user_path)
        if not path.parent.exists():
            raise ValueError(f"Parent directory doesn't exist: {user_path}")
        return path
