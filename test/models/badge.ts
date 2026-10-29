import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
const BadgeSchema = new Schema({
  tier: { type: String, enum: ['bronze', 'gold'] },
  color: { type: String, enum: ['red', 'blue'] },
});

// `only` names `color`, but only `tier` has a property to attach.
const enumOptions: enumValues.EnumValueOptions = {
  attach: { only: ['tier', 'color'], properties: { tier: { as: 'tiers' } } },
};

BadgeSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Badge', BadgeSchema);
