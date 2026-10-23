# Release Testing with Claude Code and Playwright

AI agents (Claude Code) test an OpenCloud release in a real browser and write reports with screenshots and bug
drafts. The test manager reviews the reports and files the bugs.

| Test                                     | Command                                          | What it checks                                   |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| [Exploratory](exploratory/README.md)     | `/create-charters`, `/release-exploratory-test`  | the changes of a release, driven by the changelog |
| [Bug hunt](exploratory/README.md#bug-hunt) | `/exploratory-bug-hunt`                        | bugs anywhere in the web UI                      |
| [Upgrade](upgrade/README.md)             | `/upgrade-test`                                  | nothing gets lost when upgrading from an older version |

> [!IMPORTANT]
> Run every command, including `claude`, from the repository root `~/Work/qa`. Otherwise Claude Code doesn't load
> the skills and the permission rules.

## Table of Contents

- [Setup](#setup)
- [Folder Layout](#folder-layout)
- [Rules for the Agent](#rules-for-the-agent)
- [Troubleshooting](#troubleshooting)

## Setup

### Once per Machine

```bash
curl -fsSL https://claude.ai/install.sh | bash        # install Claude Code, then run `claude` once to log in
gh auth login
cp release-testing/.env.example release-testing/.env  # instance URL and passwords, never committed
```

Optional, to look at pages interactively:

```bash
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install playwright@claude-plugins-official
```

### Before Each Run

1. Update the repository and the browser (Node 20+):

   ```bash
   git switch main && git pull
   pnpm install
   pnpm exec playwright install chromium
   ```

2. For exploratory tests: prepare a test instance with the release candidate and the demo users
   `admin`, `dennis`, `margaret`, `alan`, `lynn`, `mary`, put its URL into `release-testing/.env` and check that
   every user can log in:

   ```bash
   pnpm exploratory:smoke
   ```

   The upgrade test starts its own instance, see [upgrade/README.md](upgrade/README.md#setup).

3. Start Claude Code:

   ```bash
   claude
   ```

## Folder Layout

```
release-testing/
  .env                     instance URL and passwords (git-ignored)
  lib/                     shared helpers: login, screenshots, API access
  exploratory/             release test and bug hunt, one folder per run in releases/
  upgrade/                 upgrade test, one folder per run in runs/
```

The skills are in `.claude/skills/`.

## Rules for the Agent

- Test instances only. Everything it creates starts with `qa-`.
- It doesn't change the admin or demo accounts and restores any setting it changes.
- No credentials and no security findings in committed files — the repository is public.
  Security findings go to a git-ignored `security/` folder and are reported privately.
- No push, no issues, no comments.
- A hook (`.claude/hooks/bash-guard.mjs`) approves simple commands and blocks dangerous ones.
  If you still get a prompt, send the command to the maintainer of this folder.

## Troubleshooting

| Problem                                                 | Solution                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Approval prompt on every command, or unknown `/…` skill | Claude Code started outside the repo root. `/exit`, then `cd ~/Work/qa && claude --continue` |
| Smoke test fails for demo users                         | Demo users not enabled or wrong password. See `exploratory/releases/_scratch/screens-raw/smoke-FAIL-<user>.png` |
| Smoke test times out for admin                          | Instance not reachable. Check the URL, the certificate and `/etc/hosts`                    |
| `pnpm install` complains about Node                     | Playwright needs Node 20+ (`node -v`)                                                      |
