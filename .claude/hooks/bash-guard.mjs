#!/usr/bin/env node
// PreToolUse hook for Bash. Goal: the test run never stops for a permission prompt.
//  - simple, known-safe commands      → auto-allow
//  - compound / background / polling  → block, and tell the agent how to do it instead (it retries, no human needed)
//  - anything else                    → normal Claude Code permission flow
import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const cmd = String(input?.tool_input?.command ?? '').trim();

const allow = (reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason },
  }));
  process.exit(0);
};
const block = (msg) => { process.stderr.write(msg + '\n'); process.exit(2); };

// remove quoted strings so metacharacters inside quotes (commit messages, regexes) don't count
const bare = cmd.replace(/'[^']*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""')
  .replace(/\s2>&1\s*$/, '').trim(); // a trailing 2>&1 is harmless

const RULES = `Rules for this repo (see skill "Shell rules"):
- ONE simple command per Bash call, run from the repo root. No cd, no ; && || | > < & $( ) backticks, no loops, no sleep.
- Run Playwright scripts in the FOREGROUND: \`node exploratory/releases/<v>/scripts/x.mjs\` (set the Bash timeout up to 600000 ms).
  Never run_in_background and never poll output files. If a script takes > 10 min, split it.
- Let the script print what you need (console.log); don't grep its output. Use the Read / Grep / Glob tools for files.
- Never read or source exploratory/.env — use node exploratory/lib/status.mjs.`;

if (/\n/.test(bare)) block(`Blocked: multi-line command.\n${RULES}`);
if (/(&&|\|\||;|\||>|<|\$\(|`)/.test(bare) || /&\s*$/.test(bare)) block(`Blocked: compound command, pipe or redirection.\n${RULES}`);
const first = bare.split(/\s+/)[0];
if (['cd', 'pushd', 'until', 'while', 'for', 'sleep', 'set', 'source', '.', 'export', 'eval', 'bash', 'sh', 'zsh'].includes(first))
  block(`Blocked: \`${first}\` is not used in this workflow.\n${RULES}`);
if (/(^|\s)exploratory\/\.env(\s|$)/.test(bare)) block(`Blocked: don't read exploratory/.env.\n${RULES}`);

const words = bare.split(/\s+/);
const sub = words[1] ?? '';
const SAFE = {
  node: () => true,
  pnpm: () => ['exploratory:smoke', 'exploratory:status', 'install', 'exec', 'run'].includes(sub),
  npx: () => sub === 'playwright',
  ls: () => true, cat: () => true, head: () => true, tail: () => true, wc: () => true,
  grep: () => true, rg: () => true, jq: () => true, date: () => true, pwd: () => true, echo: () => true,
  mkdir: () => true, cp: () => true, mv: () => true, file: () => true, du: () => true,
  find: () => !/\s-(exec|execdir|delete|ok)\b/.test(bare),
  git: () => ['status', 'diff', 'log', 'show', 'add', 'commit', 'branch', 'switch', 'checkout', 'rev-parse', 'ls-files'].includes(sub)
            && !/\s(--force|-f|-D)\b/.test(bare),
  gh: () => (['release', 'issue', 'pr', 'search', 'repo'].includes(sub) && /^(view|list|diff|status|issues|prs)$/.test(words[2] ?? ''))
            || (sub === 'auth' && words[2] === 'status'),
};
if (SAFE[first]?.()) allow(`qa bash-guard: simple ${first} command`);
process.exit(0); // not decided → normal permission flow
