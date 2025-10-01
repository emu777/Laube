import nextPlugin from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  nextPlugin,
  prettierConfig,
];

export default config;