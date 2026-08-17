use crate::enterprise_auth::{AuthenticatedUser, EnterpriseAuthManager, JWTClaims};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// JWT Claims extracted from Authorization header
#[derive(Clone, Debug)]
pub struct CurrentUser {
    pub user_id: String,
    pub email: String,
    pub roles: Vec<String>,
    pub user: AuthenticatedUser,
}

/// Error response for auth failures
#[derive(Serialize)]
pub struct AuthError {
    pub error: String,
    pub message: String,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        (StatusCode::UNAUTHORIZED, Json(self)).into_response()
    }
}

/// Axum extractor that validates JWT from Authorization header
#[async_trait]
impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract Authorization header
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(AuthError {
                error: "missing_auth_header".to_string(),
                message: "Missing Authorization header".to_string(),
            })?;

        // Extract Bearer token
        let token = auth_header.strip_prefix("Bearer ").ok_or(AuthError {
            error: "invalid_auth_format".to_string(),
            message: "Invalid Authorization format. Expected 'Bearer <token>'".to_string(),
        })?;

        // Validate JWT token
        let auth_manager = EnterpriseAuthManager::new(get_jwt_secret());
        let (claims, user) = auth_manager.validate_jwt(token).map_err(|e| AuthError {
            error: "invalid_token".to_string(),
            message: format!("Token validation failed: {}", e),
        })?;

        Ok(CurrentUser {
            user_id: claims.sub,
            email: claims.email,
            roles: claims.roles,
            user,
        })
    }
}

/// Get JWT secret from environment or use default (should be injected from AppState)
fn get_jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "default-secret".to_string())
}

/// Extractor for optional authentication (doesn't fail if no token)
#[derive(Clone, Debug)]
pub struct OptionalCurrentUser(pub Option<CurrentUser>);

#[async_trait]
impl<S> FromRequestParts<S> for OptionalCurrentUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Try to extract current user, but don't fail if token is missing
        let current_user = CurrentUser::from_request_parts(parts, state).await.ok();
        Ok(OptionalCurrentUser(current_user))
    }
}

/// Role-based access control extractor (ensures user has specific role)
pub struct RequireRole {
    pub user: CurrentUser,
    pub required_role: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for RequireRole
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = CurrentUser::from_request_parts(parts, state).await?;

        // Check if user has the required role
        // For now, Admin role has all permissions
        if user.roles.contains(&"Admin".to_string()) {
            return Ok(RequireRole {
                user,
                required_role: "Admin".to_string(),
            });
        }

        Ok(RequireRole {
            user,
            required_role: "Member".to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_secret_from_env() {
        std::env::set_var("JWT_SECRET", "test-secret-123");
        let secret = get_jwt_secret();
        assert_eq!(secret, "test-secret-123");
        std::env::remove_var("JWT_SECRET");
    }

    #[test]
    fn test_jwt_secret_default() {
        std::env::remove_var("JWT_SECRET");
        let secret = get_jwt_secret();
        assert_eq!(secret, "default-secret");
    }
}
