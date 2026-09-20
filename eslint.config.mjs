// ESLint 10 flat config. (The previous file used legacy `.eslintrc`-style
// `module.exports` inside a `.mjs`, which throws "module is not defined" and
// is not even a valid flat config — linting was fully broken.)

import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      '.claude/**',
      'ios/**',
      'android/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'web-build/**',
      'vendor/**',
      'artifacts/**',
      'supabase/functions/**',
      'shims/**',
      'scripts/**',
      '*.config.js',
      '*.config.mjs',
      'babel.config.js',
      'metro.config.js',
      // One-off Node maintenance scripts at repo root (not app code).
      'replace*.js',
      'map_migration.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        __DEV__: 'readonly',
        process: 'readonly',
        global: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        AbortController: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // TypeScript handles undefined-symbol checking; no-undef produces false
      // positives on RN/Expo globals (__DEV__, fetch, etc.).
      'no-undef': 'off',
    },
  },
  prettierConfig,
];
