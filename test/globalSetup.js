import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Pinned deliberately rather than left to the package default, so a
// mongodb-memory-server release cannot change the server under the suite
// without the change showing up in a diff. Kept outside node_modules so
// `npm ci` does not wipe the download that CI caches, and resolved against
// this file rather than cwd so the path matches what actions/cache stores.
const MONGODB_VERSION = '8.2.6';
const DOWNLOAD_DIR = resolve(
  import.meta.dirname,
  '..',
  '.cache',
  'mongodb-binaries',
);

let mongod;

export default async function setup({ provide }) {
  mongod = await MongoMemoryServer.create({
    binary: {
      version: MONGODB_VERSION,
      downloadDir: DOWNLOAD_DIR,
    },
  });

  provide('MONGO_URI', mongod.getUri());

  return async function teardown() {
    await mongod.stop();
  };
}
