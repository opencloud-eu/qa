// Shared helpers for exploratory release testing of OpenCloud web.
// Throw-away scripts in releases/<version>/scripts/ import them:
//   import { open, login, shot, layoutCheck } from '../../../lib/oc.mjs'
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from '@playwright/test'; // uses the repo's existing Playwright dependency

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // .../qa/exploratory
// minimal .env loader (no extra dependency); real env vars win
const ENV_FILE = path.join(ROOT, '.env');
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export const URL = process.env.OC_URL;
export const USERS = {
  admin:    { user: process.env.OC_ADMIN_USER, pass: process.env.OC_ADMIN_PASSWORD, role: 'Admin' },
  dennis:   { user: 'dennis',   pass: process.env.OC_DEMO_PASSWORD, role: 'Admin' },
  margaret: { user: 'margaret', pass: process.env.OC_DEMO_PASSWORD, role: 'Space Admin' },
  alan:     { user: 'alan',     pass: process.env.OC_DEMO_PASSWORD, role: 'User' },
  lynn:     { user: 'lynn',     pass: process.env.OC_DEMO_PASSWORD, role: 'User' },
  mary:     { user: 'mary',     pass: process.env.OC_DEMO_PASSWORD, role: 'User' },
};

// Release folder under test: env RUN_DIR, else the path written in releases/.current (e.g. "releases/8.1.0").
const CURRENT = path.join(ROOT, 'releases', '.current');
export const RUN_DIR = path.resolve(ROOT, process.env.RUN_DIR
  || (fs.existsSync(CURRENT) ? fs.readFileSync(CURRENT, 'utf8').trim() : 'releases/_scratch'));
// All screenshots land in screens-raw/ (git-ignored). Evidence used in report.md is copied to screens/ (committed).
const RAW = path.join(RUN_DIR, 'screens-raw');
fs.mkdirSync(RAW, { recursive: true });

/** Open a browser context. viewport: 'desktop' | 'mobile' */
export async function open({ viewport = 'desktop', headless = !process.env.HEADED } = {}) {
  const browser = await chromium.launch({ headless });
  const opts = viewport === 'mobile' ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 900 } };
  const context = await browser.newContext({ ...opts, ignoreHTTPSErrors: true, locale: 'en-US' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 500) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`); });
  return { browser, context, page, consoleErrors };
}

/** Log in through the OpenCloud IdP. Selectors are tolerant; fix here once if the login page changes. */
export async function login(page, who = 'admin') {
  const u = USERS[who] ?? { user: who, pass: process.env.OC_DEMO_PASSWORD };
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  const userField = page.locator('#oc-login-username, input[name="username"], input[autocomplete="username"]').first();
  await userField.waitFor({ timeout: 30000 });
  await userField.fill(u.user);
  await page.locator('#oc-login-password, input[name="password"], input[type="password"]').first().fill(u.pass);
  await page.locator('button[type="submit"], button:has-text("Log in")').first().click();
  await page.waitForURL(/\/(files|spaces|personal)/, { timeout: 45000 });
  return u;
}

let n = 0;
/** Full-page screenshot into runs/<run>/screens, returns relative path */
export async function shot(page, name) {
  const file = path.join(RAW, `${String(++n).padStart(3, '0')}-${name.replace(/[^\w.-]+/g, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(RUN_DIR, file);
}

/** Generic layout heuristics: horizontal overflow, controls outside the viewport, covered controls. */
export async function layoutCheck(page) {
  return page.evaluate(() => {
    const out = { horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth, offscreen: [], covered: [] };
    const sel = 'button, a[href], input, select, textarea, [role="button"], [role="menuitem"]';
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || st.visibility === 'hidden' || st.display === 'none') continue;
      const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 60);
      if (r.right > window.innerWidth + 1 || r.left < -1) out.offscreen.push(label);
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cy > 0 && cy < window.innerHeight && cx > 0 && cx < window.innerWidth) {
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== el && !el.contains(top) && !top.contains(el)) out.covered.push(label);
      }
    }
    out.offscreen = [...new Set(out.offscreen)].slice(0, 20);
    out.covered = [...new Set(out.covered)].slice(0, 20);
    return out;
  });
}
