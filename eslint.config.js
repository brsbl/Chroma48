import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
                // External libraries loaded via CDN
                JSConfetti: 'readonly',
            }
        },
        rules: {
            // Error prevention
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-undef': 'error',
            'no-console': 'off', // Allow console for game debugging

            // Code quality
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',

            // Style (non-breaking) - disabled due to mixed indentation in codebase
            'semi': ['warn', 'always'],
            'quotes': 'off', // Mixed quote styles
            'indent': 'off', // Mixed indentation
            'comma-dangle': 'off',
            'prefer-template': 'off', // Allow string concatenation

            // Best practices
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-return-assign': 'error',
            'no-sequences': 'error',
            'no-throw-literal': 'error',
            'no-useless-concat': 'off',

            // Security
            'no-script-url': 'error',
        }
    },
    {
        // Specific rules for source files
        files: ['src/**/*.js', 'app/**/*.js'],
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        }
    },
    {
        // Relaxed rules for test files
        files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
        rules: {
            'no-unused-vars': 'off',
            'no-undef': 'off', // Jest globals
        }
    },
    {
        // Ignore patterns
        ignores: [
            'node_modules/**',
            'dist/**',
            '*.min.js',
            'coverage/**',
            'app/bundle.js', // Generated/minified output
            'app/script.js', // Legacy bundled file
        ]
    }
];
