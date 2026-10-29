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
);
