// Checks the package the way a consumer meets it: packed, installed, then
// typechecked and loaded from outside the source tree. See D17 on #14.
//
//   node scripts/test-package.mjs [path/to/package.tgz]
//
// With no argument it packs the working tree, which builds it first through
// the prepack script. CI passes in the tarball the build job produced, so
// every Node version in the matrix tests the same bytes.
//
// Each consumer under test/consumers/ gets the tarball extracted into its own
// node_modules. Everything else -- mongoose, typescript, @types/node --
// resolves upward from the repository root, so nothing is fetched from the
// registry.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

const consumers = [
  { name: 'cjs', smoke: 'smoke.cjs' },
  { name: 'esm', smoke: 'smoke.mjs' },
];

function pack(destination) {
  execFileSync('npm', ['pack', '--pack-destination', destination], {
    cwd: root,
    stdio: 'inherit',
  });

  const tarball = readdirSync(destination).find((file) =>
    file.endsWith('.tgz'),
  );

  if (!tarball) {
    throw new Error(`npm pack wrote no tarball to ${destination}`);
  }

  return join(destination, tarball);
}

function install(tarball) {
  for (const consumer of consumers) {
    const installed = join(
      root,
      'test',
      'consumers',
      consumer.name,
      'node_modules',
      'mongoose-enumvalues',
    );

    rmSync(installed, { recursive: true, force: true });
    mkdirSync(installed, { recursive: true });
    execFileSync('tar', [
      '-xzf',
      tarball,
      '-C',
      installed,
      '--strip-components=1',
    ]);
  }
}

function check(label, command, args) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'inherit' });
    console.log(`ok   ${label}`);
    return true;
  } catch {
    console.log(`FAIL ${label}`);
    return false;
  }
}

if (process.argv[2]) {
  install(resolve(process.argv[2]));
} else {
  const destination = mkdtempSync(join(tmpdir(), 'mongoose-enumvalues-'));

  try {
    install(pack(destination));
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
}

const results = [];

for (const consumer of consumers) {
  const dir = join(root, 'test', 'consumers', consumer.name);

  results.push(
    check(`${consumer.name} types`, process.execPath, [tsc, '-p', dir]),
    check(`${consumer.name} smoke`, process.execPath, [
      join(dir, consumer.smoke),
    ]),
  );
}

if (results.includes(false)) {
  process.exitCode = 1;
}
