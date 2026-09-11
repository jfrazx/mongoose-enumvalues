const Role = require('mongoose').model('Role');

describe('EnumValues', function() {
  describe('modify', function() {
    beforeAll(async function() {
      await Role.create({
        role: 'moderator'
      });
    });

    it('should NOT modify the property', async function() {
      const role = await Role.findOne({ role: 'moderator' });

      expect(role.role).to.be.a('string');
    });

    it('should modify property when `lean()` is used', async function() {
      const role = await Role.findOne({ role: 'moderator' }).lean();

      expect(role.role).to.be.an('object');
      expect(role.role.value).to.be.an('string');
      expect(role.role.values).to.be.instanceof(Array);
    });

    it('should reset value on update', async function() {
      const role = await Role.findOne({ role: 'moderator' }).lean();

      role.priority = 3;

      const updatedRole = await Role.findByIdAndUpdate(role._id, { $set: role }, { new: true });

      expect(updatedRole.role).to.equal(role.role.value);
    });

    it('should update other values normally', async function() {
      const role = await Role.findOne({ role: 'moderator' });

      expect(role.priority).to.equal(3);

      // PORTED: Document.prototype.update() was removed in Mongoose 7.
      // updateOne() is the documented replacement.
      await role.updateOne({ $inc: { priority: -1 } });

      const updated = await Role.findOne({});

      expect(updated.priority).to.equal(2);
    });

    it('should update enum', async function() {
      const role = await Role.findOne({ role: 'moderator' }).lean();

      const oldRole = role.role.value;
      const newRole = randElement(role.role.values, oldRole);

      const updatedRole = await Role.findByIdAndUpdate(role._id,
        { $set: { role: newRole } },
        { new: true });

      expect(updatedRole.role).to.not.equal(oldRole);
      expect(updatedRole.role).to.equal(newRole);
    });

    it('should process nested enums', async function() {
      const role = await Role.findOne({}).lean();

      const nested = randElement(role.nesting.something.values);

      expect(role.nesting.something.value).to.be.null;

      role.nesting.something.value = nested;

      const updatedRole = await Role.findOneAndUpdate({ _id: role._id }, { $set: role }, { new: true });

      expect(updatedRole.nesting.something).to.not.be.null;
      expect(updatedRole.nesting.something).to.equal(nested);
    });

    it('should find by id and modify', async function() {
      const roles = await Role.find({});

      const id = randElement(roles);

      const role = await Role.findById(id).lean();

      expect(role.role).to.be.an('object');
      expect(role.role.values).to.be.an.instanceof(Array);
      expect(role.role.value).to.be.a('string');
      expect(role.role.values).to.have.length(3);

      role.role.values.forEach(function(value) {
        expect(value).to.be.a('string');
      });
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
