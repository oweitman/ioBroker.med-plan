import config, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...config,
    ...reactConfig,
    {
        rules: {
            'no-new-func': 'warn',
            'no-extend-native': 'warn',
            'no-eval': 'warn',
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.mjs'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'warn',
            'jsdoc/require-param': 'warn',
            '@/no-duplicate-imports': 'error',
            'react/react-in-jsx-scope': 'warn',
            'import/no-unresolved': 'error',
        },
    },
    {
        ignores: ['build/**/*', 'node_modules/**/*', 'public/vendor/socket.io.js', 'src/icons/html.js'],
    },
];
