module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ['standard-with-typescript', 'prettier'],
    overrides: [],
    parserOptions: {
        ecmaVersion: 'next',
        sourceType: 'module',
    },
    ignorePatterns: ['.eslintrc.*', '/build/'],
    rules: {
        'import/no-commonjs': 'error',
        'import/no-empty-named-blocks': 'error',
        'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
        'import/order': [
            'error',
            {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    ['parent', 'sibling', 'index'],
                    'object',
                    'type',
                ],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    orderImportKind: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
    },
};
