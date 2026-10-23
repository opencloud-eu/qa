// Sanity check of the setup: log in as admin and every demo user (fresh browser context each),
// screenshot the landing page. The web app keeps its OIDC session in browser storage,
// so every user needs an own context — clearing cookies is not enough.
import path from 'node:path';
import { open, login, shot, USERS, RUN_DIR } from './oc.mjs';
let failed = 0;
for (const who of Object.keys(USERS)) {
  const { browser, page, consoleErrors } = await open();
  try {
    await login(page, who);
    const file = path.join(RUN_DIR, await shot(page, 'smoke-' + who));
    console.log(`OK   ${who.padEnd(9)} -> ${page.url()}\n     ${file}`);
  } catch (e) {
    failed++;
    const file = path.join(RUN_DIR, await shot(page, 'smoke-FAIL-' + who).catch(() => '-'));
    console.log(`FAIL ${who.padEnd(9)}: ${e.message.split('\n')[0]}\n     url: ${page.url()}\n     ${file}`);
  }
  if (consoleErrors.length) console.log(`     console errors: ${consoleErrors.length}`);
  await browser.close();
}
process.exit(failed ? 1 : 0);
