# Archive

Stale, superseded, duplicate, or fabricated planning/status docs, kept for
history rather than deleted. Nothing here should be treated as describing
the current state of the project — see the root `README.md` and
`ROADMAP_HONEST.md` for that.

## Archived in the 2026-09 documentation consolidation pass

- `ROADMAP_FABRICATED_MCP_PLATFORM_CLAIM.md` (was `docs/ROADMAP.md`) —
  claimed "Production Ready", "MCP 2.0 Platform member", "19 platform
  projects" — none of which describes this repo. Fabricated/templated
  content, not written about PrismNote.
- `PRODUCT_VISION_FABRICATED_MCP_PLATFORM.md` (was `docs/PRODUCT_VISION.md`) —
  same fabricated "MCP 2.0 Platform" framing, port assignments, etc.
- `ARCHITECTURE_GENERIC_TEMPLATE_BOILERPLATE.md` (was `docs/ARCHITECTURE.md`) —
  generic template text ("Primary logic and functionality", "MCP
  Integration") never filled in with real content about this repo.
- `FEATURES_STATUS_FABRICATED_PRODUCTION_READY.md` (was
  `docs/development/FEATURES_STATUS.md`) — a "✅ PRODUCTION-READY" feature
  matrix, dated 2026-07-29/v1.7.0, that claimed things later found false —
  e.g. "OAuth2/SSO ✅ PRODUCTION-READY" when `enterprise_auth.rs` explicitly
  does not implement OAuth/AAD/LDAP login. See `ROADMAP_HONEST.md`.
- `SECURITY_STALE_v0.4.5_BETA.md` (was `docs/reference/SECURITY.md`) —
  described a 0.4.5 "beta, no production use" state; the project is at
  1.11.0. Replaced by the root `SECURITY.md`.
- `CONTRIBUTING_STALE_PROPRIETARY_ERA.md` (was
  `docs/development/CONTRIBUTING.md`) — referenced the "Proprietary
  License" (the project relicensed to Apache-2.0), `build.sh` (doesn't
  exist), and other stale details. Replaced by the root `CONTRIBUTING.md`.
- `CONTRIBUTING_REFERENCE_MISLABELED_CLAUDE_MD.md` (was
  `docs/reference/CONTRIBUTING.md`) — despite the filename, its actual
  content was Claude-Code-agent architecture notes (a `CLAUDE.md`-style
  doc), not contributor guidance, and referenced version 0.4.5.
- `ROADMAP_V1.3_V1.4_STALE_PHASE_PLAN.md` (was
  `docs/development/ROADMAP.md`) and
  `ROADMAP_REFERENCE_PRE_CONSOLIDATION_2026-09.md` (was
  `docs/reference/ROADMAP.md`) — a stale multi-week phased v1.3→v2.0 plan.
  The `reference/` copy had two genuinely valuable dated status-check
  entries (2026-08-24, 2026-08-07); their still-relevant findings were
  folded into the new root `ROADMAP_HONEST.md` before archiving.
- `REPOSITORY_ORGANIZATION_STALE_v1.7.md` (was
  `docs/development/REPOSITORY_ORGANIZATION.md`) — describes a directory
  layout and "Proprietary license" from v1.7.0 that no longer matches the
  repo.
- `GITHUB_CI_ERRORS_TEMPLATE_BROKEN_REFS.md` (was `.github/CI_ERRORS.md`) —
  template scaffolding with an unsubstituted `$REPO_NAME` variable and
  links to files that don't exist in this repo (`CI_ERRORS_REPORT.md`,
  `.github/TROUBLESHOOTING.md`).
- `GITHUB_INSTALL_DUPLICATE_OF_README.md` (was `.github/INSTALL.md`) —
  duplicated install instructions already covered (more accurately) in the
  root README, and lived in the wrong place (`.github/` is for repo
  configuration, not user docs).
- `docs/reference/RELEASES.md` and `docs/reference/PUBLISH.md` were
  deleted outright (not archived) — they were byte-for-byte duplicates of
  the already-archived `RELEASES.md` and `PUBLISH.md` below.
- `disabled-workflows/release-binaries.yml.disabled` (was
  `.github.bak/workflows/release-binaries.yml`) — a real, seemingly-working
  multi-platform (macOS/Linux/Windows) release-binary workflow, disabled
  since 2026-06-20 and left in an ad hoc `.github.bak/` directory rather
  than `.github/workflows/`. See `ROADMAP_HONEST.md` for why it's disabled
  and what's needed to bring it back.

## Pre-existing archive (from before this pass)

The remaining ~40 files in this directory (`AI_INTEGRATION.md`,
`BIGDATA_*.md`, `PHASE_2_*.md`, `SESSION_SUMMARY*.md`,
`UI_UX_*.md`, `V0*_FEATURES.md`, etc.) are earlier planning docs, design
reviews, and session summaries from various points in the project's
history, archived in a prior pass (see git history, commit `61c7cf1` and
earlier). They were not individually re-reviewed in this pass; treat all of
them as historical, not current.
