import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,

  // D21 depends on this: with a single default export, the CommonJS build is
  // `module.exports = enumValues`, so require() keeps returning the function
  // itself. It is the default, and is pinned here so it cannot drift.
  cjsDefault: true,

  // The source is an ES module, so strict by definition, and 0.0.3's
  // index.js opened with 'use strict'. Rolldown's default, 'auto', only
  // copies a directive written in the source -- which a module never needs
  // -- so without this the CommonJS build silently drops to sloppy mode.
  outputOptions: { strict: true },

  // D22: the exports map is written by hand in package.json, with explicit
  // types conditions. Off is the default, pinned here because turning it on
  // rewrites package.json on every build.
  exports: false,

  // Both checks run against the packed tarball after every build, and fail
  // it. attw's settings are explicit because tsdown 0.23.1's defaults are
  // not what its docs say: it defaults to the 'esm-only' profile, which
  // ignores CommonJS resolution failures, and to 'warn', which never fails
  // the build.
  publint: { strict: true },
  attw: { profile: 'strict', level: 'error' },
});
