# Area admin — verify after upgrade (opencloud-rolling 7.5.0 → 8.1.0)

Date: 2026-10-22. Search re-index had already run.

**Result: no upgrade bug.** Base checks are 10/10 before and after. Extra checks are 14/14 after (14/14 before). The UI shows all
seeded admin data correctly. One web display issue in 8.1.0 was found (W1). It is not caused by the upgrade: a user created
on 8.1.0 shows the same behavior.

## Base checks (`node release-testing/upgrade/run.mjs verify admin --phase after`)

| Check | Before | After |
|---|---|---|
| no user lost (22 now, 11 at seed) | PASS | PASS |
| user ids unchanged | PASS | PASS |
| edited display name and mail | PASS | PASS |
| disabled user stays disabled | PASS | PASS |
| Space Admin role kept | PASS | PASS |
| group members kept | PASS | PASS |
| user quota 1 GB | PASS | PASS |
| announcement banner kept | PASS | PASS |
| user logs in with its password | PASS | PASS |
| disabled user cannot log in | PASS | PASS |

## Extra data (`scripts/admin-extra-verify.mjs`, see `state/admin-extra.md`)

| Item | Before | After |
|---|---|---|
| all extra users exist with the same ids | PASS | PASS |
| qa-up-admin has only the Admin role | PASS | PASS |
| qa-up-light has only the User Light role | PASS | PASS |
| qa-up-admin logs in and can list all users | PASS | PASS |
| qa-up-light logs in and cannot list all users (403) | PASS | PASS |
| qa-up-light has no personal space | PASS | PASS |
| unicode display name unchanged (`Jürgen Ölçek-Łukasz 李雷 Ωμέγα 🚀`) | PASS | PASS |
| qa-up-unicode logs in | PASS | PASS |
| unicode user quota unlimited (total 0) | PASS | PASS |
| renamed group keeps id, new name and member | PASS | PASS |
| old group name is gone | PASS | PASS |
| big group has the same 11 members | PASS | PASS |
| unicode group name and member | PASS | PASS |
| qa-up-unicode memberOf shows both groups | PASS | PASS |

## UI as admin (`scripts/admin-after-ui.mjs`, `scripts/admin-group-members-ui.mjs`)

| What | Result | Evidence |
|---|---|---|
| Users list: 22 users; role column shows Admin, User, Space Admin and User Light correctly; the Login column shows "Forbidden" only for qa-up-disabled | PASS | `screens/admin-users-list-after.png` |
| Redesigned edit panel (8.1.0) for qa-up-disabled: "Login allowed" is off, role User | PASS | `screens/admin-user-disabled-edit-after.png` |
| Edit panel for qa-up-unicode: the unicode name renders in the header and the field; quota "No restriction" (correct, unlimited); groups `qa-up-big-group`, `qa-up-grüppe 团队` | PASS | `screens/admin-user-unicode-edit-after.png` |
| Edit panel for qa-up-user: edited name and mail, "Login allowed" on, group `qa-up-group` | PASS (quota display: see W1) | `screens/admin-quota-edit-no-restriction-after.png` |
| Edit panel for qa-up-light: role User Light, groups renamed and big group, quota hint "user needs to have logged in once" (correct, User Light has no personal space) | PASS | `screens-raw/009-admin-user-light-edit.png` |
| Details panel for qa-up-user: used quota "0 B of 1.1 GB used (0%)" (1 GiB shown with decimal units) | PASS | `screens/admin-quota-details-1gb-after.png` |
| Groups: 14 groups, including `qa-up-group-renamed` and `qa-up-grüppe 团队`; no `qa-up-group-old` | PASS | `screens/admin-groups-after.png` |
| Group members panel: big group has 11 members (as seeded); the unicode group contains the unicode user; the renamed group contains QA Upgrade Light | PASS | `screens/admin-group-big-members-after.png` |
| General: edition rolling, version 8.1.0; announcement banner text, the markdown details (bold "qa upgrade") and "Show banner" on are kept in the new 8.1.0 editor | PASS | `screens/admin-general-announcement-after.png` |
| Banner for normal user alan: shown at the top; "Details" opens the announcement with the formatted info text | PASS | `screens/admin-banner-alan-after.png` |

Console noise: `404` for `/graph/v1.0/users/<id>/photo/$value` for every user without a profile photo. This is expected
(no avatar set) and harmless.

## Findings

### W1 — Edit user panel shows "No restriction" for a personal quota that is not a preset value (web 8.1.0, not an upgrade bug)

- **Steps:** Set a personal quota of 1 GiB (1073741824 bytes) on a user, e.g. through the Graph API or a 7.5.0 instance.
  Then open Admin → Users and click the pencil (Edit) on that user.
- **Expected:** "Personal quota" shows the quota (about 1.07 GB), as the details panel does ("0 B of 1.1 GB used").
- **Actual:** "Personal quota" shows "No restriction". The API (`GET /graph/v1.0/users/{id}?$expand=drive,memberOf,appRoleAssignments`,
  which the panel loads itself) returns `quota.total = 1073741824`.
- **Reproduced:** 2× on the upgraded user `qa-up-user` (`scripts/admin-quota-probe.mjs`). It was also reproduced 2× each on a user
  created on 8.1.0 after the upgrade (`scripts/admin-quota-fresh.mjs`, user deleted afterwards). On that user, 1 GiB and
  2 GiB show "No restriction", while 1 GB (1000000000 bytes, a preset value) shows "1 GB" correctly.
- **Saving the panel does not lose the quota:** a display name change saved from the panel kept `quota.total = 1073741824`
  (2× on a throw-away user, `scripts/admin-quota-save.mjs`). Only the display is wrong. An admin may still believe the user
  is unlimited.
- **Evidence:** `screens/admin-quota-edit-no-restriction-after.png` (edit panel), `screens/admin-quota-details-1gb-after.png`
  (details panel, same user), `screens/admin-quota-fresh-1gb-decimal.png` (preset value shown correctly).
- **Verdict:** not an upgrade bug and not a seed problem. The data is intact. This is a display issue in the 8.1.0 user edit
  panel (web). It mostly affects quotas set by the API or in older versions with binary units. Low severity.

## Seed problems

None.
