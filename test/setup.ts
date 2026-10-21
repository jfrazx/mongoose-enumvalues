import { inject, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

import './models/pet';
import './models/user';
import './models/role';

beforeAll(async () => {
  await mongoose.connect(inject('MONGO_URI'), { dbName: 'enumvalues' });
});

afterAll(async () => {
  await mongoose.disconnect();
});
