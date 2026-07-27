# Guia de Configuração do Ambiente de Desenvolvimento — SCTEC

## Pré-requisitos

- Node.js >= 18.x
- npm >= 9.x
- Git

## Instalação

```bash
git clone https://github.com/prbretas/SCTEC-Gestao_de_Empresas.git
cd SCTEC-Gestao_de_Empresas/src/SCTEC-Gestao_de_Empresas
npm install
```

## Executar a Aplicação

A aplicação é front-end puro — basta servir os arquivos estáticos.

**Opção 1 — Live Server (VS Code):**
Instale a extensão Live Server e clique em "Go Live" com `index.html` aberto.

**Opção 2 — http-server (npx):**
```bash
npx http-server . -p 5500
```

Acesse `http://localhost:5500/index.html`.

## Testes Automatizados

O projeto usa **Jest** com ambiente jsdom.

### Rodar todos os testes

```bash
npm test
```

### Rodar testes sem relatório de cobertura (mais rápido)

```bash
npx jest --no-coverage
```

### Rodar testes em modo watch (desenvolvimento)

```bash
npm run test:watch
```

### Ver relatório de cobertura

```bash
npm run test:coverage
```

O relatório HTML é gerado em `coverage/lcov-report/index.html`.

## Cobertura Mínima

| Módulo | Cobertura alvo |
|--------|---------------|
| `auth.js` | 70% funções |
| `storage.js` | 70% funções |
| `utils.js` | 80% funções |
| `api.js` | 70% funções |
| `agenda.js` | 70% storage |
| `crm.js` | 70% storage |
| `financeiro.js` | 70% storage + cálculo de saldo |
| `propostas.js` | 70% storage + cálculo de total |

## Hook de Pre-commit

O hook bloqueia commits quando os testes falham. Para ativá-lo:

```bash
# Windows (PowerShell)
Copy-Item .github/hooks/pre-commit .git/hooks/pre-commit

# Linux/Mac
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Após instalado, toda tentativa de `git commit` executa `npm test` automaticamente. O commit é bloqueado se algum teste falhar.

## Linting

```bash
npm run lint
```

O ESLint verifica todos os arquivos em `src/js/**/*.js`. Máximo de 0 warnings (`--max-warnings=0`).

## Estrutura de Testes

```
tests/
├── setup.js           # Carrega módulos JS no contexto global do Jest
├── helpers/
│   └── loadModule.js  # Helpers para carregar módulos com globals
├── auth.test.js       # Login, cadastro, sessão
├── storage.test.js    # CRUD e isolamento por usuário
├── utils.test.js      # Máscaras, validação CNPJ/CPF
├── api.test.js        # BrasilAPI e ViaCEP (mocks)
├── forms.test.js      # Lógica de formulário, QSA, tipoPessoa
├── config.test.js     # Configurações visuais
├── modules.test.js    # Catálogo de módulos
├── crm.test.js        # CRUD e funil de vendas
├── financeiro.test.js # CRUD e cálculo de saldo
├── agenda.test.js     # CRUD de compromissos
└── propostas.test.js  # CRUD e cálculo de total
```

## Fluxo de Desenvolvimento

```
1. git checkout master && git pull
2. git checkout -b feature/NNN-descricao
3. Implementar a feature
4. npm test              (garantir 0 falhas)
5. npm run lint          (garantir 0 warnings)
6. git add ... && git commit -m "feat: ..."
7. git push -u origin feature/NNN-descricao
8. gh pr create --base master
```

## Variáveis de Ambiente

Não há variáveis de ambiente necessárias. Toda configuração é feita via `localStorage` no browser.

## Dependências de Desenvolvimento

| Pacote | Versão | Uso |
|--------|--------|-----|
| `jest` | ^29.7.0 | Test runner |
| `jest-environment-jsdom` | ^29.7.0 | Ambiente browser simulado |
| `eslint` | ^9.0.0 | Linting |
| `@eslint/js` | ^9.0.0 | Config ESLint JS |

## CDNs usadas em produção (sem instalação local)

- Bootstrap 5.3 CSS/JS — `cdn.jsdelivr.net`
- SheetJS (exportação Excel) — `cdn.sheetjs.com`
