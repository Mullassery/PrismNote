//! Real cloud object-storage clients: S3 (reusing the existing SigV4 signer
//! from `cloud_warehouse::sigv4`), GCS (service-account JWT-bearer OAuth,
//! mirroring `cloud_warehouse::snowflake`'s JWT pattern), Azure Blob (Shared
//! Key HMAC-SHA256 signing, implemented directly against Microsoft's
//! documented algorithm the same way `sigv4.rs` implements AWS's), and
//! Google Drive (OAuth refresh-token exchange). No SDKs, no mocked
//! responses -- real HTTP calls signed/authenticated for real.

use crate::cloud_warehouse::sigv4::{self, SigV4Credentials};
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CloudStorageProvider {
    S3,
    GCS,
    AzureBlob,
    GoogleDrive,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudStorageConfig {
    pub provider: CloudStorageProvider,
    pub mount_path: String,
    pub credentials: CloudStorageCredentials,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CloudStorageCredentials {
    S3 {
        access_key_id: String,
        secret_access_key: String,
        bucket: String,
        region: String,
    },
    GCS {
        project_id: String,
        private_key: String,
        client_email: String,
        bucket: String,
    },
    AzureBlob {
        connection_string: String,
        container: String,
        storage_account: String,
    },
    GoogleDrive {
        client_id: String,
        client_secret: String,
        refresh_token: String,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudStorageFile {
    pub id: String,
    pub name: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub cloud_path: String,
    pub created_at: String,
    pub modified_at: String,
}

fn unescape_xml(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
}

// ============================================================================
// S3
// ============================================================================

pub struct S3Client {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket: String,
    pub region: String,
    /// Test-only: overrides the derived `{bucket}.s3.{region}.amazonaws.com`
    /// host+scheme with a full `scheme://host` so requests hit a local mock
    /// server instead of real AWS.
    #[cfg(test)]
    endpoint_override: Option<String>,
}

impl S3Client {
    pub fn new(
        access_key_id: String,
        secret_access_key: String,
        bucket: String,
        region: String,
    ) -> Self {
        Self {
            access_key_id,
            secret_access_key,
            bucket,
            region,
            #[cfg(test)]
            endpoint_override: None,
        }
    }

    #[cfg(test)]
    fn with_endpoint_override(mut self, endpoint: String) -> Self {
        self.endpoint_override = Some(endpoint);
        self
    }

    fn host(&self) -> String {
        format!("{}.s3.{}.amazonaws.com", self.bucket, self.region)
    }

    #[cfg(not(test))]
    fn base_url(&self) -> String {
        format!("https://{}", self.host())
    }
    #[cfg(test)]
    fn base_url(&self) -> String {
        self.endpoint_override
            .clone()
            .unwrap_or_else(|| format!("https://{}", self.host()))
    }

    fn creds(&self) -> SigV4Credentials<'_> {
        SigV4Credentials {
            access_key_id: &self.access_key_id,
            secret_access_key: &self.secret_access_key,
            session_token: None,
            region: &self.region,
            service: "s3",
        }
    }

    async fn signed_request(
        &self,
        method: reqwest::Method,
        path: &str,
        query_string: &str,
        body: Vec<u8>,
        extra_headers: &[(&str, &str)],
    ) -> Result<reqwest::Response, String> {
        let host = self.host();
        let signed = sigv4::sign(
            method.as_str(),
            &host,
            path,
            query_string,
            extra_headers,
            &body,
            &self.creds(),
            chrono::Utc::now(),
        );

        let url = if query_string.is_empty() {
            format!("{}{path}", self.base_url())
        } else {
            format!("{}{path}?{query_string}", self.base_url())
        };

        let client = reqwest::Client::new();
        let mut req = client.request(method, &url).header("Host", &host);
        for (k, v) in &signed.headers {
            req = req.header(k, v);
        }
        for (k, v) in extra_headers {
            req = req.header(*k, *v);
        }
        req.body(body)
            .send()
            .await
            .map_err(|e| format!("S3 request to {url} failed: {e}"))
    }

    pub async fn upload(
        &self,
        key: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> Result<String, String> {
        let path = format!("/{key}");
        let resp = self
            .signed_request(
                reqwest::Method::PUT,
                &path,
                "",
                content,
                &[("content-type", content_type)],
            )
            .await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("S3 upload of '{key}' failed ({status}): {body}"));
        }
        Ok(format!("s3://{}/{}", self.bucket, key))
    }

    pub async fn download(&self, key: &str) -> Result<Vec<u8>, String> {
        let path = format!("/{key}");
        let resp = self
            .signed_request(reqwest::Method::GET, &path, "", Vec::new(), &[])
            .await?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(format!("S3 object not found: s3://{}/{key}", self.bucket));
        }
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("S3 download of '{key}' failed ({status}): {body}"));
        }
        resp.bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("failed to read S3 response body: {e}"))
    }

    pub async fn list(&self, prefix: &str) -> Result<Vec<CloudStorageFile>, String> {
        let query = format!("list-type=2&prefix={}", urlencoding::encode(prefix));
        let resp = self
            .signed_request(reqwest::Method::GET, "/", &query, Vec::new(), &[])
            .await?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("S3 ListObjectsV2 failed ({status}): {body}"));
        }
        let xml = resp
            .text()
            .await
            .map_err(|e| format!("failed to read S3 list response: {e}"))?;
        Ok(parse_s3_list_response(&xml, &self.bucket))
    }

    pub async fn delete(&self, key: &str) -> Result<(), String> {
        let path = format!("/{key}");
        let resp = self
            .signed_request(reqwest::Method::DELETE, &path, "", Vec::new(), &[])
            .await?;
        if !resp.status().is_success() && resp.status() != reqwest::StatusCode::NOT_FOUND {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("S3 delete of '{key}' failed ({status}): {body}"));
        }
        Ok(())
    }
}

fn parse_s3_list_response(xml: &str, bucket: &str) -> Vec<CloudStorageFile> {
    let mut files = Vec::new();
    // No XML crate in this workspace; ListObjectsV2's <Contents> shape is
    // small, stable, and well-documented, so a targeted extractor (rather
    // than a full XML parser) is proportionate here -- same "implement
    // directly against the documented shape" philosophy sigv4.rs uses for
    // SigV4 itself.
    for block in xml_blocks(xml, "Contents") {
        let key = match xml_field(&block, "Key") {
            Some(k) if !k.is_empty() => unescape_xml(&k),
            _ => continue,
        };
        let size: u64 = xml_field(&block, "Size")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let modified = xml_field(&block, "LastModified").unwrap_or_default();
        let name = key.rsplit('/').next().unwrap_or(&key).to_string();
        files.push(CloudStorageFile {
            id: key.clone(),
            name,
            size_bytes: size,
            mime_type: "application/octet-stream".to_string(),
            cloud_path: format!("s3://{bucket}/{key}"),
            created_at: modified.clone(),
            modified_at: modified,
        });
    }
    files
}

fn xml_blocks(xml: &str, tag: &str) -> Vec<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let mut blocks = Vec::new();
    let mut rest = xml;
    while let Some(start) = rest.find(&open) {
        let after_open = &rest[start + open.len()..];
        if let Some(end) = after_open.find(&close) {
            blocks.push(after_open[..end].to_string());
            rest = &after_open[end + close.len()..];
        } else {
            break;
        }
    }
    blocks
}

fn xml_field(block: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}>");
    let close = format!("</{tag}>");
    let start = block.find(&open)? + open.len();
    let end = block[start..].find(&close)? + start;
    Some(block[start..end].to_string())
}

// ============================================================================
// GCS
// ============================================================================

pub struct GCSClient {
    pub project_id: String,
    pub bucket: String,
    pub client_email: String,
    pub private_key: String,
    oauth_token_url: String,
    storage_api_base: String,
}

impl GCSClient {
    pub fn new(
        project_id: String,
        bucket: String,
        client_email: String,
        private_key: String,
    ) -> Self {
        Self {
            project_id,
            bucket,
            client_email,
            private_key,
            oauth_token_url: "https://oauth2.googleapis.com/token".to_string(),
            storage_api_base: "https://storage.googleapis.com".to_string(),
        }
    }

    #[cfg(test)]
    fn with_base_urls(mut self, oauth_token_url: String, storage_api_base: String) -> Self {
        self.oauth_token_url = oauth_token_url;
        self.storage_api_base = storage_api_base;
        self
    }

    /// Service-account JWT-bearer OAuth2 flow (RS256), mirroring
    /// `cloud_warehouse::snowflake::build_jwt`'s pattern for a different
    /// provider's key-pair auth.
    async fn access_token(&self) -> Result<String, String> {
        #[derive(Serialize)]
        struct Claims {
            iss: String,
            scope: String,
            aud: String,
            iat: i64,
            exp: i64,
        }
        let now = chrono::Utc::now().timestamp();
        let claims = Claims {
            iss: self.client_email.clone(),
            scope: "https://www.googleapis.com/auth/devstorage.read_write".to_string(),
            aud: self.oauth_token_url.clone(),
            iat: now,
            exp: now + 3600,
        };
        let encoding_key = jsonwebtoken::EncodingKey::from_rsa_pem(self.private_key.as_bytes())
            .map_err(|e| format!("failed to load GCS service-account private key: {e}"))?;
        let jwt = jsonwebtoken::encode(
            &jsonwebtoken::Header::new(jsonwebtoken::Algorithm::RS256),
            &claims,
            &encoding_key,
        )
        .map_err(|e| format!("failed to sign GCS service-account JWT: {e}"))?;

        let client = reqwest::Client::new();
        let resp = client
            .post(&self.oauth_token_url)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", jwt.as_str()),
            ])
            .send()
            .await
            .map_err(|e| format!("GCS OAuth token exchange failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "GCS OAuth token exchange failed ({status}): {body}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse GCS OAuth response: {e}"))?;
        json.get("access_token")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "GCS OAuth response missing access_token".to_string())
    }

    pub async fn upload(
        &self,
        object_name: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> Result<String, String> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/upload/storage/v1/b/{}/o?uploadType=media&name={}",
            self.storage_api_base,
            self.bucket,
            urlencoding::encode(object_name)
        );
        let client = reqwest::Client::new();
        let resp = client
            .post(&url)
            .bearer_auth(&token)
            .header("Content-Type", content_type)
            .body(content)
            .send()
            .await
            .map_err(|e| format!("GCS upload failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "GCS upload of '{object_name}' failed ({status}): {body}"
            ));
        }
        Ok(format!("gs://{}/{}", self.bucket, object_name))
    }

    pub async fn download(&self, object_name: &str) -> Result<Vec<u8>, String> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/storage/v1/b/{}/o/{}?alt=media",
            self.storage_api_base,
            self.bucket,
            urlencoding::encode(object_name)
        );
        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("GCS download failed: {e}"))?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(format!(
                "GCS object not found: gs://{}/{object_name}",
                self.bucket
            ));
        }
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "GCS download of '{object_name}' failed ({status}): {body}"
            ));
        }
        resp.bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("failed to read GCS response body: {e}"))
    }

    pub async fn list(&self, prefix: &str) -> Result<Vec<CloudStorageFile>, String> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/storage/v1/b/{}/o?prefix={}",
            self.storage_api_base,
            self.bucket,
            urlencoding::encode(prefix)
        );
        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("GCS list failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("GCS list failed ({status}): {body}"));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse GCS list response: {e}"))?;
        let items = json
            .get("items")
            .and_then(|i| i.as_array())
            .cloned()
            .unwrap_or_default();
        Ok(items
            .iter()
            .map(|item| {
                let name = item
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string();
                CloudStorageFile {
                    id: name.clone(),
                    name: name.rsplit('/').next().unwrap_or(&name).to_string(),
                    size_bytes: item
                        .get("size")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse().ok())
                        .unwrap_or(0),
                    mime_type: item
                        .get("contentType")
                        .and_then(|v| v.as_str())
                        .unwrap_or("application/octet-stream")
                        .to_string(),
                    cloud_path: format!("gs://{}/{name}", self.bucket),
                    created_at: item
                        .get("timeCreated")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                    modified_at: item
                        .get("updated")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string(),
                }
            })
            .collect())
    }

    pub async fn delete(&self, object_name: &str) -> Result<(), String> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/storage/v1/b/{}/o/{}",
            self.storage_api_base,
            self.bucket,
            urlencoding::encode(object_name)
        );
        let client = reqwest::Client::new();
        let resp = client
            .delete(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("GCS delete failed: {e}"))?;
        if !resp.status().is_success() && resp.status() != reqwest::StatusCode::NOT_FOUND {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "GCS delete of '{object_name}' failed ({status}): {body}"
            ));
        }
        Ok(())
    }
}

// ============================================================================
// Azure Blob Storage
// ============================================================================

pub struct AzureBlobClient {
    pub connection_string: String,
    pub container: String,
    pub storage_account: String,
    #[cfg(test)]
    endpoint_override: Option<String>,
}

const AZURE_API_VERSION: &str = "2021-08-06";

impl AzureBlobClient {
    pub fn new(connection_string: String, container: String, storage_account: String) -> Self {
        Self {
            connection_string,
            container,
            storage_account,
            #[cfg(test)]
            endpoint_override: None,
        }
    }

    #[cfg(test)]
    fn with_endpoint_override(mut self, endpoint: String) -> Self {
        self.endpoint_override = Some(endpoint);
        self
    }

    #[cfg(not(test))]
    fn base_url(&self) -> String {
        format!("https://{}.blob.core.windows.net", self.storage_account)
    }
    #[cfg(test)]
    fn base_url(&self) -> String {
        self.endpoint_override
            .clone()
            .unwrap_or_else(|| format!("https://{}.blob.core.windows.net", self.storage_account))
    }

    fn account_key(&self) -> Result<String, String> {
        parse_connection_string(&self.connection_string).map(|(_, key)| key)
    }

    /// Azure "Shared Key" signing for the Blob service, implemented directly
    /// against Microsoft's documented algorithm (learn.microsoft.com/rest/api/
    /// storageservices/authorize-with-shared-key), the same way sigv4.rs
    /// implements AWS's algorithm rather than pulling in an SDK.
    fn authorization_header(
        &self,
        method: &str,
        canonicalized_resource: &str,
        content_length: usize,
        content_type: &str,
        date: &str,
        extra_ms_headers: &[(&str, &str)],
    ) -> Result<String, String> {
        let key_b64 = self.account_key()?;
        let key = base64::engine::general_purpose::STANDARD
            .decode(&key_b64)
            .map_err(|e| format!("invalid Azure AccountKey (not valid base64): {e}"))?;

        let mut headers: Vec<(String, String)> = extra_ms_headers
            .iter()
            .map(|(k, v)| (k.to_lowercase(), v.to_string()))
            .collect();
        headers.push(("x-ms-date".to_string(), date.to_string()));
        headers.push(("x-ms-version".to_string(), AZURE_API_VERSION.to_string()));
        headers.sort_by(|a, b| a.0.cmp(&b.0));
        let canonicalized_headers: String =
            headers.iter().map(|(k, v)| format!("{k}:{v}\n")).collect();

        let content_length_str = if content_length == 0 {
            String::new()
        } else {
            content_length.to_string()
        };

        let string_to_sign = format!(
            "{method}\n\n\n{content_length_str}\n\n{content_type}\n\n\n\n\n\n\n{canonicalized_headers}{canonicalized_resource}"
        );

        let mut mac = Hmac::<Sha256>::new_from_slice(&key)
            .map_err(|e| format!("Azure HMAC key init failed: {e}"))?;
        mac.update(string_to_sign.as_bytes());
        let signature =
            base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
        Ok(format!("SharedKey {}:{signature}", self.storage_account))
    }

    fn rfc1123_now() -> String {
        chrono::Utc::now()
            .format("%a, %d %b %Y %H:%M:%S GMT")
            .to_string()
    }

    pub async fn upload(
        &self,
        blob_name: &str,
        content: Vec<u8>,
        content_type: &str,
    ) -> Result<String, String> {
        let date = Self::rfc1123_now();
        let canonicalized_resource =
            format!("/{}/{}/{}", self.storage_account, self.container, blob_name);
        let ms_headers = [("x-ms-blob-type", "BlockBlob")];
        let auth = self.authorization_header(
            "PUT",
            &canonicalized_resource,
            content.len(),
            content_type,
            &date,
            &ms_headers,
        )?;

        let url = format!("{}/{}/{}", self.base_url(), self.container, blob_name);
        let client = reqwest::Client::new();
        let resp = client
            .put(&url)
            .header("Authorization", auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", AZURE_API_VERSION)
            .header("x-ms-blob-type", "BlockBlob")
            .header("Content-Type", content_type)
            .body(content)
            .send()
            .await
            .map_err(|e| format!("Azure Blob upload failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Azure Blob upload of '{blob_name}' failed ({status}): {body}"
            ));
        }
        Ok(format!(
            "https://{}.blob.core.windows.net/{}/{}",
            self.storage_account, self.container, blob_name
        ))
    }

    pub async fn download(&self, blob_name: &str) -> Result<Vec<u8>, String> {
        let date = Self::rfc1123_now();
        let canonicalized_resource =
            format!("/{}/{}/{}", self.storage_account, self.container, blob_name);
        let auth = self.authorization_header("GET", &canonicalized_resource, 0, "", &date, &[])?;

        let url = format!("{}/{}/{}", self.base_url(), self.container, blob_name);
        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .header("Authorization", auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", AZURE_API_VERSION)
            .send()
            .await
            .map_err(|e| format!("Azure Blob download failed: {e}"))?;
        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(format!(
                "Azure blob not found: {}/{}",
                self.container, blob_name
            ));
        }
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Azure Blob download of '{blob_name}' failed ({status}): {body}"
            ));
        }
        resp.bytes()
            .await
            .map(|b| b.to_vec())
            .map_err(|e| format!("failed to read Azure Blob response body: {e}"))
    }

    pub async fn list(&self, prefix: &str) -> Result<Vec<CloudStorageFile>, String> {
        let date = Self::rfc1123_now();
        // Query params must be included in CanonicalizedResource, sorted by
        // name, each as "name:value" -- restype/comp/prefix are alphabetical
        // as written here (comp < prefix < restype).
        let canonicalized_resource = format!(
            "/{}/{}\ncomp:list\nprefix:{prefix}\nrestype:container",
            self.storage_account, self.container
        );
        let auth = self.authorization_header("GET", &canonicalized_resource, 0, "", &date, &[])?;

        let url = format!(
            "{}/{}?restype=container&comp=list&prefix={}",
            self.base_url(),
            self.container,
            urlencoding::encode(prefix)
        );
        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .header("Authorization", auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", AZURE_API_VERSION)
            .send()
            .await
            .map_err(|e| format!("Azure Blob list failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Azure Blob list failed ({status}): {body}"));
        }
        let xml = resp
            .text()
            .await
            .map_err(|e| format!("failed to read Azure Blob list response: {e}"))?;
        Ok(parse_azure_list_response(
            &xml,
            &self.storage_account,
            &self.container,
        ))
    }

    pub async fn delete(&self, blob_name: &str) -> Result<(), String> {
        let date = Self::rfc1123_now();
        let canonicalized_resource =
            format!("/{}/{}/{}", self.storage_account, self.container, blob_name);
        let auth =
            self.authorization_header("DELETE", &canonicalized_resource, 0, "", &date, &[])?;

        let url = format!("{}/{}/{}", self.base_url(), self.container, blob_name);
        let client = reqwest::Client::new();
        let resp = client
            .delete(&url)
            .header("Authorization", auth)
            .header("x-ms-date", &date)
            .header("x-ms-version", AZURE_API_VERSION)
            .send()
            .await
            .map_err(|e| format!("Azure Blob delete failed: {e}"))?;
        if !resp.status().is_success() && resp.status() != reqwest::StatusCode::NOT_FOUND {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Azure Blob delete of '{blob_name}' failed ({status}): {body}"
            ));
        }
        Ok(())
    }
}

fn parse_connection_string(cs: &str) -> Result<(String, String), String> {
    let mut account_name = None;
    let mut account_key = None;
    for part in cs.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((k, v)) = part.split_once('=') {
            match k.trim() {
                "AccountName" => account_name = Some(v.trim().to_string()),
                "AccountKey" => account_key = Some(v.trim().to_string()),
                _ => {}
            }
        }
    }
    match (account_name, account_key) {
        (Some(n), Some(k)) => Ok((n, k)),
        _ => Err("Azure connection_string is missing AccountName and/or AccountKey".to_string()),
    }
}

fn parse_azure_list_response(xml: &str, account: &str, container: &str) -> Vec<CloudStorageFile> {
    let mut files = Vec::new();
    for block in xml_blocks(xml, "Blob") {
        let name = match xml_field(&block, "Name") {
            Some(n) if !n.is_empty() => unescape_xml(&n),
            _ => continue,
        };
        let size: u64 = xml_field(&block, "Content-Length")
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        let content_type = xml_field(&block, "Content-Type").unwrap_or_default();
        let modified = xml_field(&block, "Last-Modified").unwrap_or_default();
        files.push(CloudStorageFile {
            id: name.clone(),
            name: name.rsplit('/').next().unwrap_or(&name).to_string(),
            size_bytes: size,
            mime_type: if content_type.is_empty() {
                "application/octet-stream".to_string()
            } else {
                content_type
            },
            cloud_path: format!("https://{account}.blob.core.windows.net/{container}/{name}"),
            created_at: modified.clone(),
            modified_at: modified,
        });
    }
    files
}

// ============================================================================
// Google Drive
// ============================================================================

pub struct GoogleDriveClient {
    pub client_id: String,
    pub client_secret: String,
    pub refresh_token: String,
    oauth_token_url: String,
    drive_api_base: String,
    upload_api_base: String,
}

impl GoogleDriveClient {
    pub fn new(client_id: String, client_secret: String, refresh_token: String) -> Self {
        Self {
            client_id,
            client_secret,
            refresh_token,
            oauth_token_url: "https://oauth2.googleapis.com/token".to_string(),
            drive_api_base: "https://www.googleapis.com".to_string(),
            upload_api_base: "https://www.googleapis.com".to_string(),
        }
    }

    #[cfg(test)]
    fn with_base_urls(mut self, oauth_token_url: String, api_base: String) -> Self {
        self.oauth_token_url = oauth_token_url;
        self.drive_api_base = api_base.clone();
        self.upload_api_base = api_base;
        self
    }

    async fn access_token(&self) -> Result<String, String> {
        let client = reqwest::Client::new();
        let resp = client
            .post(&self.oauth_token_url)
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.as_str()),
                ("refresh_token", self.refresh_token.as_str()),
                ("grant_type", "refresh_token"),
            ])
            .send()
            .await
            .map_err(|e| format!("Google Drive OAuth refresh failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Google Drive OAuth refresh failed ({status}): {body}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Google OAuth response: {e}"))?;
        json.get("access_token")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| "Google OAuth response missing access_token".to_string())
    }

    /// There is no server-side "mount" concept over a stateless REST API --
    /// a real filesystem mount is an OS-level operation this backend service
    /// doesn't perform. What IS real and checkable here: verifying the
    /// refresh token actually grants access to Drive before reporting success,
    /// rather than unconditionally returning `Ok(())` as before.
    pub async fn mount(&self, mount_path: &str) -> Result<(), String> {
        let token = self.access_token().await?;
        let client = reqwest::Client::new();
        let url = format!("{}/drive/v3/about?fields=user", self.drive_api_base);
        let resp = client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Google Drive access check failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            return Err(format!(
                "Google Drive credentials could not be verified for mount_path '{mount_path}' ({status})"
            ));
        }
        Ok(())
    }

    /// Mirrors `mount`: no server-side mount state exists to release.
    pub async fn unmount(&self, _mount_path: &str) -> Result<(), String> {
        Ok(())
    }

    pub async fn list(&self, folder_id: &str) -> Result<Vec<CloudStorageFile>, String> {
        let token = self.access_token().await?;
        let q = format!("'{folder_id}' in parents and trashed = false");
        let url = format!(
            "{}/drive/v3/files?q={}&fields=files(id,name,size,mimeType,createdTime,modifiedTime)",
            self.drive_api_base,
            urlencoding::encode(&q)
        );
        let client = reqwest::Client::new();
        let resp = client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| format!("Google Drive list failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Google Drive list failed ({status}): {body}"));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Google Drive list response: {e}"))?;
        let files = json
            .get("files")
            .and_then(|f| f.as_array())
            .cloned()
            .unwrap_or_default();
        Ok(files
            .iter()
            .map(|f| CloudStorageFile {
                id: f
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                name: f
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                size_bytes: f
                    .get("size")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0),
                mime_type: f
                    .get("mimeType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("application/octet-stream")
                    .to_string(),
                cloud_path: format!(
                    "google-drive://{}",
                    f.get("id").and_then(|v| v.as_str()).unwrap_or_default()
                ),
                created_at: f
                    .get("createdTime")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
                modified_at: f
                    .get("modifiedTime")
                    .and_then(|v| v.as_str())
                    .unwrap_or_default()
                    .to_string(),
            })
            .collect())
    }

    pub async fn upload(
        &self,
        filename: &str,
        content: Vec<u8>,
        parent_id: &str,
    ) -> Result<String, String> {
        let token = self.access_token().await?;
        let boundary = format!("prismnote-{}", uuid::Uuid::new_v4());
        let metadata = serde_json::json!({ "name": filename, "parents": [parent_id] });

        let mut body = Vec::new();
        body.extend_from_slice(
            format!(
                "--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Type: application/octet-stream\r\n\r\n"
            )
            .as_bytes(),
        );
        body.extend_from_slice(&content);
        body.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());

        let url = format!(
            "{}/upload/drive/v3/files?uploadType=multipart",
            self.upload_api_base
        );
        let client = reqwest::Client::new();
        let resp = client
            .post(&url)
            .bearer_auth(&token)
            .header(
                "Content-Type",
                format!("multipart/related; boundary={boundary}"),
            )
            .body(body)
            .send()
            .await
            .map_err(|e| format!("Google Drive upload failed: {e}"))?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!(
                "Google Drive upload of '{filename}' failed ({status}): {text}"
            ));
        }
        let json: Value = resp
            .json()
            .await
            .map_err(|e| format!("failed to parse Google Drive upload response: {e}"))?;
        let id = json.get("id").and_then(|v| v.as_str()).unwrap_or_default();
        Ok(format!("google-drive://{id}"))
    }
}

// ============================================================================
// Manager
// ============================================================================

pub struct CloudStorageManager {
    pub s3_clients: HashMap<String, S3Client>,
    pub gcs_clients: HashMap<String, GCSClient>,
    pub azure_clients: HashMap<String, AzureBlobClient>,
    pub gdrive_clients: HashMap<String, GoogleDriveClient>,
}

impl CloudStorageManager {
    pub fn new() -> Self {
        Self {
            s3_clients: HashMap::new(),
            gcs_clients: HashMap::new(),
            azure_clients: HashMap::new(),
            gdrive_clients: HashMap::new(),
        }
    }

    pub async fn add_storage(
        &mut self,
        name: &str,
        config: CloudStorageConfig,
    ) -> Result<(), String> {
        match config.credentials {
            CloudStorageCredentials::S3 {
                access_key_id,
                secret_access_key,
                bucket,
                region,
            } => {
                self.s3_clients.insert(
                    name.to_string(),
                    S3Client::new(access_key_id, secret_access_key, bucket, region),
                );
                Ok(())
            }
            CloudStorageCredentials::GCS {
                project_id,
                private_key,
                client_email,
                bucket,
            } => {
                self.gcs_clients.insert(
                    name.to_string(),
                    GCSClient::new(project_id, bucket, client_email, private_key),
                );
                Ok(())
            }
            CloudStorageCredentials::AzureBlob {
                connection_string,
                container,
                storage_account,
            } => {
                self.azure_clients.insert(
                    name.to_string(),
                    AzureBlobClient::new(connection_string, container, storage_account),
                );
                Ok(())
            }
            CloudStorageCredentials::GoogleDrive {
                client_id,
                client_secret,
                refresh_token,
            } => {
                self.gdrive_clients.insert(
                    name.to_string(),
                    GoogleDriveClient::new(client_id, client_secret, refresh_token),
                );
                Ok(())
            }
        }
    }

    pub fn remove_storage(&mut self, name: &str) -> Result<(), String> {
        self.s3_clients.remove(name);
        self.gcs_clients.remove(name);
        self.azure_clients.remove(name);
        self.gdrive_clients.remove(name);
        Ok(())
    }
}

impl Default for CloudStorageManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- S3 --------------------------------------------------------------

    fn test_s3(server_url: &str) -> S3Client {
        S3Client::new(
            "AKIDEXAMPLE".to_string(),
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY".to_string(),
            "my-bucket".to_string(),
            "us-east-1".to_string(),
        )
        .with_endpoint_override(server_url.to_string())
    }

    #[tokio::test]
    async fn s3_upload_sends_signed_put_with_body_and_content_type() {
        let mut server = mockito::Server::new_async().await;
        let client = test_s3(&server.url());

        let mock = server
            .mock("PUT", "/notes/n1.json")
            .match_header("content-type", "application/json")
            .match_header(
                "authorization",
                mockito::Matcher::Regex("AWS4-HMAC-SHA256.*".to_string()),
            )
            .match_body("hello")
            .with_status(200)
            .create_async()
            .await;

        let url = client
            .upload("notes/n1.json", b"hello".to_vec(), "application/json")
            .await
            .expect("upload should succeed");
        mock.assert_async().await;
        assert_eq!(url, "s3://my-bucket/notes/n1.json");
    }

    #[tokio::test]
    async fn s3_download_returns_body_bytes() {
        let mut server = mockito::Server::new_async().await;
        let client = test_s3(&server.url());

        server
            .mock("GET", "/notes/n1.json")
            .with_status(200)
            .with_body("file contents")
            .create_async()
            .await;

        let bytes = client.download("notes/n1.json").await.unwrap();
        assert_eq!(bytes, b"file contents");
    }

    #[tokio::test]
    async fn s3_download_404_is_a_clear_not_found_error() {
        let mut server = mockito::Server::new_async().await;
        let client = test_s3(&server.url());

        server
            .mock("GET", "/missing.json")
            .with_status(404)
            .create_async()
            .await;

        let err = client.download("missing.json").await.unwrap_err();
        assert!(err.contains("not found"));
    }

    #[tokio::test]
    async fn s3_list_parses_realistic_list_objects_v2_xml() {
        let mut server = mockito::Server::new_async().await;
        let client = test_s3(&server.url());

        server
            .mock(
                "GET",
                mockito::Matcher::Regex(r"^/\?list-type=2&prefix=notes".to_string()),
            )
            .with_status(200)
            .with_body(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Name>my-bucket</Name>
    <Contents>
        <Key>notes/a.json</Key>
        <LastModified>2026-01-01T00:00:00.000Z</LastModified>
        <Size>1234</Size>
    </Contents>
    <Contents>
        <Key>notes/b.json</Key>
        <LastModified>2026-01-02T00:00:00.000Z</LastModified>
        <Size>5678</Size>
    </Contents>
</ListBucketResult>"#,
            )
            .create_async()
            .await;

        let files = client.list("notes").await.unwrap();
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].name, "a.json");
        assert_eq!(files[0].size_bytes, 1234);
        assert_eq!(files[0].cloud_path, "s3://my-bucket/notes/a.json");
        assert_eq!(files[1].name, "b.json");
    }

    #[tokio::test]
    async fn s3_delete_succeeds_on_204() {
        let mut server = mockito::Server::new_async().await;
        let client = test_s3(&server.url());
        server
            .mock("DELETE", "/notes/a.json")
            .with_status(204)
            .create_async()
            .await;
        client
            .delete("notes/a.json")
            .await
            .expect("delete should succeed");
    }

    // ---- GCS ---------------------------------------------------------------

    const TEST_RSA_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----\n\
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1iC6DNEAPKfQL\n\
zbGdWkgs10yy8MPkYC5UdBN6uj9NobA7WM5zhDsTNlmeg8APq+U31O53jcXFkmMO\n\
LIracJhUyYQ0DqgqXsZRyIv8hg851CW8k4soeogxJEB6w8TT1bV0wgfMqqz5Rm/R\n\
Ho5PBMYoqBXxy6jcXz6Mp+ifIH6RHKz+pQKCriuAdrIEG3l1SHvFSWkyPMK0FOfN\n\
vBatq5RewBmzNwKnwmzOEygSOUCPd7FlpQbxB7Tk8tOEIInW55CqZmwAPJfmgpIA\n\
B3FP3UjUSRDJU2CkYJs2xMhkjVVngawLTug9uOyvRnKuQ4QG03cNdS0/dUlEpmXU\n\
NS4JVlFNAgMBAAECggEAN7sPTIiGAiHHIriLhttovRt8GJOCEGLW1masdEkplhPF\n\
nvKsrxoxaLyO1vNry2PigzmD3IBR7035yygxmM5odd9IDxNQ3XErQYBoOaaOlhpj\n\
W3mQh2TW2v9eLFJd4wsBIk9PRa5AXGcbfP/8gJXeoCy6T/lOZhl3gocqC3BWawX1\n\
8bKlqWKILevLF5r50zo4nImLp7o6MmUgId/pAoHjjVp4H5vQiWRW9W1pZ0J1/Ami\n\
ix8elSobVWXwV0WU7So9VVsZNcPcdy0wgDvdw9pJohYEL1aElxzVI8kxv3zWgSbS\n\
BvF9DY9xOU0s6sReVluGFkp+bum/QGfNQ5agoxttoQKBgQDpDwVmrsKzIG618tpa\n\
O0h+fOcwAj20nTp7yzR/9dhGr/aAbT7UGZPPPFqUv63qvyTtfxCECtZqUE9Q2UGB\n\
nndGfngmCHiZuuZrCEbdam8r6JKPt1SUOLxEoczALTj3S0jEd04d+7X/cBiST8M6\n\
tTy3KimS5+dIghsyQziAeBOAuwKBgQDHZrWadAgnpoVGOoDs9yy6UjrUGDRePYqw\n\
Ur0x6nrFf5UbiYHmoD0Qq58knjnwWVYkcC2UqGXO6bflpGIVUPr/KHbki2W1Jheg\n\
b2afGLszDh9EcAOiaWJtK9d9rBmPGLGWEsmr1cCTW386jh9EZexMO2/7vIcAu4hH\n\
eVKIzKd5lwKBgFO7m9sqirVEv8ILQLwOdJtNUNqE05qiqrJzbadTsqKi8dNubJZT\n\
ojFgo8Kxo1Cl4CSb9Fkcc7C6reSESe7B+mSPZ6dyf7Hr3oEx9hPy+4IxCwcrfO3L\n\
/IhEAYZCOSdQGxLLMnu/RcJCifF3StM67ld4hHtNamE4rYC/efteKNOlAoGBAISZ\n\
M3ijYmzjmkrKSsPJ1s+MMRyrf9+PczOvwap47+132vL17REtS45TYj/ajFLdRaBz\n\
jIwHs7P1zdmDB8p/EHovMWjnndnpm9qPWiHAM3RPFtHO30vYYqCQf/tNP63d0PIo\n\
Sj3fpfEX7jJFIlu8n3dOKziu9OOy0XweHJll5pS/AoGBAIjM464kw1RlQcnObHmu\n\
PkiY9HUqp5J61NKHVadhNPHD4dXSaW1d8SSp2TW/VHIezykczCJHucn27VIn5cyA\n\
BJ8COG+4TtpXlALdYnHCsGbscDZAdMLBHuXDbeib55TaF8ieaYy8/4IBma02VsL/\n\
K+8nfOZgYtilRoVQaaK5boUP\n\
-----END PRIVATE KEY-----\n";

    fn test_gcs(oauth_url: String, api_base: String) -> GCSClient {
        GCSClient::new(
            "my-project".to_string(),
            "my-bucket".to_string(),
            "svc@my-project.iam.gserviceaccount.com".to_string(),
            TEST_RSA_KEY_PEM.to_string(),
        )
        .with_base_urls(oauth_url, api_base)
    }

    #[tokio::test]
    async fn gcs_upload_exchanges_jwt_for_token_then_uploads() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gcs(format!("{}/token", server.url()), server.url());

        let oauth_mock = server
            .mock("POST", "/token")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"access_token": "ya29.fake", "expires_in": 3600}"#)
            .create_async()
            .await;

        let upload_mock = server
            .mock(
                "POST",
                "/upload/storage/v1/b/my-bucket/o?uploadType=media&name=notes%2Fa.json",
            )
            .match_header("authorization", "Bearer ya29.fake")
            .with_status(200)
            .with_body(r#"{"name": "notes/a.json"}"#)
            .create_async()
            .await;

        let url = client
            .upload("notes/a.json", b"data".to_vec(), "application/json")
            .await
            .expect("upload should succeed");
        oauth_mock.assert_async().await;
        upload_mock.assert_async().await;
        assert_eq!(url, "gs://my-bucket/notes/a.json");
    }

    #[tokio::test]
    async fn gcs_list_parses_items() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gcs(format!("{}/token", server.url()), server.url());

        server
            .mock("POST", "/token")
            .with_status(200)
            .with_body(r#"{"access_token": "ya29.fake"}"#)
            .create_async()
            .await;
        server
            .mock("GET", mockito::Matcher::Regex(r"^/storage/v1/b/my-bucket/o\?prefix=".to_string()))
            .with_status(200)
            .with_body(r#"{"items": [{"name": "notes/a.json", "size": "42", "contentType": "application/json"}]}"#)
            .create_async()
            .await;

        let files = client.list("notes").await.unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].size_bytes, 42);
        assert_eq!(files[0].cloud_path, "gs://my-bucket/notes/a.json");
    }

    #[tokio::test]
    async fn gcs_oauth_failure_surfaces_clear_error() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gcs(format!("{}/token", server.url()), server.url());
        server
            .mock("POST", "/token")
            .with_status(400)
            .with_body(r#"{"error": "invalid_grant"}"#)
            .create_async()
            .await;

        let err = client.download("x.json").await.unwrap_err();
        assert!(err.contains("token exchange failed"));
    }

    // ---- Azure Blob --------------------------------------------------------

    fn test_azure(server_url: &str) -> AzureBlobClient {
        AzureBlobClient::new(
            "AccountName=myaccount;AccountKey=dGVzdGtleWRhdGE=;EndpointSuffix=core.windows.net"
                .to_string(),
            "notebooks".to_string(),
            "myaccount".to_string(),
        )
        .with_endpoint_override(server_url.to_string())
    }

    #[test]
    fn parses_account_name_and_key_from_connection_string() {
        let (name, key) = parse_connection_string(
            "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net",
        )
        .unwrap();
        assert_eq!(name, "myaccount");
        assert_eq!(key, "dGVzdA==");
    }

    #[test]
    fn missing_account_key_is_a_clear_error() {
        let err = parse_connection_string("AccountName=myaccount").unwrap_err();
        assert!(err.contains("AccountKey"));
    }

    #[tokio::test]
    async fn azure_upload_sends_shared_key_signed_put() {
        let mut server = mockito::Server::new_async().await;
        let client = test_azure(&server.url());

        let mock = server
            .mock("PUT", "/notebooks/n1.json")
            .match_header("x-ms-blob-type", "BlockBlob")
            .match_header(
                "authorization",
                mockito::Matcher::Regex("SharedKey myaccount:.*".to_string()),
            )
            .match_body("hello")
            .with_status(201)
            .create_async()
            .await;

        let url = client
            .upload("n1.json", b"hello".to_vec(), "application/json")
            .await
            .expect("upload should succeed");
        mock.assert_async().await;
        assert_eq!(
            url,
            "https://myaccount.blob.core.windows.net/notebooks/n1.json"
        );
    }

    #[tokio::test]
    async fn azure_download_404_is_a_clear_not_found_error() {
        let mut server = mockito::Server::new_async().await;
        let client = test_azure(&server.url());
        server
            .mock("GET", "/notebooks/missing.json")
            .with_status(404)
            .create_async()
            .await;

        let err = client.download("missing.json").await.unwrap_err();
        assert!(err.contains("not found"));
    }

    #[tokio::test]
    async fn azure_list_parses_realistic_blob_list_xml() {
        let mut server = mockito::Server::new_async().await;
        let client = test_azure(&server.url());

        server
            .mock(
                "GET",
                mockito::Matcher::Regex(r"^/notebooks\?restype=container&comp=list".to_string()),
            )
            .with_status(200)
            .with_body(
                r#"<?xml version="1.0" encoding="utf-8"?>
<EnumerationResults>
    <Blobs>
        <Blob>
            <Name>notes/a.json</Name>
            <Properties>
                <Last-Modified>Wed, 01 Jan 2026 00:00:00 GMT</Last-Modified>
                <Content-Length>99</Content-Length>
                <Content-Type>application/json</Content-Type>
            </Properties>
        </Blob>
    </Blobs>
</EnumerationResults>"#,
            )
            .create_async()
            .await;

        let files = client.list("notes").await.unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].name, "a.json");
        assert_eq!(files[0].size_bytes, 99);
        assert_eq!(files[0].mime_type, "application/json");
    }

    // ---- Google Drive --------------------------------------------------------

    fn test_gdrive(oauth_url: String, api_base: String) -> GoogleDriveClient {
        GoogleDriveClient::new(
            "client-id".to_string(),
            "client-secret".to_string(),
            "refresh-token".to_string(),
        )
        .with_base_urls(oauth_url, api_base)
    }

    #[tokio::test]
    async fn gdrive_mount_verifies_credentials_via_about_endpoint() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gdrive(format!("{}/token", server.url()), server.url());

        server
            .mock("POST", "/token")
            .with_status(200)
            .with_body(r#"{"access_token": "ya29.fake"}"#)
            .create_async()
            .await;
        let about_mock = server
            .mock("GET", "/drive/v3/about?fields=user")
            .match_header("authorization", "Bearer ya29.fake")
            .with_status(200)
            .with_body(r#"{"user": {"displayName": "Test User"}}"#)
            .create_async()
            .await;

        client
            .mount("/mnt/drive")
            .await
            .expect("mount should succeed");
        about_mock.assert_async().await;
    }

    #[tokio::test]
    async fn gdrive_mount_fails_when_token_refresh_is_rejected() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gdrive(format!("{}/token", server.url()), server.url());
        server
            .mock("POST", "/token")
            .with_status(400)
            .with_body(r#"{"error": "invalid_grant"}"#)
            .create_async()
            .await;

        let err = client.mount("/mnt/drive").await.unwrap_err();
        assert!(err.contains("OAuth refresh failed"));
    }

    #[tokio::test]
    async fn gdrive_unmount_is_a_documented_noop() {
        // No token exchange should happen at all -- there's nothing to release.
        let client = test_gdrive("http://unused".to_string(), "http://unused".to_string());
        assert!(client.unmount("/mnt/drive").await.is_ok());
    }

    #[tokio::test]
    async fn gdrive_upload_sends_multipart_with_metadata_and_content() {
        let mut server = mockito::Server::new_async().await;
        let client = test_gdrive(format!("{}/token", server.url()), server.url());

        server
            .mock("POST", "/token")
            .with_status(200)
            .with_body(r#"{"access_token": "ya29.fake"}"#)
            .create_async()
            .await;
        let upload_mock = server
            .mock("POST", "/upload/drive/v3/files?uploadType=multipart")
            .match_header("authorization", "Bearer ya29.fake")
            .match_body(mockito::Matcher::AllOf(vec![
                mockito::Matcher::Regex("\"name\":\"n1.json\"".to_string()),
                mockito::Matcher::Regex("\"parents\":\\[\"folder-1\"\\]".to_string()),
            ]))
            .with_status(200)
            .with_body(r#"{"id": "drive-file-1"}"#)
            .create_async()
            .await;

        let url = client
            .upload("n1.json", b"{}".to_vec(), "folder-1")
            .await
            .expect("upload should succeed");
        upload_mock.assert_async().await;
        assert_eq!(url, "google-drive://drive-file-1");
    }
}
