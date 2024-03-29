module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        createDefaultProgram: true,
        tsconfigRootDir: __dirname,
        project: [
            './tsconfig.eslint.json',
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
        'brace-style': 'off',
        '@typescript-eslint/brace-style': ['error', '1tbs'],

        'comma-dangle': 'off',
        '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error'],

        'semi': 'off',
        '@typescript-eslint/semi': ['error'],

        'arrow-parens': ['error', 'always'],
        'camelcase': ['error'],
        'no-var': 'error',
        'no-void': ['error'],
        'prefer-regex-literals': ['error'],
        'quotes': ['error', 'single'],
        'radix': 'error',
        'unicorn/filename-case': ['error', { 'case': 'kebabCase' }],

        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-empty-interface': ['error', { 'allowSingleExtends': true }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/sort-type-union-intersection-members': ['error'],
        '@typescript-eslint/type-annotation-spacing': ['error', { 'before': false, 'after': true }],
    },
};
