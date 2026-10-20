import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
const PetSchema = new Schema({
  species: {
    type: String,
    uppercase: true,
    enum: ['LION', 'TIGER', 'BEAR', 'PYTHON', 'PENGUIN'],
  },
  name: String,
  numLegs: {
    type: String,
    uppercase: true,
    enum: ['ZERO', 'ONE', 'TWO', 'FOUR', 'MANY'],
    default: 'FOUR',
  },
  eatsPeople: {
    type: Boolean,
    default: true,
  },
});

/**
  virtual: {
    only: ['pathName', 'pathName'],
      properties: {
        propertyName: 'asVirtual',
      }
    }
 */

const enumOptions: enumValues.EnumValueOptions = {
  virtual: {
    only: ['species'],
    properties: {
      species: 'speciesOptions',
      numLegs: 'numberOfLegs',
    },
  },
};

PetSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Pet', PetSchema);
