import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    globalSetup: ['./test/globalSetup.js'],
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*_spec.js'],
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
