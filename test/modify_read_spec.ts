import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { createFull, stored } from './helpers/account';

const Account = mongoose.model('Account');
const Draft = mongoose.model('Draft');
const Probe = mongoose.model('Probe');

// What `modify` turns an enum path into on a lean read.
interface Shape {
  values: string[];
  value?: string | null;
}

interface LeanAccount {
  plan: Shape;
  settings: {
    theme: Shape;
    density: Shape;
    label?: string;
  };
  address?: { kind: string };
}

interface LeanDraft {
  status: Shape;
}

interface LeanProbe {
  state: Shape;
}

const lean = async (id: mongoose.Types.ObjectId): Promise<LeanAccount> =>
  (await Account.findById(id).lean<LeanAccount>())!;

describe('EnumValues', function () {
  describe('modify reads', function () {
    it('lean read transforms every nested enum and keeps siblings', async function () {
      const found = await lean(await createFull());

      expect(found.settings.label).to.equal('keep');
      expect(found.settings.theme).to.deep.equal({
        values: ['light', 'dark'],
        value: 'dark',
      });
      expect(found.settings.density).to.deep.equal({
        values: ['compact', 'cozy'],
        value: 'cozy',
      });
    });

    it('an unset nested enum reads as null', async function () {
      const doc = await Account.create({ plan: 'free' });

      const found = await lean(doc._id);

      expect(found.settings.theme.value).to.be.null;
      expect(found.settings.theme.values).to.deep.equal(['light', 'dark']);
    });

    it('a stored null nested leaf reads as null', async function () {
      const { insertedId } = await Account.collection.insertOne({
        settings: { theme: null, label: 'x' },
      });

      const found = await lean(insertedId);

      expect(found.settings.theme.value).to.be.null;
      expect(found.settings.label).to.equal('x');
    });

    it('a stored null parent reads each nested enum as null', async function () {
      const { insertedId } = await Account.collection.insertOne({
        settings: null,
      });

      const found = await lean(insertedId);

      expect(found.settings.theme.value).to.be.null;
      expect(found.settings.density.value).to.be.null;
    });

    it('an absent top-level enum reads as undefined', async function () {
      const doc = await Account.create({ settings: { label: 'x' } });

      const found = await lean(doc._id);

      expect(found.plan.value).to.be.undefined;
      expect(found.plan.values).to.deep.equal(['free', 'pro', 'team']);
    });

    it('a stored null top-level enum stays null', async function () {
      const { insertedId } = await Account.collection.insertOne({
        plan: null,
      });

      const found = await lean(insertedId);

      expect(found.plan.value).to.be.null;
      expect(found.plan.values).to.deep.equal(['free', 'pro', 'team']);
    });

    it('a non-object parent is left alone', async function () {
      const { insertedId } = await Account.collection.insertOne({
        settings: 'x',
      });

      const found = await lean(insertedId);

      expect(found.settings).to.equal('x');
    });

    it('an array parent is left alone', async function () {
      const { insertedId } = await Account.collection.insertOne({
        settings: ['x'],
      });

      const found = await lean(insertedId);

      expect(found.settings).to.deep.equal(['x']);
    });

    it('an array parent round-trips through $set unchanged', async function () {
      const { insertedId } = await Account.collection.insertOne({
        plan: 'pro',
        settings: ['x'],
      });

      const found = await lean(insertedId);

      await Account.findByIdAndUpdate(insertedId, { $set: found });

      expect((await stored(insertedId))!.settings).to.deep.equal(['x']);
    });

    it('findOne matching nothing resolves null', async function () {
      const found = await Account.findOne({
        _id: new mongoose.Types.ObjectId(),
      }).lean();

      expect(found).to.be.null;
    });

    it('a lean document round-trips through $set without losing siblings', async function () {
      const id = await createFull();

      const found = await lean(id);

      found.settings.theme.value = 'light';

      await Account.findByIdAndUpdate(id, { $set: found });

      expect((await stored(id))!.settings).to.deep.equal({
        theme: 'light',
        density: 'cozy',
        label: 'keep',
      });
    });

    it('a non-lean read leaves a sparse document unmodified', async function () {
      const { _id: sparseId } = await Account.create({ plan: 'free' });

      const found = await Account.findById(sparseId);

      expect(found.isModified()).to.be.false;
      expect(found.toObject()).to.not.have.property('settings');
    });

    // Catches getOptions().lean: on 8.24.4 it is set for findOne, not find.
    it('find().lean() handles complete and sparse documents together', async function () {
      const fullId = await createFull();
      const { _id: sparseId } = await Account.create({ plan: 'free' });

      const found = await Account.find({
        _id: { $in: [fullId, sparseId] },
      }).lean<(LeanAccount & { _id: mongoose.Types.ObjectId })[]>();

      const full = found.find((doc) => doc._id.equals(fullId))!;
      const sparse = found.find((doc) => doc._id.equals(sparseId))!;

      expect(found).to.have.length(2);
      expect(full.settings.theme.value).to.equal('dark');
      expect(full.settings.label).to.equal('keep');
      expect(sparse.settings.theme.value).to.be.null;
      expect(sparse.settings).to.not.have.property('label');
    });

    it('a subdocument enum is left as stored', async function () {
      const doc = await Account.create({
        plan: 'free',
        address: { kind: 'home' },
      });

      const found = await lean(doc._id);

      expect(found.address!.kind).to.equal('home');
    });

    it('a hook listed twice does not double-wrap', async function () {
      const doc = await Draft.create({ status: 'open' });

      const found = (await Draft.findById(doc._id).lean<LeanDraft>())!;

      expect(found.status).to.deep.equal({
        values: ['open', 'done'],
        value: 'open',
      });
    });

    it('mutating a lean result does not change the enum', async function () {
      const found = await lean(await createFull());

      found.plan.values.push('hacked');

      await expect(Account.create({ plan: 'hacked' })).rejects.toThrow(
        mongoose.Error.ValidationError,
      );
      expect((await lean(await createFull())).plan.values).to.deep.equal([
        'free',
        'pro',
        'team',
      ]);
    });
  });

  describe('modify hook results', function () {
    it('a lean count resolves the count', async function () {
      await Probe.create({ state: 'on' });

      expect(await Probe.countDocuments({}).lean()).to.be.a('number');
    });

    it('includeResultMetadata transforms the document, not the wrapper', async function () {
      const doc = await Probe.create({ state: 'on' });

      const result = await Probe.findOneAndUpdate(
        { _id: doc._id },
        { $set: { state: 'off' } },
        { includeResultMetadata: true, returnDocument: 'after' },
      ).lean<mongoose.ModifyResult<LeanProbe>>();

      expect(result).to.not.have.property('state');
      expect(result.value!.state).to.deep.equal({
        values: ['on', 'off'],
        value: 'off',
      });
    });

    it('a document hook in modify.on leaves save alone', async function () {
      const doc = await Probe.create({ state: 'on' });

      expect(doc.state).to.equal('on');
    });

    it('an aggregate hook in modify.on leaves aggregate alone', async function () {
      const doc = await Probe.create({ state: 'on' });

      const [found] = await Probe.aggregate([{ $match: { _id: doc._id } }]);

      expect(found.state).to.equal('on');
    });
  });
});
