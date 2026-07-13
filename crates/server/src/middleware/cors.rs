use axum::http::{HeaderValue, Method};
use tower_http::cors::{CorsLayer, Any};

/// Configure CORS for PrismNote
///
/// Allows frontend to communicate with API while blocking cross-origin attacks
pub fn cors_layer() -> CorsLayer {
    CorsLayer::permissive()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers(tower_http::cors::Any)
        .max_age(std::time::Duration::from_secs(3600))
}

/// Configure secure cookie settings
pub struct CookieConfig {
    pub same_site: &'static str,    // "Strict" | "Lax" | "None"
    pub http_only: bool,             // Should not be accessible via JavaScript
    pub secure: bool,                // Only send over HTTPS
    pub max_age: u32,                // Seconds
}

impl Default for CookieConfig {
    fn default() -> Self {
        CookieConfig {
            same_site: "Strict",     // Prevent CSRF
            http_only: true,         // Prevent XSS access to auth tokens
            secure: !cfg!(debug_assertions), // HTTPS in production
            max_age: 3600 * 24 * 7,  // 7 days
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
