# Guia de Contribuição — SCTEC

## Pré-requisitos

- [GitHub CLI](https://cli.github.com/) instalado e autenticado (`gh auth login`)
- Node.js 18+ instalado
- Acesso de escrita ao repositório `prbretas/SCTEC-Gestao_de_Empresas`

---

## Fluxo de Desenvolvimento

```
1. Escolha uma Issue aberta no GitHub
2. bash scripts/start_issue.sh  → cria a branch correta
3. Implemente a alteração
4. Faça commits com Conventional Commits
5. npm test → todos os testes devem passar
6. npm run lint → zero erros
7. bash scripts/open_pr.sh → abre o PR
8. Aguarde review e merge
9. Delete a branch após o merge
```

---

## Convenção de Branches

```
feature/<issue-id>-descricao-curta
fix/<issue-id>-descricao-curta
docs/<issue-id>-descricao-curta
refactor/<issue-id>-descricao-curta
```

Exemplos:
```
feature/41-papeis-de-trabalho
fix/31-select-empresas-modulos
docs/45-atualiza-product-spec
```

---

## Convenção de Commits (Conventional Commits)

```
feat: implementa funcionalidade X
fix: corrige bug Y no modulo Z
docs: atualiza documentacao do produto
chore: ajusta configuracao do ESLint
test: adiciona testes para auth.js
refactor: reorganiza estrutura de pastas src/js
```

---

## Antes de Abrir o PR

### Testes
```bash
npm test          # todos os 145+ testes devem passar
npm run lint      # zero erros, zero warnings
```

### Validação Manual
- [ ] Testado no Chrome e/ou Firefox
- [ ] Testado em modo Light e Dark
- [ ] Testado em tela mobile
- [ ] Funcionalidades de login, cadastro, módulos afetados funcionando

---

## Estrutura do Código

O projeto usa **JavaScript vanilla sem framework**, com módulos organizados em:

| Pasta | Conteúdo |
|-------|---------|
| `src/js/core/` | Infraestrutura: auth, storage, config, theme, navbar, modules, inactivity |
| `src/js/pages/` | Scripts de telas: login, register, home, admin, dashboard, settings |
| `src/js/modules/` | Módulos funcionais: agenda, crm, financeiro, propostas |
| `src/js/shared/` | Utilitários compartilhados: api, utils, ui, forms, contatos, tarefas, main |

Cada arquivo JS declara um objeto literal (`const XController = {...}`) e o expõe via `window.X` para comunicação entre módulos.

---

## Boas Práticas

- Um PR por Issue
- Descreva claramente o que foi feito e como testar no corpo do PR
- Não commitar `node_modules/`, `coverage/` ou arquivos `.env`
- Remover `console.log` de debug antes de abrir o PR
- Manter cobertura de testes acima de 70% nas funções críticas

---

## Scripts Disponíveis

```bash
bash scripts/start_issue.sh   # Inicia trabalho em uma issue (cria branch)
bash scripts/open_pr.sh       # Abre PR vinculado à issue atual
bash scripts/create_issues.sh # Cria issues em lote (uso do mantenedor)
```
