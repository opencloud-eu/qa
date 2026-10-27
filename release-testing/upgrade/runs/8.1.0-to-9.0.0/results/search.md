# Search: verify after the upgrade (8.1.0 → dev)

From `opencloudeu/opencloud-rolling:8.1.0` to `opencloudeu/opencloud:dev` (status.php `9.0.0+dev`), bleve with Tika.
**No search re-index was run.** Everything below runs on the index that 8.1.0 built.

Order: area checks → extra queries → probes → UI (lynn, mary, margaret) → `--actions` (last).

## Result

No upgrade bug, no dev bug in search. All checks pass before and after. All 8 probes behave as the dev changes
promise, on the old index.

| Part | Before (8.1.0) | After (dev) |
|---|---|---|
| Area checks (`run.mjs verify search`) | 7/7 PASS | 7/7 PASS |
| Extra queries S1–S40 | 40/40 PASS | 40/40 PASS |
| Probes P1–P8 | baseline | 8/8 as expected on dev |
| UI cases U1–U26 | — | 26/26 PASS |
| After `--actions` (S1–S39 without S27/S40, A1–A2) | — | 40/40 PASS |

Raw results: `results/search-after.json`, `results/search-extra-after.json`, `results/search-extra-after-actions.json`,
`results/search-ui-after.json`.

## Area checks
`node release-testing/upgrade/run.mjs verify search --phase after`

| Check | Before | After |
|---|---|---|
| search by name | PASS | PASS |
| search by content: txt | PASS | PASS |
| search by content: md | PASS | PASS |
| search by content: html | PASS | PASS |
| search by tag | PASS | PASS |
| favorites filter | PASS | PASS |
| search finds old files | PASS | PASS |

## Extra queries
`node RUN/scripts/search-extra-verify.mjs --phase after` (queries as in `state/search-extra.md`)

| ID | What | Before | After |
|---|---|---|---|
| S1–S4 | Tika content: docx, odt, pdf, rtf | PASS | PASS |
| S5–S7 | tags with spaces, umlauts, CJK | PASS | PASS |
| S8–S10 | old mtimes, date ranges | PASS | PASS |
| S11–S16 | mixed case, CJK, umlauts (name and content) | PASS | PASS |
| S17–S18 | `mediatype:pdf`, `mediatype:document` | PASS | PASS |
| S19–S20 | hidden folder that is not `.space` | PASS | PASS |
| S21–S22 | renamed file | PASS | PASS |
| S23–S25 | trashed and live file at the same path | PASS | PASS |
| S26 | trashed file stays hidden | PASS | PASS |
| S27 | file in the trash (before restore) | PASS | PASS |
| S28 | file restored before the upgrade | PASS | PASS |
| S29–S31 | `is:favorite` for lynn, margaret, mary (received share) | PASS | PASS |
| S32 | `scope:` without AND, as the web sends it | PASS | PASS |
| S33–S35 | permissions: share recipient, no access, not a space member | PASS | PASS |
| S36–S38 | project space content and tags | PASS | PASS |
| S39 | project space root is still found | PASS | PASS |
| S40 | file in a disabled space stays hidden | PASS | PASS |

After `--actions` (last step, run once: restores `qa-up-restore-later.txt`, re-enables `qa-up-search-disabled` → HTTP 200):

| ID | What | After |
|---|---|---|
| A1 | lynn `content:"okapirestore"` → file restored from the trash after the upgrade is found | PASS |
| A2 | margaret `content:"narwhaldisabled"` → file in the re-enabled space is found | PASS |
| S1–S39 (without S27) | unchanged | 38/38 PASS |

Entries that the old index marked as deleted come back on dev without a re-index.

## Probes
| ID | User | KQL | 8.1.0 (before) | Expected on dev | dev (after) | |
|---|---|---|---|---|---|---|
| P1 | lynn | `is:favorite AND name:"qa-up-fav*"` | HTTP 400 | 2 hits: fav-doc, fav-folder | 2 hits: qa-up-fav-doc.txt, qa-up-fav-folder | as expected (fixed by `9d972f193e`) |
| P2 | lynn | `name:"qa-up-fav*" AND is:favorite` | 2 hits: fav-doc, fav-folder | same | 2 hits: qa-up-fav-doc.txt, qa-up-fav-folder | as expected |
| P3 | lynn | `is:favorite OR tag:"qa-up-favtag"` | HTTP 400 | favorites + fav-not | 4 hits: fav-search.txt, qa-up-fav-doc.txt, qa-up-fav-folder, qa-up-fav-not.txt | as expected (fixed) |
| P4 | lynn | `name:"qa-up-fav*" AND NOT is:favorite` | 2 hits: fav-not, fav-removed | same | 2 hits: qa-up-fav-not.txt, qa-up-fav-removed.txt | as expected |
| P5 | lynn | `name:"qa-up-scope-*" AND scope:<id>` | 2 hits: scope-folder, scope-inside | scope-inside, no scope-outside, no error | 2 hits: qa-up-scope-folder, qa-up-scope-inside.txt | as expected (unchanged) |
| P6 | margaret | `content:"quetzalreadme"` | 1 hit: readme.md in `.space` | 0 hits | 0 hits | as expected (new query template works on the old index) |
| P7 | margaret | `name:"readme*"` | 15 × readme.md | 0 hits | 0 hits | as expected |
| P8 | lynn | `mediatype:folder AND NOT name:"qa-up-*"` | 10 hits incl. 6 × `.space`, `Lynn Conway` | no `.space`, no personal root | 3 hits: .qa-up-hidden, docs, sub | as expected |

The probes gave the same result in the plain run and in the `--actions` run.

## UI
Script: `RUN/scripts/search-ui-verify.mjs after`. For each case: type the term in the search bar, read the preview
dropdown, press Enter, set the filters on the results page, and read the result names. The Favorites page is
checked for each user. Every case starts from the personal space. Screenshots:
`../screens/NNN-search-after-ui-<case>-<user>-{preview,results}.png`.

The web UI on dev has these search filters: **Type**, **Tags**, **Last Modified**, **Title only**. There is no
favorites filter on the results page. Favorites are checked on the Favorites page (`REPORT is:favorite`).

| ID | User | Action | Expected | Result |
|---|---|---|---|---|
| U1 | lynn | "axolotldocx" | docx (Tika content), preview shows the snippet | PASS |
| U2 | lynn | "qa-up" + Type PDF | only qa-up-paper.pdf | PASS |
| U3 | lynn | "qa-up" + Type Document | docx, odt, no pdf | PASS (txt/md are in "document" by design, `mimetype.go`) |
| U4 | lynn | "qa-up" + Tags `qa-up-标签` | qa-up-tags.txt only | PASS |
| U5 | lynn | "qa-up" + Tags `qa up tag with spaces` | qa-up-tags.txt only | PASS |
| U6 | lynn | "qa-up-mtime" + Last Modified "last 30 days" | no 2018/2022 files | PASS |
| U7 | lynn | "qa-up-rename" + "last 30 days" | rename-after, no rename-before | PASS |
| U8 | lynn | "axolotldocx" + Title only | 0 hits (content only) | PASS |
| U9 | lynn | "qa-up-report" + Title only | qa-up-report.docx | PASS |
| U10 | lynn | "marmothidden" | note in the hidden folder | PASS |
| U11 | lynn | "lemurtrashonly" | no results (trashed) | PASS |
| U12 | lynn | "readme" | no `.space` readme.md | PASS |
| U13 | lynn | "Lynn Conway" | no personal space root (only qa-up-collab.md, which contains the name) | PASS |
| U14 | lynn | "熊猫" | CJK file | PASS |
| U15 | lynn | Favorites page | fav-doc, fav-folder, fav-search.txt; no fav-not, fav-removed | PASS |
| U16 | mary | "geckoshared" | shared note | PASS |
| U17 | mary | "axolotldocx" | no results (no access) | PASS |
| U18 | mary | Favorites page | qa-up-shared-note.txt | PASS |
| U19 | margaret | "kinkajouspace" | space doc | PASS |
| U20 | margaret | "tapirspacedocx" + Type Document | space docx | PASS |
| U21 | margaret | "qa-up" + Tags `qa-up-spacetag` | qa-up-space-doc.txt only | PASS |
| U22 | margaret | "quetzalreadme" | no results (`.space` hidden) | PASS |
| U23 | margaret | "readme" | no results | PASS |
| U24 | margaret | "narwhaldisabled" | no results (space disabled; before `--actions`) | PASS |
| U25 | margaret | "qa-up-search-space" | the project space | PASS |
| U26 | margaret | Favorites page | qa-up-space-fav.txt | PASS |

All search REPORT requests answered HTTP 207.

## Findings
No upgrade bugs. No search bugs on dev.

Observations (not bugs, not upgrade-related):
1. **Results tile shows only the tags that match.** With term "qa-up" and tag filter `qa-up-标签`, the line under the
   name shows `qa-up-ünïcödé` and `qa-up-标签`, not `qa up tag with spaces`. The Tags column in the table view shows all
   three tags (`+1`). The search response (`oc:tags`) and PROPFIND return all three tags (checked twice with
   `scripts/search-probe-tags.mjs`). The line under the name shows only the tags that match the term or the filter,
   and that looks intended. Reproduced twice (`scripts/search-ui-tags-repro.mjs`),
   `../screens/010-search-after-tags-repro-r2-resource-table-qa-up-_.png`.
2. **Filters stay set when you search again from the results page.** If you type a new term on the results page,
   the earlier Type, Tags and Last Modified filters stay in the URL and in the query (e.g. `AND tag:(…) AND
   mediatype:(…)`). The chips are visible, so the user can see this. This is how the web UI behaves on the results
   page, not something the upgrade broke. The first UI run failed because of this; the script now starts each case
   from the personal space.
3. **Console error on every page load** (dev build, not search): `TypeError: Cannot read properties of undefined
   (reading 'current_version')` in the web `VersionCheck` component. The update-check response has no channel for
   edition `dev` (`channels[edition].current_version`), and the component catches the error and logs it. This is
   specific to the `dev` image and has no effect on search. The other console error is the 404 on
   `/graph/v1.0/users/<id>/photo/$value` (the user has no avatar), which is normal.

## Seed problems
None after the upgrade (seed fixes see `state/search-extra.md`).

## Scripts added in this phase
- `scripts/search-ui-verify.mjs`: UI cases U1–U26
- `scripts/search-ui-explore.mjs`: prints the filter options on the results page
- `scripts/search-probe-tags.mjs`, `scripts/search-ui-tags-repro.mjs`: repro for observation 1
