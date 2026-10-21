// Loads the packed package through Node's own import(), the way an ESM
// consumer meets it. Run by scripts/test-package.mjs.

import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import enumValues from 'mongoose-enumvalues';

assert.match(
  import.meta.resolve('mongoose-enumvalues'),
  /\/dist\/index\.mjs$/,
  'import must resolve to the ESM build',
);
assert.equal(typeof enumValues, 'function');

const schema = new mongoose.Schema({
  role: { type: String, enum: ['admin', 'guest'] },
});
schema.plugin(enumValues, { virtual: { properties: { role: 'roles' } } });

const Model = mongoose.model('Smoke', schema);

assert.deepEqual(new Model({ role: 'admin' }).roles, ['admin', 'guest']);
