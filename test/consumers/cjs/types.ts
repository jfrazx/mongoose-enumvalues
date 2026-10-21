// What a TypeScript consumer in a CommonJS project sees. Typechecked against
// the packed tarball, never the source, by scripts/test-package.mjs.
// See D17 on #14.

import { Schema } from 'mongoose';

// Both import forms a CommonJS consumer might write.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the form under test
import enumValues = require('mongoose-enumvalues');
import enumValuesDefault from 'mongoose-enumvalues';

const schema = new Schema({
  role: { type: String, enum: ['admin', 'guest'] },
});

// The options type is reachable through the export itself (D21).
const options: enumValues.EnumValueOptions = {
  find: true,
  virtual: { properties: { role: 'roles' } },
  attach: { properties: { role: { as: 'roleValues', on: ['findOne'] } } },
  modify: { only: ['role', /^role$/, (path) => path === 'role'], on: ['find'] },
};

schema.plugin(enumValues, options);
schema.plugin(enumValuesDefault, options);
enumValues(schema);

// Both of these must fail. If the import ever resolves to `any`, they stop
// failing and tsc reports the unused directives instead, which is what keeps
// this fixture from passing vacuously.

// @ts-expect-error -- an attach property needs `as`
enumValues(schema, { attach: { properties: { role: {} } } });

// @ts-expect-error -- the first argument must be a schema
enumValuesDefault('role');
