// eslint.config.js — Flat config (CommonJS, ESLint 9+)
// Os arquivos JS do projeto sao scripts de browser carregados via <script>,
// sem modulos. O pattern é: cada arquivo declara const X = {...} e depois
// usa variaveis declaradas em outros arquivos (acoplamento via global window).
// Por isso desabilitamos no-redeclare e no-undef é configurado com os nomes
// que vêm de outros modulos.

const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // ── APIs do browser ──────────────────────────────────────────────────
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        // ── Dependencias externas (CDN) ──────────────────────────────────────
        bootstrap: 'readonly',
        // ── Globals cross-file: variaveis definidas em outros modulos JS ─────
        // (declaradas aqui para que no-undef nao reclame quando um arquivo
        //  usa uma variavel definida em outro arquivo da aplicacao)
        Utils: 'readonly',
        EmpreendimentoStorage: 'readonly',
        ApiService: 'readonly',
        UIController: 'readonly',
        FormController: 'readonly',
        abrirModalCadastro: 'readonly',
        direcaoOrdenacao: 'writable',
        colunaAtual: 'writable',
      },
    },
    rules: {
      // Desabilita no-redeclare pois os modulos propositalmente declaram
      // const X = {...} no escopo global (padrao script sem bundler)
      'no-redeclare': 'off',

      // Erros de logica real
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',

      // Avisos de qualidade — nao bloqueiam o CI (--max-warnings controla)
      'no-unused-vars': ['warn', { vars: 'local', args: 'none' }],
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['error', 'warn', 'log'] }],
    },
  },
];
