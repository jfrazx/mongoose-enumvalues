import { inject, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

import './models/pet.js';
import './models/user.js';
import './models/role.js';

beforeAll(async () => {
  await mongoose.connect(inject('MONGO_URI'), { dbName: 'enumvalues' });
});

afterAll(async () => {
  await mongoose.disconnect();
});
