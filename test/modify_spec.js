const Role = require('mongoose').model('Role');
const chai = require('chai');
const expect = chai.expect;


describe('EnumValues', function() {
  describe('modify', function() {
    before(function(done) {
      Role.create({
        role: 'moderator'
      })
      .then(function() {
        done();
      })
      .catch(done);
    });

    it('should NOT modify the property', function(done) {
      Role.findOne({ role: 'moderator' })
        .then(function(role) {
          expect(role.role).to.be.a('string');
          done();
        })
        .catch(done);
    });

    it('should modify property when `lean()` is used', function(done) {
      Role.findOne({ role: 'moderator' }).lean()
        .then(function(role) {
          expect(role.role).to.be.an('object');
          expect(role.role.value).to.be.an('string');
          expect(role.role.values).to.be.instanceof(Array);
          done();
        })
        .catch(done);
    });

    it('should reset value on update', function(done) {
      Role.findOne({ role: 'moderator' }).lean()
        .then(function(role) {
          role.priority = 3;

          return Role.findByIdAndUpdate(role._id, { $set: role }, { new: true })
            .then(function(updatedRole) {
              expect(updatedRole.role).to.equal(role.role.value);
              done();
            });
        })
        .catch(done);
    });

    it('should update other values normally', function(done) {
      Role.findOne({ role: 'moderator' })
        .then(function(role) {
          expect(role.priority).to.equal(3);

          return role.update({ $inc: { priority: -1 } })
            .then(function() {
              return Role.findOne({});
          });
        })
        .then(function(role) {
          expect(role.priority).to.equal(2);
          done();
        })
        .catch(done);
    });

    it('should update enum', function(done) {
      Role.findOne({ role: 'moderator' }).lean()
        .then(function(role) {
          const oldRole = role.role.value;
          const newRole = randElement(role.role.values, oldRole);

          return Role.findByIdAndUpdate(role._id,
              { $set: { role: newRole } },
              { new: true })
                .then(function(updatedRole) {
                  expect(updatedRole.role).to.not.equal(oldRole);
                  expect(updatedRole.role).to.equal(newRole);
                  done();
                }
              );
        })
        .catch(done);
    });

    it('should process nested enums', function(done) {
      Role.findOne({}).lean()
        .then(function(role) {
          const nested = randElement(role.nesting.something.values);

          expect(role.nesting.something.value).to.be.null;

          role.nesting.something.value = nested;
          return Role.findOneAndUpdate({ _id: role._id }, { $set: role }, { new: true })
            .then(function(updatedRole) {
              expect(updatedRole.nesting.something).to.not.be.null;
              expect(updatedRole.nesting.something).to.equal(nested);
              done();
            });
        })
        .catch(done);
    });

    it('should find by id and modify', function(done) {
      Role.find({})
        .then(function(roles) {
          const id = randElement(roles);

          return Role.findById(id).lean()
            .then(function(role) {
              expect(role.role).to.be.an('object');
              expect(role.role.values).to.be.an.instanceof(Array);
              expect(role.role.value).to.be.a('string');
              expect(role.role.values).to.have.length(3);

              role.role.values.forEach(function(value) {
                expect(value).to.be.a('string');
              });
              done();
            });
        })
        .catch(done);
    });
  });
});

function randElement(values, current) {
  let newElement;

  do {
    const randIdx = Math.floor(Math.random() * values.length);
    newElement = values[randIdx];
  } while (current === newElement);

  return newElement;
}
