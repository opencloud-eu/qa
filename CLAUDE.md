# opencloud-eu/qa

- `tests/` — Playwright API tests (CalDAV/CardDAV), see README.md.
- `release-testing/` — agent-driven release testing, see release-testing/README.md. Shared `lib/` and `.env`.
  - `exploratory/` — `/create-charters` → review → `/release-exploratory-test <version>`, and `/exploratory-bug-hunt`;
    one folder per run in `release-testing/exploratory/releases/`.
  - `upgrade/` — `/upgrade-test` with opencloud-compose; one folder per run in `release-testing/upgrade/runs/`.
  Reports are committed and linked from the release issue. The repo is **public**: no credentials,
  no security findings in committed files.
- Reply in the language the user writes in (e.g. German or English); everything committed is in English.
