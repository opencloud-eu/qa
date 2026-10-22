# files — verification after the upgrade (7.5.0 → 8.1.0)

User `alan`, personal space. Date 2026-10-22. Search re-index had already run.

Verdict: **no upgrade bug found.** One check failed once (`upload after upgrade`). I ran it three more times
and it never failed again, so it is a transient failure, not a reproducible upgrade bug (F1).
A problem in the test harness hides failures in all areas (H1).

## Checks: `run.mjs verify files`

| Check | Before | After (run 1) | After (run 2) |
|-------|--------|---------------|---------------|
| personal drive id unchanged | pass | pass | pass |
| content: plain.txt, empty.txt, unicode name, 190-char name, deep/l2/…/deep.txt, fav.txt, tagged.txt, big.bin (5 MB), old-2020.txt, versions.txt (10 checks) | pass | pass | pass |
| file ids unchanged | pass | pass | pass |
| versions kept (2 old versions, content) | pass | pass | pass |
| old mtime kept (2020-01-15) | pass | pass | pass |
| favorites | info: disabled on 7.5.0 | info | info |
| tags kept | pass | pass | pass |
| trash: file and folder present | pass | pass | n/a (the folder was restored in run 1 and is no longer in the trash) |
| activities kept | pass | pass | pass |
| restore from trash after upgrade (after only) | — | pass | n/a (nothing left to restore) |
| upload after upgrade (after only) | — | **fail** | pass |

Run 1: 19 ok, 1 failed (recorded in `results/files-after-run1.json`). Run 2: `results/files-after.json`. In run 1 every
PASS has an empty detail string, so all of them are real passes (see H1).

## Extra data: `scripts/files-extra-verify.mjs` (see `state/files-extra.md`)

20/20 PASS. The before-run was also 20/20.

| # | Item | Result |
|---|------|--------|
| – | personal drive id unchanged | pass |
| 1 | 300 files in one folder (names, ids, contents) | pass |
| 2 | renamed file (new name, same id/content, old name 404) | pass |
| 3 | moved file, moved and renamed folder | pass |
| 4 | images png/jpg: content, id, thumbnail (`preview=1` → 200 image/*) | pass |
| 5 | WebDAV lock: token in lockdiscovery, PUT without token → 423, content unchanged | pass |
| 6 | special characters: all 12 names byte-identical (NFC/NFD kept apart), content, ids | pass |
| 7 | restored from trash before the upgrade: content, id, not in trash | pass |
| 8 | restored old version: content = v1, v2 in versions | pass |
| 9 | MIME types (pdf, md, csv, json, html, svg, js, zip, no extension, UPPER.TXT): content, id, type | pass (10/10, no type changes) |

## UI as alan (`scripts/files-after-ui.mjs`)

| What | Result | Screenshot |
|------|--------|------------|
| `qa-up-files` list | pass. All seeded files are there, plus the restored `trashed-folder` and the `after-upgrade*.txt` files that the checks uploaded. | `screens/001-files-after-ui-qa-up-files.png` |
| Versions panel of `versions.txt` | pass. The panel opens and lists 5 old versions of 9 B each. The check needs at least 2; 5 means the seed probably ran twice before the upgrade. | `screens/002-files-after-ui-versions.png` |
| `qa-up-files-extra` list | pass. All 10 folders are there (images, locked, many, mime, move-dst, move-src, rename, restored, special ü&ß #%, version-restore). | — |
| Image thumbnails (tiles view) | pass. Both images show real previews (blob images, 373×280). | `screens/004-files-after-ui-images-list.png` |
| Lock icon on `qa-up-locked.txt` | pass | `screens/005-files-after-ui-locked.png` |
| Special-characters folder | pass. The folder opens by click, and all 11 visible names render; `.qa-up-hidden` is hidden by the default UI setting, and the sidebar says "12 files including 1 hidden". The broken family emoji glyph comes from the font of headless Chromium. | `screens/006-files-after-ui-special.png` |
| Trash (Deleted files → Personal) | pass. `trashed.txt` (from qa-up-files) and 3 editor probe files are listed. `trashed-folder` is not, because the check restored it. | `screens/007-files-after-ui-trash.png` |

Notes:
- The tiles of `.txt` files look blank. This is expected: the server preview is a 200 `image/jpeg` that renders the
  short text in the top-left corner (`screens-raw/files-after-preview-plain.txt.jpeg`), and the tile shows the empty
  middle part of it.
- Console: 404 errors only for `GET /graph/v1.0/users/<alan>/photo/$value` (alan has no avatar). Not an upgrade issue.

## Findings

### F1: "upload after upgrade" failed once and could not be reproduced (not an upgrade bug)
- Steps: `node release-testing/upgrade/run.mjs verify files --phase after`. This was the first upload into alan's
  space after the upgrade. The check does a PUT of `qa-up-files/after-upgrade.txt` and then a GET right after it.
- Expected: GET → 200.
- Actual (run 1): the PUT succeeded, so the file exists afterwards; the later PUT on the same path returned 204. The
  GET right after it did not return 200. The status was not recorded, because the check returns `false` without a
  detail.
- Reproduction: `scripts/files-upload-repro.mjs` ran twice (r1, r2). Each run did a PUT that overwrote the file and
  PUTs of new files in the folder and in the root, followed by 3 GETs each. Every PUT returned 201/204 and every GET
  returned 200 with the right content. A second full `verify` run also passed the upload check.
- Verdict: **transient, not reproducible.** It was probably a timing effect on the first upload after the restart
  (for example postprocessing not yet finished, so the GET got 425). I did not check the server logs: this agent has
  no docker access. The lead can look at `compose.mjs logs opencloud` around the first verify run (about 15:56 UTC).
  Screenshot: none (API only).

### H1: Harness: area checks that return a detail string count as PASS (test tool problem, affects all areas)
- `release-testing/upgrade/run.mjs` line 32: `ok: r !== false`, with the comment "a returned string is kept as detail".
  The area modules, however, use the pattern `return cond || 'reason'`, so a failing condition returns a string and
  is reported as **PASS** with a detail.
- Seen in run 2: `PASS trash: file and folder present — trash: trashed.txt, …` (`trashed-folder` missing) and
  `PASS restore from trash after upgrade — not in trash`.
- Impact: in every area, a `PASS` line that has a detail text after `—` is really a failure. For files, run 1 and the
  before-run have no such lines, so the results above stand. Other areas' results should be read with this in mind,
  and `run.mjs` should treat any non-`true` result as a failure.
- Verdict: test harness bug, not an OpenCloud bug.

## Side effects of the verification (for re-runs)
- `qa-up-files/trashed-folder` was restored by the after-check, so the trash checks cannot pass in a later run.
- New files: `qa-up-files/after-upgrade.txt`, `after-upgrade-r1.txt`, `after-upgrade-r2.txt`,
  `qa-up-after-upgrade-r1.txt`, `qa-up-after-upgrade-r2.txt` (root).
