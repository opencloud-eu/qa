// Prints instance info without exposing credentials: .env present?, OC_URL, status.php.
// Usage (from repo root): node exploratory/lib/status.mjs
import fs from 'node:fs';
import path from 'node:path';
import { request } from '@playwright/test';
import { ROOT, URL } from './oc.mjs';

const envFile = path.join(ROOT, '.env');
console.log(`.env: ${fs.existsSync(envFile) ? 'present' : 'MISSING — cp exploratory/.env.example exploratory/.env'}`);
console.log(`OC_URL: ${URL ?? '(not set)'}`);
if (!URL) process.exit(1);
const ctx = await request.newContext({ ignoreHTTPSErrors: true });
try {
  const res = await ctx.get(`${URL}/status.php`, { timeout: 15000 });
  console.log(`status.php: HTTP ${res.status()}`);
  const body = await res.text();
  try { const j = JSON.parse(body); console.log(`productname: ${j.productname}\nproductversion: ${j.productversion}\nversionstring: ${j.versionstring}\nedition: ${j.edition}`); }
  catch { console.log(body.slice(0, 300)); }
} catch (e) {
  console.log(`status.php: UNREACHABLE — ${e.message.split('\n')[0]}`);
  process.exitCode = 1;
} finally { await ctx.dispose(); }
