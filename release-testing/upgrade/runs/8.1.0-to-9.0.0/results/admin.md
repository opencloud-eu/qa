# Admin — verify after the upgrade

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php `9.0.0+dev`, edition `dev`).

Result: **no upgrade bug in the admin area.** Base checks 10/10 and extra checks 21/21 pass after the upgrade, just as
they did before. In the UI, users, groups, the edit panels, the announcement and alan's banner and details look the same
as before. One dev-only finding (the version check is missing on edition `dev`), which is not related to the upgrade.

## Checks — `node release-testing/upgrade/run.mjs verify admin --phase after`

| Check | Before | After |
|---|---|---|
| no user lost | pass | pass |
| user ids unchanged | pass | pass |
| edited display name and mail | pass | pass |
| disabled user stays disabled | pass | pass |
| Space Admin role kept | pass | pass |
| group members kept | pass | pass |
| user quota 1 GB | pass | pass |
| announcement banner kept | pass | pass |
| user logs in with its password | pass | pass |
| disabled user cannot log in | pass | pass |

10 ok, 0 failed (before: 10 ok, 0 failed).

## Extra data — `state/admin-extra.md`

`scripts/admin-extra-verify.mjs`: 21 ok, 0 failed (before: 21/21). UI: `scripts/admin-ui.mjs after`, compared with the
`*-admin-before-*` screenshots.

| # | Item | API | UI |
|---|------|-----|----|
| 1 | `qa-up-admin` keeps only the Admin role and can list all users | pass | pass, role "Admin" in the list |
| 2 | `qa-up-light` keeps only User Light, gets 403 on the users list, has no personal space | pass | pass, role "User Light" |
| 3 | `qa-up-demoted` (Admin → Space Admin → User) keeps only User, no leftover role | pass | pass, edit panel role "User", quota "No restriction" |
| 4 | Unicode display name `Jürgen Ölçek-Łukasz 李雷 Ωμέγα 🚀`, user logs in | pass | pass, name and initials "JÖŁ" render |
| 5 | `qa-up-unicode` personal quota unlimited (total 0) | pass | pass, "No restriction" |
| 6 | `qa-up-quota5gb` personal quota 5 GB (5000000000) | pass | pass, "5 GB" |
| 7 | Renamed group `qa-up-group-renamed` keeps its id and member; the old name is gone | pass | pass, listed in Groups |
| 8 | Removed member `qa-up-member-25` stays removed | pass | — |
| 9 | `qa-up-big-group` has the same 28 members | pass | pass, listed |
| 10 | Unicode group `qa-up-grüppe 团队` keeps its name and member | pass | pass, renders correctly |
| 11 | `qa-up-unicode` memberOf contains both groups | pass | pass, the edit panel lists `qa-up-big-group` and `qa-up-grüppe 团队` |
| 12 | Deleted user `qa-up-deleted` stays gone | pass | — |
| 13 | Deleted group `qa-up-group-deleted` stays gone; 15 groups | pass | pass, "15 groups in total" (same as before) |
| 14 | Announcement banner and markdown details are byte-identical | pass | pass: Admin → General shows the banner text and the rich details (bold, list, inline code, link, unicode). alan sees the banner, and "Details" renders `<ul>`, `<strong>` and the `https://opencloud.eu` link |

The users list shows 43 `qa-up-*` rows, and roles and login status match before (`qa-up-disabled` "Forbidden").

Admin → Spaces (new script `scripts/admin-ui-spaces.mjs`; the seed recorded no before screenshot for this page): the list
renders 21 spaces "(including 3 disabled)", with managers, member counts, quotas and status shown
(`../screens/001-admin-after-spaces.png`). Space contents are covered by the spaces area.

## Findings

### A1 — Version check missing on edition `dev`, console TypeError (dev bug, not related to the upgrade)

- Steps: log in as admin on the dev build, open Admin → General (or look at the footer of the left sidebar on any page).
- Expected: "Up to date" or "Version X available" under the version, as on 8.1.0 rolling
  (`../screens/006-admin-before-general.png`).
- Actual: the version check is not shown (`../screens/006-admin-after-general.png`). The console logs
  `TypeError: Cannot read properties of undefined (reading 'current_version')` several times per page load.
- Reproduced twice (`admin-ui.mjs after` and `admin-ui-spaces.mjs after`).
- Cause: `https://update.opencloud.eu/server.json` only has the channels `rolling, stable, lts, lts-2.0, lts-4.0`, and the
  server reports `edition: "dev"`. `web-pkg/src/components/VersionCheck.vue` reads
  `updates.channels[serverEdition].current_version` without a guard. The error is caught, `hasError` is set, and the
  component hides itself.
- Classification: **dev bug unrelated to the upgrade**, and it only affects dev builds. Low severity (cosmetic plus
  console noise). A release build with edition `rolling` or `stable` is not affected.

### Observations (not bugs)

- Dev theme differences seen in every screenshot: the "New" button is light purple instead of dark teal, and folder icons
  are blue instead of yellow. This is an intended design change in dev and has nothing to do with admin data.
- In the users list, some user names are now cut off with an ellipsis (`qa-up-member-…`) because of new column widths.
  This is cosmetic.
- alan's notification badge showed 14 before and none after (`../screens/007-admin-before-alan-banner.png` vs
  `007-admin-after-alan-banner.png`). Notifications belong to the account area, and the badge may have changed because
  other verify agents read the notifications in the meantime. This is only a pointer for the account results.

No seed problems. No upgrade bugs.
