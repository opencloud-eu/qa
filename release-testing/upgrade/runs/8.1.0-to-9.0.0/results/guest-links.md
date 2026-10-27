# Guest links (auth-guest) on the upgraded instance

Feature: opencloud PR #3609 and follow-ups, service `auth-guest`. Tested 2026-10-26 on the `qa-upgrade` stack after the
upgrade from `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php `9.0.0+dev`).

## Setup
- `opencloud init --diff` with the dev image, patch applied (adds `auth_guest.service_account`), stack recreated with
  `OC_ENABLE_GUEST_LINKS=true`, `OC_ADD_RUN_SERVICES=notifications`, SMTP to inbucket on the host.
- Sharer **alan** (personal space, folder `qa-up-guest/`), **margaret** (project spaces `qa-up-guest-space`,
  `qa-up-guest-space7`). Guests `qa-up-guest{1..7}@example.com`, mails read through the inbucket REST API.
- Guest browser = fresh Playwright context (no cookies) for each check. Tokens, PINs and session cookies were kept in
  `state/guest-state.json` (git-ignored) and never printed.
- Scripts: `scripts/guest-*.mjs` (`guest-setup`, `guest-ui-share`, `guest-open`, `guest-session`, `guest-renew`,
  `guest-renew2`, `guest-space`, `guest-space-probe`, `guest-space-repro`, `guest-ui-space-probe`, `guest-remove`,
  `guest-notify`, `guest-mail-shot`, `guest-mail-logo`, `guest-ui-download`, `guest-app-probe`, `guest-office`).

| Share | Created by | Resource | Role |
|---|---|---|---|
| file1 → guest1 | alan, Graph `invite` `{email}` | `qa-up-guest-file.txt` | Viewer |
| folder2 → guest2 | alan, **web UI share panel** | `qa-up-guest-folder/` (subfolder + files) | Can view |
| file4 → guest4 | alan, Graph | `qa-up-guest-file4.txt` (renew/PIN tests) | Viewer |
| file5 → guest5 | alan, Graph | `qa-up-guest-file5.txt` (removal test) | Viewer |
| space3 → guest3 | margaret, Graph `root/invite` | whole project space `qa-up-guest-space` (SpaceShared) | Space Viewer |
| spacefile6 → guest6 | margaret, Graph | `qa-up-guest-space-file.txt` in the project space | Viewer |
| spacerepro7 → guest7 | margaret, Graph `root/invite` | whole project space `qa-up-guest-space7` | Space Viewer |

## Checks

| # | Check | Result |
|---|---|---|
| 1 | Capability `files_sharing.guest_links` = `{"enabled":true}` | PASS |
| 2a | Guest share of a file via Graph (`recipients: [{email}]`): permission with `@libre.graph.userType: Guest` | PASS |
| 2b | Guest share of a folder via the UI share panel: typing the address offers "qa-up-guest2@example.com (Guest)", share created, listed as "Can view" ([01](../screens/guest-01-share-panel-suggestion.png), [02](../screens/guest-02-share-panel-shared.png)) | PASS |
| 3 | Invitation mail in inbucket within ~2 s for every share (file, folder, space, space file); subject "Alan Turing shared '…' with you", sender "Alan Turing via OpenCloud", exactly one link `https://cloud.opencloud.test/g/…`, "valid for 30 minutes", new HTML design ([03](../screens/guest-03-mail-invitation.png)) | PASS |
| 4a | File link in a fresh browser: redeem 200, HttpOnly/Secure session cookie, opens the file in the text editor, content visible ([04](../screens/guest-04-file-landing.png)) | PASS |
| 4b | Folder link: lands in "Shares › qa-up-guest-folder", shows exactly the subfolder and file, "New" disabled; subfolder navigable; "Shares" root lists only the shared folder ([05](../screens/guest-05-folder-landing.png)) | PASS |
| 4c | Read/download per role (Viewer): WebDAV GET of file/inner/deep file 200, archiver zip 200, UI "Download" saves the file ([06](../screens/guest-06-folder-context-menu.png)); PUT/MKCOL/DELETE refused (403), `/app/new` refused (403) | PASS |
| 4d | Guest cannot list alan's other files or reach other users'/spaces' data via WebDAV or Graph (details not in this file) | PASS |
| 4e | Guest session on a file of a project space (spacefile6): only that file, other files of the space not reachable | PASS |
| 5 | Token single-use: second redeem of the same link from another client → **409** `tokenAlreadyRedeemed`; reopening the used link in the same browser with a valid session goes back to the share | PASS (file1, folder2, space3, spacefile6) |
| 6a | Renew with a session: 200, nonce cookie set, mail "Your new link to '…'" with a 6-digit PIN and a new link ([07](../screens/guest-07-mail-renewed-pin.png)); old link → 401 `tokenInvalid` | PASS |
| 6b | `verify/pin`: correct PIN from the renewing browser → 200 + new session; from another browser (no nonce) → 400; PIN single-use; renewed link still redeemable once after PIN verify (then 409) | PASS |
| 6c | Wrong PIN backoff: 401 `pinInvalid`, then 429 with `Retry-After` 1/2/4/8 s; after 5 failures the PIN is invalidated (`nonceInvalid`, correct PIN refused); the magic link from the same mail still works | PASS |
| 6d | Renew quotas: second renew with session within 5 min → 429 (`Retry-After` ≈ 296 s); renew without session right after a redeem → 429 (≈ 38 s) | PASS |
| 6e | Silent renew (no session) once the newest link is used: 200, no nonce cookie, mail without PIN ([08](../screens/guest-08-mail-renewed-nopin.png)), new link works; again while the newest link is unused → 200, no mail | PASS |
| 7 | Removing the share invalidates guest access immediately: sharedWithMe/PROPFIND/GET → 401; renew/redeem → 404 `tokenNotFound` (record deleted). Tested for alan's file (ShareRemoved), margaret's space file and the whole space (SpaceUnshared) | PASS |
| 8 | Guest share on a project space: backend works (invite, SpaceShared consumed, mail, session, read-only WebDAV access to the space, removal) — **web UI cannot open it**, see F1 | **FAIL** |
| 9 | Pre-upgrade shares and links: `sharing-extra-verify.mjs after` → **35/35 PASS** | PASS |
| 10 | Normal notification mails reach inbucket: alan shares with lynn and mary → mail after ~2 s each, new design ("View shares" button, plain-text part included) ([12](../screens/guest-12-mail-lynn-share.png)) | PASS |

## Findings

### F1: A guest invited to a whole project space cannot open it in the web UI
Reproduced twice (`qa-up-guest-space` → guest3, `qa-up-guest-space7` → guest7). Not an upgrade bug: the guest-links
feature is new in 9.0.
- **Steps:** margaret `POST /graph/v1beta1/drives/<space>/root/invite` with `recipients: [{"email": "qa-up-guest7@example.com"}]`,
  role Space Viewer (accepted, permission listed with `userType: Guest`, mail "Margaret Hamilton shared
  'qa-up-guest-space7' with you" arrives). Open the link from the mail in a fresh browser.
- **Expected:** the guest sees the project space (read-only), as with a file or folder share. The auth-guest README
  lists `SpaceShared` / `SpaceUnshared` as consumed events, so space shares are meant to be supported.
- **Actual:** `verify/token` 200 and a valid session (WebDAV PROPFIND of the space by its id → 207, files readable,
  upload 403), but `GET /graph/v1beta1/me/drive/sharedWithMe` returns an empty list. The web resolves the guest share
  only from sharedWithMe (`resolveGuestLink.vue` → `guestSessionManager.findSession`), so it shows **"An error
  occurred while opening the invitation — The shared item is no longer available."** (console
  `guest link could not be resolved: shareNotFound`) ([09](../screens/guest-09-space-invitation-error.png)).
- **Follow-on:** opening the (now used) link again sends the guest to the renew page. The browser still has a valid
  session cookie, so the backend issues a **PIN** mail, but the web thinks there is no session (`withPin: false`). The
  page only says "Check your inbox … open it to continue" and has **no PIN field**, while the mail says "enter the PIN
  on the page where you requested the new link" ([10](../screens/guest-10-space-renew-no-pin-field.png)). Each such
  reopen also uses one of the 5 daily session renewals and invalidates the previous link.
- The space members panel in the UI offers no guest for an e-mail address ("No users or groups found."), so the
  space case can only be reached through Graph today ([11](../screens/guest-11-space-members-no-guest.png)).
- **Likely component:** web (guest context from sharedWithMe only) and/or graph (sharedWithMe does not return space
  memberships of guests), or the Graph API should refuse an e-mail recipient on a space root while the UI does not
  support it.
- **Severity:** medium for the feature (an accepted invitation that cannot be used), low overall (API-only path).

## Observations (not filed)
- A guest who opens the base URL (`https://cloud.opencloud.test/`) with a valid guest session lands on the IdP login
  page. The share is only reachable again through the mail link or the guest route.
- Guests see the admin announcement banner ("qa-up announcement banner") and the "Share improvement ideas" button.
- Guest context menu offers "Copy to" although a guest has no own space (not followed up).
- Console `TypeError: Cannot read properties of undefined (reading 'current_version')` on the files view, also for
  alan (not guest-specific).
- `PROPFIND /dav/spaces/<sharedWithMe item id>` (share-jail id) → 404 for guests; the web uses the remote item id,
  which works.
- Office documents could not be tested for guests: `/app/list` is empty for alan as well (no `collaboration`
  container in the recreated stack), `/app/open` → 500 "Error contacting the requested application".
- The mail logo is an inline `cid:` image; inbucket's safe-HTML view does not render it, so the logo was not verified.
- `docker ps` showed `qa-upgrade-opencloud-1` up for ~17 min at the end of the run, so OpenCloud was restarted while
  this test was running. Guest sessions and link records created before the restart still worked afterwards.

## Re-check after the collaboration fix
The stack was recreated again with `OC_ADD_RUN_SERVICES=notifications,collaboration` (the previous recreation had
dropped the `collaboration` service by mistake, see the observation about `/app/list` above). Script:
`scripts/recheck-office.mjs alan|old|new` (no file is changed; the guest's write attempt is checked by sha256 through alan).

| # | Check | Result |
|---|---|---|
| R1 | `node release-testing/lib/smoke.mjs`: all 6 users log in and see their personal space | PASS |
| R2 | `GET /app/list` as alan: HTTP 200, 65 mime types, provider `CollaboraOnline` (odt, ods, odp, docx, xlsx, pptx, …) | PASS |
| R3 | alan opens `qa-up-editors/qa-up-doc.odt` (Collabora doc from the 8.1.0 seed) in the UI: `/external-collaboraonline/…`, `POST /app/open view_mode=write` → 200, editor loads in "Editing" mode with the 8.1.0 marker; file unchanged (nothing typed) ([14](../screens/guest-14-office-owner-editing.png)) | PASS |
| R4 | New guest share (alan, Graph, role Viewer) of `qa-up-guest/qa-up-guest-folder/qa-up-guest-doc.odt` to `qa-up-guest9@example.com`: mail "Alan Turing shared 'qa-up-guest-doc.odt' with you"; link in a fresh browser lands directly in `/external-collaboraonline/share/qa-up-guest-doc.odt`, web calls `/app/open view_mode=read` → 200, Collabora shows **"Read-only"** (header and status bar), only File/Edit/View/Help menus. Typing + Ctrl+S → file unchanged ([13](../screens/guest-13-office-guest-readonly.png)) | PASS |
| R5 | Guest2 (folder share, invited **before** this recreation): the stored session cookie is still valid (sharedWithMe 200), the folder lists in the UI, `qa-up-guest-doc.odt` opens in Collabora **read-only** (`view_mode=read`), typing + Ctrl+S → file unchanged. Sessions of guest1 and guest4 (two browsers) are also still valid; guest6's session → 401 as expected (its share was removed in check 7) | PASS |

Note: `POST /app/open` with `view_mode=write` sent directly by the Viewer guest also returns 200 with a Collabora URL,
as for internal Viewers on 8.1.0 (see `state/editors-extra.md` baseline): the read-only decision is made through WOPI,
not by `/app/open`. The web UI always asks for `view_mode=read` for the guest. Opening that write-mode URL was not tried.

No failures, so nothing had to be reproduced. Office documents for guests are now tested (replaces the observation
"Office documents could not be tested for guests" above).

## Data left on the instance
alan: `qa-up-guest/` (files, `qa-up-guest-folder/` incl. `qa-up-guest-doc.odt`, `qa-up-guest-other/`,
`qa-up-guest-notify.txt` shared with lynn and mary; guest shares file1, folder2, file4 and office9 (guest9, odt) still
active; file5 removed). margaret: project spaces `qa-up-guest-space` (guest3 and guest6 removed) and
`qa-up-guest-space7` (guest7 active).
