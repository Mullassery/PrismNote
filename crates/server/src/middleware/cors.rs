use axum::body::Body;
use axum::extract::Request;
use axum::http::{header, HeaderValue, Method, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use tower_http::cors::{AllowOrigin, CorsLayer};

/// True when `origin` is a local development/server origin (any port).
///
/// PrismNote is a local-first app: the UI is served from the same machine
/// (embedded `frontend/dist`) and the Vite dev server proxies to it. Every
/// legitimate origin is therefore `localhost`, `127.0.0.1` or `[::1]`. Anything
/// else — i.e. a website the user happens to have open in another tab — must
/// not be able to reach the API, or a drive-by request could run shell
/// commands, read arbitrary files, or write to disk.
fn origin_is_local(origin: &str) -> bool {
    let rest = match origin.split_once("://") {
        Some((scheme, rest)) if scheme == "http" || scheme == "https" => rest,
        _ => return false,
    };
    let host_port = rest.split('/').next().unwrap_or("");
    let host = if let Some(after_bracket) = host_port.strip_prefix('[') {
        match after_bracket.split_once(']') {
            Some((addr, _)) => addr,
            None => return false,
        }
    } else {
        host_port.split(':').next().unwrap_or("")
    };
    matches!(host, "localhost" | "127.0.0.1" | "::1")
}

/// Configure CORS for PrismNote.
///
/// Only local origins are allowed. This is deliberately *not*
/// `CorsLayer::permissive()`: the API exposes powerful local capabilities
/// (shell execution, filesystem access), so a permissive policy would let any
/// web page in the browser talk to the server.
pub fn cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin: &HeaderValue, _req| {
            origin.to_str().map(origin_is_local).unwrap_or(false)
        }))
        .allow_credentials(true)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            header::AUTHORIZATION,
            header::CONTENT_TYPE,
            header::ACCEPT,
            header::COOKIE,
        ])
        .max_age(std::time::Duration::from_secs(3600))
}

/// Server-side defence against cross-site (drive-by) requests.
///
/// CORS alone only governs whether the *browser* lets a page read the
/// response; the request can still reach the server. Browsers attach an
/// `Origin` header to every non-simple (state-changing) request, so rejecting
/// state-changing requests whose `Origin` is not local blocks cross-site
/// command execution even before the handler runs. Non-browser clients (CLI,
/// tests) send no `Origin` and are unaffected.
pub async fn origin_guard(req: Request<Body>, next: Next) -> Response {
    let method = req.method().clone();
    let state_changing = matches!(
        method,
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    );
    if state_changing {
        if let Some(origin) = req
            .headers()
            .get(header::ORIGIN)
            .and_then(|h| h.to_str().ok())
        {
            if !origin_is_local(origin) {
                return (
                    StatusCode::FORBIDDEN,
                    "Cross-origin request blocked",
                )
                    .into_response();
            }
        }
    }
    next.run(req).await
}

/// Configure secure cookie settings
pub struct CookieConfig {
    pub same_site: &'static str, // "Strict" | "Lax" | "None"
    pub http_only: bool,         // Should not be accessible via JavaScript
    pub secure: bool,            // Only send over HTTPS
    pub max_age: u32,            // Seconds
}

impl Default for CookieConfig {
    fn default() -> Self {
        CookieConfig {
            same_site: "Strict",             // Prevent CSRF
            http_only: true,                 // Prevent XSS access to auth tokens
            secure: !cfg!(debug_assertions), // HTTPS in production
            max_age: 3600 * 24 * 7,          // 7 days
        }
    }
}

impl CookieConfig {
    /// Get Set-Cookie header value with secure defaults
    pub fn to_header(&self) -> String {
        let secure_flag = if self.secure { "; Secure" } else { "" };
        format!(
            "SameSite={}; HttpOnly{}; Max-Age={}",
            self.same_site, secure_flag, self.max_age
        )
    }

    /// Production-safe configuration
    pub fn production() -> Self {
        CookieConfig {
            same_site: "Strict",
            http_only: true,
            secure: true,
            max_age: 3600 * 24 * 7,
        }
    }

    /// Development configuration (less restrictive)
    pub fn development() -> Self {
        CookieConfig {
            same_site: "Lax",
            http_only: true,
            secure: false,
            max_age: 3600 * 24,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_origins_are_allowed() {
        assert!(origin_is_local("http://localhost:8000"));
        assert!(origin_is_local("http://localhost:5173"));
        assert!(origin_is_local("https://127.0.0.1:8443"));
        assert!(origin_is_local("http://[::1]:8000"));
        assert!(origin_is_local("http://localhost"));
    }

    #[test]
    fn remote_and_malformed_origins_are_rejected() {
        assert!(!origin_is_local("https://evil.example.com"));
        assert!(!origin_is_local("http://127.0.0.1.evil.com"));
        assert!(!origin_is_local("null"));
        assert!(!origin_is_local("file://"));
        assert!(!origin_is_local("http://192.168.1.10:8000"));
    }

    #[test]
    fn test_production_cookies() {
        let config = CookieConfig::production();
        assert!(config.secure);
        assert!(config.http_only);
        assert_eq!(config.same_site, "Strict");
    }

    #[test]
    fn test_development_cookies() {
        let config = CookieConfig::development();
        assert!(!config.secure);
        assert!(config.http_only);
        assert_eq!(config.same_site, "Lax");
    }

    #[test]
    fn test_cookie_header() {
        let config = CookieConfig::production();
        let header = config.to_header();
        assert!(header.contains("SameSite=Strict"));
        assert!(header.contains("HttpOnly"));
        assert!(header.contains("Secure"));
    }
}
