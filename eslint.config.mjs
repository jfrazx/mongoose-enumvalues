// @ts-check

import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['coverage/', 'docs/', '.cache/'],
  },

  {
    files: ['**/*.{js,mjs,ts}'],
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

  // The package has no "type": "module", so .js is CommonJS. Everything below
  // narrows that default where a file genuinely differs.
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // This package is CommonJS until #14 moves the source to TypeScript.
      // require() is the correct call here, not a violation.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Vitest resolves these two through its own ESM pipeline, so they use
  // import/export despite the .js extension.
  {
    files: ['test/setup.js', 'test/globalSetup.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },

  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // vitest.config.mjs sets globals: true, so the specs use the bare names.
  {
    files: ['test/**/*_spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        test: 'readonly',
        suite: 'readonly',
        vi: 'readonly',
        assert: 'readonly',
        expectTypeOf: 'readonly',
        onTestFailed: 'readonly',
        onTestFinished: 'readonly',
      },
    },
    rules: {
      // Chai's BDD assertions are bare expressions by design:
      //   expect(role.nesting.something.value).to.be.null;
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },

  // index.js is the untouched 2017 source. #15 rewrites it, and these four
  // findings are that phase's work -- three are already recorded as latent
  // bugs in docs/baseline.md:
  //
  //   no-unused-vars (207)     -> filterPaths swallowing the caught error
  //   preserve-caught-error    -> filterPaths rethrowing without a cause
  //   no-unused-vars (279)     -> determineValue catching everything
  //   no-this-alias (129)      -> not previously recorded; raised on #15
  //
  // Silencing them here keeps the gate strict for every other file rather
  // than weakening it repo-wide. Delete this block in #15.
  {
    files: ['index.js'],
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'preserve-caught-error': 'off',
    },
  },
);
