const User = require('mongoose').model('User');

describe('EnumValues', function() {
  describe('attach', function() {
    beforeAll(async function() {
      const lisa = User.create({
        name: 'Lisa Simpson',
        age: 8
      });

      await User.create({
        name: 'Bart Simpson',
        age: 10,
        gender: 'MALE'
      });

      await lisa;
    });

    it('findeOne should attach enumValues as object property', async function() {
      const bart = await User.findOne({ name: 'Bart Simpson' });

      expect(bart.genders).to.not.be.undefined;
      expect(bart.genders).to.be.instanceof(Array);
      expect(bart.genders).to.have.length(2);
    });

    it('find should attach enumValues to all objects', async function() {
      const simpsons = await User.find({});

      simpsons.forEach(function(simpson) {
        expect(simpson.genders).to.not.be.undefined;
        expect(simpson.genders).to.be.instanceof(Array);
        expect(simpson.genders).to.have.length(2);
      });
    });

    it('genders should include ["MALE", "FEMALE"]', async function() {
      const lisa = await User.findOne({ name: 'Lisa Simpson' });

      lisa.genders.forEach(function(gender) {
        expect(['MALE', 'FEMALE']).to.include(gender);
      });
    });
  });
});
