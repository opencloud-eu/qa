# Exploratory test report — OpenCloud <version> (<rolling|production>)

**Instance:** <url> · **Server:** <status.php version> · **Web:** <version>
**Release issue:** <link> · **Changelog:** https://github.com/opencloud-eu/opencloud/releases/tag/v<version> · **Charters:** [charters.md](charters.md)
**Date / duration:** <date>, <minutes> min · **Agent:** Claude Code · **Browser:** Chromium (desktop 1440×900, Pixel 7)
**Users:** admin, dennis, margaret, alan, lynn, mary

## Summary
| Severity | Count |
|---|---|
| Blocker | 0 |
| Major | 0 |
| Minor | 0 |
| Question | 0 |

Release recommendation from the agent: <go / go with known issues / no-go> — <one sentence why>. (Final decision: test manager.)

## Findings
### <ID> <short title> — <Severity>
- **Charter / PR:** <C3 / #3440>
- **Role / viewport:** <alan, desktop>
- **Steps:**
  1. …
- **Actual:** …
- **Expected:** …
- **Evidence:** ![](screens/012-….png)  · draft: [issues/<ID>.md](issues/<ID>.md) · console: `<error if any>`
- **Reproduced:** 2/2 · **Known issue:** <#… / no>
- **Likely component:** <packages/web-pkg/src/…> (if found)

## Coverage
| Charter | Title | Priority | Result | Notes |
|---|---|---|---|---|
| C1 | … | P1 | ✅ passed / ⚠️ findings / ⛔ blocked / ➖ not tested | … |

## Not tested (and why)
- …

## Observations (not bugs)
- …

## Test data created
Prefix `qa-<version>-` — users: …, spaces: …

## Log
See [log.md](log.md).
