import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['bin/**', 'node_modules/**', 'vscode-extension/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
);
