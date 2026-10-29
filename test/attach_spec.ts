import mongoose from 'mongoose';
import { beforeAll, describe, expect, it } from 'vitest';

const User = mongoose.model('User');
const Ticket = mongoose.model('Ticket');
const Badge = mongoose.model('Badge');
const Probe = mongoose.model('Probe');

describe('EnumValues', function () {
  describe('attach', function () {
    beforeAll(async function () {
      const lisa = User.create({
        name: 'Lisa Simpson',
        age: 8,
      });

      await User.create({
        name: 'Bart Simpson',
        age: 10,
        gender: 'MALE',
      });

      await lisa;
    });

    it('findeOne should attach enumValues as object property', async function () {
      const bart = await User.findOne({ name: 'Bart Simpson' });

      expect(bart.genders).to.not.be.undefined;
      expect(bart.genders).to.be.instanceof(Array);
      expect(bart.genders).to.have.length(2);
    });

    it('find should attach enumValues to all objects', async function () {
      const simpsons = await User.find({});

      simpsons.forEach(function (simpson) {
        expect(simpson.genders).to.not.be.undefined;
        expect(simpson.genders).to.be.instanceof(Array);
        expect(simpson.genders).to.have.length(2);
      });
    });

    it('genders should include ["MALE", "FEMALE"]', async function () {
      const lisa = await User.findOne({ name: 'Lisa Simpson' });

      lisa.genders.forEach(function (gender: string) {
        expect(['MALE', 'FEMALE']).to.include(gender);
      });
    });
  });

  describe('attach regressions', function () {
    it('each attached property appears only on its own hooks', async function () {
      const ticket = await Ticket.create({ status: 'open', priority: 'low' });

      const [found] = await Ticket.find({ _id: ticket._id });

      expect(found.statuses).to.deep.equal(['open', 'closed']);
      expect(found.priorities).to.be.undefined;

      const one = await Ticket.findOne({ _id: ticket._id });

      expect(one.priorities).to.deep.equal(['low', 'high']);
      expect(one.statuses).to.be.undefined;
    });

    it('attach.only naming a path without a property does not throw', async function () {
      const badge = await Badge.create({ tier: 'gold', color: 'red' });

      const found = await Badge.findOne({ _id: badge._id });

      expect(found.tiers).to.deep.equal(['bronze', 'gold']);
    });

    it('findOne matching nothing resolves null', async function () {
      expect(await User.findOne({ name: 'Nobody Simpson' })).to.be.null;
    });

    it('mutating an attached property does not change the enum', async function () {
      const ticket = await Ticket.create({ status: 'open', priority: 'low' });

      const [found] = await Ticket.find({ _id: ticket._id });

      found.statuses.push('hacked');

      const [again] = await Ticket.find({ _id: ticket._id });

      expect(again.statuses).to.deep.equal(['open', 'closed']);
      await expect(Ticket.create({ status: 'hacked' })).rejects.toThrow(
        mongoose.Error.ValidationError,
      );
    });

    it('a count resolves the count', async function () {
      await Probe.create({ state: 'on' });

      expect(await Probe.countDocuments({})).to.be.a('number');
    });

    it('includeResultMetadata attaches to the document, not the wrapper', async function () {
      const doc = await Probe.create({ state: 'on' });

      const result = await Probe.findOneAndUpdate(
        { _id: doc._id },
        { $set: { state: 'off' } },
        { includeResultMetadata: true, returnDocument: 'after' },
      );

      expect(result).to.not.have.property('states');
      expect(result.value!.states).to.deep.equal(['on', 'off']);
    });
  });
});
