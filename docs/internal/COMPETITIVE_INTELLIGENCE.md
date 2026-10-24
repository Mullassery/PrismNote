# Competitive intelligence in roadmap and upgrade work

**Policy date:** 2026-10-19

Competitive findings are an input to product decisions, not a one-off report.
Every pending roadmap item, new feature, and routine dependency upgrade should
check the repository's [`AUDIT_FINDINGS.md`](AUDIT_FINDINGS.md) before work
starts, and record the decision in the PR or changelog.

## Required check before building

1. **Read `AUDIT_FINDINGS.md`.** Find the relevant competitor row and the
   ranked next actions. If the finding is stale, update it with a dated source.
2. **Name the competitor and the user problem.** A feature is not justified by
   "competitor has it". State the workflow it unlocks, who needs it, and how
   often. Mark unverified demand as a hypothesis.
3. **Prefer reuse over new code.** Check whether an existing Mullassery repo
   already provides the capability (see `BUNDLES.md` in the profile repo and
   the bundle role file in this repo, when present). Typical reuse:
   - crawling/fetching/robots/SSRF → **MudFish**
   - architecture maps / PR diffs → **CodeAtlas**
   - data-quality contracts / validation → **StatGuardian**
   - token counting / cost tables → **PyTokenCalc**
   - dependency graph / advisories / SBOM → **PyDeepMesh**
   - segmentation / CLV / churn → **ClusterAudienceKit**
   - activation / lineage / PII → **PyReverseETL**
   - fleet state sync → **SyncFleet** (only after conflict resolution)
4. **Choose one disposition:** build, integrate, defer, or reject. Write it
   down. A rejection with a reason is a successful outcome.
5. **For routine upgrades**, check whether the upgrade closes a known
   competitor gap or breaks a differentiated capability. Run the tests that
   cover the affected path; do not merge a green build that silently changes a
   user-visible contract.

## PR / changelog checklist

- [ ] Competitor and source URL/date recorded (or "no direct competitor").
- [ ] User impact and frequency stated; unverified demand labelled.
- [ ] Reuse check done against sibling repos/bundles.
- [ ] Failure mode and rollback considered (especially auth, PII, cost).
- [ ] Docs/roadmap status updated honestly.
- [ ] Tests or a manual verification command included.

## Review cadence

- Refresh the competitor row when a release changes the capability.
- Re-check the full `AUDIT_FINDINGS.md` at least quarterly and before a major
  release.
- If a finding is wrong or stale, correct it in the same PR that relies on it.

## Non-goals

- Copying features for parity.
- Adding a dependency just because a competitor uses it.
- Treating star counts or download counts as proof of user need.

## OSS gap analysis — 2026-10-24

**What matters most here:** install reach and trust in shipped features. macOS-Apple-Silicon-only blocks most users, and versioning, Agent Act, and data-quality placeholders erode the local-first promise. Fix distribution and either wire or remove inert features.

Scope: PrismNote's local-first, Jupyter-compatible notebook was compared with marimo, JupyterLab, and Apache Zeppelin on notebook semantics, SQL/warehouse reach, execution isolation, AI, collaboration, and distribution. Claims were checked against this repo's docs/source and current upstream release pages.

### Comparable OSS projects
| Project | GitHub | License | Last activity | Why it is the comparison |
| --- | --- | --- | --- | --- |
| marimo | https://github.com/marimo-team/marimo | Apache-2.0 | 0.25.2, 2026-10-19 | Modern reactive Python notebook with built-in SQL and AI; the closest "better notebook" alternative. |
| JupyterLab | https://github.com/jupyterlab/jupyterlab | BSD-3-Clause | 4.6.4, 2026-09-21 | Ecosystem default; defines `.ipynb` compatibility, kernels, and extensions. |
| Apache Zeppelin | https://github.com/apache/zeppelin | Apache-2.0 | 0.12.1, 2026-05-25 | Multi-interpreter SQL/Spark notebook with multi-user auth; compares on warehouse and enterprise use. |

### Capability comparison
| Capability | Ours | marimo | JupyterLab | Zeppelin | Gap |
| --- | --- | --- | --- | --- | --- |
| `.ipynb` import/export | Yes | Partial | Yes | No | Ours matches JupyterLab; marimo converts rather than edits `.ipynb` natively. |
| Per-notebook kernel isolation | Yes | Yes | Yes | Partial | Ours shipped after the 2026-09 global-namespace fix; Zeppelin shares interpreters unless configured. |
| Multi-language cells | Yes | Partial | Partial | Yes | Ours claims 15+; marimo is Python/SQL-first; JupyterLab needs installed kernels. |
| Built-in SQL/warehouse coverage | Yes | Partial | No | Partial | Ours has SQLite/DuckDB/Postgres/MySQL plus 8 warehouses; JupyterLab relies on extensions. |
| Container sandbox per run | Yes | Partial | No | No | Ours spawns a disposable Docker container; marimo has uv/WASM sandboxes, not general containers. |
| Built-in AI incl. local model | Yes | Yes | Partial | No | Ours supports Claude/OpenAI/Ollama; JupyterLab AI arrives via extensions. |
| Real-time collaboration | No | Partial | Yes | Yes | Deliberately rejected; the largest team-workflow gap. |
| Extension/plugin ecosystem | No | Partial | Yes | Partial | JupyterLab's extension model is unmatched. |
| Git-friendly plain-text notebooks | Partial | Yes | Partial | No | Ours is `.ipynb` plus an optional nbdime adapter; marimo stores `.py`. |
| In-app version history | Partial | No | Partial | Yes | Ours has `versioning.rs` but no route or UI; Zeppelin exposes revisions. |
| Multi-user auth/RBAC | Partial | Partial | Yes | Yes | Ours has Google sign-in plus stubbed AAD/LDAP/OAuth; JupyterHub and Zeppelin are mature here. |
| Cross-platform prebuilt install | Partial | Yes | Yes | Yes | Ours ships macOS arm64 only; the others distribute broadly via pip or binary. |

The `.ipynb` and kernel rows reflect verified repo behavior, not marketing: kernel registry isolation and real tracebacks are documented as fixed, while `.ipynb` import/export is part of the core. The collaboration and extension rows are deliberate product choices, not hidden defects; the version-history and auth rows are "we have a weaker version."

### Gaps that matter (ranked)
1. **Distribution is narrower than every competitor** — `README.md` discloses macOS Apple Silicon only; `ROADMAP_HONEST.md` says Linux/Windows binaries exist in `release-assets/` but the release workflow is disabled. This blocks most prospective users at install time. Effort: S.
2. **Shipped-but-inert features undermine trust** — notebook versioning has no API/UI, the AI Agent "Act" mode is unreachable (`setMode` never called), data-quality scoring is hardcoded at 0.95, and warehouse schema browsing returns placeholders. Competitors either do not claim these or ship them working. Effort: M.
3. **No collaboration or shareable notebook links** — marimo, JupyterLab (via `jupyter-collaboration`), and Zeppelin all support multi-user editing; PrismNote has no CRDT and explicitly rejects cloud SaaS. This cedes team and review workflows. Effort: L.
4. **No extension or kernel plugin surface** — integrations (dbt, GitHub, Airflow, K8s, RunPod, warehouses) are all in-tree, so users cannot add a backend without forking. JupyterLab's extension ecosystem and marimo's importable notebooks solve this differently. Effort: L.
5. **Enterprise auth and resource governance are stubs** — AAD, LDAP, and generic OAuth explicitly return "not implemented"; idle kernels are never evicted, so long-running servers leak memory. Zeppelin ships LDAP multi-user and JupyterHub provides auth/spawner control. Effort: L.
6. **Git review is still `.ipynb`-shaped** — nbdime gives semantic diff/merge, but it is an optional CLI rather than the in-app review flow; marimo's `.py` storage is materially easier to review and merge. Effort: M.

### Where we are differentiated
- **Sandboxing is real and default**: each execution gets a fresh Docker container with no network by default, memory/CPU/process limits, and a wall-clock timeout. None of these three competitors ships that as the default execution path.
- **Warehouse breadth in one local binary**: Snowflake, BigQuery, Redshift, Synapse, Databricks, Athena, Presto, and Trino alongside local SQLite/DuckDB/Postgres/MySQL, without a separate BI or gateway tier.
- **Local-first AI**: Anthropic, OpenAI, and a local Ollama model are first-class, while JupyterLab needs extensions and Zeppelin has no built-in assistant.
- **Operational integrations already wired**: dbt manifest/run-result parsing, GitHub backup/sync, Airflow REST, Kubernetes, RunPod, and SSRF-safe link previews via MudFish.

### Disposition
- **Build:** restore and verify the multi-platform release pipeline and publish the existing Linux/Windows artifacts (S); wire notebook version history, the Agent Plan/Act toggle, real data-quality scoring, and live schema browsing (M); add idle-kernel eviction and per-notebook resource budgets (M).
- **Integrate/reuse:** keep `ipykernel`/Jupyter kernel protocol and nbdime; reuse MudFish for URL previews, PyTokenCalc for AI cost accounting, and CodeAtlas for notebook/PR context; evaluate a JupyterHub-compatible auth path instead of bespoke AAD/LDAP.
- **Defer/reject:** CRDT collaboration and cloud SaaS (already rejected); MongoDB; a plugin marketplace until the release and inert-feature gaps are closed and honestly documented.

### Sources
- https://github.com/marimo-team/marimo (accessed 2026-10-24)
- https://github.com/marimo-team/marimo/releases (0.25.2, 2026-10-19)
- https://github.com/jupyterlab/jupyterlab (accessed 2026-10-24)
- https://github.com/jupyterlab/jupyterlab/releases/tag/v4.6.4 (2026-09-21)
- https://github.com/apache/zeppelin (accessed 2026-10-24)
- https://zeppelin.apache.org/releases/zeppelin-release-0.12.1.html (0.12.1, 2026-05-25)
- Repo files inspected: `README.md`, `COMPETITIVE_INTELLIGENCE.md`, `AUDIT_FINDINGS.md`, `ROADMAP_HONEST.md`, `pyproject.toml`, `Cargo.toml`, `docs/README.md`
