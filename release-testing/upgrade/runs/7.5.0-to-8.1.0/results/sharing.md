# Sharing — verify after the upgrade (7.5.0 → 8.1.0)

Date: 2026-10-22. Instance: compose project `qa-upgrade`, `opencloudeu/opencloud-rolling:8.1.0` (yjs added), search re-index done.

**Verdict: no upgrade bugs in sharing.** All 12 area checks and all 15 extra checks pass after the upgrade, same as before.
The UI shows every share, role, expiration date and link as seeded.

## Area checks (`run.mjs verify sharing`)

| Check | Before | After |
|---|---|---|
| permissions on for-lynn.txt | PASS | PASS |
| permissions on for-group | PASS | PASS |
| permissions on link-folder | PASS | PASS |
| permissions on drop | PASS | PASS |
| user share keeps role and expiration | PASS | PASS |
| links keep type and url | PASS | PASS |
| lynn sees the user share | PASS | PASS |
| mary sees the group share | PASS | PASS |
| public link opens with password | PASS | PASS |
| public link refuses without password | PASS | PASS |
| edit link can upload | PASS | PASS |
| file drop accepts upload | PASS | PASS |

12/12 before, 12/12 after (`results/sharing-before.json`, `results/sharing-after.json`).

## Extra data (`scripts/sharing-extra-verify.mjs after`, see `state/sharing-extra.md`)

| ID | Item | Before | After API | After UI |
|---|---|---|---|---|
| E1 | `qa-up-parent/`: lynn Viewer + mary Editor | PASS | PASS (lynn read-only, mary can upload) | PASS: panel shows Lynn "Can view", Mary "Can edit" |
| E2 | `qa-up-parent/qa-up-sub/`: lynn Editor with expiration, mary Viewer | PASS | PASS (lynn can upload, expiration unchanged) | PASS: Lynn "Can edit" with expiration Jan 20, 2027, Mary "Can view", plus the two shares inherited from the parent |
| E3 | `qa-up-nolink/` view link with password, no expiration | PASS | PASS (same URL and type, no expiration; opens with password, refused without) | PASS: link listed with password icon, no expiration icon; anonymous: wrong password shows "Incorrect password", right password lists `inside.txt` |
| E4 | `qa-up-hidden.txt` hidden by lynn | PASS | PASS (`@UI.Hidden=true`) | PASS: not in lynn's "Shares", only under "Hidden Shares" |
| E5 | `qa-up-declined.txt` declined by lynn | PASS | PASS (`@client.synchronize=false`) | PASS: listed in "Shared with me" without the "synced" status icon (other shares have it) |
| E6 | `qa-up-renamed.txt` mountpoint renamed by lynn | PASS | PASS (lynn sees `qa-up-renamed-by-lynn.txt` with the content) | PASS: lynn's list shows the new name, alan's list the original name |
| E8 | lynn's `qa-up-lynn-shared/`: alan Editor, mary Viewer with expiration | PASS | PASS (alan and mary see it, mary's expiration unchanged) | PASS: lynn's panel shows Alan "Can edit", Mary "Can view" expiring Dec 6, 2026 |
| E4–E6 owner side | alan still has lynn's share on all three files | PASS | PASS | PASS: all three in alan's "Shared with others" |

15/15 before, 15/15 after.

### Graph `PATCH {name}` on a received share (retry from the seed)

`scripts/sharing-after-patch-rename.mjs`: lynn sends `PATCH /graph/v1beta1/drives/<share jail>/items/<mount id>` with
`{ "name": "qa-up-renamed-by-patch.txt" }` on the E6 mount, twice.

- Both attempts: HTTP 200, the response and `sharedWithMe` still show `qa-up-renamed-by-lynn.txt`, a GET on the new name in the share jail returns 404.
- **Same behaviour as on 7.5.0**, so not an upgrade change. The handler in `services/graph/pkg/service/v0/api_drives_drive_item.go`
  (`UpdateDriveItem`) only applies `@UI.Hidden` and ignores every other field; renaming a mountpoint works only through
  WebDAV `MOVE` in the share jail. Side effect: because the handler always sets `Hidden` from the body, a `PATCH {name}`
  without `@UI.Hidden` also unhides a hidden share. E6 was not hidden, so the seed data is unchanged (E6 still PASS).

## UI walk-through

Script: `scripts/sharing-after-ui.mjs` (alan, lynn, anonymous). Screenshots in `screens/`:

| What | Result | Screenshot |
|---|---|---|
| alan "Shared with others": 9 items (for-group, qa-up-parent, qa-up-sub, for-lynn.txt, qa-up-declined/hidden/renamed.txt, plus items from the editors and account areas) with avatars of the recipients | OK | `screens/001-sharing-after-alan-with-others.png` |
| Panel for-lynn.txt: Lynn "Can edit", expiration Dec 21, 2026, internal link "qa-up internal link" | OK | `screens/002-sharing-after-alan-panel-for-lynn.png` |
| Panel for-group: qa-up-share-group "Can view" | OK | — |
| Panel qa-up-parent: Lynn "Can view", Mary "Can edit" | OK | `screens/004-sharing-after-alan-panel-parent.png` |
| Panel qa-up-sub: own shares + inherited shares from the parent | OK | `screens/005-sharing-after-alan-panel-sub.png` |
| alan "Shared via link": drop, link-folder, qa-up-nolink, for-lynn.txt | OK | — |
| Panel link-folder: "qa-up edit link" (Can edit, password), "qa-up view link" (Can view, password, expiration) | OK | `screens/008-sharing-after-alan-panel-link-folder.png` |
| Panel drop: "qa-up file drop" (Secret File Drop, password) | OK | `screens/009-sharing-after-alan-panel-drop.png` |
| Panel qa-up-nolink: two links "qa-up no-expiration link" (see note) | OK | `screens/010-sharing-after-alan-panel-nolink.png` |
| lynn "Shared with me": 6 visible items with permission and sync status; declined item without sync icon | OK | `screens/011-sharing-after-lynn-with-me.png` |
| lynn "Hidden Shares": only qa-up-hidden.txt | OK | `screens/012-sharing-after-lynn-with-me-hidden.png` |
| lynn's own share panel (qa-up-lynn-shared) | OK | `screens/013-sharing-after-lynn-panel-own-share.png` |
| Anonymous view link: wrong password → "Incorrect password"; right password → folder content; "New" button disabled | OK | `screens/015-sharing-after-anon-view-link-wrong.png`, `screens/016-sharing-after-anon-view-link-open.png` |
| Anonymous no-expiration link (E3): same flow, lists `inside.txt` | OK | — |

## Findings

### S1 — two "qa-up no-expiration link" links on `qa-up-nolink/` — seed problem, not an upgrade bug
- Steps: alan → Shares → Shared via link → qa-up-nolink → Shares panel.
- Expected: one link. Actual: two links with the same name.
- `state/sharing-extra.json` (`alanPerms`, written before the upgrade) already lists two view links, so the seed script
  created the link twice (re-run). The upgrade kept both. Screenshot `screens/010-sharing-after-alan-panel-nolink.png`.
- Verdict: **seed problem**, no action.

### S2 — console `TypeError: Cannot read properties of undefined (reading 'replaceAll')` when opening the share panel of an item with an internal link — not an upgrade bug
- Steps: log in as alan → Shares → Shared with others (or Shared via link) → right-click `for-lynn.txt` → Shares.
- Expected: no console errors. Actual: `TypeError ... reading 'replaceAll'` from `getTranslation`/`gettext` in the
  design-system chunk; the panel itself renders correctly (internal link listed).
- Reproduced 3 times on the seeded file, and with **fresh items created on 8.1.0** (`scripts/sharing-after-probe-internal.mjs`):
  the error appears for every item with an internal link (`internal-only.txt`, `both.txt`), not for an item with only a user share.
- Verdict: **not an upgrade bug** — web 8.1.0 calls `$gettext` with `undefined` somewhere when it renders an internal link.
  No visible impact found. Candidate for a separate low-severity web issue.
  Test items left behind: `qa-up-sharing-after/` in alan's personal space.

### Notes (no finding)
- Avatar requests `GET /graph/v1.0/users/<id>/photo/$value` return 404 for users without a photo (expected).
- lynn's context menu on a received folder (`qa-up-sub`, Editor) has no "Shares" action; recipients cannot reshare on this
  version anyway (E7 dropped in the seed), so nothing to compare.

## Scripts
- `scripts/sharing-extra-verify.mjs after` — extra checks (API).
- `scripts/sharing-after-patch-rename.mjs` — Graph `PATCH {name}` retry (restores E6 if the rename ever works).
- `scripts/sharing-after-ui.mjs` — UI walk-through.
- `scripts/sharing-after-probe.mjs`, `scripts/sharing-after-probe-internal.mjs` — S2 and the disabled "New" button on a view link.
