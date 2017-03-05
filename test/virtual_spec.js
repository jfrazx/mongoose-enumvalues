const Pet = require('mongoose').model('Pet');
const chai = require('chai');
const expect = chai.expect;

describe('EnumValues', function() {
  describe('virtual', function() {
    before(function(done) {
      Pet.create({
        species: 'python',
        numLegs: 'zero'
      })
      .then(function() {
        done();
      })
      .catch(done);
    });

    it('should create virtual property "speciesOptions"', function(done) {
      Pet.findOne({ species: 'PYTHON' })
        .then(function(pet) {
          expect(pet.speciesOptions).to.not.be.undefined;
          done();
        })
        .catch(done);
    });

    it('should NOT create virtual property "numberOfLegs"', function(done) {
      Pet.findOne({ species: 'PYTHON' })
        .then(function(pet) {
          expect(pet.numberOfLegs).to.be.undefined;
          done();
        })
        .catch(done);
    });

    it('should be an array of values', function(done) {
      Pet.findOne({ species: 'PYTHON' })
        .then(function(pet) {
          expect(pet.speciesOptions).to.be.instanceof(Array)
            .to.have.length(5);

            pet.speciesOptions.forEach(function(species) {
              expect(['LION', 'TIGER', 'BEAR', 'PYTHON', 'PENGUIN'])
                .to.include(species);
            });
          done();
        })
        .catch(done);
    });
  });
});
