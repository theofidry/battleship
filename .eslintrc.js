module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: [
            './tsconfig.eslint.json',
            './tsconfig.tests.json',
            './tsconfig.tests.json',
        ],
    },
    plugins: [
        '@typescript-eslint',
        'unicorn',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
        '@typescript-eslint/await-thenable': 'error',

        'brace-style': 'off',
        '@typescript-eslint/brace-style': ['error', '1tbs'],

        'camelcase': ['error'],

        'comma-dangle': 'off',
        '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error'],

        'no-var': 'error',
        'no-void': ['error', { 'allowAsStatement': true }],
        'prefer-regex-literals': ['error'],
        'quotes': ['error', 'single'],
        'radix': 'error',
        'unicorn/filename-case': ['error', { 'case': 'kebabCase' }],

        'semi': 'off',
        '@typescript-eslint/semi': ['error'],

        '@typescript-eslint/sort-type-union-intersection-members': ['error'],

        '@typescript-eslint/type-annotation-spacing': ['error', { 'before': false, 'after': true }],
    },
};
