# Instruções de Contexto — SCTEC Gestão Empresarial

## Sobre o Projeto

Sistema web de gestão empresarial desenvolvido em JavaScript vanilla (sem framework), hospedado no GitHub Pages. Usa `localStorage` para persistência de dados com isolamento por organização.

**Repositório:** `prbretas/SCTEC-Gestao_de_Empresas`
**URL de produção:** `https://prbretas.github.io/SCTEC-Gestao_de_Empresas/`

---

## Stack Técnica

- **Frontend:** HTML5, CSS3, JavaScript ES2022 (sem framework, sem bundler)
- **Estilização:** Bootstrap 5.3 (CDN) + `src/css/styles.css`
- **Testes:** Jest 29 + jsdom
- **Lint:** ESLint 9 (flat config)
- **CI/CD:** GitHub Actions + GitHub Pages
- **APIs:** BrasilAPI (CNPJ), ViaCEP (CEP)

---

## Estrutura de Pastas

```
src/js/
  core/     → auth.js, config.js, storage.js, theme.js, navbar.js, modules.js, inactivity.js
  pages/    → login.js, register.js, home.js, admin.js, dashboard.js, settings.js
  modules/  → agenda.js, crm.js, financeiro.js, propostas.js
  shared/   → api.js, utils.js, ui.js, forms.js, contatos.js, tarefas.js, main.js
src/css/
  styles.css, home.css
tests/      → *.test.js (Jest)
*.html      → na raiz (GitHub Pages)
```

---

## Padrões de Código

### Módulos JavaScript
- Cada arquivo declara um objeto literal: `const XController = { ... }`
- Expõe no global via `window.XController = XController` ao final
- Sem `import/export` — carregamento via `<script src="...">` no HTML
- `sourceType: 'script'` no ESLint (não é módulo ES)

### Storage
- `EmpreendimentoStorage` — chave: `SCTEC_DATA_ORG_{orgId}` (dados compartilhados por org)
- Módulos usam chaves próprias: `SCTEC_AGENDA_*`, `SCTEC_CRM_*`, `SCTEC_FINANCEIRO_*`, `SCTEC_PROPOSTAS_*`
- Sessão em `sessionStorage` com chave `SCTEC_SESSION`

### Autenticação
- `AuthService.requireAuth()` em todo `DOMContentLoaded` das telas protegidas
- Roles: `admin` e `user` (em evolução para papéis configuráveis)
- Senha armazenada como SHA-256 (Web Crypto API)

### Convenções de Nomenclatura
- Variáveis/funções: `camelCase`
- Objetos de serviço: `PascalCase` + sufixo `Controller`, `Storage` ou `Service`
- IDs HTML: kebab-case (`btn-salvar`, `form-proposta`)
- Chaves de localStorage: `SCTEC_MODULO_IDENTIFICADOR` (SCREAMING_SNAKE_CASE)

---

## Issues Abertas (Contexto de Desenvolvimento)

| # | Título | Prioridade |
|---|--------|-----------|
| #33 | Navbar ausente na tela de Cadastros | Alta |
| #34 | Alterar senha nas Configurações | Média |
| #35 | Navbar padronizado em todas as telas | Alta |
| #36 | Dark mode sincronizado entre telas | Alta |
| #37 | Suite de testes automatizados | Alta |
| #38 | Mini-dashboards por módulo | Média |
| #39 | Relatórios Avançados | Média |
| #41 | Papéis de Trabalho por Organização | Média |
| #42 | Auditoria de Registros | Média |
| #43 | Modo Visualização nos Registros | Média |
| #44 | Dashboard V2 | Média |

---

## Regras Importantes

1. **Não usar frameworks JS** (React, Vue, Angular) — o projeto é vanilla JS intencional
2. **Não usar bundlers** (Webpack, Vite) — scripts carregados diretamente via `<script>`
3. **HTMLs sempre na raiz** — necessário para o GitHub Pages funcionar corretamente
4. **Sempre executar `npm test` e `npm run lint`** antes de commitar
5. **Branches no padrão:** `feature/<id>-descricao`, `fix/<id>-descricao`
6. **Commits no padrão Conventional Commits**
