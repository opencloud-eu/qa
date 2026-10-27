---
name: upgrade-test
description: Agent-driven upgrade and compatibility test of OpenCloud with opencloud-compose. Starts the from-version, seeds data with parallel agents, upgrades to the to-version, runs the migrations from the release notes and verifies that nothing got lost. Produces release-testing/upgrade/runs/<from>-to-<to>/report.md. Use for /upgrade-test or "upgrade test from X to Y".
---

# Upgrade test (OpenCloud, opencloud-compose)

Goal: find data or settings that get **lost or broken by an upgrade**. Every claim in the report is backed by a
check result or a screenshot.

Paths are relative to the repo root. Run folder: `release-testing/upgrade/runs/<from>-to-<to>/` (= RUN), named by
version, not by tag: for `dev` or `latest` use the version the build reports (e.g. `8.1.0-to-9.0.0` for a `9.0.0+dev` image —
check `status.php` after the upgrade and rename the folder and branch if it differs from your guess).
Credentials and `OC_COMPOSE_DIR` come from `release-testing/.env` (shared with the exploratory tests).

## Shell rules
- One simple command per Bash call, from the repo root. No `cd`, `;`, `&&`, `|`, `>`, loops or `sleep`.
- Never read `release-testing/.env`. Docker only through `node release-testing/upgrade/compose.mjs …` (and read-only `docker ps`,
  `docker volume ls`). Never remove volumes; a fresh start is the user's command: `docker compose -p qa-upgrade down -v`.
- `opencloud.yaml` holds secrets: never print it whole or grep it loosely. Look for one key at a time
  (e.g. `grep -n "^auth_guest:" …`) and never copy values into chat, results or the report.
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

**Breaking changes need the most care — they are where upgrades fail.** Commit titles are not enough:
- List the merged PRs in the range, not only commits: `gh pr list -R opencloud-eu/opencloud --state merged --search "merged:>=<from-release-date>" --limit 300 --json number,title,labels`
  (for `dev` up to now). Breaking = title with `!` (`feat(x)!:`), a "Breaking change" label, or "breaking" in the release
  notes or the PR body. Also check the reva and web releases in the range the same way.
- Open **every** breaking PR (`gh pr view <n> --json title,body,files`) and read its "Migration" / "Breaking change" part.
  Then check that part against the code on main: later PRs often change it (a secret that became derived, an env var
  renamed, a new required setting). Note what is still required and what is outdated.
- Turn **every** behaviour change the breaking PR describes into a check (body, "Update" and "Follow-ups" sections):
  not only the owner's own files, but the same thing as share recipient, in project spaces, on public links (with and
  without password), via WebDAV properties and in the UI. Hand these checks to the verify agents of the areas they
  touch. What is not checked goes into "Not tested" in the report, item by item.
- Also read `MIGRATION.md`/upgrade sections in the service READMEs touched by the range (e.g. `services/webdav/MIGRATION.md`).
- New services or features that are **off by default** (e.g. guest links) are part of the upgrade test: plan to switch
  them on after the upgrade (step 5) — "the upgrade starts" is not enough, enabling the feature on the old config must
  work too.

Show a table: change · PR · what an existing install must do · how the test checks it. Every breaking PR appears in it,
also when the answer is "nothing to do" (say why). Ask the user **once** to confirm the list of migration steps. This
is the only question after step 1.

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
Then, always, migrate the config with the **new** image — this is the standard upgrade step for every version:
```
node release-testing/upgrade/compose.mjs run opencloud env -u IDM_ADMIN_PASSWORD opencloud init --diff
node release-testing/upgrade/compose.mjs run opencloud patch -i /etc/opencloud/opencloud.config.patch /etc/opencloud/opencloud.yaml
node release-testing/upgrade/compose.mjs up to … (same arguments, recreates opencloud on the patched config)
```
(`run` starts a one-off container on the stack's volumes, also while opencloud itself does not start.
`IDM_ADMIN_PASSWORD` is unset because `--diff` refuses it.) The diff shows secrets — in the report name only the keys
that were added or removed. Note the start of the new version **before** the patch as well: it shows what happens to an
admin who skips the step.

Then run each confirmed migration, e.g. `node release-testing/upgrade/compose.mjs exec opencloud opencloud search index --all-spaces --force-rescan --insecure`.
Keep the output. Check `node release-testing/upgrade/compose.mjs logs opencloud --tail 300` for errors and panics after the start.

Then switch on the new features that are off by default and need the old config to work (from step 2), with
`--env KEY=VAL,KEY=VAL` on `up to` (written to `qa-env.yml` for the opencloud service). Mail goes to the inbucket the user
runs on the host (SMTP `host.docker.internal:2500`, web/API `http://localhost:9000`), e.g.:
```
--env "OC_ADD_RUN_SERVICES=notifications,NOTIFICATIONS_SMTP_HOST=host.docker.internal,NOTIFICATIONS_SMTP_PORT=2500,NOTIFICATIONS_SMTP_INSECURE=true,NOTIFICATIONS_SMTP_SENDER=OpenCloud <noreply@example.com>,OC_ENABLE_GUEST_LINKS=true"
```
If opencloud does not come up (`status.php not ready`), read the log: a service that fails on the old config is a
finding — reproduce it, then fix the config the documented way and continue.
After every `up` with `--env` check that nothing of the stack got lost: smoke, and `GET /app/list` still lists the
office apps (`OC_ADD_RUN_SERVICES` is mapped to `START_ADDITIONAL_SERVICES` so compose keeps `collaboration`).
Don't recreate the stack while verify agents are running.

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
- Migrations: the breaking-change table from step 2 (each breaking PR, what it says, what is really needed on main,
  how it was checked, result), then the commands and their result, including the config diff (keys only).
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
