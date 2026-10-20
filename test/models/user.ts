import mongoose from 'mongoose';
import enumValues from '../../src/index';
const { Schema } = mongoose;
const UserSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    minlength: 2,
  },
  age: Number,
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE'],
    uppercase: true,
    default: 'FEMALE',
  },
});

/**
  attach: {
    only: ['pathName', 'pathName'],
    properties: {
      propertyName: {
        as: 'attachPropertyAs',
        on: ['find', 'findOne']
      }
    }
  }
 */

const enumOptions: enumValues.EnumValueOptions = {
  find: true,
  findOne: true,
  attach: {
    properties: {
      gender: {
        as: 'genders',
      },
    },
  },
};

UserSchema.plugin(enumValues, enumOptions);

export default mongoose.model('User', UserSchema);
