import { open, login, shot } from './exploratory/lib/oc.mjs';

async function probe(who) {
  const { browser, page } = await open({ viewport: 'desktop' });
  const found = { who, newMenu: [], appStore: null, extensions: null, apps: [], fullTextSearch: null, vaults: null, guestInvite: null, errors: [] };
  try {
    await login(page, who);
    await page.waitForTimeout(2500);

    // "New" menu entries
    try {
      const newBtn = page.locator('#new-file-menu-btn, button:has-text("New")').first();
      await newBtn.click({ timeout: 8000 });
      await page.waitForTimeout(800);
      const items = await page.locator('[role="menuitem"], .oc-menu li, #new-file-menu-drop li').allInnerTexts();
      found.newMenu = items.map(s => s.trim()).filter(Boolean);
      await page.keyboard.press('Escape');
    } catch (e) { found.errors.push('newMenu: ' + e.message.split('\n')[0]); }

    // left nav / apps (app switcher)
    try {
      const sw = page.locator('#_appSwitcherButton, button[aria-label*="Application"], nav button').first();
      await sw.click({ timeout: 5000 });
      await page.waitForTimeout(600);
      const apps = await page.locator('#app-switcher-dropdown a, [role="menuitem"]').allInnerTexts();
      found.apps = apps.map(s => s.trim()).filter(Boolean);
      await page.keyboard.press('Escape');
    } catch (e) { found.errors.push('appSwitcher: ' + e.message.split('\n')[0]); }

    // full-text search: open search, type
    try {
      const search = page.locator('input[type="search"], #files-global-search-bar input, input[aria-label*="earch"]').first();
      found.fullTextSearch = (await search.count()) > 0;
    } catch { found.fullTextSearch = false; }

    await shot(page, `probe-${who}`);

    // page text heuristics for vaults / spaces create
    const body = (await page.locator('body').innerText()).toLowerCase();
    found.vaults = body.includes('vault') || body.includes('encrypted');
  } catch (e) {
    found.errors.push('fatal: ' + e.message.split('\n')[0]);
  } finally {
    await browser.close();
  }
  return found;
}

// also check admin for app store / extensions page
async function adminExtensions() {
  const { browser, page } = await open({ viewport: 'desktop' });
  const r = { appStore: null, extensions: null, officeApps: null, errors: [] };
  try {
    await login(page, 'admin');
    // navigate to app store if present
    await page.goto(process.env.OC_URL + '/app-store', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(2000);
    const url = page.url();
    r.appStore = /app-store/.test(url) && !/login/.test(url);
    const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    r.appStoreText = body.includes('app store') || body.includes('available apps') || body.includes('installed');
    await shot(page, 'probe-admin-appstore');
  } catch (e) { r.errors.push(e.message.split('\n')[0]); }
  finally { await browser.close(); }
  return r;
}

const a = await probe('admin');
const b = await probe('alan');
const ext = await adminExtensions();
console.log(JSON.stringify({ admin: a, alan: b, adminExtensions: ext }, null, 2));
