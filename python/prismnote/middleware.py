"""Error handling and security middleware for FastAPI."""

import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle errors securely without exposing details.
    
    - Logs full errors internally
    - Returns generic messages to clients
    - Prevents information disclosure
    - Adds security headers
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and handle errors."""
        try:
            response = await call_next(request)
            return response
        
        except ValueError as e:
            # Validation errors - safe to show details
            logger.warning(f"Validation error: {e}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid input: {str(e)}"}
            )
        
        except PermissionError as e:
            # Permission errors
            logger.warning(f"Permission denied: {e}")
            return JSONResponse(
                status_code=403,
                content={"error": "Access denied"}
            )
        
        except FileNotFoundError as e:
            # File not found
            logger.warning(f"File not found: {e}")
            return JSONResponse(
                status_code=404,
                content={"error": "Resource not found"}
            )
        
        except TimeoutError:
            # Query timeout
            logger.warning("Query timeout")
            return JSONResponse(
                status_code=408,
                content={"error": "Request timeout - query took too long"}
            )
        
        except Exception as e:
            # Generic internal error - don't expose details
            logger.exception(f"Unhandled error: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error"},
                headers={"X-Error-ID": str(hash(e))}  # For debugging
            )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers."""
        response = await call_next(request)
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Prevent browsers from inferring content type
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:"
        )
        
        # Don't leak referrer info
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log requests without exposing sensitive data."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Log request safely."""
        # Don't log query params or body (could contain secrets)
        logger.debug(
            f"{request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )
        
        response = await call_next(request)
        
        logger.debug(f"Response: {response.status_code}")
        
        return response
