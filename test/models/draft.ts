import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
// Odd on purpose: unwrapping must not depend on `validateBeforeSave`, and a
// hook listed twice in `modify.on` must not wrap the value twice.
const DraftSchema = new Schema(
  { status: { type: String, enum: ['open', 'done'] } },
  { validateBeforeSave: false },
);

const enumOptions: enumValues.EnumValueOptions = {
  modify: { on: ['findOne', 'findOne'] },
};

DraftSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Draft', DraftSchema);
