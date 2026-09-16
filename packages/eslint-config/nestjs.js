/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // NestJS uses class constructors extensively with DI
    '@typescript-eslint/no-empty-function': 'off',

    // Decorators produce unused expressions
    '@typescript-eslint/no-unused-expressions': 'off',

    // NestJS modules commonly have empty constructors
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'off',

    // Allow require() for dynamic imports in NestJS
    '@typescript-eslint/no-require-imports': 'off',

    // NestJS uses floating promises with decorators
    '@typescript-eslint/no-floating-promises': 'warn',

    // Interface naming convention (prefix with I is optional in NestJS)
    '@typescript-eslint/naming-convention': 'off',
  },
};
