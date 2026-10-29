import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
// Odd on purpose: hook names in `on` are taken on trust, so these name hooks
// whose result is a count, a metadata wrapper, a document or an aggregate.
const ProbeSchema = new Schema({
  state: { type: String, enum: ['on', 'off'] },
});

const enumOptions: enumValues.EnumValueOptions = {
  modify: { on: ['countDocuments', 'findOneAndUpdate', 'save', 'aggregate'] },
  attach: {
    properties: {
      state: { as: 'states', on: ['countDocuments', 'findOneAndUpdate'] },
    },
  },
};

ProbeSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Probe', ProbeSchema);
