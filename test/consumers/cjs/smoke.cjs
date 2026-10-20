// Loads the packed package through Node's own require(), the way every 0.0.3
// consumer does today. Run by scripts/test-package.mjs.

const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const enumValues = require('mongoose-enumvalues');

assert.match(
  require.resolve('mongoose-enumvalues'),
  /[\\/]dist[\\/]index\.cjs$/,
  'require must resolve to the CommonJS build',
);

// D3 and D21: require() returns the plugin itself, as it has since 2017, so
// it can still be handed straight to schema.plugin(). An object carrying it
// on .default would break every existing consumer.
assert.equal(typeof enumValues, 'function');

const schema = new mongoose.Schema({
  role: { type: String, enum: ['admin', 'guest'] },
});
schema.plugin(enumValues, { virtual: { properties: { role: 'roles' } } });

const Model = mongoose.model('Smoke', schema);

assert.deepEqual(new Model({ role: 'admin' }).roles, ['admin', 'guest']);
