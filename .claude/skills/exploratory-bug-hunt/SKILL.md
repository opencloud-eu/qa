---
name: exploratory-bug-hunt
description: Agent-driven bug hunt across the whole OpenCloud web UI (not tied to a changelog). Parallel subagents explore one area each, guided by the web source code, deliberately break flows (cancel, back/forward, slow or failing requests, other roles), then a second round verifies every candidate. Produces release-testing/exploratory/releases/hunt-<date>/report.md. Use for /exploratory-bug-hunt or "hunt for bugs in the web UI".
---

# Exploratory bug hunt (OpenCloud web)

Arguments (all optional): `areas=<ids>` (default: all), `budget=<minutes>` (default 240), `agents=<n>` parallel
explorers (default 5), `mobile` (add a phone pass to every area).

The release test (`/release-exploratory-test`) checks whether the **changes of a release** work. This skill has a
different goal: find **real, user-visible functional bugs anywhere in the web UI**, especially off the happy path.
Every finding must be reproduced twice and backed by a screenshot; a cause in the source code is a strong plus.

All paths are relative to `release-testing/exploratory/` in the opencloud-eu/qa repo. Run folder: `releases/hunt-<YYYY-MM-DD>/` (= RUN).
It lives under `releases/` on purpose, so `release-testing/lib/oc.mjs` and the `.gitignore` rules work unchanged.

## Shell rules
Same as `/release-exploratory-test` (the hook `.claude/hooks/bash-guard.mjs` enforces them): one simple command per
Bash call from the repo root, no chains/pipes/background/polling, never read `release-testing/.env`, run Playwright scripts
in the foreground (split scripts that need more than 10 minutes). Subagents follow the same rules.

## What counts as a bug
- In scope: actions that do nothing or the wrong thing, lost or wrong data, wrong server state after a UI action,
  page errors / unhandled rejections, endless spinners, failed requests the UI ignores, wrong permissions or actions
  offered that then fail, UI and server out of sync (stale lists, counts, quota), broken back/forward or deep links.
- Out of scope: pure cosmetics/layout nitpicks, translations, server-only bugs the web can't fix or guard, features that
  are no longer supported (e.g. internal links), and anything already reported (`gh issue list -R opencloud-eu/web
  --search "<keywords>" --state all`, also opencloud-eu/opencloud).
- An "observation" is only something that may be intended. If a user-visible flow breaks (e.g. a file can't be reopened
  after removing its extension), it is a finding, not an observation.

## 0. Preconditions (stop and ask if one fails)
- Same as `/release-exploratory-test` step 0: `.env` present, test instance only, `node release-testing/lib/smoke.mjs` OK.
- Create RUN and write `releases/hunt-<date>` into `releases/.current`.
- A read-only checkout of the web source at `~/Work/opencloud/web` on the deployed version (`git -C ~/Work/opencloud/web log -1` is not
  allowed by the hook — ask the user to check out the matching tag if unsure). Without it the hunt still works, but
  code-guided exploration (step 2a) is skipped.

## 1. Areas
Write `RUN/areas.md` with one row per area: ID, area, main flows, roles, viewport, source folders to read. Default set:

| ID | Area | Source to read first |
|---|---|---|
| H1 | Files: list/tiles, selection, keyboard, rename, copy/cut/paste, drag & drop, breadcrumbs, pagination | `packages/web-app-files`, `packages/web-pkg/src/components/FilesList`, `composables/keyboardActions` |
| H2 | Upload, download, trash (restore/delete), conflicts (skip/replace/keep both/merge) | `web-app-files/src/HandleUpload.ts`, `helpers/resource/actions`, `helpers/resource/conflictHandling` |
| H3 | Sharing: people, groups, roles, expiration, Shared with me/others/via link | `web-app-files/src/components/SideBar/Shares`, `web-pkg/src/composables/piniaStores/shares` |
| H4 | Public links: create/edit/password, open as anonymous, upload links, file drop | `web-runtime/src/pages/resolvePublicLink.vue`, `web-pkg/src/composables/links` |
| H5 | Spaces: create (with options), members, quota, image/readme, disable/enable/delete, live updates | `web-app-files/src/views/spaces`, `web-pkg/src/composables/spaces` |
| H6 | Viewers and editors: preview, text editor, app wrapper, deep links | `web-app-preview`, `web-app-text-editor`, `web-pkg/src/editor`, `web-pkg/src/components/AppTemplates` |
| H7 | Search: preview, results page, filters, scope, back/forward | `web-app-search`, `web-app-files/src/components/Search`, `web-pkg/src/composables/search` |
| H8 | Admin settings: users, groups, spaces, apps; batch actions, filters, sidebars | `web-app-admin-settings` |
| H9 | Account: preferences, app tokens, avatar, password, notifications | `web-runtime/src/pages/account`, `components/Topbar` |
| H10 | Runtime: login/logout, permanent links (`/f/<id>`), vaults, embed mode, mobile layout | `web-runtime/src/router`, `pages/resolvePrivateLink.vue`, `web-app-rclone-crypt` |

Drop areas whose feature is not on the instance (probe like `/create-charters` does) and list them as not tested.

## 2. Explore — parallel subagents
Start `agents` subagents at a time (Agent tool), one area each, until all areas are done or the budget is used.
Give each subagent this brief (fill in the area):

> You hunt for functional bugs in area <ID> of the OpenCloud web UI. Read `.claude/skills/exploratory-bug-hunt/SKILL.md`
> sections "Shell rules", "What counts as a bug", 2a–2c and "Safety rules" and follow them. Prefix everything you create
> with `qa-hunt-<ID>-`. Scripts go to `RUN/scripts/<ID>-*.mjs`. Write every candidate to `RUN/candidates/<ID>.md`
> (title, steps, expected, actual, screenshot, console errors, suspected cause with file:line). Work until you have
> covered the area or used <minutes> minutes, then report the candidates.

### 2a. Code first (if `~/Work/opencloud/web` exists)
Spend the first minutes reading the area's source and note suspicious spots to target, for example:
- async actions without error handling, promises that are not awaited, missing `try/finally` around loading flags;
- modals/dialogs whose cancel/close path never resolves, `onCancel` not wired;
- state kept only in a ref while the URL has a query param (back/forward won't sync), route watchers missing;
- lists not refreshed after an action, counts/sizes/quota computed once;
- checks with `||` / truthiness that treat `0` or `''` as "not set";
- data loaded lazily per item (e.g. `memberOf`, permissions) that actions read before it arrives;
- name/length validation that differs from the server (bytes vs characters, trimming);
- keyboard handlers bound globally that ignore the focused element.

### 2b. Break the flow
For every main flow do the happy path once, then the disturbances that apply:
- **Cancel paths:** Escape, the X button, clicking the backdrop, Cancel — then continue with the next action.
- **Navigation:** browser Back/Forward, reload in the middle of a flow, deep link straight into a state, open in a second tab.
- **Timing:** double click, fast typing over a running request, select A then B quickly.
- **Network:** delay a request (`page.route(url, async r => { await sleep(3000); await r.continue() })`) and abort one
  (`r.abort()`); check that spinners stop, errors are shown and nothing stays stuck.
- **Roles and users:** viewer/editor/manager/admin, a second user watching the same resource (live updates).
- **Data:** empty, one item, many items (pagination), 0 / unlimited values, whitespace-only and very long names,
  names with `( ) + # % & ?`, nested folders, files vs folders with the same name.
- **Keyboard:** Tab to controls, Space/Enter on focused checkboxes and buttons, arrow keys, Shift ranges.
- **Mobile** (if `mobile` or the area is mobile-relevant): Pixel 7 via `open({ viewport: 'mobile' })` and `layoutCheck()`.

### 2c. Observe like a tester
- After each meaningful step: `shot()`, look at the screenshot (Read the PNG), check `consoleErrors` and failed requests.
- **Verify the server state**, not only the UI: list the folder via WebDAV, read the share/space/user via Graph. To call
  the API from a script, log in with `login(page, …)` and use `page.request` with the user's access token taken from the
  web app's browser storage (the OIDC client keeps the signed-in user in `sessionStorage`, or `localStorage` when the
  instance enables local token storage); don't pass passwords around.
- Prepare test data through WebDAV/Graph instead of clicking it together.

## 3. Verify — second round
When the explorers are done, start verifier subagents (up to `agents`), each with a batch of candidates. A verifier:
- reproduces the candidate **twice from a fresh login**, using its own `qa-hunt-v-` data;
- checks it on the code (cause, file:line) if the source is available, and searches for known issues;
- marks it **confirmed** (with severity), **not reproducible**, **duplicate** or **out of scope**, with a reason.
Only confirmed findings go into the report. Severity: Blocker (data loss, security, core flow broken) · Major (a flow
doesn't work, no workaround) · Minor (workaround exists) · Question (unclear if intended).

## 4. Report and hand-over
- `RUN/report.md` from `report-template.md` in this folder; one issue draft per finding in `RUN/issues/<ID>.md`
  (title line + body ready for `gh issue create --body-file`, with steps, expected, actual, cause and a fix idea).
- Copy the evidence screenshots to `RUN/screens/` (typically ≤ 40).
- Commit `release-testing/exploratory/releases/hunt-<date>` on branch `exploratory/hunt-<date>`. **Do not push, do not create issues.**
- Chat summary: counts by severity, top findings, areas covered / not covered, findings that need a human decision.

## Safety rules
- Test instances only. Prefix everything with `qa-hunt-…` and clean it up at the end (delete and purge from the trash).
- **Before any delete, disable or batch action, verify right before clicking that exactly the intended rows are
  selected and that every selected name has your prefix.** If a search/filter is involved, wait for and check the
  filtered list first. Never select rows by position in an unfiltered list.
- Clean up by id or exact name, never by prefix matching across users' data.
- Never change or delete admin/demo users, their data, or spaces/groups you did not create; restore any global setting.
- Security-relevant findings only to `RUN/security/` (git-ignored), never in the report; tell the user in chat.
- No load testing, brute force or exploitation.
