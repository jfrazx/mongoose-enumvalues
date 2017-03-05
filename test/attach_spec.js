const User = require('mongoose').model('User');
const chai = require('chai');
const expect = chai.expect;

describe('EnumValues', function() {
  describe('attach', function() {
    before(function(done) {
      const lisa = User.create({
          name: 'Lisa Simpson',
          age: 8
        });

      User.create({
        name: 'Bart Simpson',
        age: 10,
        gender: 'MALE'
      })
      .then(function() {
        return lisa;
      })
      .then(function() {
        done();
      })
      .catch(done);
    });
    it('findeOne should attach enumValues as object property', function(done) {
      User.findOne({ name: 'Bart Simpson' })
        .then(function(bart) {
          expect(bart.genders).to.not.be.undefined;
          expect(bart.genders).to.be.instanceof(Array);
          expect(bart.genders).to.have.length(2);
          done();
        })
        .catch(done);
    });

    it('find should attach enumValues to all objects', function(done) {
      User.find({})
        .then(function(simpsons) {
          simpsons.forEach(function(simpson) {
            expect(simpson.genders).to.not.be.undefined;
            expect(simpson.genders).to.be.instanceof(Array);
            expect(simpson.genders).to.have.length(2);
          });

          done();
        })
        .catch(done);
    });

    it('genders should include ["MALE", "FEMALE"]', function(done) {
      User.findOne({ name: 'Lisa Simpson' })
        .then(function(lisa) {
          lisa.genders.forEach(function(gender) {
            expect(['MALE', 'FEMALE']).to.include(gender);
          });

          done();
        })
        .catch(done);
    });
  });
});

