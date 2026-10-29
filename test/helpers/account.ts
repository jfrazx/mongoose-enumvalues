import mongoose from 'mongoose';

const Account = mongoose.model('Account');

// The raw stored document, past every Mongoose cast and setter.
export interface Stored {
  plan?: string;
  settings?: { theme?: string; density?: string; label?: string };
}

export async function stored(
  id: mongoose.Types.ObjectId,
): Promise<Stored | null> {
  return (await Account.collection.findOne(
    { _id: id },
    { projection: { _id: 0, __v: 0 } },
  )) as Stored | null;
}

// Each test makes its own document and queries it by `_id`: the other specs
// depend on what is in their collections, and every spec shares one database.
export async function createFull(): Promise<mongoose.Types.ObjectId> {
  const doc = await Account.create({
    plan: 'pro',
    settings: { theme: 'dark', density: 'cozy', label: 'keep' },
  });

  return doc._id;
}
