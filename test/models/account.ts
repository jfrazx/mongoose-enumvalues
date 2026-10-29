import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
const AccountSchema = new Schema({
  plan: { type: String, lowercase: true, enum: ['free', 'pro', 'team'] },
  settings: {
    theme: { type: String, lowercase: true, enum: ['light', 'dark'] },
    density: { type: String, enum: ['compact', 'cozy'] },
    label: String,
  },
  address: new Schema({ kind: { type: String, enum: ['home', 'work'] } }),
});

const enumOptions: enumValues.EnumValueOptions = {
  find: true,
  findOne: true,
  modify: true,
};

AccountSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Account', AccountSchema);
