Excalidraw whiteboard loads fonts from external CDN (esm.sh), blocked by CSP — ~470 console errors per load, CJK font missing

## Summary
Opening an Excalidraw whiteboard (new in 8.1.0) triggers a few hundred `Content-Security-Policy` violations because the Excalidraw extension requests its fonts from the external CDN `https://esm.sh/@excalidraw/excalidraw@0.18.1/dist/prod/fonts/...`, while the instance CSP is `font-src 'self'`. Every font request is blocked.

## Environment
- OpenCloud 8.1.0 (rolling), web 8.1.0, instance https://cloud.opencloud.test
- Chromium (desktop 1440×900), user `alan`

## Steps to reproduce
1. Log in, New → Whiteboard, create and open an `.excalidraw` file.
2. Open the browser dev console.

## Actual
- ~470 console errors on load (measured 471 and 473 on two separate runs). The dominant group is, repeated for every font variant:
  ```
  Loading the font 'https://esm.sh/@excalidraw/excalidraw@0.18.1/dist/prod/fonts/Xiaolai/Xiaolai-Regular-….woff2'
  violates the following Content Security Policy directive: "font-src 'self'". The action has been blocked.
  ```
- The Xiaolai (CJK handwriting) font never loads; the whiteboard depends on `esm.sh` being reachable at runtime.

## Expected
- Excalidraw fonts are served from the OpenCloud instance (`'self'`), not a third-party CDN, so they load under the default CSP and the console stays clean. No runtime dependency on esm.sh (offline/privacy).

## Severity
Minor — core whiteboard drawing still works; impact is console spam, a missing CJK font, and a runtime dependency on an external CDN.

## Notes
- Core drawing/create/list verified working. See also the separate `unzip`/`arcade` module-federation console errors (suspected instance app config, not this feature).
- Not found in opencloud-eu/web or opencloud-eu/opencloud issues (searched "excalidraw font", "esm.sh CSP font-src").
