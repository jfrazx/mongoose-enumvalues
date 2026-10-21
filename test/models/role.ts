import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
const RoleSchema = new Schema({
  role: {
    type: String,
    lowercase: true,
    required: true,
    enum: ['admin', 'moderator', 'guest'],
    default: 'guest',
  },
  priority: {
    type: Number,
    default: 2,
  },
  nesting: {
    something: {
      type: String,
      lowercase: true,
      trim: true,
      enum: ['wicked', 'this', 'way', 'comes'],
    },
  },
});

/**
  modify: {
    only: ['pathName', 'pathName'],
    on: ['find', 'findOne']
  }
 */

const enumOptions: enumValues.EnumValueOptions = {
  find: true,
  findOne: true,
  modify: true,
  attach: {
    properties: {
      'nesting.something': {
        as: 'nester',
      },
    },
  },
};

RoleSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Role', RoleSchema);
