# editors — verify after upgrade 7.5.0 → 8.1.0 (opencloud-rolling)

Date: 2026-10-22 · Users: alan (owner), lynn (share recipient) · Data: `Personal/qa-up-editors/` (see `state/editors-extra.md`)
Stack: `docker-compose.yml:yjs/yjs.yml:traefik/opencloud.yml:weboffice/collabora.yml:traefik/collabora.yml:search/tika.yml`

**Verdict: PASS — no upgrade bug.** All pre-upgrade editor data is intact and editable on 8.1.0. yjs collaboration,
@mentions, frontmatter, code blocks and the table of contents work on the upgraded instance. Collabora works (the
single `WopiDiscovery … HTTP 404` at startup had no lasting effect). Excalidraw could **not be tested**: it is a
web extension that is not part of this compose stack (see N1).

## Checks before / after

| Check | 7.5.0 (before) | 8.1.0 (after) |
| --- | --- | --- |
| `editors-extra-verify.mjs` (WebDAV existence, sha256, fileid, content; share to lynn; UI open of all 7 files) | 17/17 PASS | **17/17 PASS** |
| `qa-up-frontmatter.md` shown with a frontmatter node | n/a (no frontmatter support) | PASS |
| `qa-up-frontmatter.md` edit + save → frontmatter still at file start (WebDAV) | n/a | PASS |
| Table of contents lists the headings (QA upgrade notes, Lists, Table, Code) | n/a | PASS |
| Code block (```js) rendered with highlighting and kept on save | kept | PASS |
| `qa-up-note.ocnote` (tiptap JSON) opens with heading, list, marker | PASS | PASS |
| yjs: alan + lynn open `qa-up-notes.md` at once → "2 people in this editing session", 2 avatars, status "Collaboration ready" (both) | n/a (no yjs) | PASS |
| yjs: text typed by alan appears for lynn, and vice versa (live cursors with names) | n/a | PASS |
| `@lyn` → suggestion "Lynn Conway" → mention node `@Lynn Conway` | n/a | PASS |
| Notification for lynn: "Alan Turing mentioned you in qa-up-notes.md" (OCS userlog + bell in UI) | n/a | PASS |
| Save of the yjs session → WebDAV contains alan's text, lynn's text, `@Lynn Conway`, rest of the content | n/a | PASS |
| Collabora `qa-up-doc.odt` open, edit, save → checksum changed, new marker + old 7.5.0 marker present | PASS (seed) | PASS (9734 → 10084 B) |
| Collabora `qa-up-sheet.ods` same | PASS (seed) | PASS (8298 → 9066 B) |
| Collabora `qa-up-word.docx` same | PASS (seed) | PASS (5473 → 5470 B) |
| Collabora `qa-up-excel.xlsx` same | PASS (seed) | PASS (5907 → 5943 B) |
| Excalidraw: create a whiteboard | n/a | **NOT TESTABLE** (no whiteboard entry, N1) |
| "New" menu offers .docx/.xlsx | no | no (unchanged: odt, ods, odp, ocnote, md, url) |

Scripts: `scripts/editors-extra-verify.mjs`, `scripts/editors-after-md.mjs`, `scripts/editors-after-yjs.mjs`,
`scripts/editors-after-office.mjs`, `scripts/editors-after-excalidraw.mjs`, `scripts/editors-after-appstore.mjs`,
`scripts/editors-after-probe.mjs` (UI probe, read-only).

Note: the files were edited on purpose after the verify run, so `editors-extra-verify.mjs` now reports changed
sha256 for `qa-up-notes.md`, `qa-up-frontmatter.md` and the four office files. That is expected; do not re-record.

## Evidence
- `screens/editors-frontmatter-node.png` — 8.1.0 shows the pre-upgrade frontmatter as a "Frontmatter" block
- `screens/editors-frontmatter-saved-toc.png` — after edit + save, table of contents ("Outlines") open
- `screens/editors-ocnote.png` — 7.5.0 .ocnote in the 8.1.0 editor
- `screens/editors-yjs-alan-mention-popup.png` — alan's view: lynn's live cursor and text, `@lyn` suggestion "Lynn Conway"
- `screens/editors-yjs-lynn-sees-alan.png` — lynn's view: alan's cursor, text and `@Lynn Conway` mention, two avatars
- `screens/editors-yjs-lynn-notification.png` — lynn's bell: "Alan Turing mentioned you in qa-up-notes.md"
- `screens/editors-collabora-{odt,ods,docx,xlsx}-saved.png` — Collabora "Saved", old and new marker visible
- `screens/editors-new-menu-no-whiteboard.png`, `screens/editors-app-switcher.png` — no whiteboard / no App Store

## Collabora after the startup `WopiDiscovery … HTTP 404`
Collabora works: all four office files open in `/external-collaboraonline/` (document canvas visible, "Editing" mode),
edits are saved back through WOPI (checksums change, markers present). Collabora now reports version 26.04.5.1 in its
welcome dialog (the seed saw 26.04.3.2). The 404 was a one-off at startup, most likely opencloud requesting the
discovery before Collabora was ready; no functional impact found. Verdict: not a finding.

## Findings

### Upgrade bugs
None.

### New 8.x features on the upgraded instance
None failing among the testable ones (yjs, @mentions, frontmatter, code blocks, table of contents).

### Notes (not bugs)

**N1 — Excalidraw not testable on this stack (test gap, not an upgrade bug).**
- Steps: as alan open `Personal/qa-up-editors` → New; open the Application Switcher. Reproduced twice.
- Expected (per brief): a whiteboard entry in "New".
- Actual: "New" lists Folder, Files/Folder Upload, Document, Spreadsheet, Presentation, Note, Markdown file, Shortcut;
  the app switcher shows only Files and Calendar; `/app-store` redirects to Files.
- Reason: Excalidraw is the `web-app-excalidraw` extension from `opencloud-eu/web-extensions`, not part of
  opencloud-rolling 8.1.0 itself. The compose stack of this run includes no web-extension compose file, so it is not
  deployed (the 8.1.0 exploratory instance had it installed). To cover it, add the extension to the to-stack and rerun
  `scripts/editors-after-excalidraw.mjs`.
- Evidence: `screens/editors-new-menu-no-whiteboard.png`, `screens/editors-app-switcher.png`.

**N2 — `qa-up-notes.md` keeps the 7.5.0-mangled frontmatter (pre-existing, not an upgrade bug).** The 7.5.0 editor
had already turned the typed frontmatter into `---` + `## title: …` and `\[qa, upgrade\]` (see the seed notes). 8.1.0
renders and saves that as it is: a horizontal rule and a heading, not frontmatter. 8.1.0 does not repair it, as expected.
The unmangled control file `qa-up-frontmatter.md` keeps its frontmatter.

**N3 — Markdown re-serialisation on save (cosmetic).** The 8.1.0 save of `qa-up-frontmatter.md` adds blank lines
around the table and at the end. Content is unchanged otherwise. The mention is saved as plain text `@Lynn Conway`.

**N4 — test tooling.** In Calc (.ods/.xlsx) the Collabora 26.04.5.1 welcome dialog's close button sits outside the
`iframe-welcome-form` frame, so `closeWelcome` did not close it and typing went nowhere. In the first ods attempt
Collabora still saved, with checksum 8310 → 8298 and the old marker kept, but no new marker. `scripts/editors-lib.mjs`
now clicks the X by position as a fallback. Console 404s while the editor is open are `GET /graph/v1.0/users/<id>/photo/$value`
(no avatar photo set), which is harmless.
