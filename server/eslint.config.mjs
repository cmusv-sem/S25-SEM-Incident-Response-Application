// server/eslint.config.js
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // server custom rules
    }
  }
];
