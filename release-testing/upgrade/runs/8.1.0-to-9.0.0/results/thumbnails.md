# thumbnails — push-based thumbnailer (opencloud PR #3397) on the upgraded instance

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php `9.0.0+dev`), config migrated
with `opencloud init --diff` + patch. Verified on 2026-10-26, follow-up to `results/files.md` (owner previews,
size/type diffs and the new cache are covered there and not repeated here). Expectations are taken from
`services/webdav/README.md` and `services/webdav/MIGRATION.md` on main, and the defaults in the code
(`WEBDAV_THUMBNAILS_MAX_INPUT_IMAGE_FILE_SIZE` / `OC_THUMBNAILS_MAX_INPUT_IMAGE_FILE_SIZE` = 50MB,
`THUMBNAILS_MAX_INPUT_WIDTH/HEIGHT` = 7680, `THUMBNAILS_MAX_ANIMATION_FRAMES` = 100).

**Result: no upgrade bug.** Pre-upgrade files preview for share recipients, for every space role, on pre-upgrade
public links and in search and sidebar. The password link answers 404 (not 500) before the password is entered.
One dev bug that is not caused by the upgrade: a truncated PNG answers 500 with `processor=fit` (T1).

Scripts (all in `scripts/`, run twice, r1 and r2, same results):
- `thumbs-setup.mjs <media dir>`: test data, see "Data" below.
- `thumbs-api.mjs`: 106 API checks, **105 pass, 1 fail (T1)** in both runs.
- `thumbs-ui.mjs lynn|mary|public|alan`: web UI, records every `?preview=1` request.
- Access-control probes are a separate script. Their results are not in this file.

## Data

Pre-upgrade data used as is: alan's `qa-up-files-extra/previews` (10 preview sources), `mime/`, `sizes/qa-up-zero.png`,
`qa-up-files/versions.txt`; sharing-extra shares E1–E11 and the area links (view, edit, file drop); the space images and
readmes of `qa-up-space` and `qa-up-space-many`; `docs/versions.txt`.

New data (prefix `qa-up-thumbs`): the pre-upgrade folder `previews` shared with group `qa-up-share-group2` (lynn + mary,
Viewer), the pre-upgrade `qa-up-portrait-900x1600.jpg` shared with lynn (Viewer), a new password view link on
`previews`. Copies of the pre-upgrade landscape jpg in the pre-upgrade shares `qa-up-parent`, `qa-up-group-exp`,
`qa-up-nolink`, in the link folder and the file-drop folder, and in `qa-up-space` / `qa-up-space-many`
(`qa-up-thumbs-space.jpg`). Generated limit files in alan's `qa-up-thumbs/`.

## Checks

| # | Check | Result |
|---|-------|--------|
| **1** | **Share recipients** | |
| R1 | lynn and mary: group share of the old `previews` folder, all 10 types, 64×64 via the share jail | pass (10/10 `200 image/*`, both users) |
| R2 | same via the mount-space path `/dav/spaces/<mount id>/file`, 320×320 fit | pass (png 320×240 with alpha) |
| R3 | lynn (Viewer) and mary (Editor): image in the pre-upgrade share `qa-up-parent` | pass |
| R4 | lynn: text preview of the pre-upgrade `qa-up-parent/parent.txt` | pass |
| R5 | lynn: pre-upgrade subfolder share `qa-up-sub` (Editor, expiry) | pass |
| R6 | lynn: pre-upgrade renamed mountpoint `qa-up-renamed-by-lynn.txt` | pass |
| R7 | lynn: hidden share still previews | pass |
| R8 | lynn: single-file share of the old portrait jpg, jail path and mount path 1920×1920 fit | pass (900×1600) |
| R9 | lynn does not see the group share `for-group` of a group she is not in | pass |
| R10 | lynn: pre-upgrade file share `for-lynn.txt` (FileEditor, expiry) | pass |
| R11 | mary: pre-upgrade group Editor share `qa-up-group-exp` (image), group share `for-group/inside.txt`, lynn's share `qa-up-lynn-shared` | pass |
| R12 | Web "Shared with me", list and tiles (lynn, mary): file shares show thumbnails (web asks by resource id, `/dav/spaces/<id>?preview=1`), folders show the folder icon | pass ([screenshot](../screens/002-thumbs-r1-lynn-shared-with-me-tiles.png)) |
| R13 | Web: shared folder `previews` opened from "Shared with me", tiles view, all 10 thumbnails (lynn, mary) | pass ([screenshot](../screens/003-thumbs-r1-lynn-share-previews-folder.png)) |
| R14 | Web: pre-upgrade share `qa-up-parent` as lynn, list view | pass ([screenshot](../screens/004-thumbs-r1-lynn-share-qa-up-parent-folder.png)) |
| **2** | **Project spaces, roles** | |
| P1 | `qa-up-space`: mary (Space Viewer), lynn (Space Editor), margaret (Manager): `.space/image.png`, `docs/versions.txt`, image | pass (all 200) |
| P2 | `qa-up-space-many`: dennis (Viewer), alan (Editor), lynn (Manager): `.space/qa-up-image.png`, image | pass |
| P3 | space image via Graph `special[image].webDavUrl` + `?preview=1` (all 6 user/space pairs) | pass |
| P4 | `.space/readme.md` (`text/markdown`, not a source type, also not on 8.1.0) → 404, no 5xx | pass |
| P5 | Web: Spaces overview tiles with space images, space header image, image tile in the space (mary Viewer, lynn Editor) | pass ([screenshot](../screens/005-thumbs-r1-mary-space-qa-up-space.png)) |
| **3** | **Public links** (all password-protected, see note) | |
| L1–L6 | 6 links, 5 of them from 8.1.0 (view + expiry, edit, view without expiry, edit link on a project-space folder, view link on a project-space root, new view link on the old `previews`): preview **without password → 404** (GET and HEAD), not 500 | pass (6/6) |
| L1–L6 | forged `signature` → 404 | pass |
| L1–L6 | with the `oc:signature-auth` from PROPFIND (what web uses) → 200 for every file, HEAD 200 | pass (19 files incl. space image and pre-upgrade txt) |
| L1–L6 | `Basic public:<password>` without signature → 404 | recorded (only the signature works; web uses the signature) |
| L7 | pre-upgrade file-drop link: no preview without password (404), with signature (403 "no download permission"), with Basic (404); download is 403 too | pass |
| L8 | Web: password page first, no preview request before the password; after the password all thumbnails are shown, signed requests only | pass ([before](../screens/001-thumbs-r1-public-new-view-link-previews-before-password.png), [after](../screens/002-thumbs-r1-public-new-view-link-previews-after-password.png)) |
| L9 | Web: file-drop page shows no files and makes no preview request | pass ([screenshot](../screens/006-thumbs-r1-public-old-file-drop-after-password.png)) |
| L10 | link without password | not possible: `createLink` → 400 "password protection is enforced" (same as on 8.1.0) |
| **4** | **`oc:has-preview`** (PROPFIND depth 1, 4 folders, 37 entries) | |
| H1 | `has-preview=1` → 200 `image/*` for every source that can be read (23) | pass |
| H2 | `has-preview=0` → 404 (10: pdf, md, csv, json, html, svg, js, zip, noext, 64 MiB bin) | pass |
| H3 | folders: `has-preview` comes back as 404 propstat (not reported); `?preview=1` on a folder → 400 "Unsupported file type", no 5xx | pass |
| H4 | per type: jpg, png, gif, webp, mp3, txt, `UPPER.TXT` = 1; the rest = 0 | pass; matches the 8.1.0 list (webp was already on in the vips build) |
| H5 | Web: in `mime/` only `UPPER.TXT` shows a thumbnail, all others an icon, i.e. web follows `has-preview` | pass ([screenshot](../screens/001-thumbs-r1-alan-mime-list.png)) |
| **5** | **Request edge cases** on the pre-upgrade `qa-up-landscape-1600x900.jpg` | |
| E1 | only `x=300` → 320×180 (320 on the ladder, height unconstrained, fitted) | pass |
| E2 | only `y=300` → 569×320 | pass |
| E3 | only `x=5000` → 1600×900 (cap 2048, fit-in never enlarges) | pass |
| E4–E6 | `x=0` (with/without y), `y=0` → 400 | pass |
| E7 | no x/y → 32×32 | pass |
| E8 | `x=5000&y=5000` → 2048×2048 | pass |
| E9–E14 | 256×256 with `processor=fit-in` 256×144, `fit` 256×144, `fill` 256×256, `thumbnail` 256×256, `resize` 256×256, `bogus` 256×256 (= none) | pass |
| E15–E17 | `fill` with only x → 400, `resize` with only y → 400, `fit-in` with only x → 256×144 | pass |
| E18–E19 | `x=-5`, `x=abc` → 400 | pass |
| E20 | 18×12 → 32×16 (README example) | pass |
| E21 | `preview=0` → original file | pass |
| E22 | `a=1`, `a=0`, `scalingup=0/1`, `c=deadbeef` → byte-identical to the plain request | pass |
| E23 | `x=447` and `x=448` → same bytes, 448×448 | pass |
| E24 | gif without processor → 256×256 gif, 10 frames (resize) | pass |
| **6** | **Limits** (files generated with ffmpeg/ImageMagick) | |
| X1 | 71 MB png (above 50MB) → 403 "image is too large" | pass |
| X2 | 29 MB png 4500×4500 → 200 | pass |
| X3 | 8000×200 jpg (wider than 7680) → 403 "image is too large" | pass |
| X4 | gif with 150 frames (> 100) → 403 "image is too large" | pass |
| X5 | gif with 100 frames → 200, 100 frames | pass |
| X6 | corrupt jpg (JPEG header + random bytes) → 404 | pass |
| X7 | truncated png (first 2000 bytes of a valid png) → 404 | **fail: 404 at 64×64 `thumbnail`, 500 at 320×320 `fit`** → T1 |
| X8 | text named `.png` → 404 | pass |
| X9–X10 | zero-byte jpg (new) and zero-byte png (8.1.0) → 404 | pass |
| X11 | Web: tiles of `qa-up-thumbs/`: readable sources show a thumbnail, refused ones the image icon, no broken page | pass ([screenshot](../screens/002-thumbs-r1-alan-thumbs-limits-tiles.png)) |
| **7** | **Search and sidebar** (pre-upgrade landscape jpg) | |
| W1 | sidebar preview (`448×448 fit` → 448×252) | pass ([screenshot](../screens/003-thumbs-r1-alan-sidebar-landscape.png)) |
| W2 | search dropdown preview (64×64) | pass ([screenshot](../screens/004-thumbs-r1-alan-search-dropdown.png)) |
| W3 | search results list and tiles (320×320 fit → 320×180) | pass ([screenshot](../screens/006-thumbs-r1-alan-search-results-tiles.png)) |
| **8** | **Versions** | |
| V1 | Web versions panel (image with 2 versions): lists versions without any preview, no preview request is made | n/a: web does not show version previews ([screenshot](../screens/007-thumbs-r1-alan-versions-panel.png)) |
| V2 | API `?preview=1` on `/dav/meta/<id>/v/<version>` (pre-upgrade `versions.txt` and new jpg) → 404 "404 page not found" | recorded: no thumbnail route for versions, same routes as on 8.1.0 |

## Findings

### T1 — truncated PNG: `processor=fit` answers 500, `fill` answers 404 (dev bug, not an upgrade bug)

- Steps: upload a PNG cut after 2000 bytes (`qa-up-thumbs/qa-up-thumbs-truncated.png`, alan), then
  `GET /dav/spaces/<alan drive>/qa-up-thumbs/qa-up-thumbs-truncated.png?scalingup=0&preview=1&a=1&x=320&y=320&processor=fit`
  (what the web tiles view asks).
- Expected: 404, like a corrupt jpg or the same file with `processor=thumbnail` ("A source the generator cannot read
  answers 404", webdav README).
- Actual: **500** "could not generate thumbnail" (API r1 and r2, web UI r1 and r2). Log:
  `generate: generator returned status 500: failed to encode image`. With `x=64&y=64&processor=thumbnail` the generator
  answers "failed to process image" (406) and webdav maps it to 404. The fit-in path gets past the decode of the
  truncated data and fails in the encode step, and the generator reports that as a 500.
  The web UI shows the generic image icon, so users do not see it ([screenshot](../screens/002-thumbs-r1-alan-thumbs-limits-tiles.png),
  console: `HTTP 500`).
- Classification: dev bug in the new pipeline (thumbnails generator / webdav error mapping, PR #3397). It is not an
  upgrade bug: the file was created after the upgrade, and on 8.1.0 it was not tested. Clients treat a 500 as
  "try again" and not as "no preview", so the request repeats. Severity low.

### Observations (no finding)

- `fill`/`resize` with only one axis answers the documented 400, but the message is
  "Cannot set height of 0 or smaller!". `x=abc` gives "Cannot set width of 0 or smaller!". The status is right and
  the message is misleading.
- A 150-frame GIF and an 8000 px wide JPEG are refused with 403 "image is too large" (README: too large → 403),
  not 404.
- `oc:has-preview` is `1` by mime type also for files that cannot be previewed (zero-byte, corrupt, too large). Those
  requests return 403/404, and the web console logs "Failed to load resource" for them. This is by design
  ("the list is a hint, not a verdict", README). It was the same on 8.1.0 for `qa-up-zero.png`.
- The expected outcomes "image is too large" and "generator refused the source" are logged by webdav at level
  `error` ("could not generate thumbnail"), with an empty `request-id`. This is log noise.
- `HEAD` on an authenticated preview URL → 405. Only public links have a HEAD route, the same as on 8.1.0. Web uses
  HEAD only on public links (200 there).
- `Basic public:<password>` on a public-link preview → 404. Only `signature`/`expiration` authenticate. The
  8.1.0 behaviour for Basic was not recorded. Web is not affected.
- Small text files still give an almost white thumbnail (see `results/files.md`). The same applies to `.txt` shares
  in "Shared with me".
- Web console on dev: `current_version` TypeError (dev edition version check, see `results/files.md`).

## Not tested

- Link without password: it cannot be created (enforced on 8.1.0 and on dev).
- 8.1.0 baseline for the public-link-without-password status (the PR says it was 500). Only the dev result (404)
  was checked.
- Previews of old versions in web: web does not offer them.
- Non-default generators (imagor), S3/memory cache backends, `OC_DISABLE_PREVIEWS`, HEIC/AVIF sources, geogebra,
  flac/ogg covers.
- Previews for a guest user (another agent covers guest links).
