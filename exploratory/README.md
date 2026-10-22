# Exploratory Testing with Claude Code and Playwright

An AI agent (Claude Code) explores the OpenCloud web UI in a real browser and writes a report with screenshots
and bug drafts. The test manager reviews the report, files the bugs and publishes it.

Two modes:

- **Release test** — checks the changes of a release, driven by the changelog.
- **Bug hunt** — looks for bugs anywhere in the web UI.

> [!IMPORTANT]
> Run every command, including `claude`, from the repository root `~/Work/qa`. Otherwise Claude Code doesn't load
> the skills and the permission rules.

## Table of Contents

- [Setup](#setup)
- [Release Test](#release-test)
- [Bug Hunt](#bug-hunt)
- [Publish the Results](#publish-the-results)
- [Folder Layout](#folder-layout)
- [Rules for the Agent](#rules-for-the-agent)
- [Troubleshooting](#troubleshooting)

## Setup

### Once per Machine

```bash
curl -fsSL https://claude.ai/install.sh | bash   # install Claude Code, then run `claude` once to log in
gh auth login
cp exploratory/.env.example exploratory/.env     # instance URL and passwords, never committed
```

Optional, to look at pages interactively:

```bash
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install playwright@claude-plugins-official
```

### Before Each Run

1. Prepare a test instance with the release candidate and the demo users
   `admin`, `dennis`, `margaret`, `alan`, `lynn`, `mary`. Put its URL into `exploratory/.env`.
2. Update the repository and the browser (Node 20+):

   ```bash
   git switch main && git pull
   pnpm install
   pnpm exec playwright install chromium
   ```

3. Check that every user can log in:

   ```bash
   pnpm exploratory:smoke
   ```

4. Start Claude Code:

   ```bash
   claude
   ```

## Release Test

### 1. Create the Charters

```
/create-charters
```

The agent asks for the OpenCloud, web and reva versions, reads their changelogs and writes
`releases/<version>/charters.md`. Then it stops.

### 2. Review the Charters

Edit `charters.md` as plain text, the agent follows your notes:

- move a charter to *Out of scope* with a reason
- change the priority (P1 must, P2 should, P3 if time allows)
- add a hint or your own charter

### 3. Run the Test

```
/release-exploratory-test <version>
```

Up to 5 explorers test the charters in parallel. A run takes about 1 hour and needs no input.

Options:

| Option         | Description                             |
| -------------- | --------------------------------------- |
| `only=C1,C3`   | test only these charters                |
| `mobile`       | focus on the phone layout (Pixel 7)     |
| `budget=60`    | time in minutes (default 60)            |
| `agents=5`     | number of parallel explorers (default 5)|

Say "run headed" to watch the browser.

## Bug Hunt

```
/exploratory-bug-hunt
```

Explorers cover the whole web UI area by area. They read the web source code (`~/Work/web`, if present) and break
flows on purpose. A second round of verifiers reproduces each finding. Takes about 4 hours and uses more tokens than
a release test.

| Option         | Description                             |
| -------------- | --------------------------------------- |
| `areas=H1,H3`  | hunt only in these areas                |
| `mobile`       | add a phone pass to every area          |
| `budget=240`   | time in minutes (default 240)           |
| `agents=5`     | number of parallel explorers (default 5)|

## Publish the Results

The agent commits the results on the branch `exploratory/<version>` (or `exploratory/hunt-<date>`). It never pushes
and never creates issues.

1. Review `report.md`. Remove or downgrade findings you don't agree with, or ask the agent to re-check one.
2. File each accepted finding:

   ```bash
   gh issue create -R opencloud-eu/web --title "<title>" \
     --body-file exploratory/releases/<version>/issues/<ID>.md --label Type:Bug
   ```

3. Add the issue numbers to the report (or ask the agent), commit, then:

   ```bash
   git push -u origin exploratory/<version>
   gh pr create -R opencloud-eu/qa --fill
   ```

4. After the merge, add this to the *QA Phase* of the release issue:

   ```
   - [ ] Agent exploratory testing of the changelog @ScharfViktor
     - [ ] smoke OK on RC instance
     - [ ] report: https://github.com/opencloud-eu/qa/blob/main/exploratory/releases/<version>/report.md
     - [ ] findings triaged → "Collected bugs"
   ```

## Folder Layout

```
exploratory/
  lib/                     shared Playwright helpers (login, screenshots, layout checks)
  releases/<version>/
    charters.md            the changelog turned into charters
    report.md              the result
    screens/               screenshots used in the report
    issues/                bug drafts for `gh issue create`
    results/               one file per explorer
    log.md                 what the agents did
```

`screens-raw/`, `scripts/` and `security/` stay local (git-ignored). The skills are in `.claude/skills/`.

## Rules for the Agent

- Test instances only. Everything it creates starts with `qa-<version>-`.
- It doesn't change the admin or demo accounts and restores any setting it changes.
- No credentials and no security findings in committed files — the repository is public.
  Security findings go to `security/` and are reported privately.
- No push, no issues, no comments.
- A hook (`.claude/hooks/bash-guard.mjs`) approves simple commands and blocks dangerous ones.
  If you still get a prompt, send the command to the maintainer of this folder.

## Troubleshooting

| Problem                                              | Solution                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Approval prompt on every command, or unknown `/…` skill | Claude Code started outside the repo root. `/exit`, then `cd ~/Work/qa && claude --continue` |
| Smoke test fails for demo users                      | Demo users not enabled or wrong password. See `releases/_scratch/screens-raw/smoke-FAIL-<user>.png` |
| Smoke test times out for admin                       | Instance not reachable. Check the URL, the certificate and `/etc/hosts`          |
| `pnpm install` complains about Node                  | Playwright needs Node 20+ (`node -v`)                                            |
| Where are all screenshots?                           | `releases/<version>/screens-raw/`                                                |
