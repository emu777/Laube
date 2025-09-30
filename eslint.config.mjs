import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  { plugins: { '@next/next': nextPlugin } },
  nextPlugin.configs.recommended,
  prettierConfig,
];

export default config;