# SQL Injection Security Audit — PrismNote

**Date:** 2026-07-07  
**Severity:** CRITICAL  
**Status:** AUDIT COMPLETE — REMEDIATION REQUIRED

---

## Executive Summary

PrismNote accepts SQL queries from untrusted user input (notebook cells + API endpoints) and passes them directly to database backends without parameterized query support or input validation. This creates SQL injection vulnerabilities across **8 database backends**.

**Current State:** ⚠️ VULNERABLE  
**Impact:** Attackers can execute arbitrary SQL, exfiltrate data, modify/delete records, or escalate privileges.  
**Risk Level:** CRITICAL (OWASP A03:2021 — Injection)

---

## 🎯 Audit Findings

### ❌ Finding 1: DuckDB Query Execution (api.rs, lines 328-340)

**File:** `crates/server/src/api.rs`  
**Vulnerability:** Direct query string concatenation  
**Risk:** SQL Injection

```rust
// VULNERABLE CODE:
let q = serde_json::to_string(&body).unwrap_or_else(|_| "\"\"".to_string());
let py = format!(
    "try:\n    import duckdb as _ddb\nexcept ImportError:\n    raise ImportError('%sql needs DuckDB')\n_ddb.sql({}).df()",
    q
);
match k.execute(&py).await { ... }
```

**Attack Example:**
```sql
%sql SELECT * FROM table WHERE id = 1 OR 1=1;
-- Attacker bypasses WHERE clause via direct concatenation
```

**Remediation Required:**
- ✅ Use DuckDB's parameterized query API (`rel.execute()` with placeholders)
- ✅ Validate query structure before execution
- ✅ Implement query parser to extract only SELECT/WITH statements

---

### ❌ Finding 2: PostgreSQL Query Execution (db.rs, lines 104-112)

**File:** `crates/server/src/db.rs`  
**Vulnerability:** Placeholder stubs — vulnerabilities will exist when implemented  
**Risk:** SQL Injection (when feature added)

```rust
async fn query_postgresql(
    _conn: &DatabaseConnection,
    _query: &str,  // User input — NOT parameterized
) -> Result<(Vec<String>, Vec<Vec<Value>>, usize)> {
    Err(anyhow!("PostgreSQL connector requires: cargo add sqlx"))
}
```

**Required Before Implementation:**
- ✅ Use `sqlx` with prepared statements (`.query_as()`, `.execute()`)
- ✅ NEVER concatenate user input into query strings
- ✅ Validate connection strings to prevent injection via URL

---

### ❌ Finding 3: MySQL Query Execution (db.rs, lines 124-132)

**File:** `crates/server/src/db.rs`  
**Vulnerability:** Placeholder stubs — vulnerabilities will exist when implemented  
**Risk:** SQL Injection (when feature added)

```rust
async fn query_mysql(
    _conn: &DatabaseConnection,
    _query: &str,  // User input — NOT parameterized
) -> Result<...> { ... }
```

**Required Before Implementation:**
- ✅ Use `mysql_async` with prepared statements
- ✅ Parameterize all queries
- ✅ Escape connection string credentials properly

---

### ❌ Finding 4: SQLite Query Execution (db.rs, lines 140-148)

**File:** `crates/server/src/db.rs`  
**Vulnerability:** Placeholder stubs — vulnerabilities will exist when implemented  
**Risk:** SQL Injection (when feature added)

```rust
async fn query_sqlite(
    _conn: &DatabaseConnection,
    _query: &str,  // User input — NOT parameterized
) -> Result<...> { ... }
```

**Required Before Implementation:**
- ✅ Use `rusqlite` with prepared statements (`.prepare()`, `.execute_named()`)
- ✅ Never use `.query_row(query_str)` directly
- ✅ Validate database file path to prevent traversal attacks

---

### ❌ Finding 5: DuckDB Query Execution (db.rs, lines 150+)

**File:** `crates/server/src/db.rs`  
**Vulnerability:** Placeholder stubs — vulnerabilities will exist when implemented  
**Risk:** SQL Injection (when feature added)

```rust
async fn query_duckdb(
    _conn: &DatabaseConnection,
    _query: &str,  // User input — NOT parameterized
) -> Result<...> { ... }
```

**Required Before Implementation:**
- ✅ Use DuckDB Rust binding with parameterized queries
- ✅ Validate Parquet/CSV file paths to prevent path traversal
- ✅ Implement query allowlist for external data access

---

### ❌ Finding 6: MongoDB Query Execution (db.rs, lines 150+)

**File:** `crates/server/src/db.rs`  
**Vulnerability:** Placeholder stubs  
**Risk:** NoSQL Injection (when feature added)

```rust
async fn query_mongodb(
    _conn: &DatabaseConnection,
    _query: &str,  // BSON/JSON input — must be parsed safely
) -> Result<...> { ... }
```

**Required Before Implementation:**
- ✅ Parse JSON/BSON safely (use `serde_json`, not string concatenation)
- ✅ Use `mongodb` driver's filter builders (not raw query strings)
- ✅ Validate aggregation pipeline syntax

---

### ❌ Finding 7: Cloud Warehouse Queries (cloud_warehouse.rs, lines 213-300+)

**File:** `crates/server/src/cloud_warehouse.rs`  
**Backends:** Snowflake, BigQuery, Redshift, Azure Synapse, Databricks, Athena, Presto, Trino  
**Vulnerability:** Placeholder stubs — all accept user queries directly  
**Risk:** SQL Injection (when features implemented)

**Examples:**
```rust
async fn execute_snowflake(&self, _conn: &CloudWarehouseConnection, _query: &str) -> Result<...> { ... }
async fn execute_bigquery(&self, _conn: &CloudWarehouseConnection, _query: &str) -> Result<...> { ... }
// 6 more backends...
```

**Required For Each Backend:**
- ✅ Use official SDK with parameterized queries
  - Snowflake: `.execute_string()` with params
  - BigQuery: `QueryJobConfig.query_parameters`
  - Redshift: `psycopg2` prepared statements
  - Azure Synapse: `pyodbc` parameterized queries
  - Databricks: `sql.Parameter()` bindings
  - Athena: `boto3` with `ExecutionParameters`
  - Presto/Trino: `.execute()` with parameters
- ✅ Validate warehouse credentials before use
- ✅ Implement query allowlist for sensitive databases
- ✅ Log all executed queries for audit trail

---

## 📊 Vulnerability Summary

| Backend | Location | Current Status | Vulnerability |
|---------|----------|-----------------|----------------|
| **DuckDB** | `api.rs:328-340` | **ACTIVE** | Direct concatenation ❌ |
| **PostgreSQL** | `db.rs:104-112` | Stubbed | Will be vulnerable ⚠️ |
| **MySQL** | `db.rs:124-132` | Stubbed | Will be vulnerable ⚠️ |
| **SQLite** | `db.rs:140-148` | Stubbed | Will be vulnerable ⚠️ |
| **DuckDB (db.rs)** | `db.rs:150+` | Stubbed | Will be vulnerable ⚠️ |
| **MongoDB** | `db.rs:150+` | Stubbed | Will be vulnerable (NoSQL) ⚠️ |
| **Snowflake** | `cloud_warehouse.rs:213-227` | Stubbed | Will be vulnerable ⚠️ |
| **BigQuery** | `cloud_warehouse.rs:229-243` | Stubbed | Will be vulnerable ⚠️ |
| **Redshift** | `cloud_warehouse.rs:245-259` | Stubbed | Will be vulnerable ⚠️ |
| **Azure Synapse** | `cloud_warehouse.rs:261-275` | Stubbed | Will be vulnerable ⚠️ |
| **Databricks** | `cloud_warehouse.rs:277-291` | Stubbed | Will be vulnerable ⚠️ |
| **Athena** | `cloud_warehouse.rs:293+` | Stubbed | Will be vulnerable ⚠️ |
| **Presto** | `cloud_warehouse.rs:180+` | Stubbed | Will be vulnerable ⚠️ |
| **Trino** | `cloud_warehouse.rs:186+` | Stubbed | Will be vulnerable ⚠️ |

---

## 🛡️ Remediation Strategy

### Phase 1: IMMEDIATE (This PR)

#### 1.1 Add Query Validation Layer
- Create `query_validator.rs` with:
  - Allowed keywords allowlist (SELECT, WITH, INSERT, UPDATE, DELETE, etc.)
  - Disallowed keywords blocklist (EXEC, EXECUTE, xp_, sp_, CREATE USER, DROP, ALTER, etc.)
  - Simple regex validation for obvious injection patterns
  - Comment stripping (-- and /* */)

#### 1.2 Add Query Sanitization
- Create `query_sanitizer.rs`:
  - Escape single quotes in string literals
  - Validate table/column names against pattern
  - Limit query length (MAX 100KB)
  - Detect common injection attempts

#### 1.3 Add Input Validation to API
- Add to `api.rs` execute_cell:
  - Validate DuckDB query before Python execution
  - Limit query timeout to 30 seconds
  - Add rate limiting (5 queries/second per session)

#### 1.4 Add Security Headers
- Add to `main.rs`:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block

### Phase 2: SHORT-TERM (1 week)

- Implement parameterized queries for PostgreSQL backend
- Implement parameterized queries for MySQL backend
- Add comprehensive logging of all SQL queries
- Add SQL query audit trail to database

### Phase 3: MEDIUM-TERM (2-4 weeks)

- Complete parameterized queries for all 8 backends
- Add query allowlist configuration for enterprise deployments
- Implement query execution policies (max timeout, max rows, etc.)
- Add query explain plan analysis before execution

### Phase 4: LONG-TERM

- Implement automatic SQL query plan analysis
- Add AI-powered injection detection
- Create security dashboard showing query patterns
- Implement rate limiting per database connection

---

## 🔑 Key Security Principles

✅ **ALWAYS use parameterized queries** — no string concatenation  
✅ **Never trust user input** — validate, escape, parameterize  
✅ **Validate before execution** — check query structure/keywords  
✅ **Log all queries** — audit trail for security investigations  
✅ **Implement timeouts** — prevent resource exhaustion  
✅ **Use least privilege** — database users with minimal permissions  
✅ **Encrypt in transit** — TLS for all database connections  

---

## 📋 Testing Checklist

Before considering any SQL backend "production ready":

- [ ] Parameterized queries for ALL user input
- [ ] Query validation against allowlist
- [ ] Rate limiting per connection
- [ ] Query timeout enforcement
- [ ] Execution logging with sensitive data masking
- [ ] Unit tests with injection attack payloads
- [ ] Integration tests with all 8 backends
- [ ] Security code review (2 reviewers minimum)
- [ ] Penetration testing with common SQL injection vectors

---

## 🚨 Immediate Actions Required

**BEFORE ANY PRODUCTION USE:**

1. ✅ Implement `query_validator.rs` — blocks obvious injection patterns
2. ✅ Add validation to `api.rs` execute_cell() for DuckDB queries
3. ✅ Add SQL_INJECTION_AUDIT.md to SECURITY.md as known limitation
4. ✅ Set version warning in docs: "SQL backend support beta — not for production data"
5. ✅ Implement query allowlist for sensitive environments

---

## References

- [OWASP A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- [SQLi Detection & Evasion Techniques](https://portswigger.net/research/sql-injection)

---

**Report Generated:** 2026-07-07  
**Auditor:** Claude Code Security Review  
**Recommended Status:** ⚠️ NOT PRODUCTION READY — SQL features must be hardened
