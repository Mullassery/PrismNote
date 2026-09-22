"""Tests for prismnote.middleware: FastAPI error handling & security headers.

Uses real FastAPI/Starlette TestClient apps (not mocks) so the middleware
actually intercepts real exceptions flowing through real ASGI request
handling, exercising the information-disclosure prevention this module
exists for.
"""

import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from prismnote.middleware import (
    ErrorHandlingMiddleware,
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
)


# ---------------------------------------------------------------------------
# ErrorHandlingMiddleware
# ---------------------------------------------------------------------------


def _error_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(ErrorHandlingMiddleware)

    @app.get("/ok")
    def ok():
        return {"status": "fine"}

    @app.get("/value-error")
    def value_error():
        raise ValueError("notebook_name contains invalid characters")

    @app.get("/permission-error")
    def permission_error():
        raise PermissionError("cannot access /etc/shadow")

    @app.get("/not-found")
    def not_found():
        raise FileNotFoundError("/data/secret_notebook.ipynb")

    @app.get("/timeout")
    def timeout():
        raise TimeoutError("query exceeded 30s")

    @app.get("/internal-secret-leak")
    def internal_secret_leak():
        # Simulates an unexpected internal error that might otherwise leak
        # implementation details (stack traces, DB DSNs, credentials) to a
        # client if not for the generic 500 handling below.
        raise RuntimeError("connection failed: postgres://admin:hunter2@10.0.0.5/db")

    return app


class TestErrorHandlingMiddlewareStatusCodes:
    def setup_method(self):
        self.client = TestClient(_error_app())

    def test_success_path_is_unaffected(self):
        resp = self.client.get("/ok")
        assert resp.status_code == 200
        assert resp.json() == {"status": "fine"}

    def test_value_error_maps_to_400(self):
        resp = self.client.get("/value-error")
        assert resp.status_code == 400
        assert "Invalid input" in resp.json()["error"]

    def test_permission_error_maps_to_403_without_leaking_detail(self):
        resp = self.client.get("/permission-error")
        assert resp.status_code == 403
        body = resp.json()
        assert body == {"error": "Access denied"}
        # The real path (/etc/shadow) must not reach the client.
        assert "/etc/shadow" not in resp.text

    def test_file_not_found_maps_to_404_without_leaking_path(self):
        resp = self.client.get("/not-found")
        assert resp.status_code == 404
        body = resp.json()
        assert body == {"error": "Resource not found"}
        assert "secret_notebook" not in resp.text

    def test_timeout_maps_to_408(self):
        resp = self.client.get("/timeout")
        assert resp.status_code == 408
        assert "timeout" in resp.json()["error"].lower()


class TestErrorHandlingMiddlewareInformationDisclosure:
    def setup_method(self):
        self.client = TestClient(_error_app())

    def test_unexpected_exception_returns_generic_500(self):
        resp = self.client.get("/internal-secret-leak")
        assert resp.status_code == 500
        assert resp.json() == {"error": "Internal server error"}

    def test_unexpected_exception_does_not_leak_internal_details(self):
        # This is the core security property of ErrorHandlingMiddleware:
        # a bare `except Exception` must never let credentials, DSNs, or
        # stack traces reach the HTTP response body.
        resp = self.client.get("/internal-secret-leak")
        assert "hunter2" not in resp.text
        assert "postgres://" not in resp.text
        assert "10.0.0.5" not in resp.text

    def test_value_error_intentionally_does_include_detail(self):
        # Contrast case: ValueError is explicitly documented as "safe to
        # show" (validation errors), so its message IS surfaced -- this
        # confirms the middleware distinguishes exception types rather
        # than blanket-hiding or blanket-leaking everything.
        resp = self.client.get("/value-error")
        assert "notebook_name contains invalid characters" in resp.json()["error"]


# ---------------------------------------------------------------------------
# SecurityHeadersMiddleware
# ---------------------------------------------------------------------------


def _headers_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/")
    def root():
        return {"ok": True}

    return app


class TestSecurityHeadersMiddleware:
    def setup_method(self):
        self.client = TestClient(_headers_app())

    def test_adds_all_expected_security_headers(self):
        resp = self.client.get("/")
        assert resp.headers["X-Frame-Options"] == "DENY"
        assert resp.headers["X-Content-Type-Options"] == "nosniff"
        assert resp.headers["X-XSS-Protection"] == "1; mode=block"
        assert resp.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_content_security_policy_restricts_default_src_to_self(self):
        resp = self.client.get("/")
        csp = resp.headers["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "script-src 'self'" in csp


# ---------------------------------------------------------------------------
# RequestLoggingMiddleware
# ---------------------------------------------------------------------------


def _logging_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/notebooks/{notebook_id}")
    def get_notebook(notebook_id: str):
        return {"id": notebook_id}

    return app


class TestRequestLoggingMiddleware:
    def setup_method(self):
        self.client = TestClient(_logging_app())

    def test_request_completes_normally(self):
        resp = self.client.get("/notebooks/abc123")
        assert resp.status_code == 200

    def test_does_not_log_sensitive_query_params_or_body(self, caplog):
        with caplog.at_level(logging.DEBUG, logger="prismnote.middleware"):
            self.client.get(
                "/notebooks/abc123?api_key=super-secret-token&password=hunter2"
            )

        logged_text = "\n".join(r.getMessage() for r in caplog.records)
        # The middleware logs request.url.path (no query string) by design;
        # this proves the secret values genuinely never reach the log, not
        # just that the code "looks like" it avoids logging them.
        assert "super-secret-token" not in logged_text
        assert "hunter2" not in logged_text
        assert "/notebooks/abc123" in logged_text
