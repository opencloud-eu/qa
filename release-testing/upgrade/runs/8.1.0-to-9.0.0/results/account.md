# Area account — verify after the upgrade (8.1.0 rolling → dev 9.0.0+dev)

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php 9.0.0+dev).
Users: `qa-up-account` (base data, language de) and `qa-up-account2` (extra data, see `state/account-extra.md`).
The read-only checks ran first, before anyone opened the bell. Every failure was reproduced twice
(`scripts/account-extra-verify.mjs after` and `... after-repro`, plus `scripts/account-after-ui.mjs`).
Screenshots are in `../screens/` (numbering restarts in each script run, so the names below are complete).

## Checks (`run.mjs verify account`)

| Check | Before (8.1.0) | After (dev) |
|-------|:-:|:-:|
| login with the changed password | pass | pass |
| language de | pass | pass |
| setting disable-email-notifications | pass | pass |
| setting auto-accept-shares | pass | pass |
| setting email-sending-interval-options | pass | pass |
| avatar kept | pass | pass |
| app token listed | pass | pass |
| GDPR export file exists | pass | pass |

8/8 before, 8/8 after.

## Extra data (`scripts/account-extra-verify.mjs`)

| ID | Item | Before | After |
|----|------|:-:|:-:|
| E1 | `qa-up-account2` can log in | pass | pass |
| E2 | Unread notification "Alan Turing shared qa-up-notify.txt with you" | pass | **fail** (F1) |
| E3 | Unread notification "Admin added you to Space qa-up-account2-space" | pass | **fail** (F1) |
| E4 | Notification marked read (`qa-up-notify-read.txt`) stays gone | pass | pass (not meaningful: the list is empty) |
| E5 | Shares `qa-up-notify.txt` and `qa-up-notify-read.txt` in Shared with me | pass | pass |
| E6 | Member of space `qa-up-account2-space` | pass | pass |
| E7 | Per-event options: Share Removed in-app off / mail on; Added as space member in-app on / mail off; Space disabled in-app off (API) | pass | pass |
| E8 | Email sending interval `daily` (API) | pass | pass |
| E9 | App token `qa-up-token2` listed | pass | pass |
| E10 | `qa-up-token2` authenticates WebDAV PROPFIND (basic auth) → 207 | pass | pass |
| E11 | Dark Theme from the saved browser state (`state/account-dark.json`) | pass | pass |
| E12 | "Show WebDAV information in details view" on, from the saved browser state | pass | pass |
| E13 | UI shows the E7 checkboxes and interval "Daily" | pass | pass |
| E14 | Bell badge 2 | pass | **fail** (F1, empty bell) |

16/16 before, 13/16 after. The 3 failures are one finding (F1).

## UI review (dev)

- `qa-up-account`: the whole UI is in German (`<html lang="de">`, "Profil", "Einstellungen", "DSGVO"). Avatar kept,
  app token `qa-up-token` listed as "Aktiv" (expires 25. Nov. 2026), GDPR page loads. No notifications (API 0, no badge).
  Screens: `001-account-after-files.png`, `002-account-after-information.png`, `003-account-after-preferences.png`
  … `006-account-after-preferences-scroll3.png`, `007-account-after-gdpr.png`, `008-account-after-app-tokens.png`.
- `qa-up-account2` with the saved browser state: UI dark, Theme "Dark Theme", WebDAV option checked, per-event table
  and "Daily" as seeded (`001-account2-after-preferences.png`). Fresh browser: Theme falls back (browser-side setting,
  expected); app token `qa-up-token2` listed as Active, expires Jan 24, 2027 (`016-account2-after-app-tokens.png`).
- New notifications still work after the upgrade (`scripts/account-after-notify.mjs after`): alan shares
  `qa-up-notify-after.txt` → API lists "Alan Turing shared qa-up-notify-after.txt with you", the bell shows badge 1 and
  the dropdown shows it (`001-account2-after-new-badge.png`, `002-account2-after-bell-open.png`). Only the
  notifications from before the upgrade are gone.
- Mail notifications were not looked at (out of scope).

## Findings

### F1 — Unread in-app notifications are lost by the upgrade (same as U1 in 7.5.0 → 8.1.0)

- Steps: on 8.1.0 alan shares `qa-up-notify.txt` with `qa-up-account2` and admin adds the user to the space
  `qa-up-account2-space` (both notifications unread, badge 2); a third notification (`qa-up-notify-read.txt`) is marked
  read. Upgrade to dev (containers recreated). As `qa-up-account2`, call
  `GET /ocs/v2.php/apps/notifications/api/v1/notifications` and open the Files page with the saved browser state.
- Expected: 2 unread notifications, bell badge 2; the read one stays gone.
- Actual: 0 notifications for `qa-up-account2` (and for `qa-up-account`), no badge. The shares and the space membership
  themselves are kept (E5, E6). The read one stays gone, but only because nothing is left. Reproduced twice (two runs of
  the extra-verify script, plus the UI script: API 0 and no badge for both users).
- Evidence: before `../screens/002-account2-files-dark-before.png` (badge 2), after
  `../screens/002-account2-after-files.png` and `../screens/002-account2-after-repro-files.png` (no badge).
- Cause: `userlog` keeps notifications in `USERLOG_STORE`, whose default is still `memory` on main
  (`services/userlog/pkg/config/defaults/defaultconfig.go`, `Store: "memory"`). In the running dev container neither
  `USERLOG_STORE` nor `OC_PERSISTENT_STORE` is set (`printenv` returns nothing), so any container recreation drops all
  notifications. New notifications after the upgrade work (see UI review).
- Verdict: **upgrade-visible data loss, not a regression of dev**. It is the same behaviour as in 7.5.0 → 8.1.0 (U1),
  still not fixed. Not a seed problem (16/16 before). Component: opencloud-compose (no persistent store for userlog)
  / opencloud (`memory` default). Suggestion as before: configure `nats-js-kv` for userlog in opencloud-compose, or
  mention it in the upgrade notes.

### Side notes (not upgrade bugs)

- **Carried over from 7.5.0 → 8.1.0 (F2 there), still present:** `qa-up-account` has `disable-email-notifications` =
  true on the server (verify check passes), but Account → Preferences shows every Mail box for share and membership
  events as checked, and there is no global "receive notification mails" switch (`003-account-after-preferences.png`
  and the scroll screenshots). Same in 8.1.0, so not caused by this upgrade.
- **dev only, not related to the upgrade:** on every page the console logs
  `TypeError: Cannot read properties of undefined (reading 'current_version')`. Web's `VersionCheck.vue` reads
  `updates.channels[edition].current_version`, and the update feed has no channel for edition `dev`. The error is
  caught; the visible effect is only that the footer shows "OpenCloud 9.0.0+dev dev" without the "Up to date" line that
  8.1.0 showed. Expected for a dev build, not expected in a release.
- `qa-up-account2` console: some HTTP 404 resource loads (most likely the avatar of a user without one), as in 8.1.0;
  no visible effect.
- German UI: the "File rejected" notification row is still not translated (as in 8.1.0).

## Data added after the upgrade

- `qa-up-account2-share/qa-up-notify-after.txt` (alan), shared with `qa-up-account2`; its notification is unread
  (the bell was opened but nothing was marked read).
