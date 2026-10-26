# editors: verify after the upgrade (opencloud-rolling 8.1.0 → opencloud dev)

To: `opencloudeu/opencloud:dev` (status.php 9.0.0+dev, web 8.2.0), stack with yjs and Collabora. Owner of the data:
alan; second user: lynn. There is no `run.mjs` area for editors; everything comes from `state/editors-extra.md`.

Scripts (all in `scripts/`, print PASS/FAIL):
- `editors-extra-verify.mjs` (compare mode, no `--record`), `editors-seed-vault.mjs check`, `editors-seed-share.mjs check`,
  `editors-probe.mjs` (read-only apart from the existing folder)
- new: `editors-after.mjs collab|frontmatter|office|stat|notif|errors` (collab, frontmatter and office edit and save on
  purpose; stat, notif and errors are read-only)

Order: the read-only checks (1–3) ran first, before anything was edited. After `editors-after.mjs collab|frontmatter|office`,
the sha256 values of `qa-up-collab.md`, `qa-up-frontmatter.md` and the four office files no longer match
`state/editors-extra.json`. A later `editors-extra-verify.mjs` run fails on these checks, and that is expected.

## Checks

| # | Check | Before (8.1.0) | After (dev) |
| --- | --- | --- | --- |
| 1 | `editors-extra-verify.mjs`: WebDAV size/sha256 of all 9 files, shares to lynn, public link, Shared with me, every file opens in the UI as alan, `qa-up-collab.md` as lynn | 24/24 pass | **24/24 pass** |
| 2 | Vault `editors-seed-vault.mjs check`: only encrypted names on the server, unlock with the stored passphrase lists note + subfolder, note decrypts (`qa-up-vault-marker`), wrong passphrase rejected | 5/5 pass | **5/5 pass** |
| 3 | View-only `editors-seed-share.mjs check`: lynn (Can view) and the password-protected public link open `qa-up-viewonly.docx` in Collabora read-only; the file stays unchanged | all pass | **all pass** (compared with the baseline below) |
| 4 | yjs: alan and lynn in one session on `qa-up-collab.md`. Both see "2 people in this editing session / Collaboration ready", each sees what the other types, the save keeps both new markers and the 8.1.0 markers | pass | **pass** |
| 5 | Old mention `@Lynn Conway` still in `qa-up-collab.md` (file content; shown to alan; lynn sees it highlighted as a mention) | pass | **pass** |
| 6 | lynn's notification from 8.1.0, "Alan Turing mentioned you in qa-up-collab.md" | pass (seed) | **fail**, F1 |
| 7 | `qa-up-frontmatter.md` (control, never opened before): dev shows 3 frontmatter nodes, edit + save, the file still starts with the frontmatter | — | **pass** (dev re-pads the table, same as 8.1.0 did for `qa-up-fm-saved.md`) |
| 8 | `qa-up-fm-saved.md` and `qa-up-note.ocnote` open with their content | pass | **pass** (part of 1) |
| 9 | Collabora edit + save as alan: `qa-up-doc.odt`, `qa-up-sheet.ods`, `qa-up-word.docx`, `qa-up-excel.xlsx` open in "Edit mode", typed dev marker saved (file changed, marker in the XML), 8.1.0 marker still there | pass | **pass** (4/4) |
| 10 | Whiteboard / Excalidraw offered | absent | **still absent**: not in `/config.json` apps, `/app/list` or the New menu (Document, Spreadsheet, Presentation, Note, Markdown file) |

Extra data: all 10 items in `editors-extra.md` pass, apart from the mention notification (F1).

## View-only document compared with the 8.1.0 baseline

| Aspect | 8.1.0 baseline | dev | Assessment |
| --- | --- | --- | --- |
| lynn (Can view): header and status bar | "Read-only", no watermark | "Read-only" in both places, no watermark (`../screens/001-editors-seed-viewonly-lynn.png`) | unchanged. dev shows the secure-view watermark only for view-only (secure view) tokens, and "Can view" is not secure view, so no watermark is the expected result |
| Public link (password) | "Read-only", no watermark | identical (`../screens/004-editors-seed-viewonly-public.png` vs. baseline `003-editors-seed-viewonly-public.png`) | unchanged, as expected |
| Typing as lynn | file unchanged | file unchanged (sha256 the same) | unchanged. The dev change where view-only sessions answer Lock with 200 instead of locking causes no write and no visible error |
| lynn's File menu | Save As…, Download as (PDF, odt, doc, docx, rtf, epub, html, md), Print… | same entries (also Security Label…, Digital Signatures…, Repair) | download/print/export are still offered outside secure view. This matches "DownloadUrl sent outside secure view". The extra entries cannot be compared because the 8.1.0 File-menu screenshot was overwritten (numbered screenshot names) |
| `POST /app/open` view/read/write for lynn | 200 each | 200 each, no `permission` query parameter | unchanged. The WOPI server makes the read-only decision |

No differences in behaviour that the WOPI changes would not explain. Secure view itself (a "Can view (secure)" role) was
not seeded on 8.1.0, so dev's watermark and CheckFileInfo changes for secure view were not tested here.

## Findings

### F1: lynn's unread mention notification is lost by the upgrade (upgrade bug, known)
- Steps: on 8.1.0 alan writes `@Lynn Conway` in `qa-up-collab.md` during the yjs session and saves. lynn gets
  "Alan Turing mentioned you in qa-up-collab.md" (seed script: PASS "lynn got a mention notification"). The notification
  is never read. Upgrade to dev. As lynn, call `GET /ocs/v2.php/apps/notifications/api/v1/notifications` and look at the bell.
- Expected: the mention notification is still listed.
- Actual: HTTP 200 with **0 notifications** for lynn (and for alan), and no badge on lynn's bell. The mention in the file
  is still there (check 5). Reproduced 3 times: `editors-after.mjs collab`, then `notif lynn alan` and `notif lynn`.
- Evidence: `../screens/002-editors-after-yjs-lynn.png` (bell without a badge). Before: seed output in `state/editors-extra.md`.
- Classification: **upgrade bug**. The cause is likely the same as `runs/7.5.0-to-8.1.0/results/account.md` F1
  (userlog store defaults to `memory`, so unread notifications do not survive recreated containers). The account area
  (E2/E3/E14) checks the same thing on its own. Caveat: nobody re-checked the notification between the seed and the
  upgrade, but no script reads or deletes lynn's notifications.

### Observations (not upgrade bugs)
- **Script problem, not a product bug:** the first `office` run reported the markers in the `.odt` and `.docx` files as
  missing. Collabora's autocorrect capitalises the first letter (`Qa-up-…`), and the check was case-sensitive. After
  making the check case-insensitive (`editors-after.mjs stat`), all dev and 8.1.0 markers are present. The screenshot
  `../screens/001-editors-after-office-saved-qa-up-doc.odt.png` shows "Saved".
- **dev bug unrelated to the upgrade or the editors:** every web page logs
  `TypeError: Cannot read properties of undefined (reading 'current_version')` from the `VersionCheck` component. It
  reads `capabilities.core['check-for-updates']` → `channels[status.edition || 'rolling'].current_version`, and the
  channel for the dev build's edition does not exist. The component catches the error and logs it, and there is no
  visible effect. Also a 404 on `/graph/v1.0/users/<alan>/photo/$value`, which is just a missing avatar.
- `qa-up-collab.md` still ends with `&nbsp;` after the save, the same cosmetic serialisation as on 8.1.0.
- The mention is plain text in alan's editor view, while lynn sees it highlighted as a mention. It looked the same on 8.1.0
  (the seed selector found no mention node there either).
