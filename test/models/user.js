const mongoose = require('mongoose');
const path = require('path');
const enumValues = require(path.resolve('index'));
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
    default: 'FEMALE'
  }
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

const enumOptions = {
  find: true,
  findOne: true,
  attach: {
    properties: {
      gender: {
        as: 'genders'
      }
    }
  }
};

UserSchema.plugin(enumValues, enumOptions);

module.exports = mongoose.model('User', UserSchema);
