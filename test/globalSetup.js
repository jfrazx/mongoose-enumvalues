import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export default async function setup({ provide }) {
  mongod = await MongoMemoryServer.create();

  provide('MONGO_URI', mongod.getUri());

  return async function teardown() {
    await mongod.stop();
  };
}
