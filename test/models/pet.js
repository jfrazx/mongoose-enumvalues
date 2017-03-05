const path = require('path');
const enumValues = require(path.resolve('index'));
const mongoose = require('mongoose');
const { Schema } = mongoose;
const PetSchema = new Schema({
  species: {
    type: String,
    uppercase: true,
    enum: ['LION', 'TIGER', 'BEAR', 'PYTHON', 'PENGUIN']
  },
  name: String,
  numLegs: {
    type: String,
    uppercase: true,
    enum: ['ZERO', 'ONE', 'TWO', 'FOUR', 'MANY'],
    default: 'FOUR'
  },
  eatsPeople: {
    type: Boolean,
    default: true
  }
});

/**
  virtual: {
    only: ['pathName', 'pathName'],
      properties: {
        propertyName: 'asVirtual',
      }
    }
 */

const enumOptions = {
  virtual: {
    only: ['species'],
    properties: {
      species: 'speciesOptions',
      numLegs: 'numberOfLegs'
    }
  }
};

PetSchema.plugin(enumValues, enumOptions);

module.exports = mongoose.model('Pet', PetSchema);
