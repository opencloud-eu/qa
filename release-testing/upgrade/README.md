# Upgrade Testing

An AI agent starts an old OpenCloud version with opencloud-compose, fills it with test data, upgrades it to a new
version and checks that nothing got lost. Result: a report and a checklist for the release issue.
Setup and rules: [release-testing/README.md](../README.md).

## Table of Contents

- [Setup](#setup)
- [Run](#run)
- [What Is Checked](#what-is-checked)
- [Clean Up](#clean-up)
- [Folder Layout](#folder-layout)

## Setup

In addition to the [common setup](../README.md#setup), in `release-testing/.env`:

```bash
OC_COMPOSE_DIR=/Users/<you>/Work/opencloud/opencloud-compose
```

- `OC_URL` must match `OC_DOMAIN` in the `.env` of opencloud-compose, `OC_DEMO_PASSWORD=demo`.
- Your own stack must be stopped (ports 80/443).
- Your opencloud-compose checkout and its `.env` are not changed: the test uses its own worktrees, the compose project
  `qa-upgrade` and its own volumes.

## Run

```
/upgrade-test
```

The agent asks:

| Question | Example                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------- |
| From     | `opencloudeu/opencloud-rolling 8.1.0`                                                                    |
| To       | `opencloudeu/opencloud dev` (built locally)                                                              |
| Stack    | `docker-compose.yml:yjs/yjs.yml:traefik/opencloud.yml:weboffice/collabora.yml:traefik/collabora.yml:search/tika.yml` |

For a production version (e.g. `7.2.x`) it uses the compose branch `stable-7.2`, for rolling and `dev` `main`.

Then:

1. Reads the release notes and shows the migrations (e.g. search re-index). You confirm once.
2. Starts the from-version.
3. 7 agents in parallel seed data: files, sharing, spaces, admin, account, search, editors.
4. Upgrades and runs the migrations.
5. 7 agents in parallel verify their area by API and in the UI.
6. Writes `release-testing/upgrade/runs/<from>-to-<to>/report.md` with a checklist to paste into the release issue.

## What Is Checked

| Area     | Examples                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------- |
| files    | content checksums, file ids, versions, old mtimes, favorites, tags, trash and restore, unicode names |
| sharing  | user and group shares with expiration, public links (password, edit, file drop), internal links      |
| spaces   | quota, description, image, readme, members, space link, versions, trash, disabled space              |
| admin    | users, disabled user, Space Admin role, groups, user quota, announcement banner                      |
| account  | language, notification settings, auto-accept shares, avatar, app token, GDPR export, new password    |
| search   | name, content (Tika), tags, favorites after re-index                                                 |
| editors  | yjs collaborative editing and mentions, Collabora, Excalidraw, vault (UI only)                        |

The agents add their own data per area on top of this, e.g. dark mode or unread notifications.

Seed and verify can also be run by hand against any instance:

```bash
node release-testing/upgrade/run.mjs seed files
node release-testing/upgrade/run.mjs verify files --phase after
```

## Clean Up

The stack keeps running after the test. Remove it with:

```bash
docker compose -p qa-upgrade down -v
```

## Folder Layout

```
upgrade/
  compose.mjs              starts the stack (never deletes volumes)
  run.mjs                  seed / verify per area
  areas/                   one script per area
  env.mjs                  points the shared helpers at the current run
  runs/<from>-to-<to>/
    report.md              the result
    results/               check results per area
    issues/                bug drafts
```

`state/` (ids, generated passwords), `screens-raw/` and `scripts/` stay local (git-ignored).
