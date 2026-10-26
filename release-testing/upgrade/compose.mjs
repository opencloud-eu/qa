// Runs the opencloud-compose stack for upgrade tests, isolated from your own stack:
//  - own git worktree of opencloud-compose per phase (release-testing/upgrade/.work/compose-<phase>), your checkout stays untouched
//  - own compose project "qa-upgrade" with own volumes
//  - own env file: your opencloud-compose/.env + overrides (image, tag, COMPOSE_FILE, demo users, admin password)
// It never deletes volumes. A fresh start needs your command: docker compose -p qa-upgrade down -v
//
// Usage (from repo root):
//   node release-testing/upgrade/compose.mjs refs                             stable branches of opencloud-compose
//   node release-testing/upgrade/compose.mjs up <from|to> --ref <git ref> --image <image> --tag <tag> --files <a.yml:b.yml>
//        [--env KEY=VAL,KEY=VAL]   extra environment for the opencloud service (written to qa-env.yml in the worktree)
//   node release-testing/upgrade/compose.mjs exec <service> <command ...>     e.g. exec opencloud opencloud search index --all-spaces
//   node release-testing/upgrade/compose.mjs run <service> <command ...>      one-off container on the stack's volumes, e.g. run opencloud opencloud init --diff
//   node release-testing/upgrade/compose.mjs ps | logs [service] | down       (down keeps volumes)
import { UPGRADE } from './env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { request } from '@playwright/test';
import { URL } from '../lib/oc.mjs';

const PROJECT = 'qa-upgrade';
const COMPOSE_DIR = process.env.OC_COMPOSE_DIR;
const WORK = path.join(UPGRADE, '.work');
const STATE = path.join(WORK, 'compose.json');
fs.mkdirSync(WORK, { recursive: true });

const die = (msg) => { console.log(`ERROR: ${msg}`); process.exit(1); };
const run = (cmd, args, opts = {}) => {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) die(`${cmd} exited with ${r.status}`);
};
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const state = () => fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
// cwd = the worktree: docker compose resolves the COMPOSE_FILE paths against the working directory
const compose = (s, args, opts) => run('docker', ['compose', '--project-directory', s.dir, '--env-file', s.envFile, '-p', PROJECT, ...args], { cwd: s.dir, ...opts });

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

// your .env, with paths and secrets that must not leak into the test stack overridden
function envFile(phase, { image, tag, files, extraCompose = {} }) {
  const base = fs.readFileSync(path.join(COMPOSE_DIR, '.env'), 'utf8').split(/\r?\n/);
  const over = {
    ...extraCompose, COMPOSE_FILE: files, OC_DOCKER_IMAGE: image, OC_DOCKER_TAG: tag,
    DEMO_USERS: 'true', INSECURE: 'true', INITIAL_ADMIN_PASSWORD: process.env.OC_ADMIN_PASSWORD,
    // always docker volumes of this project — never your data directories
    OC_CONFIG_DIR: '', OC_DATA_DIR: '', LDAP_DATA_DIR: '', LDAP_CERTS_DIR: '', RADICALE_DATA_DIR: '',
  };
  const lines = base.filter(l => !Object.keys(over).some(k => new RegExp(`^\\s*${k}\\s*=`).test(l)));
  for (const [k, v] of Object.entries(over)) lines.push(`${k}=${v}`);
  const file = path.join(WORK, `compose-${phase}.env`);
  fs.writeFileSync(file, lines.join('\n') + '\n', { mode: 0o600 });
  return file;
}

// worktree of opencloud-compose at <ref>; copies your local certs and traefik dynamic config
function worktree(phase, ref) {
  const dir = path.join(WORK, `compose-${phase}`);
  run('git', ['-C', COMPOSE_DIR, 'fetch', '--quiet', 'origin']);
  if (fs.existsSync(dir)) run('git', ['-C', dir, 'checkout', '--quiet', '--detach', ref]);
  else run('git', ['-C', COMPOSE_DIR, 'worktree', 'add', '--quiet', '--detach', dir, ref]);
  for (const sub of ['certs', 'config/traefik/dynamic']) {
    const src = path.join(COMPOSE_DIR, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(dir, sub), { recursive: true, force: false, errorOnExist: false });
  }
  console.log(`compose ${phase}: ${ref} @ ${out('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'])}`);
  return dir;
}

async function waitForStatus(minutes = 5) {
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const until = Date.now() + minutes * 60e3;
  while (Date.now() < until) {
    try {
      const res = await ctx.get(`${URL}/status.php`, { timeout: 5000 });
      if (res.ok()) {
        const j = await res.json();
        if (j.installed) { console.log(`status.php: ${j.productversion} (${j.versionstring})`); await ctx.dispose(); return; }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 5000));
  }
  await ctx.dispose();
  die(`${URL}/status.php not ready after ${minutes} min — check: node release-testing/upgrade/compose.mjs logs opencloud`);
}

const [cmd, ...rest] = process.argv.slice(2);
const args = ['exec', 'run'].includes(cmd) ? { _: rest } : parseArgs(rest); // exec/run pass flags through unchanged

if (!COMPOSE_DIR || !fs.existsSync(path.join(COMPOSE_DIR, 'docker-compose.yml')))
  die('set OC_COMPOSE_DIR in release-testing/.env to your opencloud-compose checkout');

if (cmd === 'up') {
  const phase = args._[0];
  if (!['from', 'to'].includes(phase)) die('up <from|to> --ref <ref> --image <image> --tag <tag> --files <a:b>');
  for (const k of ['ref', 'image', 'tag', 'files']) if (!args[k]) die(`missing --${k}`);
  const volumes = out('docker', ['volume', 'ls', '-q', '--filter', `label=com.docker.compose.project=${PROJECT}`]);
  if (phase === 'from' && volumes) die(`volumes of "${PROJECT}" exist from an earlier run. To start fresh, run yourself:\n  docker compose -p ${PROJECT} down -v`);
  if (phase === 'to' && !volumes) die(`no volumes of "${PROJECT}" — run "up from" first`);
  const busy = out('docker', ['ps', '--format', '{{.Label "com.docker.compose.project"}} {{.Names}} {{.Ports}}'])
    .split('\n').filter(l => l && !l.startsWith(PROJECT + ' ') && /:(80|443)->/.test(l));
  if (busy.length) die(`ports 80/443 are used by another stack — stop it first:\n  ${busy.join('\n  ')}`);
  const s = { phase, ref: args.ref, image: args.image, tag: args.tag, files: args.files, dir: worktree(phase, args.ref) };
  const missing = s.files.split(':').filter(f => !fs.existsSync(path.join(s.dir, f)));
  if (missing.length) die(`not in opencloud-compose ${s.ref}: ${missing.join(', ')} — adjust --files`);
  if (args.env) {
    // variables that docker-compose.yml does not pass through, e.g. OC_ENABLE_GUEST_LINKS.
    // OC_ADD_RUN_SERVICES is built by the compose files (weboffice/collabora.yml appends "collaboration"), so an
    // override would drop their services: it goes to START_ADDITIONAL_SERVICES in the env file instead.
    let env = args.env.split(',').map(kv => kv.split(/=(.*)/s).slice(0, 2));
    s.extraCompose = Object.fromEntries(env.filter(([k]) => k === 'OC_ADD_RUN_SERVICES').map(([, v]) => ['START_ADDITIONAL_SERVICES', v]));
    env = env.filter(([k]) => k !== 'OC_ADD_RUN_SERVICES');
    const yml = ['services:', '  opencloud:', '    environment:', ...env.map(([k, v]) => `      ${k}: ${JSON.stringify(v)}`)];
    fs.writeFileSync(path.join(s.dir, 'qa-env.yml'), yml.join('\n') + '\n');
    s.env = args.env;
    s.files += ':qa-env.yml';
  }
  const old = state();
  if (old) compose(old, ['down']); // removes containers of the previous phase, keeps volumes
  s.envFile = envFile(phase, s);
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
  compose(s, ['up', '-d', '--pull', 'missing']); // never re-pulls a locally built image such as :dev
  await waitForStatus();
} else if (cmd === 'refs') {
  run('git', ['-C', COMPOSE_DIR, 'fetch', '--quiet', 'origin']);
  console.log(out('git', ['-C', COMPOSE_DIR, 'branch', '-r', '--list', 'origin/stable-*', 'origin/main']));
} else if (cmd === 'exec') {
  const s = state() ?? die('nothing running — use "up" first');
  compose(s, ['exec', '-T', ...args._]);
} else if (cmd === 'run') {
  // works while the service itself does not start (e.g. config migration before the first start of a new version)
  const s = state() ?? die('nothing running — use "up" first');
  const [service, entry, ...cmdArgs] = args._;
  compose(s, ['run', '--rm', '-T', '--no-deps', '--entrypoint', entry, service, ...cmdArgs]);
} else if (cmd === 'ps') {
  const s = state() ?? die('nothing running');
  console.log(`phase: ${s.phase} · ${s.image}:${s.tag} · ref ${s.ref}\nCOMPOSE_FILE=${s.files}`);
  compose(s, ['ps']);
} else if (cmd === 'logs') {
  const s = state() ?? die('nothing running');
  compose(s, ['logs', '--no-color', '--tail', args.tail ?? '200', ...args._]);
} else if (cmd === 'down') {
  const s = state() ?? die('nothing running');
  compose(s, ['down']);
  fs.rmSync(STATE);
} else {
  die('commands: refs | up | exec | run | ps | logs | down');
}
