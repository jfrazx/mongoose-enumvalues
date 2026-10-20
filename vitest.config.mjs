import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ['./test/globalSetup.mts'],
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*_spec.ts'],
    testTimeout: 20000,
    hookTimeout: 120000,
    coverage: {
      include: ['src/index.ts'],
      // The suite carries a deliberate red until the middleware rewrite, and
      // Vitest skips the coverage report on failure by default -- which would
      // make coverage silently useless for the whole of phases 0-3.
      reportOnFailure: true,
    },
  },
});
