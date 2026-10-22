# Charters — OpenCloud 8.1.0 (rolling)

## Sources
- opencloud 8.1.0: https://github.com/opencloud-eu/opencloud/releases/tag/v8.1.0 (release tag)
- web 8.1.0: https://github.com/opencloud-eu/web/releases/tag/v8.1.0 (release tag) · reva 2.51.0: https://github.com/opencloud-eu/reva/releases/tag/v2.51.0 (release tag)
- Instance: https://cloud.opencloud.test, productversion 8.1.0 (rolling). Optional features found: Excalidraw whiteboard ✓, office formats (.odt/.ods/.odp → office app wired) ✓, full-text search input ✓, App Store ✓, Calendar ✓, Admin settings ✓. Not confirmed on instance: encrypted spaces/vaults, guest invite enabled, which office engine (Collabora/OnlyOffice/EuroOffice).

| ID | Title | PRs | Mission — what could break | Roles | Viewport | Prio | UI? |
|---|---|---|---|---|---|---|---|
| R0 | Regression smoke | – | upload/download, folder, rename, move/copy, delete+restore, share user+link, preview, search, spaces, logout | alan, lynn | desktop + short mobile | P1 | yes |
| C1 | Excalidraw whiteboard | oc Yjs, web#3483 #3398 #3397 | create whiteboard from New menu; open/draw/save; share and co-edit live (two users), follow collaborator cursor; reload keeps strokes; excalidraw file icon shows; delete/restore | alan, lynn | desktop | P1 | yes |
| C2 | Create a space with options | web#3413 #3459 #3450 #3444 | New-space dialog Options button: image/emoji, subtitle, description, header, quota, members (picked member role applied); dialog still simple when Options not opened; focus trap when dragging; created space usable | margaret, admin | desktop | P1 | yes |
| C3 | Editor: TOC, markdown copy/paste, code blocks | web#3440 #3473 #3371 #3526 #3527 | Markdown/.ocnote table of contents follows scroll, jumps on click, updates live; paste Markdown renders; copy carries HTML+Markdown; code block from Turn-into/"/", language autodetect + manual pick, Tab→spaces, triple-Enter exits; pasted images embed in rich text; plain-text paste keeps md syntax | alan, lynn | desktop | P1 | yes |
| C4 | Editor: external-change conflicts | oc Yjs, web#3433 #3396 #3397 | file changed on server while open → conflict notification to all participants; "Save as" and reload both work; editor stays open when save on close fails; stale-recovery granted to one client only | alan, lynn | desktop | P1 | yes |
| C5 | New editor roles | oc#3637 reva#834 web | share a file/space with the new editor roles; permissions behave (can edit, limits respected); existing shares unaffected; role labels render in share panel | alan, margaret | desktop | P1 | yes |
| C6 | Consistent sorting (folders above files) | web#3411 #3432 | folders always sort above files in both directions, across Files/Spaces/Shares/Favorites/search; sort indicators correct; no mixing on re-sort | alan | desktop | P2 | yes |
| C7 | Right sidebar harmonization | web#3470 #3484 #3430 #3423 #3494 | one sidebar look across Files and admin settings; Actions panel removed (actions still reachable via context menu); activities & versions timeline readable, many versions fit; account pages two-column; no missing panels | alan, admin | desktop | P2 | yes |
| C8 | Save As dialog | web#3468 | Save As respects file-extension setting and validates the name (invalid/empty/duplicate rejected); correct extension kept/added | alan | desktop | P2 | yes |
| C9 | Shares neighbours | web#3313 #3477 oc#3533 | indirect shares load in editors; clicking current breadcrumb / Shares tab reloads favorites & shares; guest-created shares are NOT auto-accepted; share user + link still work end-to-end | alan, lynn | desktop | P2 | yes |
| A1 | Admin: user & group management | web#3489 #3492 #3517 #3516 | redesigned user/group edit panels; "Login allowed" toggle works; used space shown in quota; search users by username and email (not only first/last name); avatars/space images in name column | admin, dennis | desktop | P1 | yes |
| A2 | Admin: spaces, apps, sorting | web#3501 #3441 #3427 #3488 | admin spaces use customize menu + space images; selecting a space opens only that one's details; apps sortable by status; sorting of users/groups/extensions persists; app tokens sorted by creation/expiry | admin | desktop | P2 | yes |
| M1 | Mobile web UI | web#3476 #3497 #3474 #3392 #3399 #3393 #3469 | current breadcrumb item clickable on mobile; breadcrumb context menu on mobile; full-width search inputs; nested drops in overflow menus work; mobile text-editor toolbar drops show titles; table size slider; truncated names don't overflow | alan | mobile | P2 | yes |
| P1 | Web performance & i18n loading | web#3522 #3500 #3378 #3373 | pages load with lazy-loaded editor chunk, subset/preloaded fonts, optimized chunks; switch UI language (incl. German) → correct translations load and render; non-Latin scripts (Cyrillic/Greek) render; no missing glyphs or broken icons (#3525) | alan | desktop | P2 | yes |
| S1 | Full-text search & reindex | oc#3651 #3602 #3543 #3579 | content search returns hits (tika); trashed vs live files at same path kept apart in results; disabled→enabled space gets reindexed and becomes searchable; no stale/duplicate results | alan, admin | desktop | P2 | conditional — FTS present; verify indexing |
| O1 | Office / WOPI | oc#3633 #3630 #3636 #3635 | open/edit .odt/.ods/.odp in the office app; admin can disable specific WOPI extensions (then New menu / open reflects it); EuroOffice mobile web view (if EuroOffice); token handling hardened — no broken sessions | alan, admin | desktop + mobile | P2 | conditional — office engine on instance unknown |
| G1 | Guest invite / guest links | web#2915 reva#822 #829 | invite a guest; guest receives access; guestlinks authmanager; guest-created shares not auto-accepted (ties C9) | admin, alan | desktop | P1 | conditional — guest feature not confirmed enabled on instance |
| V1 | Vaults / encrypted spaces | web#3404 #3408 #3367 | vault breadcrumb shows vault icon in every subfolder; disabling an encrypted space locks it; unlock actions hidden / lock action hidden for disabled spaces | margaret, alan | desktop | P3 | conditional — vaults not confirmed on instance |

## Out of scope (reason)
- oc#3466 OIDC access-token audience validation — proxy config / no default UI surface (verify via config only if requested).
- oc#3526 graph PatchMe password-change fix — API-level; covered indirectly by account password flow, no dedicated UI charter.
- oc#3521 per-service proxy metrics, oc#3068 posixfs index cmd, oc#3603 uploads CLI, oc#3560/#3580 CLI tests — CLI/ops/metrics, not web UI.
- oc#3647 #3643 #3555, web e2e PRs (#3506 #3457 #3458 #3425 #3389), reva#846 — test-only.
- oc#3503 audit-log docs — documentation.
- All `chore(deps)`/`fix(deps)` bumps (web & reva) and Node/pnpm updates — dependency bumps.
- web#3442 #3426 #3467 announcement banner polish, web#3464 translate-link, web#3456 bubble-menu rounding, web#3479 fonts table polish, web#3486 view-mode labels, web#3454 tiles-first, web#3471 tile hover zone, web#3447 NoContentMessage, web#3443 disabled-new explanation, web#3419 modal actions, web#3491 quota bar bg, web#3485 rename below download — polish (sample opportunistically during R0/C7, no dedicated charter).
- reva#830 mobile param forwarding, reva#834 editor roles, reva#829 — exercised via C5/O1.
