# Spaces: verify after upgrade (7.5.0 → 8.1.0)

Date: 2026-10-22. Instance: compose project `qa-upgrade`, `opencloudeu/opencloud-rolling:8.1.0` (upgraded from 7.5.0, yjs added, search re-index done).

## Checks (`node release-testing/upgrade/run.mjs verify spaces`)

| Check | Before | After |
|-------|--------|-------|
| space name and description | pass | pass |
| space quota 3 GB | pass | pass |
| space image and readme | pass | pass |
| space image content | pass | pass |
| space members and link | pass | pass |
| viewer membership keeps expiration | pass | pass |
| content: docs/versions.txt | pass | pass |
| content: docs/sub/file.txt | pass | pass |
| content: docs/by-lynn.txt | pass | pass |
| space file versions | pass | pass |
| space trash | pass | pass |
| disabled space stays disabled | pass | pass |
| lynn still sees the space | pass | pass |
| mary still sees the space | pass | pass |
| space editor can upload after upgrade | – (after only) | pass |

Before: 14/14, after: 15/15 (`results/spaces-after.json`).

## Extra data (`scripts/spaces-extra-verify.mjs --write`, see `state/spaces-extra.md`)

30/30 pass after the upgrade (30/30 before).

| Space | Checks | After |
|-------|--------|-------|
| `qa-up-space-renamed` | new name and description on the same id, old name gone, file content | pass (3/3) |
| `qa-up-space-group` | group roles (unix-lovers Editor, bible-readers Viewer), dennis and mary see it, file by group member, dennis can upload | pass (6/6) |
| `qa-up-space-managers` | alan Manager, vlsi-lovers Manager, mary Viewer (invited by alan), description by alan, lynn sees it, alan can still edit | pass (6/6) |
| `qa-up-space-many` | 10 permissions, user and group roles, alan/dennis/lynn/mary see it, readme is the space readme, readme content (SHA-256) | pass (8/8) |
| `qa-up-Ünïcødé 空间 Ωμέγα 🚀` | name and description byte-identical, file in unicode path, lynn sees it | pass (3/3) |
| `qa-up-space-reenabled` | enabled, file survived, dennis sees it | pass (3/3) |

## UI (`scripts/spaces-after-ui.mjs`, as margaret)

| What | Result | Screenshot |
|------|--------|------------|
| Spaces overview: all 9 spaces, names, descriptions, images | pass: custom image of `qa-up-space` (red PNG) and the default images load (all `<img>` loaded), descriptions shown incl. the unicode one, `qa-up-space-disabled` marked "Disabled", only the new name of the renamed space | `screens/spaces-overview-after.png` |
| Unicode space: name in card, breadcrumb and header, description | pass, rendered correctly | `screens/spaces-unicode-after.png` |
| Members panel of `qa-up-space-many` | pass: "10 members", 5 users + 4 groups + margaret with the seeded roles (lynn/margaret Can manage; alan, mary, chess-lovers, basic-haters Can edit; qa-up-user, dennis, machine-lovers, programmers Can view) | `screens/spaces-many-members-after.png` |
| Readme rendering of `qa-up-space-many` | pass: heading with emoji, bold/italic/strike/inline code/link, table with unicode and emoji, nested lists, task list with checked/unchecked boxes, quote, highlighted code block; read-only (contenteditable false, code language select disabled). The `[^1]` footnote stays literal text — the seed calls it a "footnote-like marker", footnotes are not part of the supported markdown | `screens/spaces-many-readme-after.png` |
| Space quota of `qa-up-space` (details sidebar) | pass: "146 B of 3.2 GB used (0%)"; 3 GiB (3 × 1024³ bytes) shown in decimal units = 3.2 GB, same value as the API check | `screens/spaces-quota-after.png` |
| Admin settings → Spaces list | pass: 9 spaces (1 disabled), space images shown in the list (new in 8.1.0, custom image for `qa-up-space`, greyed default for the disabled one), managers, member counts, quotas and status as seeded | `screens/spaces-admin-list-after.png` |

Console: the only error was a 404 for `GET /graph/v1.0/users/<margaret>/photo/$value` (user has no avatar) — expected, not upgrade-related.

## Findings

None. No check failed after the upgrade, so nothing needed a reproduction.

Notes (not upgrade bugs, no action):
- `qa-up-space-disabled` was skipped by the search re-index — expected for a disabled space.
- The 3 GiB quota is displayed as "3.2 GB" (decimal units) in the sidebar and the admin list — consistent display, not a data change.
- "Show more" appears under a one-line readme (`qa-up-space`), cosmetic, unrelated to the upgrade.

## Verdict

Spaces area: **pass** — 15/15 checks and 30/30 extra checks after the upgrade, UI matches the seeded data. No seed problems, no upgrade bugs.
