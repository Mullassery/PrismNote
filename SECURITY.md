# Security Policy

Current version as of this document: **1.11.0**. This file replaces a stale
copy (`docs/archive/SECURITY_STALE_v0.4.5_BETA.md`) that described a
0.4.5-era "no production use, beta" state that no longer reflects the
current codebase.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Email **mullassery@gmail.com** with:
- A description of the vulnerability and its impact
- Steps to reproduce
- A suggested fix, if you have one

This is a single-maintainer project — there is no dedicated security team
and no guaranteed response time. Reports will be acknowledged as soon as
possible.

## Known security-relevant facts (verified 2026-09-19)

### SQL injection defense

`crates/server/src/query_validator.rs` implements query-string validation
before SQL cells run: a blocklist of privilege-escalation keywords
(`GRANT`, `REVOKE`, `EXEC`, `xp_`/`sp_` prefixes, `OUTFILE`/`LOAD_FILE`), a
100KB length cap, comment stripping to prevent bypass, and detection of
smuggled multi-statement injection (e.g. `SELECT 1; DROP TABLE users`). This
is defense-in-depth, not parameterization — the module's own header comment
states it directly: "This is NOT a complete protection; use parameterized
queries for actual execution." Ordinary DDL/DML (`CREATE`/`INSERT`/`DROP`
etc.) is deliberately allowed, since these are the user's own credentialed
database connections and running SQL they typed themselves is the product's
core function, not an attack. 8 unit tests cover the validator
(`cargo test query_validator::tests`, all passing as of this pass).

We have not audited whether every execution path (SQLite/DuckDB/Postgres/
MySQL/cloud-warehouse connectors) actually uses parameterized queries
end-to-end versus string interpolation. This needs a dedicated audit — see
`ROADMAP_HONEST.md`.

### Sandboxed code execution

`docker_executor.rs` runs untrusted/AI-generated code in a disposable Docker
container (`docker run --rm`) with `--network=none` by default, and
memory/CPU/process/wall-clock limits. Verified by passing tests
(`cargo test docker_executor::tests`) covering no-network-access, memory
limits, and stdout/stderr/exit-code capture. One test in this area
(`sandbox_enforces_wall_clock_timeout_and_kills_container`) is flaky under
concurrent test-suite load — see `ROADMAP_HONEST.md` for detail. This
requires a working Docker install; if Docker is unavailable, sandboxed
execution is unavailable (fails, not silently degraded).

### Enterprise auth (AAD / LDAP / generic OAuth)

`crates/server/src/enterprise_auth.rs` explicitly does **not** implement
AAD, LDAP, or generic-OAuth-provider login — `authenticate_aad`,
`authenticate_ldap`, and `authenticate_oauth` return errors stating the
token-exchange / bind / user-lookup logic is not implemented, rather than
fabricating a session. Do not deploy this expecting real SSO — it does not
exist yet.

### Secrets / credentials

- `.env.example` documents required environment variables; no secrets are
  committed to the repo (checked: no `.env` file, no obvious API keys or
  tokens found in tracked files during this pass — see also the prior
  "scrub leaked PyPI token" commit `4245d96` in git history, which is why
  this check matters here specifically).
- **`JWT_SECRET` has a hardcoded fallback.** `crates/server/src/middleware/
  auth.rs:76`: `get_jwt_secret()` returns the literal string
  `"default-secret"` if the `JWT_SECRET` environment variable is unset —
  confirmed by reading the code and its own test
  (`test_jwt_secret_default`, which asserts the fallback value). If you run
  this outside local development without setting `JWT_SECRET`, every JWT is
  signed with a secret that's publicly visible in this repo's source code —
  anyone can forge a valid auth token. **Set `JWT_SECRET` explicitly in any
  non-local deployment; do not rely on the default.** This is tracked as an
  unresolved gap in `ROADMAP_HONEST.md` (arguably the default should refuse
  to start, or generate+persist a random secret, rather than silently using
  a known constant).

### Known-vulnerable dependencies (as of 2026-09-19, `npm audit` in `frontend/`)

6 vulnerabilities (3 high, 3 moderate), all transitive:
- `dompurify` (pulled in via `monaco-editor`) — multiple XSS/sanitizer-bypass
  advisories.
- `nanoid` — infinite loop with negative/zero size.
- `postcss` — source-map path traversal / arbitrary `.map` file disclosure.

No fix is currently available without an upstream `monaco-editor` bump for
the `dompurify` chain; `npm audit fix` may resolve `nanoid`/`postcss`. Not
fixed in this pass — see `ROADMAP_HONEST.md`.

## Compliance

This project makes no claim of SOC 2, HIPAA, GDPR, PCI DSS, or ISO 27001
compliance or certification.

## Supported versions

Only the latest released version is supported. There is no LTS branch.
