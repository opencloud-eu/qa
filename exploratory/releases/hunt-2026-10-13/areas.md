# Areas — bug hunt 2026-10-13

Instance: OpenCloud 8.1.0+85466427 (rolling). Web source: opencloud-eu/web tag v8.1.0 (24aeb55), read-only clone.
Paths below are relative to `packages/` in the web source.

| ID | Area | Main flows | Roles | Viewport | Source to read first |
|---|---|---|---|---|---|
| H1 | Files: list/tiles, selection, keyboard, rename, copy/cut/paste, drag & drop, breadcrumbs, pagination | browse, select (click, shift, keyboard), rename, copy/cut/paste, drag to folder/breadcrumb, paginate | alan, lynn | desktop + mobile | `web-app-files`, `web-pkg/src/components/FilesList`, `web-pkg/src/composables/keyboardActions` |
| H2 | Upload, download, trash, conflicts | file/folder upload, conflict skip/replace/keep both/merge, download single/multi, delete, restore, empty trash | alan | desktop | `web-app-files/src/HandleUpload.ts`, `web-pkg/src/helpers/resource/conflictHandling`, `web-pkg/src/composables/actions` |
| H3 | Sharing | share with user/group, roles, expiration, unshare, Shared with me/others, accept/hide | alan, lynn, mary | desktop | `web-app-files/src/components/SideBar/Shares`, `web-pkg/src/composables/piniaStores/shares` |
| H4 | Public links | create/edit/password/expiry, open anonymously, upload link, file drop | alan, anonymous | desktop + mobile | `web-runtime/src/pages/resolvePublicLink.vue`, `web-pkg/src/composables/links` |
| H5 | Spaces | create (with options), members, quota, image/readme, disable/enable/delete, live updates | margaret, admin, alan | desktop | `web-app-files/src/views/spaces`, `web-pkg/src/composables/spaces` |
| H6 | Viewers and editors | preview, text editor (md, ocnote, txt), app wrapper, Collabora open, deep links | alan, lynn | desktop + mobile | `web-app-preview`, `web-app-text-editor`, `web-pkg/src/editor`, `web-pkg/src/components/AppTemplates` |
| H7 | Search | search preview, results page, filters, scope, back/forward | alan | desktop + mobile | `web-app-search`, `web-app-files/src/components/Search`, `web-pkg/src/composables/search` |
| H8 | Admin settings | users, groups, spaces, apps; batch actions, filters, sidebars | admin, dennis | desktop | `web-app-admin-settings` |
| H9 | Account | preferences, app tokens, avatar, password, notifications | alan | desktop + mobile | `web-runtime/src/pages/account`, `web-runtime/src/components/Topbar` |
| H10 | Runtime | login/logout, permanent links `/f/<id>`, vaults (rclone-crypt app present, no vaults yet), embed mode, mobile layout | alan, admin | desktop + mobile | `web-runtime/src/router`, `web-runtime/src/pages/resolvePrivateLink.vue`, `web-app-rclone-crypt` |

Not on the instance (not tested): Excalidraw, OnlyOffice/EuroOffice, guest invite.
