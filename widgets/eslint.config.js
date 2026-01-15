import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

export default [
    {
        ignores: [
            '**/.dev-server/**',
            '**/.vscode/**',
            '**/*.test.js',
            '**/test/**',
            '**/*.config.mjs',
            '**/build/**',
            '**/dist/**',
            '**/admin/**',
            '**/adapter-config.d.ts',
            'widgets/med-plan/build/**',
        ],
    },
    // Basis JS-Regeln
    js.configs.recommended,

    // Widget Code (vis)
    {
        files: ['**/*.js', '**/*.vis.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',

            globals: {
                // Browser globals (window, document, etc.)
                ...globals.browser,

                // jQuery global
                $: 'readonly',

                // vis globals
                vis: 'readonly',
                systemDictionary: 'writable',
            },
        },

        plugins: {
            import: importPlugin,
            jsdoc,
        },

        rules: {
            /* ---------------------------
             * echte Laufzeitfehler
             * --------------------------- */
            'no-undef': 'error',
            'no-redeclare': 'error',
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',

            /* ---------------------------
             * Imports (esbuild!)
             * --------------------------- */
            'import/no-unresolved': 'off', // esbuild löst auf
            'import/extensions': 'off',

            /* ---------------------------
             * Async / Modern JS
             * --------------------------- */
            'require-await': 'warn',
            'no-return-await': 'warn',

            /* ---------------------------
             * vis / pragmatisch
             * --------------------------- */
            'no-console': 'off',
            'no-alert': 'off',

            /* ---------------------------
             * Variablen
             * --------------------------- */
            'no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'none',
                    ignoreRestSiblings: true,
                },
            ],

            /* ---------------------------
             * JSDoc – gezielt
             * --------------------------- */
            'jsdoc/require-jsdoc': [
                'warn',
                {
                    contexts: ['Property[key.name=/^(create|_create|_render|_normalize|_get|_send)/]'],
                },
            ],
            'jsdoc/check-param-names': 'error',
            'jsdoc/check-tag-names': 'error',
            'jsdoc/require-param': 'warn',
            'jsdoc/require-returns': 'warn',
        },
    },
];
