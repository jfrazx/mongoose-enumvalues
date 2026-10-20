// @ts-check

import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['coverage/', 'dist/', 'docs/', '.cache/'],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // Carried forward from the deleted .eslintrc. #13 retires that file's
      // *stylistic* rules because Prettier owns formatting now -- these six
      // are correctness rules, which Prettier does not replace and neither
      // recommended preset turns on.
      eqeqeq: ['error', 'smart'],
      curly: 'error',
      'no-extend-native': 'error',
      'no-use-before-define': ['error', 'nofunc'],
      'block-scoped-var': 'error',
      camelcase: 'error',
    },
  },

  // The source and tests are TypeScript since #14. What JavaScript is left
  // is tooling and the consumer smoke tests, all run by Node directly.
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // require() is the correct call in a CommonJS file, not a violation.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },

  {
    files: ['test/**/*_spec.ts'],
    rules: {
      // Chai's BDD assertions are bare expressions by design:
      //   expect(role.nesting.something.value).to.be.null;
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // src/index.ts is the 2017 source, ported to TypeScript in #14 with its
  // behaviour unchanged. #15 rewrites it, and these four findings are that
  // phase's work -- three are already recorded as latent bugs in
  // docs/baseline.md:
  //
  //   no-unused-vars (311)     -> filterPaths swallowing the caught error
  //   preserve-caught-error    -> filterPaths rethrowing without a cause
  //   no-unused-vars (390)     -> determineValue catching everything
  //   no-this-alias (216)      -> not previously recorded; raised on #15
  //
  // Silencing them here keeps the gate strict for every other file rather
  // than weakening it repo-wide. Delete this block in #15.
  {
    files: ['src/index.ts'],
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'preserve-caught-error': 'off',
    },
  },
);
