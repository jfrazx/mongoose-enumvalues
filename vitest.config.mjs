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
      // Measured on the finished rewrite (D31 on #15), rounded down to a whole
      // percent: statements 100, branches 93.5, functions 100, lines 100.
      thresholds: {
        statements: 100,
        branches: 93,
        functions: 100,
        lines: 100,
      },
      // Vitest skips the coverage report when a test fails, unless told
      // otherwise. Keep it, so a red run still shows which lines it left
      // uncovered.
      reportOnFailure: true,
    },
  },
});
