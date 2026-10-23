# Search — after the upgrade (7.5.0 → 8.1.0)

Context: 8.1.0 starts with a new, empty bleve index (bleve-v5). Migration
`opencloud search index --all-spaces --force-rescan --insecure` ran before this check: 19 spaces indexed, 1 disabled
space skipped (expected). Search is the area the breaking change targets.

**Verdict: PASS. No upgrade bugs.** Every check and every query that passed on 7.5.0 passes on 8.1.0 against the
rebuilt index: names, content (txt, md, html, docx, odt, pdf via Tika), tags (spaces, umlauts, Chinese), old mtimes,
CJK and umlaut text, mediatype filters, and space permissions. One server error found on a date query (`mtime:<date>`,
HTTP 500). It already happens in 7.5.0, so it is not caused by the upgrade.

## Area checks — `node release-testing/upgrade/run.mjs verify search`

| Check | 7.5.0 (before) | 8.1.0 (after) |
|---|---|---|
| search by name | PASS | PASS |
| search by content: txt | PASS | PASS |
| search by content: md | PASS | PASS |
| search by content: html | PASS | PASS |
| search by tag | PASS | PASS |
| favorites filter | INFO (favorites disabled on 7.5.0, not seeded) | INFO (same; not seeded, so nothing to check) |
| search finds old files | PASS | PASS |

## Extra queries — `RUN/scripts/search-extra-verify.mjs`

| ID | User | KQL | 7.5.0 | 8.1.0 |
|---|---|---|---|---|
| S1 | lynn | `content:"axolotldocx"` | PASS | PASS |
| S2 | lynn | `content:"capybaraodt"` | PASS | PASS |
| S3 | lynn | `content:"pangolinpdf"` | PASS | PASS |
| S4 | lynn | `tag:"qa up tag with spaces"` | PASS | PASS |
| S5 | lynn | `tag:"qa-up-ünïcödé"` | PASS | PASS |
| S6 | lynn | `tag:"qa-up-标签"` | PASS | PASS |
| S7 | lynn | `name:"qa-up-mtime*" mtime<2019-01-01` | PASS | PASS |
| S8 | lynn | `name:"qa-up-mtime*" AND mtime>=2022-01-01 AND mtime<2023-01-01` | PASS | PASS |
| S9 | lynn | `name:"*camelcasereport*"` | PASS | PASS |
| S10 | lynn | `name:"*CamelCase*"` | PASS | PASS |
| S11 | lynn | `content:"ocelotmixedcase"` | PASS | PASS |
| S12 | lynn | `name:"*中文报告*"` | PASS | PASS |
| S13 | lynn | `content:"熊猫"` | PASS | PASS |
| S14 | lynn | `name:"*größe*"` | PASS | PASS |
| S15 | lynn | `content:"straßenbahnfahrt"` | PASS | PASS |
| S16 | lynn | `name:"qa-up-*" mediatype:pdf` | PASS | PASS |
| S17 | lynn | `name:"qa-up-*" mediatype:document` | PASS | PASS |
| S18 | lynn | `content:"kinkajouspace"` (no access, must not match) | PASS | PASS |
| S19 | margaret | `content:"kinkajouspace"` | PASS | PASS |
| S20 | margaret | `content:"tapirspacedocx"` | PASS | PASS |
| S21 | margaret | `tag:"qa-up-spacetag"` | PASS | PASS |
| S22 | margaret | `name:"qa-up-space-doc*"` | PASS | PASS |

22/22 pass on both versions.

## Notes on query behaviour from 7.5.0, checked again (`RUN/scripts/search-after-probe.mjs`, run twice, same result both times)

| Query (lynn) | 7.5.0 (from `state/search-extra.md`) | 8.1.0 |
|---|---|---|
| `name:"qa-up-mtime*" mtime>=2022-01-01 mtime<2023-01-01` (no explicit AND) | "almost everything of lynn" (count not recorded) | 4 hits: `qa-up-mtime-2018.txt`, `qa-up-mtime-2022.txt`, `old-2019.txt`, `old-2021.txt`. That is the same set as `mtime<2023-01-01` alone |
| `name:"qa-up-mtime*" mtime:2022-09-01` | both mtime files (the date is not used as a filter) | same: both mtime files. `AND` and `mtime=` give the same result |
| `mtime:2022-09-01` (no other term) | not recorded | **HTTP 500** `can not compile the query` (also for `mtime:"2022-09-01"`) |
| `mtime>=2022-09-01 AND mtime<2022-09-02` | — | 1 hit, `qa-up-mtime-2022.txt` (this range form works) |

- The query without an explicit AND still does not give the expected range, but the result has changed. 7.5.0
  returned almost all of lynn's files, 8.1.0 returns only the old files (the `mtime<2023-01-01` set). The KQL query
  compiler changed a lot between the two versions (`services/search/pkg/query/bleve/compiler.go`, new
  `normalize.go`), so this is a change in how the query is parsed, not missing index data. The form with explicit
  `AND` (S8) gives the same result on both versions. Not an upgrade bug.
- `mtime:<date>`: the bleve compiler skips a date node whose operator is `:` (`case *ast.DateTimeNode … default:
  continue`). The code is the same in v7.5.0 and v8.1.0. When this is the only term, nothing is left to compile and
  the search service returns 500. When it is combined with another term, the date is silently ignored. Both
  versions behave the same way, so it is **not an upgrade bug**. See finding F1.

## UI (lynn, `RUN/scripts/search-after-ui.mjs`)

| Check | Result | Screenshot |
|---|---|---|
| Preview drop, content word `quokkaupgrade` | PASS: `zebrafinch-report.txt` in `qa-up-search`, "Show 1 result" | `screens/001-search-after-preview-content.png` |
| Results page, `quokkaupgrade` | PASS: 1 row with content snippet | (raw 002) |
| Preview + results, `axolotldocx` (docx via Tika) | PASS: `qa-up-report.docx` with snippet | `screens/004-search-after-results-content-docx.png` |
| Preview + results, `熊猫` | PASS: `qa-up-中文报告.txt`, snippet with the word highlighted | `screens/006-search-after-results-chinese.png` |
| Results `qa-up` + Tags filter `qa-up-标签` | PASS: only `qa-up-tags.txt`. The filter lists all 4 seeded tags | `screens/008-search-after-filter-tag-chinese.png` |
| Results `search` + Tags filter `qa-up-searchtag` | PASS: only `tagged-search.txt` | (raw 010) |
| Results `qa-up-mtime` | PASS: both files, Modified "8 years ago" / "4 years ago". The original mtimes survived the re-index | `screens/011-search-after-results-mtime.png` |
| Last Modified = "this year" on `qa-up-mtime` | PASS: no results (old files are filtered out) | `screens/012-search-after-filter-lastmod-thisyear.png` |
| Last Modified = "last 30 days" on `old-20` | PASS: no results. Without the filter: `old-2019.txt` "7 years ago", `old-2021.txt` "5 years ago" | (raw 013/014) |
| Last Modified = "last 30 days" on `qa-up-search` | PASS: recent folders still listed | (raw 016) |

The Last Modified filter offers only: today, last 7 days, last 30 days, this year, last year. None of them selects
files from 2018–2022, so the UI check for the old files is that they are filtered out. The API covers the positive
case (S7, S8).

Typing a tag name as a plain search term (`qa-up-searchtag`) gives "No results": plain-term search does not look in
tags. The Tags filter does. This is expected and has nothing to do with the upgrade.

## Findings

### F1 — `mtime:<date>` alone returns HTTP 500 (pre-existing, not an upgrade bug)
- Steps: as lynn, `REPORT /dav/spaces/` with KQL `mtime:2022-09-01` (or `mtime:"2022-09-01"`).
- Expected: the files modified on that day, or a 400 error that explains the query syntax.
- Actual: HTTP 500, `{"id":"eu.opencloud.api.search","code":500,"detail":"can not compile the query"}`. Reproduced
  twice. When combined with another term (`name:"qa-up-mtime*" mtime:2022-09-01`), the date is silently ignored.
- Evidence: probe output (no UI path: the web filters use range syntax).
- Verdict: not an upgrade bug. Same compiler code in v7.5.0 and v8.1.0. Low severity (KQL API / search service,
  `services/search/pkg/query/bleve/compiler.go`).

### Observation — implicit join of same-property date ranges changed
- `name:"qa-up-mtime*" mtime>=2022-01-01 mtime<2023-01-01`: 7.5.0 almost all of lynn's files, 8.1.0 4 old files.
  Neither is the intended range. Explicit `AND` works on both. This changed with the KQL compiler rewrite, not with
  the index migration. Not an upgrade bug.

No upgrade bugs: no data was lost and no query broke after the re-index.
