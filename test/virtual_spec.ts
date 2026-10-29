import mongoose from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';

const Pet = mongoose.model('Pet');

describe('EnumValues', function () {
  describe('virtual', function () {
    beforeAll(async function () {
      await Pet.create({
        species: 'python',
        numLegs: 'zero',
      });
    });

    it('should create virtual property "speciesOptions"', async function () {
      const pet = await Pet.findOne({ species: 'PYTHON' });

      expect(pet.speciesOptions).to.not.be.undefined;
    });

    it('should NOT create virtual property "numberOfLegs"', async function () {
      const pet = await Pet.findOne({ species: 'PYTHON' });

      expect(pet.numberOfLegs).to.be.undefined;
    });

    it('should be an array of values', async function () {
      const pet = await Pet.findOne({ species: 'PYTHON' });

      expect(pet.speciesOptions).to.be.instanceof(Array).to.have.length(5);

      pet.speciesOptions.forEach(function (species: string) {
        expect(['LION', 'TIGER', 'BEAR', 'PYTHON', 'PENGUIN']).to.include(
          species,
        );
      });
    });

    it('mutating the virtual does not change the enum', async function () {
      const pet = await Pet.findOne({ species: 'PYTHON' });

      pet.speciesOptions.push('HACKED');

      expect(pet.speciesOptions).to.have.length(5);
      await expect(Pet.create({ species: 'HACKED' })).rejects.toThrow(
        mongoose.Error.ValidationError,
      );
    });
  });
});
