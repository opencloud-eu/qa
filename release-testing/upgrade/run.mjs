// Seed test data before an upgrade and check it before and after.
//   node release-testing/upgrade/run.mjs seed <area>
//   node release-testing/upgrade/run.mjs verify <area> --phase before|after
// Areas: see release-testing/upgrade/areas/. State (ids, generated passwords) goes to <run>/state/ (git-ignored),
// check results to <run>/results/<area>-<phase>.json.
import './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { RUN_DIR } from '../lib/oc.mjs';

const [cmd, area, flag, phaseArg] = process.argv.slice(2);
const AREAS = fs.readdirSync(new URL('./areas/', import.meta.url)).map(f => f.replace(/\.mjs$/, ''));
if (!['seed', 'verify'].includes(cmd) || !AREAS.includes(area))
  { console.log(`usage: run.mjs seed|verify <${AREAS.join('|')}> [--phase before|after]`); process.exit(1); }
const phase = cmd === 'seed' ? 'seed' : (flag === '--phase' && phaseArg) || 'after';

const stateDir = path.join(RUN_DIR, 'state');
const resultDir = path.join(RUN_DIR, 'results');
fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(resultDir, { recursive: true });
const stateFile = path.join(stateDir, `${area}.json`);

const results = [];
const t = {
  phase,
  state: fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {},
  save() { fs.writeFileSync(stateFile, JSON.stringify(t.state, null, 2)); },
  /** a check passes when fn returns true or nothing; false, a string (the reason) or a throw is a failure */
  async check(name, fn) {
    try {
      const r = await fn();
      results.push({ name, ok: r === true || r === undefined, detail: typeof r === 'string' ? r : '' });
    } catch (e) {
      results.push({ name, ok: false, detail: e.message.split('\n')[0].slice(0, 300) });
    }
  },
  /** information that is neither pass nor fail, e.g. a feature the from-version doesn't have */
  note(name, detail) { results.push({ name, ok: null, detail }); },
};

const mod = await import(`./areas/${area}.mjs`);
try {
  if (cmd === 'seed') { await mod.seed(t); t.save(); }
  else {
    if (!fs.existsSync(stateFile)) { console.log(`no state for ${area} — run seed first`); process.exit(1); }
    await mod.verify(t);
  }
} catch (e) {
  t.save();
  console.log(`ABORTED ${area} ${phase}: ${e.stack}`);
  process.exit(1);
}

if (cmd === 'verify') {
  fs.writeFileSync(path.join(resultDir, `${area}-${phase}.json`), JSON.stringify(results, null, 2));
  for (const r of results) console.log(`${r.ok === null ? 'INFO' : r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
  const failed = results.filter(r => r.ok === false).length;
  console.log(`\n${area} ${phase}: ${results.length - failed} ok, ${failed} failed`);
  process.exit(failed ? 2 : 0);
}
console.log(`seeded ${area}: ${Object.keys(t.state).join(', ')}`);
