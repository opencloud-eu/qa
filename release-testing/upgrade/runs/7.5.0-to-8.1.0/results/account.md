# Area account — verify after the upgrade (7.5.0 → 8.1.0)

Users: `qa-up-account` (base data, language de) and `qa-up-account2` (extra data, see `state/account-extra.md`).
Every failure was reproduced twice (`scripts/account-extra-verify.mjs` and `scripts/account-after-ui.mjs`).

## Checks (`run.mjs verify account`)

| Check | Before (7.5.0) | After (8.1.0) |
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
| E2 | Unread in-app notification "Alan Turing shared qa-up-notify.txt with you", bell badge 1 | pass | **fail** (F1) |
| E3 | Share `qa-up-notify.txt` in Shared with me | pass | pass |
| E4 | Per-event options: Share Removed in-app off / mail on; Added as space member in-app on / mail off | pass | pass (API and UI rows match) |
| E5 | `disable-email-notifications` = true | pass | pass (value kept, but no longer visible in the UI, F2) |
| E6 | App token `qa-up-token2` listed | pass | pass |
| E7 | `qa-up-token2` authenticates WebDAV PROPFIND (basic auth) → 207 | pass | pass |
| E8 | Dark Theme from the saved browser state (`state/account-dark.json`) | pass | pass (8.1.0 honours the stored localStorage value, UI dark) |
| E9 | "Show WebDAV information in details view" from the saved browser state | pass | pass |

## UI review (8.1.0, redesigned account pages)

- `qa-up-account`: whole UI in German (`<html lang="de">`, "Profil", "Einstellungen", "DSGVO", "App-Token"),
  avatar kept (red circle), language select "Deutsch - German", email interval "Wöchentlich" (seeded weekly),
  app token `qa-up-token` listed with created/expiry dates, GDPR page loads. Theme "Automatisch" in a fresh browser
  — expected (theme is browser-side). No console errors.
  Screens: `screens/account-profile-de-after.png`, `screens/account-preferences-de-after.png`,
  `screens/account-preferences-de-bottom-after.png`, `screens/account-app-tokens-de-after.png`.
- `qa-up-account2`: English UI, per-event notification table shows the seeded values, app token `qa-up-token2`
  listed (expires 2027-01-20), reopened browser state shows Dark Theme and the WebDAV option checked.
  Screens: `screens/account2-dark-theme-after.png`, `screens/account2-app-tokens-after.png`.
- Side note, not upgrade-related: in the German UI the notification row "File rejected — Notify when a file I uploaded
  was rejected because of a virus infection or policy violation" is not translated (`screens/account-preferences-de-bottom-after.png`).
- Console of `qa-up-account2` shows several HTTP 404 resource loads (most likely the avatar request for a user
  without an avatar); no visible effect.

## Findings

### F1 — Unread in-app notifications are lost by the upgrade

- Steps: on 7.5.0 alan shares `qa-up-notify.txt` with `qa-up-account2`; the notification is not marked as read.
  Upgrade to 8.1.0 (containers recreated). Log in as `qa-up-account2`, look at the bell; call
  `GET /ocs/v2.php/apps/notifications/api/v1/notifications`.
- Expected: notification still listed, bell badge 1.
- Actual: 0 notifications for `qa-up-account2` and also for `qa-up-account`, no badge. The share itself is kept (E3 pass).
  Reproduced twice (extra-verify script and UI script, API and bell).
- Evidence: before `screens/account2-notification-before.png` (badge 1), after `screens/account2-no-badge-after.png`.
- Analysis: the `userlog` service stores notifications in `USERLOG_STORE`, whose default is `memory` in both v7.5.0 and
  v8.1.0 (`services/userlog/pkg/config/defaults/defaultconfig.go`), and opencloud-compose sets neither
  `USERLOG_STORE` nor `OC_PERSISTENT_STORE`. Every container restart drops all notifications, not only an upgrade.
- Verdict: **upgrade-visible data loss, not a regression of 8.1.0** (same behaviour on a 7.5.0 restart, per code; not
  tested by restart). Not a seed problem (passed before). Suggestion: opencloud-compose should configure a persistent
  store for userlog (e.g. `nats-js-kv`), or the upgrade notes should mention it. Component: opencloud-compose / opencloud (userlog default).

### F2 — "Receive notification mails" off from 7.5.0 is hidden in 8.1.0 and cannot be switched back on

- Steps: on 7.5.0 user unchecks Account → Preferences → "Receive notification mails" (`disable-email-notifications` = true).
  Upgrade to 8.1.0. Open Account → Preferences as that user (`qa-up-account`, `qa-up-account2`).
- Expected: the stored choice is visible and can be changed (either the old checkbox or the per-event Mail column reflects "off").
- Actual: 8.1.0 shows only the per-event In-App/Mail table; the global checkbox is gone. For `qa-up-account` all Mail
  boxes for share and membership events are checked, although `disable-email-notifications` is still true on the
  server (verify check passes). Reproduced twice (both users, two runs).
- Why: web shows the global checkbox only when the capability `notifications.configurable` is false
  (`accountPreferences.vue`, `v-if="showNotifications && !canConfigureSpecificNotifications"`); the frontend default
  `FRONTEND_CONFIGURABLE_NOTIFICATIONS` is `true` in v8.1.0 (not set in v7.5.0). The notifications service in v8.1.0
  still drops all mails for users with `disable-email-notifications` = true (`disableEmails()` in
  `services/notifications/pkg/service/service.go`). Mail delivery itself was not tested end to end (no mail sink).
- Evidence: before `screens/account2-preferences-before.png` (checkbox unchecked), after
  `screens/account-preferences-de-after.png` and `screens/account-preferences-de-bottom-after.png` (all Mail boxes checked, no global toggle).
- Verdict: **upgrade bug** (setting kept, but invisible and not reversible in the UI; users who opted out on 7.x see
  mail "on" and get no mails). Severity medium. Component: web (preferences page) / opencloud (frontend capability default).
