// Import this FIRST in every upgrade script: points the shared helpers (release-testing/lib/oc.mjs) at the current
// upgrade run, so screenshots land in upgrade/runs/<run>/screens-raw/. Credentials come from release-testing/.env.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPGRADE = path.dirname(fileURLToPath(import.meta.url)); // .../qa/release-testing/upgrade
const CURRENT = path.join(UPGRADE, 'runs', '.current');
if (!process.env.RUN_DIR)
  process.env.RUN_DIR = path.join(UPGRADE, 'runs', fs.existsSync(CURRENT) ? fs.readFileSync(CURRENT, 'utf8').trim() : '_scratch');
