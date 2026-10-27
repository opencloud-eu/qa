# Sharing — verify after the upgrade

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php 9.0.0+dev), 2026-10-26.
Migration before this check (lead): `opencloud shares migrate import_space_members` (20/20 spaces).

**Result: no upgrade bug in sharing.** Area script 12/12, extra data 35/35, UI as alan, lynn, mary, margaret and
anonymous matches the seeded state.

## Checks (`node release-testing/upgrade/run.mjs verify sharing --phase after`)

| Check | Before | After |
|------|------|------|
| permissions on for-lynn.txt | pass | pass |
| permissions on for-group | pass | pass |
| permissions on link-folder | pass | pass |
| permissions on drop | pass | pass |
| user share keeps role and expiration | pass | pass |
| links keep type and url | pass | pass |
| lynn sees the user share | pass | pass |
| mary sees the group share | pass | pass |
| public link opens with password | pass | pass |
| public link refuses without password | pass | pass |
| edit link can upload | pass | pass |
| file drop accepts upload | pass | pass |

12/12 before, 12/12 after.

## Extra data (`scripts/sharing-extra-verify.mjs after`, see `state/sharing-extra.md`)

35/35 pass (35/35 before).

| ID | Item | After |
|----|------|------|
| — | Exact permission snapshots (same id, grantee, role, expiry day, link url/type, no extra permission) for all 8 items of alan | pass |
| E1 | `qa-up-parent` lynn Viewer (upload refused) / mary Editor (upload ok) | pass |
| E2 | `qa-up-sub` lynn Editor exp 2027-01-24 (writable) + mary Viewer, own mount in "Shared with me" | pass |
| E3 | Link without expiration: same url/type, no expiry, opens with password, refused without | pass |
| E4 | lynn: hidden share stays hidden | pass |
| E5 | lynn: declined share stays declined (`@client.synchronize=false`) | pass |
| E6 | lynn: renamed mountpoint `qa-up-renamed-by-lynn.txt` keeps name and content | pass |
| E8 | lynn's own share (alan Editor, mary Viewer exp 2026-12-10) unchanged; alan sees it | pass |
| E9 | Group2 Editor exp 2026-11-25 unchanged, mary can upload | pass |
| E10 | Group share hidden by mary only: hidden for mary, not for lynn | pass |
| E11 | Project space `qa-up-share-space`: **member permission ids unchanged** (group2 Space Viewer exp 2026-12-15, margaret Manager), folder share alan Editor + edit link, file share alan FileEditor; alan writes, link reads/uploads, lynn and mary see the space | pass |

Note on `import_space_members`: the Graph permission ids of the project-space members (E11 root:
`…2261bab76b88` group2, `…a5e9a66dae8c5602` margaret) are **the same** after the migration. No id change, so
nothing to judge separately.

## UI (`scripts/sharing-ui-after.mjs <user>`)

| User | What was looked at | Result |
|------|------|------|
| alan | `qa-up-sharing-extra/`: share icons on all shared items; share panel of `qa-up-parent` (Lynn Can view, Mary Can edit), `qa-up-nolink` (link "qa-up no-expiration link" Can view), `qa-up-group-exp` (group2 Can edit, expires Nov 25, 2026). Shared with others (13 items), Shared via link (5), Shared with me (`qa-up-lynn-shared`, `qa-up-space-shared`, `qa-up-space-file.txt`) | pass |
| lynn | Shared with me: 9 shares incl. `qa-up-sub`, `qa-up-renamed-by-lynn.txt`, `qa-up-declined.txt` without sync icon (declined), `qa-up-group-hidden` visible; Hidden Shares: `qa-up-hidden.txt` only. Spaces: `qa-up-share-space` listed | pass |
| mary | Shared with me: 6 shares (`qa-up-parent` editable, `qa-up-sub` view, `qa-up-group-exp` editable, `qa-up-lynn-shared`); Hidden Shares: `qa-up-group-hidden` only. Spaces: `qa-up-share-space` listed | pass |
| margaret | `qa-up-share-space` members: Margaret Can manage, group2 Can view, expires Dec 15, 2026; folder `qa-up-space-shared`: Alan Can edit (expires Dec 15, 2026) + link "qa-up space item link" Can edit | pass |
| anonymous | 4 links (no-expiration view link, project-space edit link, area view link, area file drop): each asks for the password, then shows the expected content / upload page | pass |

Screenshots (in `../screens/`): `001-sharing-after-alan-folder.png`, `002-sharing-after-alan-panel-qa-up-parent.png`,
`003-sharing-after-alan-panel-qa-up-nolink.png`, `004-sharing-after-alan-panel-qa-up-group-exp.png`,
`005-sharing-after-alan-with-others.png`, `006-sharing-after-alan-via-link.png`, `007-sharing-after-alan-with-me.png`,
`001-sharing-after-lynn-with-me.png`, `002-sharing-after-lynn-with-me-hidden.png`, `003-sharing-after-lynn-projects.png`,
`001-sharing-after-mary-with-me.png`, `002-sharing-after-mary-with-me-hidden.png`, `003-sharing-after-mary-projects.png`,
`001-sharing-after-margaret-space.png`, `002-sharing-after-margaret-space-folder-panel.png`,
`001-sharing-after-public-no-exp_view_link.png`, `002-sharing-after-public-space_edit_link.png`,
`003-sharing-after-public-area_view_link.png`, `004-sharing-after-public-area_file_drop.png`.

## Guest links (auth-guest, new in dev)

Not offered: capability `files_sharing.guest_links.enabled = false` (`scripts/sharing-probe-guest.mjs`); the setting
is `OC_ENABLE_GUEST_LINKS`, "disabled by default", introduced in 9.0.0. The share panel shows no guest option.
Not smoke-tested, because enabling it needs a config change on the stack.

## Findings

No upgrade bugs. Two observations in dev, **not related to the upgrade** (they are not data loss and
have nothing to do with sharing data):

1. **"Shared with me" footer counts hidden shares** (dev web, minor, cosmetic). Seen for two users.
   - Steps: log in as lynn → Shares → Shared with me (default "Shares" filter).
   - Expected: footer matches the listed items ("Shares (9)", 9 tiles).
   - Actual: footer "10 items with 5 kB in total (6 files, 4 folders)". Same for mary: 6 tiles, footer "7 items
     … (0 files, 7 folders)". In both cases the footer counts the hidden share as well (lynn: hidden
     file → 6 files; mary: hidden folder → 7 folders).
   - Screenshot: `../screens/001-sharing-after-lynn-with-me.png`, `../screens/001-sharing-after-mary-with-me.png`.
   - Not compared with 8.1.0 (no screenshot of this view before), so it may be older behavior. Category: dev
     bug unrelated to the upgrade (web).
2. **Console error on every page** (dev web, no visible effect): `TypeError: Cannot read properties of undefined
   (reading 'current_version')`. It comes from web's `VersionCheck.vue` (update check). Seen as alan, lynn, mary,
   margaret and anonymous. Category: dev bug unrelated to the upgrade, not a sharing problem; for the lead to
   check with other areas.

No security-relevant findings.

Side effects of this run: verify uploads `qa-up-*-after.txt` into `qa-up-sub/`, `qa-up-parent/`, `qa-up-group-exp/`,
`qa-up-space-shared/`, `qa-up-sharing/link-folder/` and `qa-up-sharing/drop/` (as documented in `state/sharing-extra.md`).
