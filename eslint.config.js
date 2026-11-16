import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build/**', 'coverage/**', '.husky/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['tools/**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['scripts/**/*.ts'], languageOptions: { globals: globals.browser } },
);
