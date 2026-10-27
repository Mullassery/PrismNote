# Security Vulnerability Audit - prismnote

**Audit Date:** 2026-10-27
**Repository:** /Users/georgimullassery/Desktop/Projects/prismnote
**Total Findings:** 31

## Summary
- **Critical:** 29
- **High:** 2

## Findings

### 1. [Critical] Command Injection
- **File:** crates/server/src/api.rs:458
- **Description:** exec()
- **Evidence (Line):** `pub async fn terminal_exec(Json(req): Json<TerminalRequest>) -> Json<serde_json::Value> {`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 2. [Critical] Command Injection
- **File:** crates/server/src/cell_executor.rs:63
- **Description:** eval()
- **Evidence (Line):** `"eval(",`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 3. [Critical] Command Injection
- **File:** crates/server/src/cell_executor.rs:62
- **Description:** exec()
- **Evidence (Line):** `"exec(",`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 4. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1292
- **Description:** Private Key (PKCS8) detected
- **Evidence (Line):** `const TEST_RSA_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----\n\`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 5. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1340
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.with_body(r#"{"access_token": "ya29.fake", "expires_in": 3600}"#)`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 6. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1349
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.match_header("authorization", "Bearer ya29.fake")`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 7. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1372
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.with_body(r#"{"access_token": "ya29.fake"}"#)`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 8. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1528
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.with_body(r#"{"access_token": "ya29.fake"}"#)`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 9. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1533
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.match_header("authorization", "Bearer ya29.fake")`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 10. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1576
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.with_body(r#"{"access_token": "ya29.fake"}"#)`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 11. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_storage.rs:1581
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.match_header("authorization", "Bearer ya29.fake")`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 12. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/bigquery.rs:228
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `credentials.insert("access_token".to_string(), "ya29.test-token".to_string());`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 13. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/bigquery.rs:265
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.match_header("authorization", "Bearer ya29.test-token")`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 14. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/bigquery.rs:334
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `.match_header("authorization", "Bearer ya29.test-token")`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 15. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/databricks.rs:210
- **Description:** Password Assignment detected
- **Evidence (Line):** `conn.password = "dapi-from-password-field".to_string();`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 16. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/mod.rs:539
- **Description:** Google OAuth Token detected
- **Evidence (Line):** `credentials.insert("access_token".to_string(), "ya29.test".to_string());`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 17. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/redshift.rs:201
- **Description:** Password Assignment detected
- **Evidence (Line):** `password: "p@ss/word".to_string(), // deliberately contains chars that need URL-encoding`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 18. [Critical] Hardcoded Secret
- **File:** crates/server/src/cloud_warehouse/snowflake.rs:188
- **Description:** Private Key (PKCS8) detected
- **Evidence (Line):** `const TEST_PRIVATE_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----\n\`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 19. [Critical] Hardcoded Secret
- **File:** crates/server/src/db/executor.rs:770
- **Description:** Password Assignment detected
- **Evidence (Line):** `password: "testpass",`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 20. [Critical] Hardcoded Secret
- **File:** crates/server/src/db/executor.rs:824
- **Description:** Password Assignment detected
- **Evidence (Line):** `password: "testpass",`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 21. [Critical] Command Injection
- **File:** crates/server/src/kernel.rs:172
- **Description:** eval()
- **Evidence (Line):** `val = eval(compile(last, "<cell>", "eval"), _ns)`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 22. [Critical] Command Injection
- **File:** crates/server/src/kernel.rs:170
- **Description:** exec()
- **Evidence (Line):** `exec(compile(tree, "<cell>", "exec"), _ns)`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 23. [Critical] Hardcoded Secret
- **File:** docs/archive/DATABASE_CONNECTORS.md:101
- **Description:** Password Assignment detected
- **Evidence (Line):** `password="password",`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 24. [Critical] Command Injection
- **File:** frontend/src/__tests__/aiIntegration.test.ts:239
- **Description:** os.system()
- **Evidence (Line):** `code: "os.system('rm -rf /')",`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 25. [Critical] Command Injection
- **File:** frontend/src/components/AgentPanel.tsx:74
- **Description:** exec()
- **Evidence (Line):** `while ((m = re.exec(text))) {`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 26. [Critical] Command Injection
- **File:** frontend/src/lib/pyerror.ts:35
- **Description:** exec()
- **Evidence (Line):** `while ((fm = frameRe.exec(tb))) line = parseInt(fm[1], 10)`
- **Exploit Scenario:** Attacker could execute arbitrary system commands
- **Fix Recommendation:** Avoid shell execution, use subprocess with shell=False and list args
- **Confidence:** High

### 27. [Critical] Hardcoded Secret
- **File:** frontend/tests/ai-security.spec.ts:24
- **Description:** API Key Assignment detected
- **Evidence (Line):** `api_key = "sk-1234567890abcdef"`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 28. [Critical] Hardcoded Secret
- **File:** frontend/tests/ai-security.spec.ts:25
- **Description:** Password Assignment detected
- **Evidence (Line):** `password = "my_secret_password"`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 29. [Critical] Hardcoded Secret
- **File:** frontend/tests/ai-security.spec.ts:251
- **Description:** Password Assignment detected
- **Evidence (Line):** `input: "password='secret123'",`
- **Exploit Scenario:** Attacker could extract credentials and gain unauthorized access
- **Fix Recommendation:** Move secrets to environment variables or secret manager, rotate compromised credentials
- **Confidence:** High

### 30. [High] .env File with Secrets
- **File:** .env.example:1
- **Description:** .env.example contains potential secrets
- **Evidence (Line):** `# All variables below are optional — the app runs with none of them set,`
- **Exploit Scenario:** Secrets in committed .env files exposed in git history
- **Fix Recommendation:** Add .env to .gitignore, remove from git history, rotate secrets
- **Confidence:** High

### 31. [High] SQL Injection
- **File:** crates/server/src/kernel.rs:362
- **Description:** SQL f-string interpolation
- **Evidence (Line):** `con.execute(f"INSTALL {ext}; LOAD {ext};")`
- **Exploit Scenario:** Attacker could manipulate SQL queries to access/modify/delete data
- **Fix Recommendation:** Use parameterized queries/prepared statements
- **Confidence:** Medium
