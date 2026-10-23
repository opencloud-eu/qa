# Exploratory Testing

An AI agent explores the OpenCloud web UI in a real browser and writes a report with screenshots and bug drafts.
Setup and rules: [release-testing/README.md](../README.md).

Two modes:

- **Release test** — checks the changes of a release, driven by the changelog.
- **Bug hunt** — looks for bugs anywhere in the web UI.

## Table of Contents

- [Release Test](#release-test)
- [Bug Hunt](#bug-hunt)
- [Publish the Results](#publish-the-results)
- [Folder Layout](#folder-layout)

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

Explorers cover the whole web UI area by area. They read the web source code (`~/Work/opencloud/web`, if present) and break
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
2. File each accepted bug where it belongs — web, opencloud or reva:

   ```bash
   gh issue create -R opencloud-eu/<web|opencloud|reva> --title "<title>" \
     --body-file release-testing/exploratory/releases/<version>/issues/<ID>.md --label Type:Bug
   ```

3. Add the issue numbers to the report (or ask the agent), commit, then:

   ```bash
   git push -u origin exploratory/<version>
   gh pr create -R opencloud-eu/qa --fill
   ```

## Folder Layout

```
exploratory/releases/<version>/
  charters.md            the changelog turned into charters
  report.md              the result
  screens/               screenshots used in the report
  issues/                bug drafts for `gh issue create`
  results/               one file per explorer
  log.md                 what the agents did
```

`screens-raw/`, `scripts/` and `security/` stay local (git-ignored).
