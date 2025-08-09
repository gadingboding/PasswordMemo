const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'test/**/*.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
    },
  },
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '*.config.js', 'src/**/*.ts', 'test/**/*.ts'],
  },
];