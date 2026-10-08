# opencloud-eu/qa

- `tests/` — Playwright API tests (CalDAV/CardDAV), see README.md.
- `exploratory/` — agent-driven exploratory release testing. Workflow: `/create-charters` → review → `/release-exploratory-test <version>`;
  (`/release-exploratory-test <version>`), one folder per release in `exploratory/releases/<version>/`.
  Reports are committed and linked from the release issue. The repo is **public**: no credentials,
  no security findings in committed files.
- Chat with the test manager in Russian; everything committed is in English.
