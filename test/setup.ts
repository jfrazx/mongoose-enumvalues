import { inject, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

import './models/pet';
import './models/user';
import './models/role';
import './models/account';
import './models/draft';
import './models/ticket';
import './models/badge';
import './models/probe';

beforeAll(async () => {
  await mongoose.connect(inject('MONGO_URI'), { dbName: 'enumvalues' });
});

afterAll(async () => {
  await mongoose.disconnect();
});
