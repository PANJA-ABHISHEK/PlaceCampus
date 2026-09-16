/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    './base.js',
    'next/core-web-vitals',
    'next/typescript',
  ],
  rules: {
    // Next.js specific relaxations
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/require-await': 'off',

    // Allow default exports for pages/layouts
    'import/no-default-export': 'off',
  },
};
