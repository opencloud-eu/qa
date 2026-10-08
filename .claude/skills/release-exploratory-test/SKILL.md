---
name: release-exploratory-test
description: Agent-driven exploratory testing of an OpenCloud release candidate in the web UI with Playwright, driven by the release changelog. Produces exploratory/releases/<version>/report.md in the opencloud-eu/qa repo. Use for "test release X", "exploratory test 8.x", or /release-exploratory-test <version>.
---

# Release exploratory test (OpenCloud web)

Arguments: `<version>` (e.g. `8.1.0`). Optional: `mobile`, `only=<charter ids>`, `budget=<minutes>` (default 120).

Charters are created beforehand with `/create-charters`. If `releases/<version>/charters.md` doesn't exist,
stop and tell the user to run `/create-charters` first.

You are an experienced exploratory tester. Goal: find **real, user-visible problems** in this release — not to re-run
the CI suite. Every claim in the report must be backed by a screenshot and a reproduction you executed yourself.

All paths below are relative to `exploratory/` in the opencloud-eu/qa repo. Release folder: `releases/<version>/` (= REL).


## Shell rules (avoid permission prompts)
- One simple command per Bash call. No chains with `;`, `&&`, `||`, no `set -a`, no `source`/`.`, no subshells.
- Never read or source `exploratory/.env`. For URL/version use `node exploratory/lib/status.mjs`;
  for logins use `node exploratory/lib/smoke.mjs`; in scripts import `URL`, `USERS` from `exploratory/lib/oc.mjs`.
- Run scripts from the repo root: `node exploratory/...` (no `cd`).
- Run Playwright scripts in the **foreground** (Bash timeout up to 600000 ms). Never run in background and never poll
  output files with loops/sleep; let the script print its results. Split scripts that need more than 10 minutes.
- A hook (`.claude/hooks/bash-guard.mjs`) auto-approves simple commands and blocks compound ones with an explanation —
  if a command is blocked, rewrite it as one simple command instead of retrying.

## Unattended
- The run is meant to work without the user. Don't ask questions during exploration: make a reasonable assumption,
  note it in `log.md` and collect open questions in the report under "Questions for the test manager".
- Only stop for real blockers (instance down, login impossible, version mismatch).

## Layout of REL
```
releases/<version>/
  charters.md      input: changelog → charters (committed)
  report.md        output: final report (committed, linked from the release issue)
  screens/         only screenshots referenced in report.md (committed)
  issues/          bug drafts, one file per finding (committed)
  log.md           exploration log (committed)
  screens-raw/     all screenshots (git-ignored)
  scripts/         throw-away Playwright scripts (git-ignored)
  security/        security-relevant findings (git-ignored — NEVER commit, repo is public)
```

## 0. Preconditions (stop and ask if one fails)
- `exploratory/.env` exists, `OC_URL` points to a **test** instance. Never test anything that looks like production. Do not read `.env`.
- Create `releases/<version>/` if it doesn't exist and write `releases/<version>` into `releases/.current`
  (lib/oc.mjs uses it for screenshots).
- `node exploratory/lib/smoke.mjs` logs in as admin and all demo users. If login fails, fix selectors in `lib/oc.mjs` once, rerun.
- Record versions: `node exploratory/lib/status.mjs` and web version (account page / About). If they don't match `<version>`, stop and tell the user.
- Run scripts as plain `node exploratory/releases/<version>/scripts/<name>.mjs` from the repo root — no env prefixes, no `cd`, no `rm`.

## 1. Charters
- Use `REL/charters.md` (created by `/create-charters`, reviewed by the test manager). Treat notes in it as instructions
  ("no — not enabled", priorities, hints). Charters under "Out of scope" are not tested but listed in the report.
- `conditional` charters: first check whether the feature exists on the instance; if not → "Not tested" with reason.
- Work in priority order: P1, then P2, then P3, within the time budget. R0 (regression smoke) is always P1.

## 2. Test data
- Prefix everything you create with `qa-<version>-`.
- Prefer the UI; to *prepare* data fast use WebDAV/Graph from a node script (Playwright `request` + `USERS` from lib/oc.mjs), not curl with passwords.
- Include nasty data where relevant: 200+ char names without spaces, unicode/emoji, `#%&?`, 5-level nesting, empty files.

## 3. Explore (per charter, timeboxed ~10–15 min)
- Scripts in `REL/scripts/`, importing `../../../lib/oc.mjs` (`open`, `login`, `shot`, `layoutCheck`). Prefer role/text locators.
- Per charter: happy path → variations (other role, mobile, long names, empty state, cancel/escape, reload, second user
  sees the change) → neighbours of the change (what else uses the same component?).
- After each meaningful step: `shot()`, check `consoleErrors`, on mobile `layoutCheck()`.
- **Look at the screenshots yourself** (Read the PNG). Do not judge from the DOM alone.
- Source checkouts `~/Work/web`, `~/Work/opencloud` (if present) are read-only references for intended behavior and
  component names. Do not modify them.
- Append to `REL/log.md`: charter, what you did, observations, open questions.

## 4. Confirm findings
Report a finding only if: (1) reproduced **at least twice** from a fresh page/login, (2) a screenshot shows it,
(3) it is not caused by your own test data or instance config.
Severity: **Blocker** (data loss, security, core flow broken, crash) · **Major** (changelog feature doesn't work, no workaround)
· **Minor** (workaround exists, layout) · **Question** (unclear if intended).
Known? `gh issue list -R opencloud-eu/web --search "<keywords>" --state all` (also opencloud-eu/opencloud) → "known: #123".
**Security-relevant findings** (auth bypass, data exposure, permission escalation): write ONLY to `REL/security/`, mention in
report.md just "1 security finding reported privately", and tell the user in chat. The repo is public.

## 5. Report & hand-over
1. Copy the screenshots used as evidence from `screens-raw/` to `REL/screens/`; reference them relatively (`screens/…png`)
   so they render on GitHub. Keep it lean (only evidence, typically ≤ 30 images).
2. Write `REL/report.md` from `report-template.md` (this folder) and one draft per finding in `REL/issues/<ID>.md`
   (title line + body ready for `gh issue create --body-file`).
3. Never put passwords, tokens or the `.env` content into any committed file.
4. `git add exploratory/releases/<version>` and commit on branch `exploratory/<version>` (create it from the current HEAD with `git checkout -b`; if it exists, switch to it) with message
   `exploratory: report for <version>`. **Do not push** — the test manager reviews and pushes/opens the PR.
5. Chat summary: counts by severity, top 3 findings, coverage, items needing a human decision, and the future link
   `https://github.com/opencloud-eu/qa/blob/main/exploratory/releases/<version>/report.md`.
- **Do not create GitHub issues or comments yourself.**

## Safety rules
- Never change password/email/role of `admin` or demo users; never delete them or the admin's data.
- Don't disable/delete spaces you did not create. Change global admin settings only if a charter requires it — then restore
  the previous value and note it in the log.
- No load testing, brute force or exploitation beyond checking documented behavior.
- If something blocks you (login broken, instance down, 5xx everywhere), stop and report.
