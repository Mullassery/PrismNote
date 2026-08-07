//! Snowflake connector using the SQL API v2 (docs.snowflake.com/en/developer-guide/sql-api/index)
//! with key-pair JWT authentication — the modern, non-deprecated auth method
//! (username/password auth to the SQL API is deprecated by Snowflake).
//! The public-key fingerprint computation is cross-checked in tests against
//! an independently-computed value from Python's `cryptography` library.

use super::{CloudQueryResult, CloudWarehouseConnection};
use anyhow::{anyhow, Context, Result};
use jsonwebtoken::{encode, EncodingKey, Header};
use rsa::pkcs8::{DecodePrivateKey, EncodePublicKey};
use rsa::RsaPrivateKey;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    iss: String,
    sub: String,
    iat: i64,
    exp: i64,
}

fn private_key_pem(conn: &CloudWarehouseConnection) -> Result<&str> {
    conn.credentials
        .get("private_key_pem")
        .map(String::as_str)
        .ok_or_else(|| anyhow!("Snowflake connection is missing credentials.private_key_pem (PKCS8 PEM)"))
}

/// Snowflake's documented fingerprint: base64(SHA256(DER-encoded
/// SubjectPublicKeyInfo of the public key)), prefixed "SHA256:".
fn public_key_fingerprint(private_key_pem: &str) -> Result<String> {
    let private_key =
        RsaPrivateKey::from_pkcs8_pem(private_key_pem).context("failed to parse private_key_pem as PKCS8 PEM")?;
    let public_key = private_key.to_public_key();
    let der = public_key.to_public_key_der().context("failed to DER-encode public key")?;
    let mut hasher = Sha256::new();
    hasher.update(der.as_bytes());
    let digest = hasher.finalize();
    Ok(format!("SHA256:{}", base64::engine::general_purpose::STANDARD.encode(digest)))
}

fn build_jwt(conn: &CloudWarehouseConnection) -> Result<String> {
    let account = conn.account_id.as_deref().ok_or_else(|| anyhow!("Snowflake connection is missing account_id"))?;
    let user = if conn.username.is_empty() {
        return Err(anyhow!("Snowflake connection is missing username"));
    } else {
        conn.username.to_uppercase()
    };
    let account_upper = account.to_uppercase();
    let pem = private_key_pem(conn)?;
    let fingerprint = public_key_fingerprint(pem)?;

    let now = chrono::Utc::now().timestamp();
    let claims = Claims {
        iss: format!("{account_upper}.{user}.{fingerprint}"),
        sub: format!("{account_upper}.{user}"),
        iat: now,
        exp: now + 3600, // Snowflake JWTs are valid up to 1 hour
    };

    let encoding_key =
        EncodingKey::from_rsa_pem(pem.as_bytes()).context("failed to load private key for JWT signing")?;
    encode(&Header::new(jsonwebtoken::Algorithm::RS256), &claims, &encoding_key)
        .context("failed to sign Snowflake JWT")
}

fn base_url(conn: &CloudWarehouseConnection) -> Result<String> {
    if let Some(host) = &conn.host {
        if host.starts_with("http://") || host.starts_with("https://") {
            return Ok(host.clone());
        }
    }
    let account = conn.account_id.as_deref().ok_or_else(|| anyhow!("Snowflake connection is missing account_id"))?;
    Ok(format!("https://{account}.snowflakecomputing.com"))
}

pub async fn test_connection(conn: &CloudWarehouseConnection) -> Result<String> {
    execute_query(conn, "SELECT 1").await.map(|_| "Snowflake connection OK".to_string())
}

pub async fn execute_query(conn: &CloudWarehouseConnection, query: &str) -> Result<CloudQueryResult> {
    let client = reqwest::Client::new();
    let jwt = build_jwt(conn)?;
    let started = std::time::Instant::now();

    let mut body = json!({ "statement": query, "timeout": conn.timeout_seconds });
    if !conn.database.is_empty() {
        body["database"] = json!(conn.database);
    }
    if let Some(warehouse) = &conn.warehouse_id {
        body["warehouse"] = json!(warehouse);
    }

    let url = format!("{}/api/v2/statements", base_url(conn)?);
    let response = client
        .post(&url)
        .bearer_auth(&jwt)
        .header("X-Snowflake-Authorization-Token-Type", "KEYPAIR_JWT")
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .context("Snowflake query request failed")?;

    let status = response.status();
    let text = response.text().await.context("failed to read Snowflake response body")?;
    if !status.is_success() {
        return Err(anyhow!("Snowflake API returned {status}: {text}"));
    }
    let parsed: Value = serde_json::from_str(&text).context("failed to parse Snowflake response as JSON")?;

    if let Some(message) = parsed.get("message").and_then(|m| m.as_str()) {
        if parsed.get("code").is_some() && parsed.get("data").is_none() {
            return Err(anyhow!("Snowflake error: {message}"));
        }
    }

    let columns: Vec<String> = parsed["resultSetMetaData"]["rowType"]
        .as_array()
        .map(|cols| cols.iter().filter_map(|c| c["name"].as_str().map(String::from)).collect())
        .unwrap_or_default();

    let rows: Vec<Vec<Value>> =
        parsed["data"].as_array().map(|rows| rows.iter().map(|r| r.as_array().cloned().unwrap_or_default()).collect()).unwrap_or_default();

    Ok(CloudQueryResult {
        row_count: rows.len(),
        columns,
        rows,
        execution_time_ms: started.elapsed().as_millis() as u64,
        // Snowflake's SQL API v2 doesn't return bytes-scanned in the statement
        // response body itself (it's available via a separate history query);
        // not fabricating a number here.
        estimated_bytes_scanned: 0,
        estimated_cost_usd: 0.0,
    })
}

use base64::Engine;

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // Test-only PKCS8 key generated for this test suite (not used anywhere
    // real). Its fingerprint below was computed independently using Python's
    // `cryptography` library, following Snowflake's documented algorithm
    // (SHA256 of the DER SubjectPublicKeyInfo, base64, "SHA256:" prefix).
    const TEST_PRIVATE_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----\n\
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

    const EXPECTED_FINGERPRINT: &str = "SHA256:BEw/bomMy81CvYlt1N/DTd85lRe6WLReQwmF4uu3b7g=";

    fn test_conn() -> CloudWarehouseConnection {
        let mut credentials = HashMap::new();
        credentials.insert("private_key_pem".to_string(), TEST_PRIVATE_KEY_PEM.to_string());
        CloudWarehouseConnection {
            id: "test".to_string(),
            warehouse_type: super::super::CloudWarehouseType::Snowflake,
            name: "test snowflake".to_string(),
            host: None,
            port: None,
            database: "MYDB".to_string(),
            username: "myuser".to_string(),
            password: String::new(),
            credentials,
            region: None,
            project_id: None,
            account_id: Some("myaccount".to_string()),
            warehouse_id: Some("mywh".to_string()),
            timeout_seconds: 30,
            created_at: chrono::Local::now().to_rfc3339(),
        }
    }

    #[test]
    fn fingerprint_matches_independent_python_cryptography_computation() {
        let fingerprint = public_key_fingerprint(TEST_PRIVATE_KEY_PEM).unwrap();
        assert_eq!(fingerprint, EXPECTED_FINGERPRINT);
    }

    #[test]
    fn jwt_has_correct_claims_and_verifies_with_the_matching_public_key() {
        let conn = test_conn();
        let jwt = build_jwt(&conn).unwrap();

        // Decode without verification first to check claim shape.
        let parts: Vec<&str> = jwt.split('.').collect();
        assert_eq!(parts.len(), 3, "JWT should have header.payload.signature");

        use base64::Engine;
        let payload_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(parts[1]).unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&payload_bytes).unwrap();

        assert_eq!(payload["iss"], format!("MYACCOUNT.MYUSER.{EXPECTED_FINGERPRINT}"));
        assert_eq!(payload["sub"], "MYACCOUNT.MYUSER");
        assert!(payload["exp"].as_i64().unwrap() > payload["iat"].as_i64().unwrap());

        // Now actually verify the signature with jsonwebtoken using the
        // corresponding public key derived from the same private key —
        // proves the JWT is genuinely correctly RS256-signed, not just
        // shaped correctly.
        let private_key = RsaPrivateKey::from_pkcs8_pem(TEST_PRIVATE_KEY_PEM).unwrap();
        let public_key = private_key.to_public_key();
        let public_pem =
            rsa::pkcs8::EncodePublicKey::to_public_key_pem(&public_key, rsa::pkcs8::LineEnding::LF).unwrap();

        let decoding_key = jsonwebtoken::DecodingKey::from_rsa_pem(public_pem.as_bytes()).unwrap();
        let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::RS256);
        validation.validate_exp = false; // token's exp is real, but we don't need the clock check for this test
        let decoded = jsonwebtoken::decode::<Claims>(&jwt, &decoding_key, &validation);
        assert!(decoded.is_ok(), "JWT signature failed to verify against its own public key: {decoded:?}");
    }

    #[test]
    fn missing_private_key_is_a_clear_error() {
        let mut conn = test_conn();
        conn.credentials.remove("private_key_pem");
        assert!(build_jwt(&conn).unwrap_err().to_string().contains("private_key_pem"));
    }

    #[tokio::test]
    async fn execute_query_parses_a_realistic_sql_api_v2_response() {
        let mut server = mockito::Server::new_async().await;
        let mut conn = test_conn();
        conn.host = Some(server.url());

        let mock = server
            .mock("POST", "/api/v2/statements")
            .match_header("x-snowflake-authorization-token-type", "KEYPAIR_JWT")
            .with_status(200)
            .with_body(
                r#"{
                    "resultSetMetaData": {"rowType": [{"name": "ID"}, {"name": "NAME"}]},
                    "data": [["1", "alice"], ["2", "bob"]]
                }"#,
            )
            .create_async()
            .await;

        let result = execute_query(&conn, "SELECT * FROM t").await.unwrap();
        mock.assert_async().await;

        assert_eq!(result.columns, vec!["ID".to_string(), "NAME".to_string()]);
        assert_eq!(result.row_count, 2);
    }
}
