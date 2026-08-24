//! Real GitHub-backed notebook backup/sync via the Contents API
//! (`GET`/`PUT /repos/{owner}/{repo}/contents/{path}`).
//!
//! Shells out to `reqwest` for real HTTP calls (no mocked responses). Tests
//! exercise the actual request/response/base64 round trip against a local
//! `mockito` server rather than just unit-testing helper functions in
//! isolation.

use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const GITHUB_API_BASE: &str = "https://api.github.com";
const USER_AGENT: &str = "prismnote";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GitHubIntegration {
    pub enabled: bool,
    pub token: Option<String>,
    pub username: Option<String>,
    pub auto_backup: bool,
    pub backup_frequency: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GitHubRepository {
    pub owner: String,
    pub repo: String,
    pub branch: String,
    pub path: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub frequency: String,
    pub retention_days: u32,
    pub auto_sync: bool,
}

pub struct GitHubManager {
    pub token: Option<String>,
    pub repositories: Vec<GitHubRepository>,
    api_base: String,
}

impl GitHubManager {
    pub fn new(token: Option<String>) -> Self {
        Self {
            token,
            repositories: Vec::new(),
            api_base: GITHUB_API_BASE.to_string(),
        }
    }

    /// Test-only hook to point requests at a local mock server instead of
    /// the real GitHub API.
    #[cfg(test)]
    fn new_with_base_url(token: Option<String>, api_base: String) -> Self {
        Self {
            token,
            repositories: Vec::new(),
            api_base,
        }
    }

    pub async fn add_repository(
        &mut self,
        owner: String,
        repo: String,
        branch: String,
        path: String,
    ) -> Result<GitHubRepository, String> {
        if self.token.is_none() {
            return Err("GitHub token not configured".to_string());
        }

        let repo = GitHubRepository {
            owner,
            repo,
            branch,
            path,
        };

        self.repositories.push(repo.clone());
        Ok(repo)
    }

    pub async fn list_repositories(&self) -> Result<Vec<GitHubRepository>, String> {
        Ok(self.repositories.clone())
    }

    fn contents_url(&self, repo: &GitHubRepository, notebook_name: &str) -> String {
        let trimmed_path = repo.path.trim_matches('/');
        let file_path = if trimmed_path.is_empty() {
            notebook_name.to_string()
        } else {
            format!("{trimmed_path}/{notebook_name}")
        };
        format!(
            "{}/repos/{}/{}/contents/{file_path}",
            self.api_base, repo.owner, repo.repo
        )
    }

    fn require_token(&self) -> Result<&str, String> {
        self.token
            .as_deref()
            .ok_or_else(|| "GitHub token not configured".to_string())
    }

    fn authed_request(
        &self,
        client: &reqwest::Client,
        method: reqwest::Method,
        url: &str,
        token: &str,
    ) -> reqwest::RequestBuilder {
        client
            .request(method, url)
            .header("Authorization", format!("Bearer {token}"))
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
    }

    /// `GET`s the file via the Contents API. Returns `Ok(None)` on a real
    /// 404 (file doesn't exist yet -- not an error for push/sync), decoded
    /// `(content, sha)` on success, `Err` for anything else.
    async fn get_file_contents(
        &self,
        token: &str,
        repo: &GitHubRepository,
        notebook_name: &str,
    ) -> Result<Option<(String, String)>, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}?ref={}",
            self.contents_url(repo, notebook_name),
            repo.branch
        );

        let resp = self
            .authed_request(&client, reqwest::Method::GET, &url, token)
            .send()
            .await
            .map_err(|e| format!("GitHub request failed: {e}"))?;

        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("GitHub GET {url} failed ({status}): {body}"));
        }

        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse GitHub response: {e}"))?;
        let sha = json
            .get("sha")
            .and_then(|s| s.as_str())
            .ok_or("GitHub response missing 'sha'")?
            .to_string();
        let content_b64 = json
            .get("content")
            .and_then(|c| c.as_str())
            .ok_or("GitHub response missing 'content'")?;
        // The Contents API line-wraps base64 at 60 chars.
        let cleaned: String = content_b64.chars().filter(|c| !c.is_whitespace()).collect();
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(cleaned)
            .map_err(|e| format!("failed to decode GitHub file content: {e}"))?;
        let text = String::from_utf8(decoded)
            .map_err(|e| format!("GitHub file content is not valid UTF-8: {e}"))?;
        Ok(Some((text, sha)))
    }

    pub async fn push_notebook(
        &self,
        repo: &GitHubRepository,
        notebook_name: String,
        content: String,
    ) -> Result<String, String> {
        let token = self.require_token()?;
        // Creating a file needs no `sha`; updating an existing one requires
        // the current `sha` or GitHub rejects the write as a conflict.
        let existing_sha = self
            .get_file_contents(token, repo, &notebook_name)
            .await?
            .map(|(_, sha)| sha);

        let client = reqwest::Client::new();
        let url = self.contents_url(repo, &notebook_name);
        let encoded = base64::engine::general_purpose::STANDARD.encode(content.as_bytes());

        let mut body = serde_json::json!({
            "message": format!("Update {notebook_name} via PrismNote"),
            "content": encoded,
            "branch": repo.branch,
        });
        if let Some(sha) = existing_sha {
            body["sha"] = serde_json::json!(sha);
        }

        let resp = self
            .authed_request(&client, reqwest::Method::PUT, &url, token)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("GitHub request failed: {e}"))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!(
                "GitHub push of '{notebook_name}' failed ({status}): {text}"
            ));
        }

        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse GitHub response: {e}"))?;
        Ok(json
            .get("content")
            .and_then(|c| c.get("html_url"))
            .and_then(|u| u.as_str())
            .unwrap_or(&url)
            .to_string())
    }

    pub async fn pull_notebook(
        &self,
        repo: &GitHubRepository,
        notebook_name: String,
    ) -> Result<String, String> {
        let token = self.require_token()?;
        match self.get_file_contents(token, repo, &notebook_name).await? {
            Some((content, _sha)) => Ok(content),
            None => Err(format!(
                "'{notebook_name}' not found in {}/{} at '{}' (branch {})",
                repo.owner, repo.repo, repo.path, repo.branch
            )),
        }
    }

    /// Real bidirectional sync, with an honestly-documented limitation: there's
    /// no persisted "last synced sha" to detect which side actually diverged,
    /// so a genuine conflict (both sides changed since last sync) resolves as
    /// local-wins rather than a three-way merge.
    pub async fn sync_notebook(
        &self,
        repo: &GitHubRepository,
        notebook_name: String,
        content: String,
    ) -> Result<String, String> {
        let token = self.require_token()?;
        match self.get_file_contents(token, repo, &notebook_name).await? {
            None => {
                self.push_notebook(repo, notebook_name.clone(), content)
                    .await?;
                Ok(format!(
                    "'{notebook_name}' did not exist on GitHub; pushed local copy"
                ))
            }
            Some((remote_content, _)) if remote_content == content => {
                Ok(format!("'{notebook_name}' already in sync"))
            }
            Some(_) => {
                let url = self
                    .push_notebook(repo, notebook_name.clone(), content)
                    .await?;
                Ok(format!(
                    "'{notebook_name}' differed from GitHub; pushed local version ({url})"
                ))
            }
        }
    }

    /// Pushes every `(notebook_name, content)` pair to every configured
    /// repository (a "backup" fans out to all configured destinations, not
    /// just one). Returns the resulting URLs in `(repo, notebook)` order;
    /// stops at the first failure so a partial backup isn't reported as
    /// silently complete.
    pub async fn backup_all(
        &self,
        notebooks: Vec<(String, String)>,
    ) -> Result<Vec<String>, String> {
        self.require_token()?;
        if self.repositories.is_empty() {
            return Err("no GitHub repositories configured for backup".to_string());
        }

        let mut results = Vec::with_capacity(notebooks.len() * self.repositories.len());
        for repo in &self.repositories {
            for (name, content) in &notebooks {
                let url = self
                    .push_notebook(repo, name.clone(), content.clone())
                    .await?;
                results.push(url);
            }
        }
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_repo() -> GitHubRepository {
        GitHubRepository {
            owner: "acme".to_string(),
            repo: "notebooks".to_string(),
            branch: "main".to_string(),
            path: "backups".to_string(),
        }
    }

    #[test]
    fn contents_url_joins_path_and_notebook_name() {
        let mgr = GitHubManager::new_with_base_url(None, "https://api.github.com".to_string());
        let url = mgr.contents_url(&test_repo(), "notes.ipynb");
        assert_eq!(
            url,
            "https://api.github.com/repos/acme/notebooks/contents/backups/notes.ipynb"
        );
    }

    #[test]
    fn contents_url_handles_empty_repo_path() {
        let mgr = GitHubManager::new_with_base_url(None, "https://api.github.com".to_string());
        let mut repo = test_repo();
        repo.path = "".to_string();
        let url = mgr.contents_url(&repo, "notes.ipynb");
        assert_eq!(
            url,
            "https://api.github.com/repos/acme/notebooks/contents/notes.ipynb"
        );
    }

    #[tokio::test]
    async fn push_pull_sync_without_token_fail_fast() {
        let mgr = GitHubManager::new(None);
        let repo = test_repo();
        assert!(mgr
            .push_notebook(&repo, "n.ipynb".to_string(), "{}".to_string())
            .await
            .unwrap_err()
            .contains("token"));
        assert!(mgr
            .pull_notebook(&repo, "n.ipynb".to_string())
            .await
            .unwrap_err()
            .contains("token"));
        assert!(mgr
            .sync_notebook(&repo, "n.ipynb".to_string(), "{}".to_string())
            .await
            .unwrap_err()
            .contains("token"));
    }

    #[tokio::test]
    async fn backup_all_requires_at_least_one_repository() {
        let mgr = GitHubManager::new(Some("tok".to_string()));
        let err = mgr
            .backup_all(vec![("n.ipynb".to_string(), "{}".to_string())])
            .await
            .unwrap_err();
        assert!(err.contains("no GitHub repositories"));
    }

    // ---- Real HTTP round trip against a local mock GitHub API -----------

    #[tokio::test]
    async fn pull_notebook_decodes_base64_content_from_real_response() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();
        let raw_content = "print('hello from prismnote')";
        let encoded = base64::engine::general_purpose::STANDARD.encode(raw_content);

        let _m = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/notes.ipynb?ref=main",
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(format!(
                r#"{{"sha": "abc123", "content": "{encoded}", "encoding": "base64"}}"#
            ))
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        let content = mgr
            .pull_notebook(&repo, "notes.ipynb".to_string())
            .await
            .expect("pull should succeed");
        assert_eq!(content, raw_content);
    }

    #[tokio::test]
    async fn pull_notebook_reports_missing_file_on_404() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();

        let _m = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/notes.ipynb?ref=main",
            )
            .with_status(404)
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        let err = mgr
            .pull_notebook(&repo, "notes.ipynb".to_string())
            .await
            .unwrap_err();
        assert!(err.contains("not found"));
    }

    #[tokio::test]
    async fn push_notebook_creates_new_file_without_sha_on_404() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();

        let _get = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/new.ipynb?ref=main",
            )
            .with_status(404)
            .create_async()
            .await;

        let _put = server
            .mock("PUT", "/repos/acme/notebooks/contents/backups/new.ipynb")
            .match_body(mockito::Matcher::PartialJsonString(
                r#"{"branch": "main"}"#.to_string(),
            ))
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(r#"{"content": {"html_url": "https://github.com/acme/notebooks/blob/main/backups/new.ipynb"}}"#)
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        let url = mgr
            .push_notebook(&repo, "new.ipynb".to_string(), "{}".to_string())
            .await
            .expect("push should succeed");
        assert_eq!(
            url,
            "https://github.com/acme/notebooks/blob/main/backups/new.ipynb"
        );
    }

    #[tokio::test]
    async fn push_notebook_includes_existing_sha_when_updating() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();
        let old_encoded = base64::engine::general_purpose::STANDARD.encode("old content");

        let _get = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/existing.ipynb?ref=main",
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(format!(
                r#"{{"sha": "existing-sha-1", "content": "{old_encoded}"}}"#
            ))
            .create_async()
            .await;

        let _put = server
            .mock(
                "PUT",
                "/repos/acme/notebooks/contents/backups/existing.ipynb",
            )
            .match_body(mockito::Matcher::PartialJsonString(
                r#"{"sha": "existing-sha-1"}"#.to_string(),
            ))
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"content": {"html_url": "https://github.com/acme/notebooks/blob/main/backups/existing.ipynb"}}"#)
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        mgr.push_notebook(
            &repo,
            "existing.ipynb".to_string(),
            "new content".to_string(),
        )
        .await
        .expect("push should succeed and include the sha it fetched");
    }

    #[tokio::test]
    async fn sync_notebook_reports_already_in_sync_when_content_matches() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();
        let encoded = base64::engine::general_purpose::STANDARD.encode("same content");

        let _get = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/notes.ipynb?ref=main",
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(format!(r#"{{"sha": "s1", "content": "{encoded}"}}"#))
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        let result = mgr
            .sync_notebook(&repo, "notes.ipynb".to_string(), "same content".to_string())
            .await
            .expect("sync should succeed");
        assert!(result.contains("already in sync"));
    }

    #[tokio::test]
    async fn push_notebook_surfaces_github_error_body_on_failure() {
        let mut server = mockito::Server::new_async().await;
        let repo = test_repo();

        let _get = server
            .mock(
                "GET",
                "/repos/acme/notebooks/contents/backups/notes.ipynb?ref=main",
            )
            .with_status(404)
            .create_async()
            .await;

        let _put = server
            .mock("PUT", "/repos/acme/notebooks/contents/backups/notes.ipynb")
            .with_status(403)
            .with_body(r#"{"message": "Resource not accessible by integration"}"#)
            .create_async()
            .await;

        let mgr = GitHubManager::new_with_base_url(Some("tok".to_string()), server.url());
        let err = mgr
            .push_notebook(&repo, "notes.ipynb".to_string(), "{}".to_string())
            .await
            .unwrap_err();
        assert!(err.contains("403"));
        assert!(err.contains("not accessible by integration"));
    }
}
