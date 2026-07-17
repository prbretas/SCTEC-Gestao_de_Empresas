# 📋 Issues para o GitHub — SCTEC Gestão Empresarial

> Gerado em: 16/07/2026
> Repositório: prbretas/SCTEC-Gestao_de_Empresas

---

## ISSUE 1 — [BUG] Select de empresas não carrega nas telas de módulos

**Labels:** `bug`, `data-integrity`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 1

### Descrição

Nas telas de **Agenda**, **CRM**, **Propostas** e **Financeiro**, o campo `<select>` de "Empresa Relacionada" não exibe as empresas cadastradas. Sem conseguir vincular uma empresa, não é possível salvar registros nessas rotinas — em especial Propostas e CRM, onde o campo é obrigatório.

### Causa Raiz

O `EmpreendimentoStorage.buscarTodos()` depende da chave correta de storage da organização (`SCTEC_DATA_ORG_{orgId}`), que só é resolvida após `AuthService.requireAuth()`. Se o `<select>` for populado antes da sessão estar carregada, o retorno é vazio.

### Passos para Reproduzir

1. Cadastrar ao menos uma empresa em `cadastros.html`
2. Acessar `propostas.html` ou `crm.html`
3. Clicar em "+ Nova Proposta" / "+ Nova Oportunidade"
4. Observar que o campo "Empresa" está vazio
5. Tentar salvar — sistema bloqueia por campo obrigatório vazio

### Critérios de Aceitação

- [ ] O select de empresa exibe todas as empresas da organização ao abrir o modal
- [ ] A população do select ocorre **após** `DOMContentLoaded` e `requireAuth()`
- [ ] Campo empresa é **obrigatório** em Propostas e CRM
- [ ] Campo empresa é **opcional** em Agenda e Financeiro
- [ ] Testado nas 4 telas: `agenda.html`, `crm.html`, `propostas.html`, `financeiro.html`

---

## ISSUE 2 — [BUG] Financeiro: texto branco sobre fundo branco no modo Light

**Labels:** `bug`, `ux`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 1

### Descrição

Na tela de **Controle Financeiro** (`financeiro.html`), as linhas da tabela de transações exibem texto com cor branca sobre fundo branco no modo Light, tornando os dados completamente ilegíveis. No modo Dark o comportamento está correto.

### Causa Raiz Provável

Alguma regra CSS global ou herança do Bootstrap está forçando `color: white` nas células da tabela sem estar devidamente escopada para `.dark-mode`. A classe `text-white` dos cards de resumo pode estar vazando para os elementos filhos da tabela.

### Passos para Reproduzir

1. Acessar o sistema no **modo Light** (sem dark mode ativo)
2. Navegar para `financeiro.html`
3. Observar as linhas da tabela de transações — texto invisível

### Critérios de Aceitação

- [ ] Linhas do `tbody` da tabela exibem `color: #212529` no modo Light
- [ ] Cards de resumo (Entradas, Saídas, Saldo) mantêm `text-white` correto
- [ ] Modo Dark continua funcionando normalmente
- [ ] Testado alternando entre Light e Dark sem recarregar a página

---

## ISSUE 3 — [BUG] Menu (navbar) ausente ou não renderizado na tela de Cadastros

**Labels:** `bug`, `ux`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 1

### Descrição

A tela de Cadastros (`cadastros.html`) possui o placeholder `<div id="app-navbar"></div>` para receber o navbar dinâmico injetado por `navbar.js`, mas o menu não aparece corretamente para o usuário. Sem o navbar, o usuário perde acesso à navegação, ao botão de logout e à identidade visual.

### Passos para Reproduzir

1. Fazer login no sistema
2. Acessar `cadastros.html`
3. Observar que o navbar não é renderizado no topo da página

### Critérios de Aceitação

- [ ] Navbar é renderizado corretamente em `cadastros.html` após o login
- [ ] Exibe: logo/nome do sistema, links dos módulos ativos, nickname#ID, botão 🚪 Sair
- [ ] O guard de rota `requireAuth()` é executado antes da renderização do navbar
- [ ] Dark/Light mode é aplicado corretamente no navbar da tela de Cadastros

---

## ISSUE 4 — [ENHANCEMENT] Alterar senha nas Configurações Pessoais

**Labels:** `enhancement`, `security`
**Prioridade:** 🟡 Média
**Milestone:** Sprint 2

### Descrição

A tela de Configurações (`settings.html`) não possui seção de segurança pessoal. Atualmente, o único caminho para trocar a senha é pela tela de recuperação no login, o que é inconveniente e não intuitivo para usuários logados.

### O que Implementar

Adicionar uma seção **"🔐 Segurança da Conta"** em `settings.html` com formulário de alteração de senha.

**Campos:**
- Senha Atual
- Nova Senha (mínimo 4 caracteres)
- Confirmar Nova Senha

**Lógica:**
- Verificar o hash da senha atual antes de aceitar a alteração
- Criar método `alterarSenha(senhaAtual, novaSenha)` em `auth.js`
- Exibir feedback de sucesso/erro inline (sem abrir modal)

### Critérios de Aceitação

- [ ] Seção "🔐 Segurança da Conta" visível em `settings.html` para todos os usuários logados
- [ ] Formulário valida que a senha atual está correta antes de alterar
- [ ] Nova senha deve ter pelo menos 4 caracteres
- [ ] Confirmação de nova senha deve coincidir
- [ ] Exibe mensagem de sucesso inline após alterar com sucesso
- [ ] Exibe mensagem de erro inline se senha atual incorreta
- [ ] Senha armazenada como SHA-256 (mesmo padrão do cadastro)

---

## ISSUE 5 — [ENHANCEMENT] Navbar padronizado em todas as telas

**Labels:** `enhancement`, `ux`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 1

### Descrição

O navbar das telas de módulo (`agenda.html`, `crm.html`, `propostas.html`, `financeiro.html`, `admin.html`) está inconsistente em relação ao padrão definido em `cadastros.html` e `dashboard.html`. Algumas telas têm botões faltando, layout diferente ou não exibem a identidade do usuário logado.

### O que Implementar

- Aplicar o componente `navbar.js` padronizado em **todas** as telas de módulo
- O navbar deve conter: logo/nome do sistema, links dos módulos **ativos** (conforme `modules.js`), nickname#ID do usuário, botão 🚪 Sair
- **Remover** o botão de Configurações (⚙️) do navbar — deve aparecer apenas na Home
- O navbar deve respeitar o estado de dark/light mode da sessão

### Critérios de Aceitação

- [ ] Todas as telas de módulo usam o mesmo componente de navbar
- [ ] Navbar exibe apenas módulos ativos para a organização
- [ ] Botão ⚙️ Configurações removido do navbar (mantido apenas na Home)
- [ ] Identidade do usuário (nickname#ID) visível em todas as telas
- [ ] Botão de logout funcional em todas as telas
- [ ] Dark/Light mode sincronizado no navbar

---

## ISSUE 6 — [ENHANCEMENT] Sincronização do Dark Mode entre todas as telas

**Labels:** `enhancement`, `ux`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 1

### Descrição

Quando o usuário alterna entre modo Escuro e Claro em uma tela, as demais telas não refletem a mudança até serem recarregadas. O estado está salvo em `localStorage` (`SCTEC_THEME`), mas nem todas as telas aplicam o tema corretamente ao inicializar.

### O que Implementar

- Centralizar a lógica de dark mode em `js/theme.js` (já existe — verificar se todas as telas carregam este script)
- Todas as telas devem ler `SCTEC_THEME` do `localStorage` no `DOMContentLoaded` e aplicar a classe `dark-mode` no `<body>`
- O toggle em qualquer tela deve salvar o estado e aplicar imediatamente — nas outras telas aplica no próximo carregamento (comportamento padrão de `localStorage`)

### Critérios de Aceitação

- [ ] Todas as telas HTML carregam `js/theme.js`
- [ ] Tema é aplicado corretamente ao carregar qualquer tela
- [ ] Não há flash de conteúdo sem tema (FOUC) — script de tema aplicado antes do render
- [ ] Toggle de dark mode funciona em todas as telas
- [ ] Estado persiste entre sessões

---

## ISSUE 7 — [ENHANCEMENT] Suite de testes automatizados antes de cada commit

**Labels:** `enhancement`, `tests`
**Prioridade:** 🔴 Alta
**Milestone:** Sprint 2

### Descrição

Nenhum teste automatizado está sendo executado antes de subir código. Com o crescimento do sistema, bugs regressivos estão sendo introduzidos sem detecção. É necessário estruturar uma suite de testes mínima e garantir que seja executada antes de cada commit.

### Módulos a Cobrir

| Módulo | O que testar |
|--------|-------------|
| `auth.js` | Login, cadastro, validação de nickname, hash de senha, organização |
| `storage.js` | Isolamento por usuário/org, CRUD básico |
| `agenda.js` | CRUD de compromissos |
| `crm.js` | CRUD de oportunidades, mudança de etapa |
| `propostas.js` | Cálculo de total, geração de itens |
| `financeiro.js` | Cálculo de saldo, aplicação de filtros |
| `modules.js` | Visibilidade por role e estado de ativo |

### O que Implementar

- Criar/expandir testes em `tests/` para os módulos listados
- Usar o framework de testes já configurado no projeto (`package.json`)
- Configurar instrução clara: executar `npm test` antes de qualquer commit
- Considerar adicionar hook de pre-commit em `.github/hooks/pre-commit`

### Critérios de Aceitação

- [ ] Testes cobrem pelo menos os 7 módulos listados
- [ ] `npm test` executa toda a suite sem erros
- [ ] Cobertura mínima de 70% nas funções críticas (auth, storage, cálculos)
- [ ] Hook de pre-commit configurado para rodar os testes automaticamente
- [ ] Documentação de como rodar os testes em `docs/SETUP_DEV.md`

---

## ISSUE 8 — [ENHANCEMENT] Mini-dashboards por módulo

**Labels:** `enhancement`, `ux`
**Prioridade:** 🟡 Média
**Milestone:** Sprint 3

### Descrição

Cada tela de módulo deve exibir um painel de métricas resumidas no topo, permitindo ao usuário ter uma visão rápida do estado atual sem precisar ir ao Dashboard Geral.

### O que Implementar

| Tela | Mini-dashboard |
|------|---------------|
| `crm.html` | Total de oportunidades por etapa + valor total do pipeline |
| `agenda.html` | Contagem por status (Pendente / Concluído / Cancelado) |
| `propostas.html` | Contagem por status + valor total de propostas aceitas |
| `financeiro.html` | Já implementado ✅ (cards de resumo existentes) |

### Critérios de Aceitação

- [ ] Mini-dashboard renderizado no topo de `crm.html` com cards por etapa e valor do pipeline
- [ ] Mini-dashboard renderizado no topo de `agenda.html` com contagem por status
- [ ] Mini-dashboard renderizado no topo de `propostas.html` com contagem e valor total
- [ ] Dados atualizados automaticamente ao salvar/excluir registros
- [ ] Layout responsivo e compatível com dark/light mode

---

## ISSUE 9 — [ENHANCEMENT] Relatórios Avançados consolidados

**Labels:** `enhancement`, `data-management`
**Prioridade:** 🟡 Média
**Milestone:** Sprint 3

### Descrição

Não existe uma visão consolidada para geração de relatórios que abranja múltiplos módulos. O usuário precisa de uma página dedicada para gerar relatórios por período com exportação para impressão/PDF.

### O que Implementar

- Criar `relatorios.html` com seleção de período e módulos a incluir
- Seções do relatório:
  - Resumo Financeiro (entradas, saídas, saldo)
  - Pipeline CRM (oportunidades por etapa)
  - Compromissos por status
  - Propostas por status e valor total
- Exportação via `window.print()` com layout formatado (sem bibliotecas externas)
- Acesso controlado pelo sistema de módulos (`modules.js`)

### Critérios de Aceitação

- [ ] Página `relatorios.html` criada e acessível pelo navbar
- [ ] Seletor de período (mês/ano) com filtro aplicado a todos os módulos
- [ ] Pelo menos 4 seções de relatório implementadas
- [ ] Exportação PDF via `window.print()` com layout adequado (sem navbar, sem botões)
- [ ] Acesso controlado — módulo desativado oculta a opção no navbar

---

## ✅ ISSUE CONCLUÍDA — Renomear login.html para index.html

**Labels:** `bug`, `deployment`
**Status:** ✅ Done — 16/07/2026

### Descrição

O `index.html` havia sido removido, fazendo com que o GitHub Pages abrisse o `README.md` em vez do sistema. A solução foi renomear `login.html` para `index.html`, pois o GitHub Pages serve este arquivo como ponto de entrada por padrão.

### O que foi feito

- `login.html` renomeado para `index.html`
- Referências atualizadas em: `js/auth.js` (2x), `js/register.js`, `js/inactivity.js`, `register.html`

---

## 📊 Resumo das Issues

| # | ID | Título | Labels | Prioridade | Milestone |
|---|-----|--------|--------|-----------|-----------|
| 1 | BUG-A | Select de empresas não carrega nos módulos | bug, data-integrity | 🔴 Alta | Sprint 1 |
| 2 | BUG-B | Financeiro: texto branco no modo Light | bug, ux | 🔴 Alta | Sprint 1 |
| 3 | BUG-C | Navbar ausente na tela de Cadastros | bug, ux | 🔴 Alta | Sprint 1 |
| 4 | BUG-D | Alterar senha nas Configurações | enhancement, security | 🟡 Média | Sprint 2 |
| 5 | NAV-1 | Navbar padronizado em todas as telas | enhancement, ux | 🔴 Alta | Sprint 1 |
| 6 | NAV-2 | Dark mode sincronizado entre telas | enhancement, ux | 🔴 Alta | Sprint 1 |
| 7 | T-TESTES | Suite de testes automatizados | enhancement, tests | 🔴 Alta | Sprint 2 |
| 8 | DASH-2 | Mini-dashboards por módulo | enhancement, ux | 🟡 Média | Sprint 3 |
| 9 | 5c | Relatórios Avançados | enhancement, data-management | 🟡 Média | Sprint 3 |
