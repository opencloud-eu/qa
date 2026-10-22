---
name: upgrade-test
description: Agent-driven upgrade and compatibility test of OpenCloud with opencloud-compose. Starts the from-version, seeds data with parallel agents, upgrades to the to-version, runs the migrations from the release notes and verifies that nothing got lost. Produces release-testing/upgrade/runs/<from>-to-<to>/report.md. Use for /upgrade-test or "upgrade test from X to Y".
---

# Upgrade test (OpenCloud, opencloud-compose)

Goal: find data or settings that get **lost or broken by an upgrade**. Every claim in the report is backed by a
check result or a screenshot.

Paths are relative to the repo root. Run folder: `release-testing/upgrade/runs/<from-tag>-to-<to-tag>/` (= RUN).
Credentials and `OC_COMPOSE_DIR` come from `release-testing/.env` (shared with the exploratory tests).

## Shell rules
- One simple command per Bash call, from the repo root. No `cd`, `;`, `&&`, `|`, `>`, loops or `sleep`.
- Never read `release-testing/.env`. Docker only through `node release-testing/upgrade/compose.mjs …` (and read-only `docker ps`,
  `docker volume ls`). Never remove volumes; a fresh start is the user's command: `docker compose -p qa-upgrade down -v`.
- Scripts in the foreground, Bash timeout up to 600000 ms.
- Playwright scripts in `RUN/scripts/` start with `import '../../../env.mjs'` (before anything else), then import
  `open`, `login`, `shot` from `../../../../lib/oc.mjs` and `session` from `../../../../lib/api.mjs`. Screenshots then
  land in `RUN/screens-raw/`.

## 1. Ask — one question at a time
1. "From: image and tag?" (e.g. `opencloudeu/opencloud-rolling 8.1.0`)
2. "To: image and tag?" (e.g. `opencloudeu/opencloud dev` — built locally)
3. "Stack?" Default `docker-compose.yml:yjs/yjs.yml:traefik/opencloud.yml:weboffice/collabora.yml:traefik/collabora.yml:search/tika.yml`.

Compose ref per phase (`node release-testing/upgrade/compose.mjs refs` lists the stable branches): production image
`opencloudeu/opencloud` X.Y.z → `origin/stable-X.Y` if it exists, else ask; rolling and `dev` → `origin/main`.
Files that don't exist in the from-ref (e.g. `yjs/yjs.yml` before 8.0) are dropped from the from-stack — say so.
Show the plan (from/to, refs, both COMPOSE_FILEs) and continue.

## 2. Release notes → migrations
Read the opencloud release notes of every release after `from` up to `to` (`gh release list -R opencloud-eu/opencloud`,
`gh release view <tag>`; for `dev` also the unreleased `CHANGELOG.md` on main). Collect breaking changes, upgrade notes
and required commands (search re-index, `opencloud shares migrate …`, config changes, new compose files).
Ask the user **once** to confirm the list of migration steps. This is the only question after step 1.

## 3. Start the from-version
Write `<from>-to-<to>` into `release-testing/upgrade/runs/.current`, then:
```
node release-testing/upgrade/compose.mjs up from --ref <ref> --image <image> --tag <tag> --files <files>
node release-testing/lib/smoke.mjs
```
If ports 80/443 are busy or old volumes exist, the script stops and prints what the user must do — tell the user, stop.

## 4. Seed — parallel agents
Start one subagent per area, all at once (Agent tool): `files`, `sharing`, `spaces`, `admin`, `account`, `search`,
`editors`. Brief for each:

> Area <area> of an OpenCloud upgrade test, from-version <from> is running. Read `.claude/skills/upgrade-test/SKILL.md`
> sections "Shell rules", 4 and "Safety". (1) Run `node release-testing/upgrade/run.mjs seed <area>` (not for `editors`). If it fails
> because of the script, fix only `release-testing/upgrade/areas/<area>.mjs` and rerun. (2) Add more data in this area that an upgrade
> could lose or break — through the UI with Playwright (scripts in `RUN/scripts/<area>-*.mjs`) or the API
> (`release-testing/lib/api.mjs`). Prefix everything with `qa-up-`. (3) Write what you created and how to check it to
> `RUN/state/<area>-extra.md`. (4) Run `node release-testing/upgrade/run.mjs verify <area> --phase before` and check your extra data
> once. Anything failing **before** the upgrade is a seed problem — fix it or drop it, note it. Report: what exists
> now, what failed.

Ideas for extra data per area (go beyond the scripts):
- **files**: many files in one folder, large and zero-byte files, previews/thumbnails, renamed and moved files, a locked file, special characters.
- **sharing**: share with expiration, link without expiration, hidden/declined share, share of a subfolder of a shared folder, guest invite if enabled.
- **spaces**: renamed space, member via group, Manager role, space with many members, readme with markdown.
- **admin**: users with Admin and User Light roles, group renamed, announcement (if the version has it), general settings.
- **account**: dark mode (Account → Theme, keep the Playwright `storageState` in `RUN/state/` to reopen it after the upgrade), in-app notifications (unread), language, notification options.
- **search**: office documents and PDFs with unique words, files with old mtimes, tags with spaces/unicode.
- **editors**: collaborative markdown document with yjs and a `@mention`, Collabora document created and edited, Excalidraw whiteboard, vault folder (encrypted in the browser — UI only).

## 5. Upgrade
After all seed agents are done:
```
node release-testing/upgrade/compose.mjs up to --ref <ref> --image <image> --tag <tag> --files <files>
```
Then run each confirmed migration, e.g. `node release-testing/upgrade/compose.mjs exec opencloud opencloud search index --all-spaces --force-rescan --insecure`.
Keep the output. Check `node release-testing/upgrade/compose.mjs logs opencloud --tail 300` for errors and panics after the start.

## 6. Verify — parallel agents
Same areas, one subagent each:

> Verify area <area> after the upgrade to <to>. Read `.claude/skills/upgrade-test/SKILL.md` sections "Shell rules", 6
> and "Safety". Run `node release-testing/upgrade/run.mjs verify <area> --phase after` (not for `editors`), check everything in
> `RUN/state/<area>-extra.md`, and look at the area in the UI (as the users who own the data). Reproduce every failure
> twice. A check that passed before and fails after is an upgrade bug. Write `RUN/results/<area>.md`: checks
> (pass/fail), extra data (pass/fail), findings with steps, expected, actual, screenshot, and whether it is a seed
> problem or an upgrade bug.

## 7. Report
`RUN/report.md`, screenshots used as evidence copied to `RUN/screens/`:
- Header: from/to image:tag, compose refs and COMPOSE_FILEs, date, duration, agents.
- Migrations: commands and their result.
- Summary per area: checks before/after, failures.
- Findings (upgrade bugs only) with severity, steps, evidence, likely component (web / opencloud / reva). Draft issues in `RUN/issues/<ID>.md`.
- **Checklist for the release issue** in this format, ticked from the results:
  ```
  Compatibility and upgrade test between `<from image:tag>` and `<to image:tag>` using opencloud-compose `<COMPOSE_FILE>`

  ### upgrade test:
  - [x] <migration step>
  ### compatibility test:
  personal space:
  - [x] public share (with an expiration date)
  ...
  ```
  Groups: personal space, project space, users/groups, settings, search, editors — one line per check or extra item.

Commit `RUN` on the branch `upgrade/<from>-to-<to>`. Don't push, don't create issues or comments.
Leave the stack running and tell the user: URL, how to clean up (`docker compose -p qa-upgrade down -v`, user's command).

## Safety
- Only the `qa-upgrade` compose project. Never touch the user's own stack, checkout or `.env` of opencloud-compose.
- Never change passwords or roles of admin and demo users; create own users for that (`qa-up-*`).
- Generated passwords and tokens stay in `RUN/state/` (git-ignored). No credentials in committed files.
- Security-relevant findings only in `RUN/security/`, tell the user in chat.
