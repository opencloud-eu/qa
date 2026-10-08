# Exploratory release testing with Claude Code and Playwright

This folder contains everything needed to let an AI agent (Claude Code) run an exploratory test of an
OpenCloud release candidate. The agent reads the changelog, turns it into test charters, explores the web UI
with Playwright in a real browser, and writes a report with screenshots. The test manager reviews the report,
files the bugs and links the report from the release issue.

## How it is organized

Each release gets its own folder:

```
exploratory/releases/<version>/
  charters.md   the changelog turned into test charters (reviewed by the test manager)
  report.md     the result, linked from the release issue
  screens/      screenshots used as evidence in the report
  issues/       bug drafts, ready for `gh issue create --body-file`
  log.md        what the agent did
```

The folders `screens-raw/`, `scripts/` and `security/` are created during a run as well, but stay local (git-ignored).

The method itself is defined in the Claude Code skill `.claude/skills/release-exploratory-test/`, the permission
rules in `.claude/settings.json`. Shared Playwright helpers (login, screenshots, layout checks) are in `lib/`.

**Important:** always run all commands — including `claude` — from the repository root `~/Work/qa`.
Claude Code only picks up the skill and the permission rules when started there; otherwise it asks for approval
on every single command.

## Setting up a machine

This is done once.

1. Install Claude Code and log in:
   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   claude        # log in, then exit
   ```
2. Log in with the GitHub CLI, the agent uses it to read release notes and search existing issues:
   ```bash
   gh auth login
   ```
3. Create the credentials file and fill in the instance URL, the admin password and the demo user password.
   This file is never committed.
   ```bash
   cd ~/Work/qa
   cp exploratory/.env.example exploratory/.env
   ```

## Testing a release

### 1. Update the repository and Playwright

Playwright is already a dependency of this repository (`@playwright/test` in the root `package.json`, Node 20+ required).
Before each release, update the repository and install the matching browser:

```bash
cd ~/Work/qa
git switch main && git pull
pnpm install
pnpm exec playwright install chromium
```

### 2. Check the test instance

You need a running test instance with the release candidate and the demo users
(`admin`, `dennis`, `margaret`, `alan`, `lynn`, `mary` with password `demo`).
How it is deployed doesn't matter — the agent only needs the URL and the credentials from `exploratory/.env`.

Check that all users can log in:

```bash
pnpm exploratory:smoke
```

Every user should be reported as `OK`. If one fails, a screenshot of what the browser saw is saved as
`smoke-FAIL-<user>.png` (see Troubleshooting).

### 3. Start Claude Code

```bash
claude
```

To make sure the project settings are loaded, type `/permissions` — the list should contain rules like `Bash(node *)`.

### 4. Create the charters

A charter describes one area to explore: what changed, what could break, which roles are involved,
whether to test on desktop or mobile, and the priority. The agent writes them from the changelog — you only
tell it the versions. In the running Claude Code session type:

```
/create-charters
```

The agent asks three questions, one after the other:

```
Which OpenCloud version do you want to test?   → 8.1.0
Which web version is included?                 → 8.1.0
Which reva version is included?                → 2.x.y
```

For each component it then takes the changelog from the release tag if it already exists, otherwise from the
open release PR (e.g. https://github.com/opencloud-eu/opencloud/pull/3534). If it can't find a source unambiguously,
it asks you for the link. It also checks which optional features the instance offers (office, Excalidraw, vaults,
guests, full-text search) and marks charters for missing features as out of scope.

Result: the folder `exploratory/releases/8.1.0/` with `charters.md` — the sources at the top, then the charters table
and the out-of-scope list. The agent prints a short overview with open questions and stops; nothing is tested yet.

### 5. Review the charters

Open `charters.md` and adjust it. It is plain Markdown and the agent treats your notes as instructions, so there is
no special syntax:

- If something can't or shouldn't be tested, move the line to *Out of scope* and give the reason,
  e.g. `- C15 Office — no Collabora on the instance`.
- Change the priority (P1 = must, P2 = should, P3 = if time allows) or add a hint directly in the row,
  e.g. `yes — focus on live co-editing`.
- Add your own charter at the end in the same format, for example a bug you want re-checked.

The *viewport* column says in which browser size the web UI is tested: `desktop` is a 1440×900 browser window,
`mobile` is a Pixel 7 phone emulation. Both refer to the web UI, not to the native clients.

### 6. Run the test

```
/release-exploratory-test <version>
```

A run takes one to two hours and runs hundreds of commands. To keep it from stopping for approvals, the repository
has a hook (`.claude/hooks/bash-guard.mjs`): simple commands (`node`, `git status`, `gh pr view`, `ls` …) are approved
automatically, compound commands (`cd … && …`, loops, pipes) are rejected with an explanation so the agent rewrites
them itself, and forbidden ones (`git push`, `gh issue create`, `rm -rf`, reading `.env`) are denied. You should
rarely see a prompt; if one appears, send the command to the maintainer of this folder.

Optional arguments: `only=C1,C3` to test selected charters, `mobile` to focus on the phone layout,
`budget=60` to limit the time in minutes (default 120). Say "run headed" if you want to watch the browser.
It requires `charters.md` from step 4.

The agent doesn't ask questions during the run: it notes assumptions in `log.md` and collects open questions in
the report. It works through the charters by priority, takes screenshots and looks at them, reproduces every finding
twice and checks whether it is already reported. At the end it prints a summary and commits the release folder on
the branch `exploratory/<version>`. It never pushes and never creates issues.

### 7. Review the report

Read `exploratory/releases/<version>/report.md` (the screenshots render in the VS Code Markdown preview).
Remove or downgrade findings you don't agree with. You can also ask the agent in the same session to re-check
a finding or to look at something in more detail.

Security-relevant findings are never written to the report. They are stored in the git-ignored `security/` folder
and must be reported privately.

### 8. File the issues

Create an issue for every finding you accept, using the prepared draft:

```bash
gh issue create -R opencloud-eu/web --title "<title>" \
  --body-file exploratory/releases/<version>/issues/<ID>.md --label Type:Bug
```

Then add the issue numbers to the report — or ask the agent to do it ("add #123 to finding F2") — and commit.

### 9. Publish the report

```bash
git push -u origin exploratory/<version>
gh pr create -R opencloud-eu/qa --fill
```

After the PR is merged, the report is available at
`https://github.com/opencloud-eu/qa/blob/main/exploratory/releases/<version>/report.md`.

### 10. Link it in the release issue

Add this to the *QA Phase* of the release issue:

```
- [ ] Agent exploratory testing of the changelog @ScharfViktor
  - [ ] smoke OK on RC instance
  - [ ] report: https://github.com/opencloud-eu/qa/blob/main/exploratory/releases/<version>/report.md
  - [ ] findings triaged → "Collected bugs"
```

## Rules for the agent

- It works on test instances only. Everything it creates is prefixed with `qa-<version>-`.
- It never changes the admin or demo user accounts and restores any global setting it had to change.
- The repository is public: no credentials and no security findings are committed.
- It never creates issues, comments or pushes — that is the test manager's job.

## Troubleshooting

**Claude Code asks for approval on every command, or doesn't know `/create-charters` / `/release-exploratory-test`.**
It was started outside the repository root. Exit with `/exit`, then run `cd ~/Work/qa && claude --continue`.

**The smoke test fails for demo users.** Demo users are not enabled on the instance or have a different password.
Look at `smoke-FAIL-<user>.png` in `exploratory/releases/_scratch/screens-raw/`.

**The smoke test times out for admin.** The instance is not reachable from this machine — check the URL in a browser,
the certificate and `/etc/hosts`.

**`pnpm install` complains about the Node version.** Playwright 1.64 needs Node 20 or newer (`node -v`).

**Where are the screenshots?** All of them are in `exploratory/releases/<version>/screens-raw/`, the ones used in the
report in `screens/`. Before a release is selected (e.g. during the smoke test) they go to `exploratory/releases/_scratch/`.
