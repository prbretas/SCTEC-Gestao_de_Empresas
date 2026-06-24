import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        bootstrap: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        // Globals do projeto
        Utils: 'writable',
        EmpreendimentoStorage: 'writable',
        ApiService: 'writable',
        UIController: 'writable',
        FormController: 'writable',
        abrirModalCadastro: 'writable',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': ['warn', { allow: ['error', 'warn', 'log'] }],
      'eqeqeq': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
    },
    files: ['js/**/*.js'],
  },
];
