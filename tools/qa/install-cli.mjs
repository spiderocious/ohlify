#!/usr/bin/env node
// One-time installer: symlinks tools/qa/spin-call.mjs into a directory on
// $PATH so you can run `ohlify-spin-call` from anywhere.
//
// Tries (in order):
//   1. ~/.local/bin (standard user-local bin per XDG)
//   2. /usr/local/bin (mac/linux global, may need sudo)
//
// Usage:
//   pnpm qa:install
//   pnpm qa:install --to /custom/bin
//   pnpm qa:install --uninstall

import { existsSync, mkdirSync, symlinkSync, unlinkSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (k) => {
  const i = args.indexOf(`--${k}`);
  if (i === -1) return null;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const UNINSTALL = !!flag('uninstall');
const FORCED_DIR = typeof flag('to') === 'string' ? flag('to') : null;

const COMMAND = 'ohlify-spin-call';
const SOURCE = resolve(__dirname, 'spin-call.mjs');

if (!existsSync(SOURCE)) {
  console.error(`source not found: ${SOURCE}`);
  process.exit(1);
}

const candidates = FORCED_DIR
  ? [FORCED_DIR]
  : [join(homedir(), '.local', 'bin'), '/usr/local/bin'];

let target = null;
for (const dir of candidates) {
  try {
    if (!existsSync(dir)) {
      if (dir.startsWith(homedir())) {
        mkdirSync(dir, { recursive: true });
      } else {
        continue;
      }
    }
    // Test writability with a probe link
    const probe = join(dir, `.ohlify-probe-${process.pid}`);
    try {
      symlinkSync('/tmp', probe);
      unlinkSync(probe);
      target = dir;
      break;
    } catch {
      continue;
    }
  } catch {
    continue;
  }
}

if (!target) {
  console.error(`No writable bin dir found in: ${candidates.join(', ')}`);
  console.error('Tip: pnpm qa:install --to /your/bin/path');
  process.exit(1);
}

const link = join(target, COMMAND);

if (UNINSTALL) {
  if (existsSync(link) || existsSyncSafe(link)) {
    try {
      unlinkSync(link);
      console.log(`removed ${link}`);
    } catch (err) {
      console.error(`failed to remove ${link}: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`not installed (no symlink at ${link})`);
  }
  process.exit(0);
}

// Install: ensure source is executable
try {
  // chmod +x
  const { chmodSync } = await import('node:fs');
  chmodSync(SOURCE, 0o755);
} catch (err) {
  console.error(`warn: chmod ${SOURCE}: ${err.message}`);
}

// Replace existing symlink if present
if (existsSyncSafe(link)) {
  try { unlinkSync(link); } catch {}
}

try {
  symlinkSync(SOURCE, link);
} catch (err) {
  console.error(`failed to symlink ${SOURCE} → ${link}: ${err.message}`);
  process.exit(1);
}

console.log(`installed: ${link} → ${SOURCE}`);
console.log();
console.log(`Make sure ${target} is on your PATH. Then:`);
console.log();
console.log(`  ${COMMAND}                                # local dev`);
console.log(`  ${COMMAND} --base https://api.ohlify.dev  # other env`);
console.log(`  ${COMMAND} --new-users                    # force-register fresh users`);
console.log();
if (target.startsWith(homedir()) && !process.env.PATH?.split(':').includes(target)) {
  console.log(`Tip: add to your shell rc:`);
  console.log(`  export PATH="${target}:$PATH"`);
}

function existsSyncSafe(p) {
  try { lstatSync(p); return true; } catch { return false; }
}
