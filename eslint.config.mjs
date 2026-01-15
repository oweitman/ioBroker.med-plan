// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        // specify files to exclude from linting here
        ignores: [
            '.dev-server/',
            '.vscode/',
            '*.test.js',
            'test/**/*.js',
            '*.config.mjs',
            'build',
            'src-admin/build',
            'dist',
            'admin/',
            '**/adapter-config.d.ts',
            'widgets/**/*.js',
        ],
    },
    {
        // you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
        // as this improves maintainability. jsdoc warnings will not block build process.
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "prettier/prettier": "warn",
            "no-debugger": "warn",
            'jsdoc/require-jsdoc': 'warn',
        },
    },
];