# Exploration log — OpenCloud 9.0.0

## Setup
- Instance https://cloud.opencloud.test, status.php `9.0.0+dev`, edition `dev` — a build of main with web v8.2.0
  (opencloud commit "chore: bump web to v8.2.0 (#3816)"). Release PR #3665 is still open, so this build is treated as the
  9.0.0 candidate (assumption, see report questions).
- The instance is the stack of the upgrade test 8.1.0 → 9.0.0 and holds `qa-up-*` data; explorers don't touch it.
- Guest links on, notifications service with SMTP to inbucket (http://localhost:9000), Collabora, Tika full-text search.
- Smoke: admin, dennis, margaret, alan, lynn, mary log in (1–2 console errors each: `current_version` TypeError on
  edition `dev`, known W1 of the upgrade test).
- 5 explorer batches, 45 min each:
  - B1: R0, C6, C11, C18
  - B2: C1, C12
  - B3: C2, C5, C13, C16
  - B4: C4, C3, C14, C9
  - B5: C7, C8, C10, C15, C17, C19


---

<!-- merged from results/B1.md -->

# B1 — R0, C6, C11, C18 (OpenCloud 9.0.0+dev, web 8.2.0)

Explorer batch B1, 2026-10-26 21:57–22:40 CET, desktop 1440x900, users alan and lynn. Data prefix `qa-9.0.0-B1-`.
Scripts: `scripts/B1-*.mjs` (`B1-lib.mjs` has the helpers). Screenshots are in `screens-raw/` (`*-B1-*`).
Every data change was read back via WebDAV/Graph with the user's own OIDC token from the browser session.

Console noise on every page: `404 GET /graph/v1.0/users/<id>/photo/$value` (the user has no avatar; not a finding).

## R0 — Regression smoke — **passed** (desktop; the mobile pass was not done)
- New → Folder creates `qa-9.0.0-B1-folder`. The UI and the PROPFIND agree. (`002-B1-r0-newfolder-modal.png`)
- New → Files Upload, 2 files (txt and png): both are listed in the UI and on the server. (`002-B1-r0-uploaded.png`)
- Rename via the context menu: the dialog preselects only the base name (selection 0–18, without `.txt`). The UI and the server show the new name.
- Download via the context menu: the file name and content are correct.
- Preview: clicking the png opens `/preview/...` with the image at 64x48. Escape returns to the folder.
- Copy to… (picker dialog, iframe) → folder → "Copy here": the copy is in the folder and the original stays.
- Move to… image → folder: the image is gone from the root and is in the folder (server confirms).
- Delete: the file is in the trash bin (server confirms). Restore from Deleted files (⋮ → Restore): the file is back on the server.
- Search: the preview drop shows 2 results. Enter opens the result list with the file and its copy in the folder. (`006-B1-r0-search.png`)
- Share the folder with lynn from the share panel. Graph permissions: Lynn Conway with the viewer role. Lynn sees the folder in "Shared with me". (`007-B1-r0-shared.png`, `001-B1-c6-sharedwithme.png`)
- Log out leads to the IdP sign-in page.
- Observation (not reproduced): in the first run, the log out after sharing logged
  `TypeError: Cannot read properties of null (reading 'id')` from `web-app-files-*.mjs`. The second log out showed only a 401. It is not counted as a finding.

## C6 — Delete and move need parent permissions — **passed**
Setup by alan via Graph. In `qa-9.0.0-B1-c6/` alan shared `ro/` with lynn as viewer, `rw/` as editor and
`filesonly/f.txt` (file only) as file editor.
- UI menus for lynn:
  - On `f.txt`, the share root with file-editor rights: no delete, move or rename. Only download, sync, hide share and the editor actions. (`002-B1-c6-menu-ftxt.png`)
  - On `ro/a.txt`: no delete, move or rename. (`003-B1-c6-menu-ro.png`)
  - On `rw/b.txt`: delete, move and rename are offered, as expected.
- Server, as lynn:
  - `DELETE` of `a.txt` in the viewer share returns 403.
  - `DELETE` of the file-editor share root `f.txt` returns 403.
  - `MOVE` of `f.txt` into her own space returns 403.
  - Alan's files are intact.
- Move from a share into lynn's personal space (another space): the web app asks "Copy here?" because moving between
  spaces isn't possible, then shows the conflict dialog with Skip / Replace / Keep both.
  - Keep both: lynn's own file is untouched and the copy is `… (1).txt`.
  - Replace: lynn's file is overwritten by the copy. She chose Replace, so this is expected.
  - In both cases the source stays in alan's folder. The destination was never deleted. (`001-B1-c6-cross-space-conflict.png`)
- Move a folder into its own subfolder: blocked in alan's own space with the message "You can't paste an item into
  itself", and nothing changes on the server. (`004-B1-c6-move-into-self.png`)
- Not covered: Graph unshare edge cases (already removed share, unknown share id), mary and margaret.
- Note: when lynn opens the Move dialog inside the share, `GET /graph/v1.0/drives/<shareid>` returns 404, with no visible effect.

## C11 — Uploads and conflicts — **passed with 1 minor finding**
- Uploading an existing `plain.txt` shows the conflict dialog. Escape closes it. Nothing is uploaded, the server keeps the old
  content, and no upload overlay is left behind. (`001-B1-c11-conflict-plain.png`, `002-B1-c11-after-escape.png`)
- Batch of 3 conflicts. The dialog offers "Apply to all 3 files" and Keep both. The files were:
  - `qa-9.0.0-B1-sp #%&ü😀.txt`: kept as `… (1).txt`, special characters intact on the server.
  - A 216-character name: kept as `…LLL (1).txt`, so the extension is kept.
  - A file named like an existing folder (`qa-9.0.0-B1-clash`): file vs folder conflict, kept as a second entry.
  - The upload panel says "3 files uploaded" and the list refreshed. (`003-B1-c11-conflict-batch.png`, `004-B1-c11-after-keepboth.png`)
- **Finding B1-1 (Minor)**, see below. "Keep both" inserts ` (1)` inside names that contain a dot but have no real extension.
- Not covered: public file drop (anonymous), quota check, cancel/resume, mobile.

## C18 — Navigation, deep links and file list behaviour — **passed**
- Two files deleted one after the other, then Ctrl+Z: only the latest (`x2.txt`) is restored. A second Ctrl+Z
  doesn't restore `x1.txt`, as the charter says.
- Deleted files → "Delete permanently" → Cancel: the item stays in the trash (server confirms).
- Deep links:
  - Deleted file: "Resource not found" with "Go to »Personal« page". (`003-B1-c18-deletedFile.png`)
  - Missing nested folder: the same not-found page.
  - File path used as a folder (`…/x3.txt`): the parent folder opens with the file selected.
  - `page=99`: clamped to the last page.
  - Preview of a missing file: "Resource not found".
  - Old `/files/search/list?term=` route: still works and shows search results.
- Console: each not-found deep link logs `zs: Resource not found` (an uncaught rejection in the console) besides the
  404. The user sees nothing of it.
- Not covered: back/forward with URL filters, context menus during list changes, shortcut URLs.

## Findings

### B1-1 (Minor) "Keep both" splits names with a dot but no extension at the wrong place
- Steps:
  1. Have a file `qa-9.0.0-B1-release 1.2 notes`, with no extension, in a folder.
  2. Upload a file with the same name.
  3. Choose "Keep both" in the conflict dialog.
- Expected: `qa-9.0.0-B1-release 1.2 notes (1)`.
- Actual: `qa-9.0.0-B1-release 1 (1).2 notes`, and `… 1 (2).2 notes` on the next upload. The same happens with
  `qa-9.0.0-B1-clash`, which becomes `qa-9.0 (1).0-B1-clash`. The text after the last dot is taken as the extension.
- Reproduced 3 times in 2 fresh logins (`B1-c11.mjs`, `B1-c18.mjs` twice). The server holds the odd names (PROPFIND).
- Screenshot: `screens-raw/001-B1-c18-keepboth-dotted.png`.
- Console: nothing related.
- Source: `resolveFileNameDuplicate` in `web-pkg/src/helpers/resource/conflictHandling/conflictUtils.ts` inserts
  ` (n)` before `extension`, and the caller derives the extension from the last dot.
- Known? Nothing found in `opencloud-eu/web` issues ("keep both extension dot"). It is probably old behaviour, not a regression in 8.2.0.
  Whether names like `v1.2 notes` count as having an extension is a product decision. **Question/Minor.**

## Open questions
- B1-1: should Keep both use the extension only when it looks like one (no spaces, short), as other cloud UIs do?
- Is the `TypeError: Cannot read properties of null (reading 'id')` on log out (seen once) worth a closer look?

## Leftovers
- None. alan's and lynn's `qa-9.0.0-B1-*` files and folders are deleted and purged from the trash. The shares to lynn
  were removed together with the folders, and lynn's "Shared with me" holds no B1 items.
- Local temp files are in the session scratchpad only, not in the repo.


---

<!-- merged from results/B2.md -->

# B2 — C1 (guest links in the web UI), C12 (sharing UI and public links)

Explorer B2, 2026-10-26 21:57–22:35 CET. Instance `9.0.0+dev` (edition dev). Data prefix `qa-9.0.0-B2-`, owner alan,
guests `qa-9.0.0-b2-guest1/2@example.com` (inbucket). Scripts: `scripts/B2-*.mjs`; tokens, PINs and link passwords
stayed in `scripts/B2-state.json` (git-ignored) and are not in this file. Screenshots in `screens-raw/*B2-*`.
Known issues W1 (`current_version` TypeError, seen on every page incl. guest pages), W2, F1, T1, U1 not re-reported.

## C1 — Guest links in the web UI — PASS (no new finding)

Setup (API, data prep): `qa-9.0.0-B2-guest/` with `qa-9.0.0-B2-folder/` (`a.txt`, `sub/deep.txt`), `file.txt`,
`file2.md`, `secret.txt`, `other/`.

| # | Check | Result |
|---|---|---|
| 1 | alan invites guest1 from the share panel on a folder, a .txt and a .md (3 invites, desktop): typing the address offers "… (Guest)", share listed as "Can view", toast "Share was added successfully"; one mail per share ("Alan Turing shared '…' with you", one link) (`B2-invite-done-*`) | PASS |
| 2 | Guest1 opens the folder link in a fresh desktop browser: `verify/token` 200, lands in `Shares › qa-9.0.0-B2-folder` with exactly `sub` + `a.txt` (`B2-guest-landing-*`) | PASS |
| 3 | Guest with several shares: the "Shares" root lists all 3 shares of guest1 ("Shares (3)"), not the other guest's share (`B2-guest-shares-root-*`) | PASS |
| 4 | Guest chrome: no app switcher, no global search (only "Search for shares"), nav has only "Shares", "New" disabled; user menu shows "Guest", the e-mail and "Preferences" only (no logout/IdP) (`B2-guest-usermenu-*`) | PASS |
| 5 | SSE as guest: alan uploads a file into the shared folder via WebDAV → appears in the guest's list without reload (< 12 s); delete → disappears (< 8 s) (`B2-guest-sse-*`) | PASS |
| 6 | Folder download as guest (context menu Download) → `qa-9.0.0-B2-folder.zip` | PASS |
| 7 | Text files open read-only in the text editor (`file2.md`, `a.txt`): content shown, no editable area, no save | PASS |
| 8 | "Copy permanent link" as guest → `/f/<id>` link; opening it in the guest browser opens the file in the guest context (`/text-editor/share/…/a.txt`) (`B2-guestact-permalink-open`) | PASS |
| 9 | Subfolder navigation, breadcrumb, reload keeps the guest in place; details sidebar of a file shows modified/size, no tags | PASS |
| 10 | Mobile (Pixel 7): guest2 (invited via Graph) opens the link, lands in the folder, opens `a.txt`; `layoutCheck` clean (no overflow, nothing covered) on landing, file, renew pages (`B2-m-landing`, `B2-m-file`) | PASS |
| 11 | Session expiry warning (simulated: fake browser clock 10 min before the real session expiry, server session real), mobile: toast "Your session expires soon … request a PIN" → "Request PIN" (`renew` 200, mail "Your new link to '…'" with PIN) → "Enter PIN" → PIN modal → `verify/pin` 200, stored expiry moved forward, guest stays on the page (`B2-exp-warning-10-mobile`, `B2-exp-requested-10-mobile`, `B2-exp-pin-modal-10-mobile`, `B2-exp-after-pin-10-mobile`) | PASS |
| 12 | Same within 5 min: "Request PIN" → 429 → toast "Too many PINs were requested. Please try again in 4 minutes.", button disabled (`B2-exp-requested-10-mobile` of the 2nd run, overwritten — reproduced 1×, matches the backend quota from the upgrade test) | PASS |
| 13 | `/g/renew/<permissionId>` opened with a valid session → resumes and goes back to the share (no PIN asked) | PASS (by design, `renewGuestLink.vue` resumes when a session exists) |
| 14 | Activity panel (alan, folder) shows "Alan Turing shared qa-9.0.0-B2-folder with qa-9.0.0-b2-guest1@example.com" (and guest2) | PASS |
| 15 | alan removes guest1 from `file2.md` in the share panel → guest1's Shares root shows 2 items; the mail link of the removed share → "An error occurred while opening the invitation — The shared item is no longer available. Ask the person who invited you for a new invitation." (`B2-guest1-removed-link`) | PASS |
| 16 | Reopening the used mail link in the same browser (session cookie valid, 409 on redeem) → back in the share | PASS |

Not covered (time): office files as guest (covered by upgrade R4/R5), guest on a project-space file via the UI share
panel, mail rendering details (C3), real (not clock-simulated) expiry, "expired" state (clock past expiry).

### Observations (C1, not filed)
- **O1 Guest avatar initials:** the guest avatar shows "Q90" for `qa-9.0.0-b2-guest1@…` — initials are built from the
  local part with only `.`/`_` treated as separators (`UserMenu.vue` `guestAvatarName`). Cosmetic, depends on the address.
- **O2 "Copy to" for a Viewer guest:** offered in the context menu and batch bar; the dialog only shows the shares and
  "Copy here" stays disabled (`B2-guestact-copyto`). Harmless, but an action that can never succeed (also noted in the upgrade test).
- **O3 Base URL ends the guest context:** opening `https://cloud.opencloud.test/` as a guest removes
  `oc.guestPermissionId` and shows the IdP login; the guest cookie (24 h) is still valid and the used mail link brings
  the guest back. Same as the upgrade-test observation.
- **O4 Toast above the modal backdrop:** while the "Enter PIN" modal is open, the "Your session expires soon" toast is
  not dimmed and stays above the overlay (mobile, `B2-exp-pin-modal-10-mobile`). Cosmetic.
- Guests see the admin announcement banner and "Share improvement ideas" (known from the upgrade test).

## C12 — Sharing UI and public links — PASS for the parts tested (no finding)

| # | Check | Result |
|---|---|---|
| 1 | "Add link" on a file: modal with a generated password (password enforced); Options → empty password → Copy link disabled (no inline text); `abc` → policy checklist (8+ letters, upper, numbers, special … "Requirement not met"), disabled; Generate → enabled (`B2-c12-link-weak`) | PASS |
| 2 | "Copy link and password" → clipboard holds `<link> Password: <pw>` on one line; toast says "The link has been copied to your clipboard."; link listed as "Unnamed link / Can view" with lock icon (`B2-c12-link-created`) | PASS |
| 3 | Anonymous: wrong password → "Incorrect password" inline, field red (`B2-c12-public-wrongpw`); right password → file opens in the text editor (`B2-c12-public-ok`) | PASS |
| 4 | WebDAV client on a password link: `PROPFIND /dav/public-files/<token>/` and `/remote.php/dav/public-files/<token>/` without auth → 401 with `WWW-Authenticate: Basic realm="cloud.opencloud.test", charset="UTF-8"`; Basic `public:<pw>` → 207; wrong → 401 + challenge (reva#904/#915) | PASS |
| 5 | Share views filter + no-results: "Shared with others" filter `qa-9.0.0-B2` → 2 of 23, nonsense → "No shares found — Try refining the search term or filters…"; same for "Shared via link"; desktop and mobile, layoutCheck clean | PASS |

Not covered (time): role dropdown revert on error, sync in mixed selections, link names, links on space roots,
public-link token in the preferences link, file name instead of share id.

- Note (unverified): "Shared with others" counted 23 tiles on desktop but 16 on mobile before filtering — probably
  lazy rendering of the list on the small viewport, not checked further.

## Findings
None confirmed. No security findings (`security/B2.md` not created).

## Questions for the test manager
- Should "Copy to" be hidden for guests without any writable target (O2)?
- Should the guest avatar initials handle `-` and digits (O1)?

## Cleanup / leftovers
All B2 permissions removed (3 guest shares, 2 public links), `qa-9.0.0-B2-guest/` and `qa-9.0.0-B2-links/` deleted
and purged from alan's trash (0 B2 items left). Left: guest mails in inbucket mailboxes `qa-9.0.0-b2-guest1/2`;
guest records for guest1/guest2 in auth-guest may persist on the server (no UI to delete them). `screens-raw/*B2-c12-link-modal*`
shows a generated link password — do not copy it to `screens/`.


---

<!-- merged from results/B3.md -->

# B3 — C2, C5, C13, C16 (explorer B3)

Instance https://cloud.opencloud.test, `9.0.0+dev` (edition dev), web shows "OpenCloud 9.0.0+dev dev". Run 2026-10-26
21:57–22:35 CET (45 min budget). Data prefix `qa-9.0.0-B3-`, all in alan's `qa-9.0.0-B3-media` (removed at the end).
Known issues not re-reported: W1 (`current_version` TypeError, seen on every page), W2, F1, T1, U1.

Scripts (`scripts/`, git-ignored): `B3-media.mjs` (generates media with ImageMagick, macOS `sips` for HEIC/HEIF —
`heif-enc` on this machine is broken, missing libx265 —, avifenc, ffmpeg, exiftool), `B3-setup.mjs` (upload, share
folder to lynn as Viewer, password view link, PROPFIND + preview per file), `B3-c2-ui.mjs alan|lynn [mobile]`,
`B3-c5.mjs setup|ui view|secure`, `B3-c13.mjs`, `B3-cleanup.mjs`.

## Results per charter

| Charter | Result |
|---|---|
| C2 Previews and media viewer | **Pass with notes** (no finding). HEIC/HEIF/HIF/AVIF not previewable on this instance by config, Live Photo not testable with synthetic files |
| C5 Office apps (WOPI) | **Pass** (read-only and secure view as lynn, desktop) |
| C13 Text editor | **Partly tested**: markdown round-trip only, no finding. yjs, image picker, delete-while-open not tested |
| C16 Vault | **Not tested** (time) |

## C2 — Previews and the media viewer

Data: 18 files — jpg with EXIF orientation 6, 300×3000 and 4000×300 jpg, alpha png, 4-frame gif, webp, two svg (with and
without viewBox/size), heic, heif, `.hif` (heic bytes), avif, mkv, mp4, Live Photo pair `IMG_0001.HEIC` + `.MOV`
(same Apple `ContentIdentifier` written with exiftool), 250-char name without spaces, `ünïcødé #%& 😀.png`.

API (alan, PROPFIND + `?preview=1&x=320&y=320&processor=fit`):
- jpg/png/gif/webp, long name, unicode name: `has-preview=1`, 200. gif comes back as gif, webp as jpeg.
- heic, heif, hif, avif: content types right (`image/heic`, `image/heif` — `.hif` mapped by reva#911 —, `image/avif`),
  but `has-preview=0`, preview 404.
- svg, mkv, mp4, mov: `has-preview=0`, 404 (expected, web renders them itself).
- `oc:photo` for orient6 = `orientation 6`; `oc:image` reports the stored 800×400 (not the displayed 400×800).
- HEIC with `Make/Model=Apple/iPhone 15`: `oc:photo` has camera make/model, but **no `oc:live-photo`** on either file of
  the pair.

Web UI (alan desktop, lynn desktop via "Shared with me", alan mobile Pixel 7), list and tiles:
- Thumbnails for all `has-preview=1` files in list and tiles (all 200), sidebar 448 preview of orient6 correctly
  rotated. Tiles of heic/heif/avif/mov show the generic icons.
- Media viewer: orient6 shown upright (portrait, text reads top to bottom), the photo roll shows long names truncated
  in the middle (`qa-9.0.0-B3-long_na… .jpg`), counter "6 of 13". Next/prev works, the viewer preloads the neighbours
  (1920 px previews requested for every image in the folder on desktop, 1024 on mobile). SVG scales to the stage
  (desktop and mobile). mkv plays (video readyState 4, 640 px), on desktop and mobile, also for lynn. Animated gif
  opens.
- ctrl+wheel over the image: the zoom changes only slightly (`003-B3-c2-alan-desktop-zoom.png`). Not judged as a bug.
- heic/heif/avif/Live Photo HEIC: click → dialog "No preview available for »qa-9.0.0-B3-photo.avif«… Do you want to
  download it instead?" (`006-B3-c2-alan-desktop-viewer-qa-9.0.0-B3-photo.avif.png`). This is the designed fallback of
  web#4009: the viewer opens these types only when the server has a preview (`has-preview`), and the server announces
  `preview_mime_types` from `thumbnail.NewSourceTypes(AdditionalSourceTypes)`; web#4009 relies on the dev stack with
  imagor (#3997) for heic/avif. This instance runs the default thumbnailer without extra source types → by design.
- Mobile: `layoutCheck` clean in the list and in the viewer (no overflow, nothing covered). The "covered" entries that
  appear after the heic/avif clicks are the modal dialog covering the page, expected.
- lynn (Viewer share): same results as alan, previews requested by resource id; console clean apart from W1 and one
  404 (avatar).

Not covered in C2: public-link page (link was created but not opened — time), spaces, search previews (covered in the
upgrade test), "details preview of a changed file", rw2 (no sample).

## C5 — Office apps (WOPI)

alan created `qa-9.0.0-B3-view.odt` and `qa-9.0.0-B3-secure.odt` with `POST /app/new` (both 200) inside the folder
shared with lynn as Viewer; `secure.odt` additionally shared with lynn with the role "Can view (secure)"
(`aa97fe03-…`, invite 200 — the role is enabled on this instance). lynn opened both from "Shared with me" (default app
Collabora 26.04.5.1 dev edition), run twice:

| Check | view (Can view) | secure view |
|---|---|---|
| `/app/open` | POST 200 | POST 200 |
| Header / status bar | "Read-only" | "Read-only" |
| Watermark | none | "Lynn Conway lynn@example.org" tiled (`002-B3-c5-lynn-secure-filemenu.png`) |
| File menu | Download as ›, Digital Signatures…, Print… | only Digital Signatures… |
| Typing into the document | no change | no change |
| Server state after the session | 0 bytes, sha256 unchanged | 0 bytes, unchanged |

Matches the charter: watermark only in secure view, download/print only outside secure view, no write.
Observation: the view-only File menu has no "Save As…" (upgrade test on 8.1.0 listed "Save As…" for lynn on a
docx). Probably the intended CheckFileInfo change (save-as only with write permission) — question below.
Console: once `Unable to process sse event space-member-added AxiosError 404` (getDrive) in lynn's session — caused by
the parallel run of the other explorers' space changes, not reproducible here; not reported.
Not covered: mobile flag, back button, Visio/zmd mime types, default app when several are possible, alan/mary edit.

## C13 — Text editor (markdown round-trip only)

alan: uploaded `qa-9.0.0-B3-roundtrip.md` (heading, `---`, task list, ordered list, 4-space indented line after the
list, js fence, fence inside a list item, `***`), opened it in the text editor, typed ` B3edit`, ctrl+s, read back:
- task list `- [ ]`/`- [x]` kept, js fence kept, fence inside the list item kept (indented), `---` kept.
- `***` → `---` (same thematic break), the indented line after `2. second` 4 → 3 spaces (it is a list-item paragraph
  continuation in CommonMark, not a code block — my test data was ambiguous), the blank line between `- list item` and
  its nested fence removed (loose → tight list). No content lost. The typed text landed after `- list item`, not at the
  end (ctrl+End in Playwright Chromium on macOS), so the "tight list" change could be due to the edit there.
Not covered: image picker (svg/webp), images on public links, delete the open file, yjs follow/recovery/token renewal.

## C16 — Vault

Not tested (time budget used by C2/C5).

## Findings

None confirmed. No security findings (`security/B3.md` not created).

## Questions for the test manager

1. Should HEIC/HEIF/AVIF previews work on the release build with the default (vips) thumbnailer? On this instance
   they report `has-preview=0` and web offers download instead (designed fallback). web#4009 says the dev stack uses
   imagor for these. If the release notes advertise heic/avif previews, it should say that extra source types /
   imagor are required.
2. Live Photos: a synthetic pair (exiftool `ContentIdentifier` on HEIC and MOV) gets no `oc:live-photo` property.
   Needs a real iPhone pair (and probably HEIC preview support) to test.
3. View-only Collabora session no longer offers "Save As…" — intended (CheckFileInfo save-as change, oc#3711/3712)?

## Leftovers

None on the server: shares (folder → lynn, secure file → lynn), the password link and the folder were removed,
the folder purged from alan's trash; lynn's "Shared with me" has no B3 entries. Local only (git-ignored):
`scripts/B3-*.mjs`, `scripts/B3-state.json` (contains the removed link's password), `scripts/B3-c5.json`,
`screens-raw/*B3-*`. Generated media in the session scratchpad.


---

<!-- merged from results/B4.md -->

# B4: C4, C3, C14, C9

Instance https://cloud.opencloud.test, productversion `9.0.0+dev` (edition dev). Run on 2026-10-26, 21:57–22:30 CET.
Users: alan (owner), lynn (recipient), margaret (space manager). Data prefix `qa-9.0.0-B4-` (spaces: `qa-9-0-0-B4-`,
because space names must not contain `.`). Scripts: `scripts/B4-*.mjs`. Screenshots: `screens-raw/*B4-*`.

## Setup (`B4-setup.mjs`)
In alan's personal space: folder `qa-9.0.0-B4-search/` with `zebra-report.txt` (content `aardvarkunique`, tags tagA+tagB),
`sub/zebra notes.md`, `fav-one.txt`, `tagged.txt` (tagA) and the hidden file `.qa-9.0.0-B4-hidden.txt` (content `aardvarkunique`).
API search check: name, content and tag KQL all return the expected files.
- Note: marking a favorite with WebDAV `PROPPATCH oc:favorite` returns **HTTP 403** as alan on his own file. I didn't look into it
  (9.0 may have moved favorites to another API); `release-testing/lib/api.mjs` `favorite()` no longer works on this instance.
  See open questions.

## C4: Search (query filter, tags, content) [desktop]: **passed** (partly covered)
`B4-c4-search.mjs`, alan:
- Name search `qa-9.0.0-B4-zebra`: the preview drop shows "Files / Show 2 results" with the parent folder. Enter opens the results
  page with both files (`001-B4-c4-desktop-zebra.png`).
- Content search `aardvarkunique`: 1 result with the matching snippet and the term highlighted ("why it matched" hint),
  `002-B4-c4-desktop-content.png`. The hidden file also matches. The UI hides it, and the footer says
  "2 items … (2 files including 1 hidden, 0 folders)". This looks like the intended hidden-results behaviour.
- Tag name as the search term (`…tagB`): finds zebra-report and shows the tag as the match hint (`003-…-tagterm.png`).
- Leading and trailing spaces around the term: same 2 results.
- Tags filter on the results page: the dropdown lists the tag (`004-…-tagdrop.png`). After selecting tagA, 2 results
  (`005-…-tagfilter.png`). `q_tags` goes into the URL, and the filter and results survive a reload.
- `.space` and `readme`: no results. No `.space` content and no personal root show up.
- Old bookmark `/files/search/list/all?term=…`: still loads and shows the results (the URL keeps `/list/all`). The current results URL
  is `/files/search/list?...`.
- `is:favorite`: 0 results. Alan had no favorites, because the API call above failed and I didn't set one in the UI, so
  **is:favorite / scope: with AND/OR is not really tested.**
- Not tested (time): paging after a filter change, search provider failure, mobile run, margaret/lynn.
- Console: only W1 (`current_version` TypeError, known) and 404s from loading resources.
- Observation: the results heading truncates the term early ("Search results for "aardvarku..."") although there is
  plenty of horizontal space.

## C3: Mail notifications in the new design: **passed with 1 finding**
`B4-c14-share.mjs`, `B4-c3-mail.mjs`, `B4-c3-mail2.mjs`. Inbucket mailbox `lynn` (lynn@example.org, language en).
- Share mail (alan → lynn, file with a long unicode name), unshare mail, space invite mail (margaret adds lynn to
  `qa-9-0-0-B4-space-Ünï-😀`), folder share mail from a project space: all 4 arrive within a few seconds and use the new
  design (card, button, "Or open this link", footer) (`003-B4-c3-mail-Margaret_Hamilton_invited_you_.png`). Unicode and
  emoji render correctly in the subject and body. The language is English (en), as set for lynn.
- Links: share mails → `https://cloud.opencloud.test/files/shares/with-me`. Space invite → `/f/<space id>`, which is correct.
  The unshare mail has no link (intended). **No link has `target="_blank"`**, and the templates in
  `services/notifications/pkg/email` don't contain `_blank` anywhere, so "open in a new tab" is not implemented in the
  mail HTML (see questions).
- The logo is embedded as a `cid:` inline attachment (`opencloud-logo.png`, `opencloud-logo-dark.png`). It doesn't show in
  the inbucket "Safe HTML" view or when the HTML is rendered directly. That is expected for cid images in those viewers. Not
  checked in a real mail client.
- Not tested: guest invite and renew mails (B2 area), link-created mail, per-event mail settings and interval. I didn't
  change lynn's settings, so nothing needs restoring.

### Finding B4-1 (Minor): long file names without spaces break the layout of the new notification mail
- Steps: 1. As alan, share a file named `qa-9.0.0-B4-Ünïcödé-日本語-😀-` + 150×`x` + `.txt` with lynn. 2. Open the "Alan Turing
  shared '…' with you" mail in inbucket (or render its HTML). The unshare mail looks the same.
- Expected: the card keeps its width (about 600px). The heading and the sentence wrap or break the long name.
- Actual: the long name doesn't wrap. The heading and body text run past the card, the card stretches beyond the viewport, and the
  footer moves off-centre. At a phone width of 400px the document is **1817px wide**, so the button and link are partly cut off.
  With normal names the card is centred and correct (space invite mail).
- Reproduced: 2 different mails (share 20261026T210704-0032, unshare …-0033), rendered 3 ways: direct HTML at 1440px, the inbucket web UI
  and 400px width. Each time in a fresh page.
- Screens: `screens-raw/001-B4-c3-mail-Alan_Turing_shared_qa-9.0.0-B.png`, `screens-raw/001-B4-c3-inbucket-20261026T210704-0032.png`,
  `screens-raw/002-B4-c3-narrow-20261026T210704-0032.png`. Compare with the correct `003-B4-c3-mail-Margaret_Hamilton_invited_you_.png`.
- Server state: n/a. The HTML contains some `word-break`/`overflow-wrap` CSS, but it doesn't apply to the title/body text.
- Known? `gh issue list -R opencloud-eu/opencloud --search "mail notification long name overflow"`: nothing relevant.
- Related to oc#3789 (new mail design).

## C14: Notifications and live updates [desktop + mobile]: **passed**
`B4-c14-share.mjs` (desktop and `mobile`). lynn had "Shared with me" open, and alan shared and unshared through Graph:
- The new share shows up in lynn's list **without a reload after about 1 s** (SSE), and the bell badge goes from 9 to 10.
  After the unshare the row disappears without a reload. Desktop and mobile.
- The notification drop shows the new share notification with a long unicode/emoji name that wraps correctly
  (`002-B4-c14-desktop-drop.png`). Clicking the notification closes the drop and goes to
  `/files/shares/with-me?scrollTo=<id>`, and the shared item is highlighted (`003-…-after-notif-click.png`).
- Mobile (Pixel 7): notifications open as a bottom drawer with a close button. Long names wrap
  (`002-B4-c14-mobile-drop.png`). No horizontal overflow. The "covered" controls in `layoutCheck` are only the
  drawer's modal backdrop.
- Space notification "Margaret Hamilton added you to Space qa-9-0-0-B4-space-Ünï-😀" shows up with the emoji.
- Observation: clicking a notification doesn't mark it as read (the badge stays at 10). Probably intended.
- Not tested: mark-all-read failure. I didn't use "Mark all as read" on lynn, because it would also mark the
  notifications of the other batches (B2/B5) as read. Not tested either: SSE for the sharer's recipient list.

## C9: Keyboard and screen-reader accessibility [desktop]: **passed** (sample)
`B4-c9-keyboard.mjs`, alan in `qa-9.0.0-B4-search`:
- Tab order from the top is logical: skip link → banner → search → header buttons → New → nav → breadcrumb → view
  toggles. Every focused control has a visible 2px outline (the search input has 1px plus a border).
- Space on a row checkbox selects the row, and the live region says "1 item selected. Actions are available above the table."
- Enter on the row context menu button opens the menu with focus inside it. Escape closes it, and **focus returns to the trigger
  button**.
- Search announcements: typing gives an `aria-live=polite` "2 results", and Enter on the results page announces "Navigated to Search
  results" plus "2 results".
- Minor observations, not confirmed: tab stop 4 is a link with an empty accessible name in my heuristic (probably the logo
  link, whose name comes from the img alt, which my check ignores). ArrowDown in the search field keeps DOM focus in the input
  (probably `aria-activedescendant`).
- Not tested: keyboard copy/cut/paste and permissions, editor, forms, Escape after focus loss in modals.

## Leftovers
None. `B4-cleanup.mjs` deleted alan's `qa-9.0.0-B4-search` folder and the share test files, purged only the
`qa-9.0.0-B4-*` items from alan's trash, and disabled and purged margaret's space `qa-9-0-0-B4-space-Ünï-😀`.
The mails and notifications in lynn's inbucket mailbox and notification list stay (B4 share/unshare/space notifications).
No settings were changed.

## Open questions
1. WebDAV `PROPPATCH oc:favorite` → 403 for the owner on 9.0.0+dev. Is that intended (favorites moved to another API)? If
   not, it is a regression for WebDAV clients. **Not verified in the UI, so this is not a finding yet.** It is worth a quick check (star a
   file in the UI and look at the network call).
2. Should links in the new mails open in a new tab (charter C3)? The templates have no `target="_blank"`. In mail clients that is
   usually irrelevant.
3. Since the favorite couldn't be set, `is:favorite` / `scope:` combined with AND/OR still needs a run with real favorites.


---

<!-- merged from results/B5.md -->

# Batch B5: C7, C8, C10, C15, C17 (C19 not tested)

Instance 9.0.0+dev (edition dev), desktop 1440x900 and Pixel 7. Window 21:57 to 22:42. Scripts: `scripts/B5-*.mjs`.
Console noise on every page: W1 (`current_version` TypeError) and some 404s on static resources. Both are known from the upgrade test and are filtered out below.

Assumption: the space-name validation rejects `.`, so spaces were named `qa-9-0-0-B5-*` instead of `qa-9.0.0-B5-*`.

## C7 Space quotas and space lifecycle (P2): passed, 1 known issue
- Create space dialog (admin, Spaces > New > Options > Advanced): the quota select offers `1 GB (Default) | 2 GB | 5 GB | 10 GB | 50 GB | 100 GB | No restriction`. The default (capability `default_quota` 1e9) is preselected.
- Created 4 spaces and checked each one in Graph:
  - default: `total` 1000000000
  - typed `2.5`: 2500000000
  - typed `0`: "No restriction", `total` 0
  - typed `0.0000015`: shown as "2 kB", stored as 1500 bytes, so the value is rounded to whole bytes as intended.
- Space lists:
  - Projects list view shows a "Remaining quota" column: 2.5 GB, 999.8 MB, 2 kB, Unrestricted.
  - Admin > Spaces shows Total/Used/Remaining.
  - Sorting by Total quota works in both directions, with Unrestricted largest.
- The manager re-enables a disabled space. Alan was made manager through Graph, then admin disabled the space. Alan sees it in Spaces as "Disabled" ("6 spaces in total (including 1 disabled)"), and the context menu offers Enable and Details. The Enable dialog and its confirmation re-enable the space, and Graph confirms it is no longer `deleted`. Screens: `B5-c7-alan-ctx`, `B5-c7-alan-enable-modal`.
- A viewer (lynn) of a disabled space:
  - The space is not listed.
  - Its deep link `/files/spaces/project/<id>` shows "Resource not found" with a "Go to »Spaces Overview«" button.
  - Its permalink `/f/<id>` shows "Private link – An error occurred while resolving the link". Clean UI, no crash.
- **Known, not new**: creating a space with a quota smaller than the space template (~171 kB, here 1500 B) shows the "Creating space failed..." toast and logs `POST /graph/v1.0/drives?template=default` → 500, but the space is created on the server (empty, no template) and appears after a reload. This is opencloud#3791 (closed as not planned). Screen: `011-B5-c7-created-qa-9-0-0-B5-tiny.png` (first run).
- Not covered: member sorting in the sidebar (my sidebar locator didn't match), editing the quota of an existing space, leaving a space.

## C8 Branding, theme and list views (P2): passed
- Login page:
  - The logo and buttons are lilac.
  - Keyboard focus is visible: 2px white outline plus a 6px dark ring on the logo link (`B5-c8-loginpage-focus`).
- Files view:
  - Only two view toggle buttons (tiles and list); the condensed view is gone.
  - Sort menu options: A-Z, Z-A, Largest, Smallest, Recently modified, Least recently modified.
- Folders come first for every sort direction: Name asc and desc, Size asc and desc.
- Dark mode (auto theme plus OS dark): the app background is dark (`rgb(29,32,33)`). A markdown file in the editor renders its link in a light colour with `target=_blank` (`B5-c8-md-dark`).
- Preferences page: language, theme (Auto), WebDAV info, notifications. **I found no custom font size or font type option**; maybe it is configured only by the theme. See question 1.
- Mobile: no horizontal overflow on the files list.

## C10 App Store (P2): passed
- `/app-store` lists 21 apps with tag chips, a search, a tiles/list toggle and image cards. No broken images.
- Sorting checked against the order computed from `apps.json`:
  - A-Z, Z-A: correct.
  - Newest, Oldest (by first release date): correct.
- Tag filter goes into the URL (`q_tag=markdown`).
- App details page: version list with release dates, "Requires OpenCloud X or newer", and a Download button. A resource link with `%25` in it is kept intact.
- Store unreachable (request aborted, HTTP 500, or invalid JSON): each shows "The apps could not be loaded" (`B5-c10-store-abort/500/badjson`).
- Compatibility: with `minOpenCloud` injected as 99.0.0, Admin > Apps shows the installed Maps 3.1.0 as "Incompatible" (`B5-c10-extensions-incompatible`). The App Store detail page only shows the requirement text, which matches the source (`useOpenCloudRequirement`).
- There is no install/uninstall in the store UI, only Download, so nothing was installed.
- Mobile: no overflow, no offscreen controls.

## C15 Admin settings: users, groups, app tokens (P2): passed (partly covered)
- The user search term goes into the route (`q_displayName=qa-up`) and is kept after a reload.
- Create user with a whitespace-only password: "Password cannot be empty" appears, Confirm is disabled, and no user is created.
- A password with surrounding spaces is accepted (no error). This looks intended.
- Created user `qa-9.0.0-B5-u1` and group `qa-9.0.0-B5-grp` in the UI; the "User was created successfully" toast appeared.
- Account page of the new user (after adding it to the group through Graph) shows "Group memberships: qa-9.0.0-B5-grp".
- App Tokens page shows the "No app tokens found" empty state with a New button.
- Not covered: creating app tokens (status, notes), shift/space selection, failed deletions, admin renaming themselves.

## C17 Mobile layout (P2): passed (short check)
- Admin Users, Spaces and Groups tables on Pixel 7 reduce to name + actions. No horizontal overflow.
- A floating "+" button sits bottom right. It overlaps the action icons of the row underneath while scrolling, which is normal for a FAB. I did not check whether the last row stays reachable at the end of the list. See observation O2.
- Files list in tiles view with the FAB, no overflow.
- Not covered: preview swiping, bottom drawers as dialogs, page-size select, Save as. My context-menu locator didn't open the drawer.

## C19 Small backend fixes (P3): not tested (out of time)

## Findings
### F-B5-1 (Minor): space name validation message shows a double backslash and a stray apostrophe
- Steps:
  1. Admin > Spaces > New.
  2. Type a name with a dot, e.g. `qa-9.0.0-B5-default`.
- Expected: `The Space name cannot contain the following characters: / \ . : ? * " > < |`
- Actual: `The Space name cannot contain the following characters: / \\ . : ? * " > < |'` (seen in the dialog text).
- Source: `web-pkg/src/composables/resources/useIsResourceNameValid.ts:86`, msgid `'... / \\\\ . : ? * " > < |\''`. The string is fixed, so this reproduces every time.
- Evidence: I captured the dialog text only once and took no screenshot of the message. Needs a screenshot before filing.
- Not new in 9.0.0 as far as I know. Did not search gh issues (no time).

## Observations
- O1: Space names cannot contain `.`. Names like `Release 9.0` are rejected. This is long-standing validation, not new.
- O2: Mobile admin tables: the FAB covers the edit and context-menu icons of the row underneath it (layoutCheck "covered": Edit, Show context menu). Not confirmed as a real blocker.

## Questions for the test manager
1. C8 "custom font size and type" (oc#3631?): where is it configured? It is not on the Preferences page.
2. App Store install/uninstall: the store only offers Download. Is installing done manually on purpose?

## Cleanup
All B5 data removed:
- 4 spaces disabled and purged
- user `qa-9.0.0-B5-u1` and group `qa-9.0.0-B5-grp` deleted
- alan's folder `qa-9.0.0-B5-sort` deleted and removed from the trash bin

No global settings changed. No `qa-up-*` data touched.


---

## Main agent
- F-B5-1 (space name message) confirmed by the main agent: `scripts/M-space-name.mjs`, 2 fresh logins as margaret,
  screenshots `M-space-name-run1/2`. Reported as F3.
- Report IDs: F1 = B1-1, F2 = B4-1, F3 = F-B5-1.
