---
name: create-charters
description: Create exploratory test charters for an OpenCloud release from the changelog of the opencloud release PR/tag and the web and reva releases. Asks for the three versions interactively. Use for /create-charters or "create charters for release X".
---

# Create charters for a release

Output: `exploratory/releases/<opencloud-version>/charters.md`, the input for `/release-exploratory-test`.
Talk to the user in **English** for the questions below; keep the chat short.


## Shell rules (avoid permission prompts)
- One simple command per Bash call. No chains with `;`, `&&`, `||`, no `set -a`, no `source`/`.`, no subshells.
- Never read or source `exploratory/.env`. For URL/version use `node exploratory/lib/status.mjs`;
  for logins use `node exploratory/lib/smoke.mjs`; in scripts import `URL`, `USERS` from `exploratory/lib/oc.mjs`.
- Run scripts from the repo root: `node exploratory/...` (no `cd`).
- Run Playwright scripts in the **foreground** (Bash timeout up to 600000 ms). Never run in background and never poll
  output files with loops/sleep; let the script print its results. Split scripts that need more than 10 minutes.
- A hook (`.claude/hooks/bash-guard.mjs`) auto-approves simple commands and blocks compound ones with an explanation —
  if a command is blocked, rewrite it as one simple command instead of retrying.

## 1. Ask for the versions — one question at a time, wait for each answer
1. "Which OpenCloud version do you want to test? (e.g. 8.2.0)"
2. "Which web version is included? (e.g. 8.2.0)"
3. "Which reva version is included? (e.g. 2.47.0)"

Accept answers with or without a leading `v`. If the user already gave versions as arguments, don't ask again.
If `exploratory/releases/<version>/charters.md` already exists, ask whether to overwrite it before continuing.

## 2. Find the changelog for each component
For each repo (`opencloud-eu/opencloud`, `opencloud-eu/web`, `opencloud-eu/reva`), in this order:
1. **Release tag exists** → `gh release view v<x> -R <repo>` — use its notes.
2. **No tag yet** → find the release PR:
   `gh pr list -R <repo> --state all --search "<x> in:title" --json number,title,state,url`
   (typical titles: "Release <x>", "release v<x>"). Read it with `gh pr view <n> -R <repo>` and
   `gh pr diff <n> -R <repo>` — the changelog is in the PR body and/or the `CHANGELOG.md` / `changelog/` diff.
3. **PR only bumps versions / no changelog** → collect merged PRs since the previous tag:
   `gh release list -R <repo> --limit 5` → date of previous tag →
   `gh pr list -R <repo> --state merged --search "merged:>=<date>" --limit 200 --json number,title,labels`.
4. Several candidates or nothing found → show what you found and ask the user for the link. Never guess.

Tell the user in one line per component which source you used (tag / PR #… / merged PRs since …).

## 3. Check the instance
- `node exploratory/lib/status.mjs` must show `.env: present` and a status.php answer; `node exploratory/lib/smoke.mjs` must log in admin (other users optional here).
- `node exploratory/lib/status.mjs` → compare `productversion` with the OpenCloud version; mention a mismatch, don't stop.
- Probe optional features with a short Playwright script (as admin and as `alan`), using `exploratory/lib/oc.mjs`:
  entries in the "New" menu (Excalidraw, office formats), app store / extensions, office app (Collabora / OnlyOffice /
  EuroOffice), vaults / encrypted spaces, guest invite, full-text search. Write `releases/<version>` into
  `exploratory/releases/.current` first so screenshots land in the release folder.

## 4. Write the charters
Create `exploratory/releases/<version>/` and write `charters.md`:

```
# Charters — OpenCloud <version> (<rolling|production>)

## Sources
- opencloud <version>: <tag link | PR link | merged PRs since vX>
- web <x>: <link> · reva <y>: <link>
- Instance: <OC_URL>, productversion <…>, optional features: <found / not found>

| ID | Title | PRs | Mission — what could break | Roles | Viewport | Prio | UI? |
|---|---|---|---|---|---|---|---|
| R0 | Regression smoke | – | upload/download, folder, rename, move/copy, delete+restore, share user+link, preview, search, spaces, logout | alan, lynn | desktop + short mobile | P1 | yes |
| C1 | … | web#… oc#… | … | … | … | P1 | yes |

## Out of scope (reason)
- …
```

Rules:
- One charter per user-visible change or cluster of related changes; cite all PRs (`oc#`, `web#`, `reva#`).
- *Mission* = what could break, including neighbours of the change, not just "check that X works".
- Roles from: admin, dennis (Admin), margaret (Space Admin), alan / lynn / mary (User).
- Viewport: `desktop` (1440×900 window) and/or `mobile` (Pixel 7 emulation) — both web UI.
- Prio: P1 = highlights / new features / behavior changes, P2 = bug fixes users can hit, P3 = polish.
- UI?: `yes` · `API only` · `conditional — <feature> not on instance` (→ also list under Out of scope) · `no`.
- Out of scope by default, with reason: CI/test-only PRs, docs, dependency bumps, metrics, CLI/ops-only changes,
  server config not enabled on the instance, native clients.

## 5. Hand over
Print a short summary: number of charters per priority, out-of-scope list, questions for the test manager.
Then say: "Review `exploratory/releases/<version>/charters.md`, then run `/release-exploratory-test <version>`."
Do not start testing.
