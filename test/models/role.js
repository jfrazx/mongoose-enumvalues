const path = require('path');
const enumValues = require(path.resolve('index'));
const mongoose = require('mongoose');
const { Schema } = mongoose;
const RoleSchema = new Schema({
  role: {
    type: String,
    lowercase: true,
    required: true,
    enum: ['admin', 'moderator', 'guest'],
    default: 'guest'
  },
  priority: {
    type: Number,
    default: 2
  },
  nesting: {
    something: {
      type: String,
      lowercase: true,
      trim: true,
      enum: ['wicked', 'this', 'way', 'comes']
    }
  }
});

/**
  modify: {
    only: ['pathName', 'pathName'],
    on: ['find', 'findOne']
  }
 */

const enumOptions = {
  find: true,
  findOne: true,
  modify: true,
  attach: {
    properties: {
      'nesting.something': {
        as: 'nester'
      }
    }
  }
};

RoleSchema.plugin(enumValues, enumOptions);

module.exports = mongoose.model('Role', RoleSchema);

