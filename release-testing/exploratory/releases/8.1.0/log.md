# Exploration log — OpenCloud 8.1.0

Instance: https://cloud.opencloud.test · server 8.1.0 (rolling) · Chromium desktop 1440×900 + Pixel 7.
Test data prefix: `qa-8.1.0-`.


## R0 regression smoke (alan, desktop, list view)
- create folder ✅, upload (filechooser) ✅, open .txt → text-editor app ✅, rename ✅, delete→trash ✅, restore (per-space trash bin) ✅, public link (Add link) ✅, search ✅.
- Share panel opens correctly (Share with people / role dropdown / Public links). Invite input placeholder is "Search".
- Note: tiles is the default view; URL param view-mode ignored — must toggle via #viewmode-switch-toggle.
- Note: trash ("Deleted files") lists per-space trash bins; open the "Personal" bin to see deleted files.
- Console: repeated "cannot load external application unzip/arcade as applicationPath is not a valid module federation remote entry" on every load → looks like instance app config (apps unzip/arcade registered but not served), not a release change. Observation, not a bug.

## C2 create space with options (margaret, desktop) ✅
- "Create a new space" dialog: Space name, E2E-encrypt toggle, Customize (Image Upload/Icon, Subtitle, Description rich-text), Advanced (Quota, Members). Matches web#3413.
- Space name validation rejects / \ . : ? * " > < | (so "qa-8.1.0-..." is rejected by design — dots not allowed).
- Created "qa-810-space-…" successfully. Encrypted-spaces toggle present → V1 feature available on instance.

## A1 admin users/groups (admin, desktop; UI in German) ✅
- Users table: avatars in name column, columns Anmeldename/Name/E-Mail/Rolle/"Anmeldung erlaubt?"/Aktionen.
- Edit panel (pencil): redesigned — Profil, Zugriff (Passwort, "Anmeldung erlaubt" TOGGLE, Rolle, Persönliche Quota), Mitgliedschaft. Matches web#3489.
- User search box "Nach Personen suchen": filters on ENTER (not live). Verified: Turing→1, lynn(username)→1, mary@example(email)→1, lynn@example.org→1, nonsense→0. #3517 works.
- NOTE: initial scare — fill() without Enter returned all rows; search is submit-on-Enter by design. Not a bug.

## C5 editor roles / sharing (alan→lynn, desktop)
- Share panel: "Share with people" (invite autocomplete needs real keystrokes, not fill()), role dropdown, per-file roles: **Can view** (view+download), **Can view (secure)** (view-only docs/images/PDF, watermark), **Can edit** (view+download+edit).
- Invitee added as chip; role switchable to "Can edit"; submit = #new-collaborators-form-create-button.
- Observation: newly created .md shows 0 B in listing right after create+Ctrl+S — persistence verified separately in C3.

## C3 editor (alan, desktop) ✅
- `.md` opens a plain **source** editor (shows raw markdown — correct). `.ocnote` opens the **rich** editor (.ProseMirror).
- Rich editor: markdown shortcuts render (typing `# ` → H1, `## ` → H2), fenced ``` → code block with language selector ("auto"), **Outlines (TOC)** panel lists headings and highlights the active one. Matches #3440/#3473/#3371.
- Content persists: a saved .md file showed 89 B and reopened with content.
- Automation note: the "Create a new file" dialog pre-fills `New file.<ext>` with only the basename selected; `fill()` wipes the extension → file created without extension → later opens as "No preview available". A real user keeps the suffix. Minor edge case, not a release regression.

## C1 Excalidraw whiteboard (alan, desktop)
- Create from New menu → opens the Excalidraw app (`/excalidraw/...`, `.excalidraw`); file appears in the list; drawing shapes works (ellipse/rectangle), full Excalidraw UI (tools, stroke/bg/width/opacity/layers, Library). Highlight feature is present and usable.
- **FINDING (Minor): ~470 console errors per whiteboard load.** The Excalidraw extension loads fonts from the external CDN `https://esm.sh/@excalidraw/excalidraw@0.18.1/dist/prod/fonts/Xiaolai/*.woff2`, all blocked by the instance CSP `font-src 'self'`. Hundreds of blocked requests per load + the Xiaolai (CJK) font never loads. Reproduced on 2 runs (471 / 473 errors). Evidence: scripts/c1-console.txt.
- **OPEN QUESTION (not confirmed): persistence after reload.** One run showed an empty canvas after reload, but that file had its `.excalidraw` extension stripped by fill(); later clean runs couldn't reliably register a drag-draw via automation. Needs a manual draw→save→reload check before being called a bug. Not reported as a finding.
- Observation: unzip/arcade module-federation errors also appear here (instance app config, not release).

## Not run (time budget; user chose to wrap up)
- C4 external-change conflicts (needs a server-side write while the editor is open; WebDAV basic/bearer not available from scripts).
- C6 sorting, C7 sidebar, C8 Save As, C9 shares-neighbours, A2 admin spaces/apps, M1 mobile, P1 perf/i18n — not executed (spot-checked only via R0).
- Conditional: O1 office/WOPI, G1 guest invite, V1 vaults — presence noted (office formats + encrypted-space toggle exist) but not functionally tested.
