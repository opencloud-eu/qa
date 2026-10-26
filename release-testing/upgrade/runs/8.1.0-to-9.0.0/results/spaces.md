# Spaces — verify after upgrade (8.1.0 → dev)

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php 9.0.0+dev).
Migration in this area: `opencloud shares migrate import_space_members` (20/20 spaces migrated).

**Result: no failures. No upgrade bug, no seed problem, no dev bug found in the spaces area.**

## Checks

| run | when | result |
|---|---|---|
| `run.mjs verify spaces --phase before` | before upgrade | 14/14 PASS |
| `scripts/spaces-extra-verify.mjs` (read-only) | right after the upgrade (lead) | 52/52 PASS |
| `scripts/spaces-extra-verify.mjs` (read-only) | after `import_space_members` (lead) | 52/52 PASS |
| `run.mjs verify spaces --phase after` | after migration | 15/15 PASS (incl. write check "space editor can upload after upgrade") |
| `scripts/spaces-extra-verify.mjs --write` | after migration | 56/56 PASS |
| `scripts/spaces-ui-verify.mjs` (capability + UI, 4 users) | after migration | 26/26 PASS (run `c`) |

`run.mjs verify spaces --phase after` (all PASS): space name and description; quota 3 GB; image and readme;
image content; members and link; viewer membership keeps expiration; content `docs/versions.txt`,
`docs/sub/file.txt`, `docs/by-lynn.txt`; file versions; trash; disabled space stays disabled; lynn and mary still
see the space; space editor can upload.

## Extra data (`state/spaces-extra.md`)

| item | result |
|---|---|
| Exact member lists of all 13 spaces (roles, expirations, links, group grants, removed members, no duplicates) | PASS |
| Quota totals of all 13 spaces (3 GiB, 1 GiB, 5 GiB, 10 MiB, unlimited 0, default 1000000000) | PASS |
| renamed: name/description, old name gone, file content | PASS |
| group: dennis/mary see the space via group, group member's file, dennis (group editor) uploads | PASS |
| roles: description by manager alan, lynn (manager via group) sees it, mary (viewer) cannot upload, alan (manager) edits description and uploads | PASS |
| changed: dennis (removed) does not see it, mary has exactly one grant (manager) | PASS |
| expiry: lynn (expiring editor) sees the space | PASS |
| many: alan/dennis/lynn/mary see it, readme + image special set, readme and image content hashes | PASS |
| quotaSmall: used unchanged (6462325), 6 MiB upload rejected | PASS |
| quotaDefault: alan (editor) uploads | PASS |
| New space `qa-up-space-after-default-quota` without quota → 1000000000 (same default as on 8.1.0) | PASS |
| Capability `spaces.default_quota` = `1000000000` (`max_quota` 0) — new in dev, from `OC_SPACES_DEFAULT_QUOTA`; matches the quota the graph service gives a new space | PASS |
| disabledMembers: still disabled, not re-enabled by `import_space_members`, dennis does not list it | PASS |
| reenabled: enabled, file survived, dennis sees it | PASS |

## UI (margaret, alan, dennis, mary)

Script `scripts/spaces-ui-verify.mjs`, screenshots `../screens/0NN-spaces-after-c-*`.

| check | margaret | alan | dennis | mary |
|---|---|---|---|---|
| Projects list shows every enabled `qa-up-` space the API returns | PASS (17 + 3 disabled shown as "Disabled") | PASS (5) | PASS (4) | PASS (6) |
| `qa-up-space-many`: rich markdown readme rendered (heading, table with unicode) | PASS | PASS | PASS | PASS |
| `qa-up-space-many`: space image shown | PASS | PASS | PASS | PASS |
| `qa-up-space-many`: header "17 members" | PASS | PASS | PASS | PASS |
| Members panel lists all 17 entries (2 pages of 10) — demo users, qa-up-sp-m1..m8, 4 groups | PASS | PASS | PASS | PASS |

Quotas in margaret's list ("Remaining quota" column): qa-up-space 3.2 GB, quota-1g 1.1 GB, quota-5g 5.4 GB,
quota-small 4 MB, quota-unlimited "Unrestricted", quota-default and after-default-quota 999.8 MB (1000000000 minus
~170 KB used by the template `.space` content, same as the other default spaces), disabled spaces "-". Consistent with
the API values.

Lists per user: alan — changed, expiry, many, quota-default, roles; dennis — group, many, reenabled, roles (not
changed, not disabled-members); mary — share-space, space, changed, group, many, roles.

Evidence: `../screens/001-spaces-after-c-margaret-projects.png`, `../screens/014-spaces-after-c-mary-many-header.png`,
`../screens/003-spaces-after-c-margaret-many-members.png` (+ `-p2`).

## Findings

None in the spaces area.

Notes (not findings):
- UI runs `a` and `b` reported members-panel failures — a script problem: the panel is paginated (10 per page) and the
  script read only page 1. Fixed in the script; run `c` reads both pages, all 17 entries present for all 4 users.
- Every page logs `TypeError: Cannot read properties of undefined (reading 'current_version')` plus 404s in the browser
  console. `current_version` is only used by web's `VersionCheck.vue` (update check), not by spaces; nothing visible
  breaks. Not investigated further here (outside this area); may be worth a look in the general report.
