# Queue status — 2026-10-19

This file records what was shipped, what is blocked/failed, and what is rejected for this repository. It complements `AUDIT_FINDINGS.md`.

## Shipped
- Optional nbdime-backed semantic notebook diff/merge adapter (`[nbdime]` extra); audit/bundle docs added.

## Blocked / failed
- Publish the Linux/Windows binaries already present in `release-assets/`.
- Fix frontend lint/e2e gates.
- Idle kernel eviction.

## Rejected / deferred
- MongoDB, CRDT collaboration, and cloud SaaS.

## Policy

Any future feature or upgrade must check `AUDIT_FINDINGS.md` and this file before implementation. A blocked item is retried only when its external dependency is available; a rejected item needs new user evidence or a design change to reopen.
