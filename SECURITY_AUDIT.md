# PrismNote Security Audit

**Last Audited:** July 2026  
**Status:** Web app security gaps; multiple critical issues for production

---

## 🔴 CRITICAL Issues

### 1. No CORS/CSRF Protection
**Location:** Rust backend + React frontend  
**Risk:** Cross-site request forgery, cross-origin attacks  
**Severity:** CRITICAL (if exposed to internet)  
**Status:** Not production-ready for web exposure

**Recommended:**
```rust
// Add CORS middleware
use axum_cors::CorsLayer;
use http::{Method, HeaderMap};

let cors = CorsLayer::permissive()  // THIS IS WRONG
    .allow_methods([Method::GET, Method::POST])
    .allow_origins([..]); // Restrict origins!
```

**Fix:**
```rust
let cors = CorsLayer::very_restrictive()
    .allow_origin("http://localhost:3000".parse()?)
    .allow_methods([Method::GET, Method::POST]);

app.layer(cors)
```

**Plus CSRF tokens:**
```python
# On state-changing operations
@app.post("/api/save")
def save_notebook(csrf_token: str, data: dict):
    if not verify_csrf_token(csrf_token):
        raise HTTPException(401, "Invalid CSRF token")
    # Process save
```

**Timeline:** v1.2.0 (Q3 2026) — MANDATORY before production

---

### 2. No Authentication/Authorization
**Risk:** Anyone with access to http://localhost:8000 can see all notebooks  
**Severity:** CRITICAL (if on shared machine or network)  

**Recommended:**
```python
from fastapi.security import HTTPBearer
import jwt

security = HTTPBearer()

async def verify_user(credentials: HTTPAuthCredentials) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]
    except:
        raise HTTPException(401, "Invalid token")

@app.post("/api/notebooks")
async def list_notebooks(user: str = Depends(verify_user)):
    return notebooks_for_user(user)
```

**Timeline:** v1.2.0 (Q3 2026)

---

## 🟡 HIGH Priority Issues

### 3. No Dependency Version Pinning
**Severity:** HIGH  
**Finding:** 0 pinned, 21 floating versions  
**Critical Deps:** `uvicorn`, database connectors, crypto libs

**Action:**
```toml
uvicorn = "0.23.2"
sqlalchemy = "2.0.23"
pydantic = "2.4.2"
```

**Timeline:** v1.0.1 (Q3 2026)

---

### 4. SQL Injection via DuckDB Queries
**Risk:** User-provided SQL in notebooks  
**Severity:** HIGH  

**Current:** Probably using `.execute(user_sql)` directly  
**Vulnerability:** SELECT with DROP/DELETE/ALTER

**Recommended:**
```python
# Restrict what users can do
ALLOWED_KEYWORDS = ["SELECT", "WITH"]
FORBIDDEN_KEYWORDS = ["DROP", "DELETE", "INSERT", "ALTER", "CREATE"]

def validate_sql(sql: str):
    sql_upper = sql.strip().upper()
    if any(kw in sql_upper for kw in FORBIDDEN_KEYWORDS):
        raise ValueError("SQL not allowed")
    if not any(sql_upper.startswith(kw) for kw in ALLOWED_KEYWORDS):
        raise ValueError("Only SELECT queries allowed")
    return sql
```

**Timeline:** v1.1.0 (Q3 2026)

---

### 5. No Input Validation
**Risk:** Malformed notebooks, code injection  
**Severity:** HIGH  

**Timeline:** v1.1.0 (Q3 2026)

---

### 6. Code Execution (Jupyter Kernel)
**Risk:** User Python code runs with app privileges  
**Severity:** MEDIUM (by design) but needs sandboxing  

**Mitigation:**
- Run kernel in separate process with limited permissions
- Use seccomp/AppArmor to restrict system calls
- Document risks in README

**Timeline:** Document in v1.0.1; implement sandboxing v2.0.0

---

## 🔵 MEDIUM Priority

### 7. File System Access Control
**Risk:** Users can read any file accessible to the app  
**Severity:** MEDIUM  

**Recommendation:**
```python
# Restrict to specific directories
ALLOWED_BASE_DIR = Path.home() / "prismnote_data"
ALLOWED_BASE_DIR.mkdir(exist_ok=True, mode=0o700)

def validate_file_path(user_path: str) -> Path:
    base = ALLOWED_BASE_DIR.resolve()
    path = (base / user_path).resolve()
    if not str(path).startswith(str(base)):
        raise ValueError("Access denied")
    return path
```

**Timeline:** v1.1.0 (Q3 2026)

---

### 8. No Secrets Scanning in CI
**Timeline:** v1.0.2 (Q3 2026)

---

### 9. Information Disclosure in Errors
**Risk:** Stack traces leak file paths, database schema  
**Severity:** MEDIUM  

**Timeline:** v1.1.0 (Q3 2026)

---

## 🔵 LOW Priority

### 10. No Rate Limiting
**Risk:** DoS via repeated API calls  
**Severity:** LOW (localhost by default)  
**Timeline:** v1.3.0 (Q4 2026)

---

## Security Roadmap

| Issue | Severity | Target | BLOCKING |
|-------|----------|--------|----------|
| CORS/CSRF protection | CRITICAL | v1.2.0 | YES |
| Authentication | CRITICAL | v1.2.0 | YES |
| Pin dependencies | HIGH | v1.0.1 | NO |
| SQL injection protection | HIGH | v1.1.0 | YES |
| Input validation | HIGH | v1.1.0 | NO |
| File access control | MEDIUM | v1.1.0 | NO |
| Error handling | MEDIUM | v1.1.0 | NO |
| Code execution sandboxing | MEDIUM | v2.0.0 | NO |
| Rate limiting | LOW | v1.3.0 | NO |

---

## 🚨 Production Deployment Warning

**DO NOT expose this to the internet until v1.2.0.**

- No CORS/CSRF protection
- No authentication
- Arbitrary SQL execution possible
- Full file system access

---

## Testing

```bash
pip-audit --strict
bandit -r . -ll

# Security testing
python -m pytest tests/security/test_auth.py
python -m pytest tests/security/test_sql_injection.py
python -m pytest tests/security/test_path_traversal.py
```

---

## Deployment Checklist

Before production:
- [ ] CORS/CSRF protection implemented
- [ ] Authentication enabled
- [ ] All dependencies pinned
- [ ] SQL queries validated
- [ ] File paths restricted
- [ ] Error messages don't leak info
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] HTTPS only (no HTTP)
