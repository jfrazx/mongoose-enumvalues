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
    coverage: {
      include: ['index.js'],
      // The suite carries a deliberate red until the middleware rewrite, and
      // Vitest skips the coverage report on failure by default -- which would
      // make coverage silently useless for the whole of phases 0-3.
      reportOnFailure: true,
    },
  },
});
