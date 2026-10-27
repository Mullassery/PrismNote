# Audit Report: prismnote
Date: 2026-10-26 | Type: Read-only systems design audit  
Repo: https://github.com/Mullassery/prismnote.git (local: /Users/georgimullassery/Desktop/Projects/prismnote) | Branch: main | Status: clean

## Overview
Local-first Jupyter-compatible notebook with Rust Axum backend + React/Vite frontend embedded in binary, 15+ languages, SQL/warehouses, Docker sandboxing, AI integration. Single maintainer, honest about gaps in docs.

## Architecture / Entry points
- Workspace: single crate `crates/server` (Axum). Frontend embedded in release binary. Python launcher on PyPI downloads binary.
- Key modules: `execution.rs`, `cell_executor.rs`, `docker_executor.rs`, `kernel.rs`, `sql_executor.rs`, `ai.rs`, middleware/auth, cloud_warehouse/*, integrations (dbt/airflow/github/k8s), rbac, governance, audit.
- Frontend in `frontend/` (TypeScript/React).

## Dependencies
Rust workspace deps: axum 0.7, tokio full, tower/tower-http, serde, tracing, uuid, async-trait, zeromq, tempfile, anyhow, thiserror. Many integration deps likely in server crate. Python/JS tooling present.

## Data / State
- Notebooks/kernels/cells with isolation per notebook (README claims fixed). Persistence via DB/files (see models/catalog/files).
- Audit logging, governance/RBAC present.

## APIs / Contracts
- REST/WebSocket (Axum) for notebook operations, execution, SQL, AI, integrations. Auth via JWT/middleware.

## Security observations
- Sandbox: `docker_executor.rs` — README states disposable containers, no network by default, memory/CPU/process limits, wall-clock timeout, real stdout/stderr/exit-code. This is a strong control if enforced.
- SSRF: README explicitly states MudFish used for link previews with blocks on private/loopback/link-local (including cloud metadata) and non-http(s). Implementation should be audited.
- Auth: JWT-based auth middleware (`middleware/auth.rs`) with EnterpriseAuthManager, bearer tokens, proper error codes.
- Unsafe: `cell_executor.rs:70` warns on "potentially unsafe operation detected" (pattern-based) — heuristic, not necessarily Rust unsafe block.
- Secrets: cloud credentials for warehouses/AI stored/configured externally; need to ensure not logged.
- CORS/middleware present.

## Tests / CI
- CI workflows: ci.yml, commit-conventions.yml, security.yml, tests.yml. Backend tests 120+, frontend vitest, Playwright E2E (207 tests across browsers) per README. Source files 4243, TODO/FIXME ~1353.

## Findings
| ID | Severity | Category | Evidence | Impact | Root cause | Recommendation | Confidence |
|---|---|---|---|---|---|---|---|
| PRISM-001 | High | Security / Sandboxing | docker_executor.rs present; README describes strict sandbox. No network default claimed. | If network not actually disabled or limits not enforced, untrusted code could exfiltrate. | Complex sandbox implementation. | Verify actual `docker run` flags (network=none, --memory, --cpus, --pids-limit, read-only, no-new-privileges, seccomp, timeout). Add integration tests proving isolation. | High |
| PRISM-002 | High | Security / SSRF | README states SSRF-safe link previews via MudFish blocking private/loopback/link-local/metadata. | SSRF could lead to metadata exfiltration/internal access. | Reliance on external MudFish with specific policy. | Verify MudFish integration enforces blocks before requests; add tests for 169.254.169.254, 127.0.0.1, ::1, RFC1918; ensure DNS rebinding protection. | High |
| PRISM-003 | Medium | AuthN/Z | middleware/auth.rs uses JWT validation via EnterpriseAuthManager. | Weak JWT config (alg, secret rotation, audience/issuer) could be issue. | Enterprise auth complexity. | Verify algorithm allowlist (no 'none'), secret strength/rotation, token expiry, revocation strategy; avoid logging tokens. | Medium |
| PRISM-004 | Medium | Code Quality / Technical Debt | TODO/FIXME ~1353 across codebase; data-quality scoring not wired (README admits). | Maintenance burden, incomplete features. | Rapid development/single maintainer. | Prioritize security-critical TODOs, track in issues, avoid expanding scope until core gaps addressed. | High |
| PRISM-005 | Low | Documentation / Claims | README says "Development Status :: 5 - Production/Stable" on PyPI but repo says actively developed; MongoDB "explicit error not fake success" good. | Misleading expectations. | Versioning/marketing drift. | Align PyPI classifier with honest status or document production-readiness criteria. | Medium |

## Strengths
- Honest documentation of limitations and gaps. Strong security posture claims with concrete controls (sandbox, SSRF blocks). Extensive testing across stack. Jupyter compatibility focus. Real integrations, not mocks.

## Prioritized remediation
1. Verify sandbox enforcement (PRISM-001) with tests.
2. Verify SSRF protections end-to-end (PRISM-002).
3. Audit JWT/auth config (PRISM-003).
4. Triage critical TODOs (PRISM-004).

## Limitations
Read-only audit; did not inspect docker_executor.rs full implementation or MudFish integration code in detail.
