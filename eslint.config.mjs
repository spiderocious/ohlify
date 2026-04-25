import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', '.nx/', 'apps/admin-web/**', 'apps/customer-web/**'],
  },
  {
    files: ['apps/backend/src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
      sonarjs,
    },
    languageOptions: {
      parserOptions: {
        project: './apps/backend/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './apps/backend/tsconfig.json',
        },
      },
    },
    rules: {
      ...importPlugin.flatConfigs.recommended.rules,
      ...importPlugin.flatConfigs.typescript.rules,
      ...sonarjs.configs['recommended-legacy'].rules,

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@features/**', group: 'internal' },
            { pattern: '@lib/**', group: 'internal' },
            { pattern: '@shared/**', group: 'internal' },
            { pattern: '@middlewares/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],

      'no-console': 'error',
      eqeqeq: ['error', 'always'],

      ...prettier.rules,
    },
  },
);