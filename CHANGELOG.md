# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Historical entries prior to this file's creation were not backfilled from
git log/commit messages — doing so from memory or inference would risk
fabricating release notes for versions that were never formally tagged as
releases. See `git log` for the real commit history, and
`docs/archive/RELEASES.md` / `docs/reference/RELEASE_SYNC_VERIFICATION.md`
for whatever pre-existing release documentation exists (not verified for
accuracy in this pass).

## [Unreleased]

### Changed
- Consolidated documentation: archived ~13 stale, duplicated, or fabricated
  docs (fake "MCP 2.0 Platform" roadmap/vision docs, a stale v0.4.5
  SECURITY.md, a mislabeled CONTRIBUTING.md, a fabricated
  "PRODUCTION-READY" features matrix, generic template boilerplate) to
  `docs/archive/`. See `docs/archive/README.md` for the full list and
  reasons.
- Added root `CONTRIBUTING.md`, `SECURITY.md`, `ROADMAP_HONEST.md`; moved
  `CODE_OF_CONDUCT.md` to repo root.
- Rewrote `.github/ISSUE_TEMPLATE/` (previous templates were copy-pasted
  from an unrelated project, "OpenAnchor") and fixed `pull_request_template.md`
  (referenced a non-existent `make format` target and had a stray
  `Co-Authored-By:` placeholder).
- Added `npm` ecosystem to `.github/dependabot.yml` (frontend dependencies
  were not previously covered by Dependabot).
- Moved a disabled release workflow out of the ad hoc `.github.bak/`
  directory into `docs/archive/disabled-workflows/` with an explanation of
  why it's inactive.

See `ROADMAP_HONEST.md` for the full list of known bugs, security gaps, and
untested/non-functional features found during this pass.
