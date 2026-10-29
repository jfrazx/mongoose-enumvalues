import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { createFull, stored } from './helpers/account';

const Account = mongoose.model('Account');
const Draft = mongoose.model('Draft');

// What `modify` receives on a write: the same shape it hands back on a lean
// read, which is what a client holds after reading a document and sends back.
const shape = (value: string) => ({ value, values: ['ignored'] });

describe('EnumValues', function () {
  describe('modify writes', function () {
    it('create unwraps shapes, applies schema setters, and keeps siblings', async function () {
      const doc = await Account.create({
        plan: shape('PRO'),
        settings: {
          theme: shape('DARK'),
          density: shape('cozy'),
          label: 'keep',
        },
      });

      expect(await stored(doc._id)).to.deep.equal({
        plan: 'pro',
        settings: { theme: 'dark', density: 'cozy', label: 'keep' },
      });
    });

    it('save unwraps a shape assigned to a hydrated document', async function () {
      const doc = await Account.create({
        plan: 'free',
        settings: { label: 'keep' },
      });

      doc.plan = shape('team');
      await doc.save();

      const found = await stored(doc._id);

      expect(found!.plan).to.equal('team');
      expect(found!.settings!.label).to.equal('keep');
    });

    it('insertMany unwraps shapes', async function () {
      const [doc] = await Account.insertMany([
        {
          plan: shape('PRO'),
          settings: { theme: shape('dark'), label: 'keep' },
        },
      ]);

      expect(await stored(doc._id)).to.deep.equal({
        plan: 'pro',
        settings: { theme: 'dark', label: 'keep' },
      });
    });

    it('findByIdAndUpdate unwraps top-level fields', async function () {
      const id = await createFull();

      await Account.findByIdAndUpdate(id, { plan: shape('team') });

      expect((await stored(id))!.plan).to.equal('team');
    });

    it('updateMany unwraps top-level fields', async function () {
      const id = await createFull();

      await Account.updateMany({ _id: id }, { plan: shape('team') });

      expect((await stored(id))!.plan).to.equal('team');
    });

    it('$set of nested shapes keeps siblings', async function () {
      // Density starts as compact, so the $set below changes it.
      const { _id: id } = await Account.create({
        plan: 'pro',
        settings: { theme: 'dark', density: 'compact', label: 'keep' },
      });

      await Account.findByIdAndUpdate(id, {
        $set: {
          settings: {
            theme: shape('light'),
            density: shape('cozy'),
            label: 'keep',
          },
        },
      });

      expect((await stored(id))!.settings).to.deep.equal({
        theme: 'light',
        density: 'cozy',
        label: 'keep',
      });
    });

    it('updateOne unwraps a dotted path', async function () {
      const id = await createFull();

      await Account.updateOne(
        { _id: id },
        { 'settings.theme': shape('light') },
      );

      const found = await stored(id);

      expect(found!.settings!.theme).to.equal('light');
      expect(found!.settings!.label).to.equal('keep');
    });

    it('updateMany unwraps under $set', async function () {
      const id = await createFull();

      await Account.updateMany({ _id: id }, { $set: { plan: shape('free') } });

      expect((await stored(id))!.plan).to.equal('free');
    });

    it('replaceOne unwraps', async function () {
      const id = await createFull();

      await Account.replaceOne(
        { _id: id },
        { plan: shape('pro'), settings: { label: 'r' } },
      );

      expect(await stored(id)).to.deep.equal({
        plan: 'pro',
        settings: { label: 'r' },
      });
    });

    it('findOneAndReplace unwraps', async function () {
      const id = await createFull();

      await Account.findOneAndReplace(
        { _id: id },
        { plan: shape('team'), settings: { label: 'r' } },
      );

      expect(await stored(id)).to.deep.equal({
        plan: 'team',
        settings: { label: 'r' },
      });
    });

    it('an unwrapped value outside the enum is still rejected', async function () {
      const error = await Account.create({ plan: shape('nope') }).then(
        () => undefined,
        (e: mongoose.Error.ValidationError) => e,
      );

      expect(error!.errors.plan.kind).to.equal('enum');
    });

    it('plain-value filters are unaffected', async function () {
      const doc = await Account.create({ plan: 'pro' });

      const equal = await Account.find({ _id: doc._id, plan: 'pro' });
      const within = await Account.find({
        _id: doc._id,
        plan: { $in: ['pro'] },
      });

      expect(equal).to.have.length(1);
      expect(within).to.have.length(1);
    });

    it('validateBeforeSave: false still unwraps on save', async function () {
      const draft = await Draft.create({ status: shape('open') });

      const found = await Draft.collection.findOne({ _id: draft._id });

      expect(found!.status).to.equal('open');
    });
  });
});
