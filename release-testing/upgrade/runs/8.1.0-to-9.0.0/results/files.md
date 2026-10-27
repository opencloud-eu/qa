# files — verify after the upgrade (8.1.0 → dev)

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php `9.0.0+dev`), user `alan`,
personal space. Verified on 2026-10-26.

**Result: no upgrade bug in the files area.** All data, ids, versions, mtimes, tags, trash, lock, special names
and mime types survived. Every preview that worked on 8.1.0 is still a `200 image/*`; all size/type changes match
the new thumbnail pipeline (webdav `MIGRATION.md`). One base check failed on the first run because of a race in
the test script (HTTP 425 while postprocessing runs), fixed in `areas/files.mjs`.

## Base checks (`run.mjs verify files --phase after`)

Before: 18/18 ok. After (first run): **19 ok, 1 failed**.

| Check | Before | After |
|-------|--------|-------|
| personal drive id unchanged | pass | pass |
| content (10 files: plain, empty, unicode name, 196-char name, 5 levels deep, fav, tagged, 5 MiB big.bin, old-2020, versions) | pass | pass |
| file ids unchanged | pass | pass |
| versions kept (2 old versions, content) | pass | pass |
| old mtime kept (2020-01-15) | pass | pass |
| favorites | INFO (disabled on 8.1.0) | INFO |
| tags kept | pass | pass |
| trash: file and folder present | pass | pass |
| activities kept | pass | pass |
| restore from trash after upgrade | — | pass |
| upload after upgrade | — | **fail** → test race, see F1; pass after the fix |

Re-run with the fixed script: `upload after upgrade` passes. That re-run also reports `trash: file and folder
present` and `restore from trash after upgrade` as failed — expected, because the first run already restored
`trashed-folder` (the check is not repeatable). `results/files-after.json` holds this second run; the first run is
the one in the table above.

## Extra data (`scripts/files-extra-verify.mjs`)

Before: 30/30 PASS. After: **30/30 PASS**, 34 preview DIFFs (judged below).

| # | Item | After |
|---|------|-------|
| 1 | 300 files in one folder (names, ids, contents) | pass (UI: "300 items", `../screens/005-files-after-tour-many.png`) |
| 2 | 64 MiB file, zero-byte txt and png (content, id, size); zero-byte png preview fails cleanly (no 5xx) | pass |
| 3 | renamed file (new name, same id/content, old name 404) | pass |
| 4 | moved file, moved + renamed folder | pass |
| 5 | 10 preview sources: content, id, preview 200 `image/*` for all 6 sizes | pass (10/10) |
| 6 | WebDAV lock: token kept, PUT without token → 423, content unchanged | pass (UI: lock icon in Status column, `../screens/003-files-after-tour-locked.png`) |
| 7 | special characters: 13 names byte-identical, content, ids, preview of the image | pass (UI: all names rendered, "13 files including 1 hidden", `../screens/002-files-after-tour-special.png`) |
| 8 | restored from trash before the upgrade | pass |
| 9 | restored old version (content v1, v2 in versions) | pass |
| 10 | mime types (pdf, md, csv, json, html, svg, js, zip, noext, UPPER.TXT): content, id, `getcontenttype` | pass (10/10) |

## Preview diffs

Judged against `services/webdav/MIGRATION.md` and the dev code (`services/webdav/pkg/thumbnail/workflow/workflow.go`
`matchOperation`, `resolutions.go`): without a `processor` the operation is `fill` (crop to the snapped box,
may upscale), for GIF `stretch`; `processor=fit` → `fit-in` (no upscale); each axis is snapped up on the ladder
separately. `a=1` and `scalingup=0` are ignored.

API requests (`?scalingup=0&preview=1&a=1&x=X&y=Y`):

| Source | Request | 8.1.0 | dev | Judgement |
|--------|---------|-------|-----|-----------|
| landscape / portrait / large / exif-rotated jpg, webp, mp3 cover, text txt | 256×256 | jpeg 280×500 or 500×280 (wrong orientation for most) | jpeg 256×256 | expected: per-axis snap, crop to the box; no more 90° turned box (doc: "no longer returned in a different orientation") |
| same | 480×270 | jpeg 500×280 | jpeg 512×320 | expected: 480→512, 270→320 on the ladder, fill crop |
| same | 1920×1080 | jpeg 1600×900 / 1920×1080 / 800×600 / 640×480 / 500×500 (source size or box) | jpeg 1920×1280 | expected: 1080→1280 on the ladder; smaller sources (800×600 webp, mp3 cover 500×500, txt canvas) are upscaled by `fill` — doc: "A source smaller than the box is enlarged to fill it for the cropping operations" |
| alpha png | 256×256, 480×270, 1920×1080 | png 280×500 / 500×280 / 800×600, alpha | png 256×256 / 512×320 / 1920×1280, **alpha kept** | expected: png stays png, RGBA kept, upscale by fill |
| animated gif | 256×256, 480×270, 1920×1080 | gif 280×500 / 320×240 / 320×240, 10 frames | gif 256×256 / 512×320 / 1920×1280, **10 frames** | expected: gif stays gif and animated; GIF without processor uses `stretch` (aspect distorted, by design in the code; 8.1.0 also returned a non-aspect box, e.g. 500×280 for the tiles) |
| tiny png 10×10 | all 6 sizes | png 10×10 (no upscale) | png 64×64 … 1920×1280 | expected: fill upscales small sources (doc) |
| `special ü&ß #%/bild ü #1 (copy).png` (10×10) | 64×64 | png 10×10 | png 64×64 | expected, same as tiny png |

Spot-checked visually (saved previews): exif-rotated jpg at 480×270 shows the stripes horizontal, i.e. the
EXIF rotation is applied before the crop; portrait 1920×1080 is a correct centre crop; alpha png 256×256 has a
transparent background; gif 128×128 is a stretched 10-frame animation.

Web UI (`scripts/files-ui-previews.mjs after`, compared with `state/files-ui-previews-before.json`):

| View | Request | 8.1.0 | dev | Judgement |
|------|---------|-------|-----|-----------|
| list | 64×64 | all 200; tiny png 10×10, rest 64×64 | all 200, all 64×64 (tiny png upscaled), png alpha kept, gif 10 frames | expected |
| tiles | 320×320 | aspect kept but on a 280-high box (landscape 498×280, portrait 280×498, exif 158×280, alpha png 373×280, gif 500×280 = distorted, tiny 10×10) | `fit-in`: landscape 320×180, portrait 180×320, exif-rotated 180×320 (rotation applied), alpha png 320×240 png with alpha, gif 320×240 gif 10 frames (now aspect-correct), tiny 10×10, mp3 320×320 | expected, better than before (gif no longer distorted) |
| media viewer | 1920×1920 portrait jpg | 900×1600 | 900×1600 (plus neighbours tiny 10×10, large 1920×1440 preloaded) | same |

All 10 tiles show a thumbnail, no placeholder icon (`../screens/002-files-after-ui-previews-resource-tiles.png`
vs `002-files-before-…`). The WebP thumbnail is a JPEG with a black background, same as on 8.1.0.

New cache: `/var/lib/opencloud/thumbnails/cache/` exists and holds the new entries (keys like
`64x64-fill.jpg`, `512x320-fill.png`, `320x320-fit-in.gif`, `256x256-stretch.gif`, `1920x1280-fill.jpg`).
The old `thumbnails/files/` is still there (8.1.0 entries like `320x320-fit.jpeg`) and received no file newer than
the new `cache/` directory, i.e. it is not written any more. Cache was cold after the update as documented.

## Findings

### F1 — `upload after upgrade` fails right after the PUT (test-script race, not an upgrade bug)
- Steps: `node release-testing/upgrade/run.mjs verify files --phase after` → PUT `qa-up-files/after-upgrade.txt`
  (201), immediately GET the same file.
- Expected: GET 200.
- Actual: first run FAIL. Probe `scripts/files-probe-upload.mjs` (run twice): run 1, the first GET 44 ms after the
  PUT returned **425 Too Early**, the next one 1 s later 200; run 2 all GETs 200 at once. The file
  `after-upgrade.txt` exists with the right content (UI: `../screens/006-files-after-tour-basic.png`).
- Cause: upload postprocessing is asynchronous; a GET before it finishes answers 425. The check did not wait.
- Classification: **test-script problem** (not an upgrade bug, not a seed problem). Fixed in
  `release-testing/upgrade/areas/files.mjs`: the check retries the GET for up to 10 s while it gets 425 and
  reports the status otherwise. With the fix the check passes.

### Observations (no finding)
- Web console on dev logs `TypeError: Cannot read properties of undefined (reading 'current_version')` on every
  page (web `VersionCheck.vue`: the update feed has no channel for the `dev` edition; the error is caught and the
  version check hidden). Dev build only, unrelated to the upgrade and to files. The 404 console errors seen on
  8.1.0 are still there.
- Small text files (e.g. `plain.txt`) show an almost white thumbnail in the list (the one text line is tiny on
  the rendered canvas); preview is 200 `image/jpeg`. Zero-byte and binary files get 404 and the generic icon,
  no 5xx.
- Versions panel of `qa-up-files/versions.txt` lists the 2 old versions (`../screens/007-files-after-tour-versions.png`).

## Scripts used / added
- `scripts/files-extra-verify.mjs`, `scripts/files-ui-previews.mjs after` (from the seed agent)
- `scripts/files-probe-upload.mjs` — PUT + GET timing probe (F1); creates `qa-up-probe-upload-*` files
- `scripts/files-probe-textpreview.mjs` — text/empty/binary preview probe
- `scripts/files-ui-tour.mjs after` — screenshots of the area as alan
