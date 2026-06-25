# 📋 Regras do Fluxo de Desenvolvimento — SCTEC

**Versão:** 1.0  
**Data:** Junho 2026  
**Autor:** Philippe Bretas

> Este documento define as regras obrigatórias para cada etapa do Kanban.  
> Toda issue deve passar sequencialmente por cada coluna antes de ser concluída.  
> **Nenhuma etapa pode ser pulada.**

---

## Visão Geral do Fluxo

```
BACKLOG → EM REFINAMENTO → REFINADO → COMPROMETIDO → EM DESENVOLVIMENTO → EM CODE REVIEW → EM TESTE DE ACEITAÇÃO → CONCLUÍDA
```

---

## 1. BACKLOG

### Definição
Issues criadas mas ainda não priorizadas para refinamento.

### Critérios de entrada
- Issue criada com título claro e label adequada
- Adicionada ao projeto Kanban

### Critérios de saída (para mover ao EM REFINAMENTO)
- [ ] Issue está no backlog priorizado (ordenada por importância)
- [ ] Issue tem labels corretas (enhancement / bug / refactor)
- [ ] Issue tem sprint definido (sprint-1 / sprint-2 / sprint-3)

---

## 2. EM REFINAMENTO

### Definição
A issue está sendo detalhada para ter clareza suficiente para desenvolvimento.

### Critérios de entrada
- Issue saiu do Backlog e foi selecionada para refinamento
- Assignee definido

### O que deve ser feito nesta etapa
- [ ] Detalhar todos os critérios de aceite (formato: dado, quando, então)
- [ ] Identificar dependências com outras issues ou módulos
- [ ] Definir o escopo mínimo (MVP) da feature
- [ ] Identificar riscos técnicos
- [ ] Estimar complexidade: P (< 1 dia) / M (1-3 dias) / G (3-5 dias) / XG (> 5 dias)
- [ ] Documentar decisões de design que devem ser seguidas
- [ ] Listar os casos de teste esperados

### Critérios de saída (para mover a REFINADO)
- [ ] Todos os critérios de aceite documentados na issue
- [ ] Escopo claro e sem ambiguidades
- [ ] Estimativa de complexidade definida
- [ ] Casos de teste listados
- [ ] Time de desenvolvimento consegue iniciar sem dúvidas

---

## 3. REFINADO

### Definição
Issue completamente detalhada, pronta para ser comprometida em um sprint.

### Critérios de entrada
- Todos os critérios de saída do EM REFINAMENTO atendidos

### O que deve ser feito nesta etapa
- [ ] Revisar os critérios de aceite com o responsável
- [ ] Confirmar que o design segue o padrão definido em `docs/ROADMAP_SUGESTOES.md` (Seção 1)
- [ ] Confirmar que os testes serão escritos antes do código (TDD quando possível)

### Critérios de saída (para mover a COMPROMETIDO)
- [ ] Issue aprovada pelo responsável do produto (prbretas)
- [ ] Sem dúvidas abertas
- [ ] Design pattern confirmado

---

## 4. COMPROMETIDO

### Definição
Issue aceita no sprint atual. O desenvolvedor se comprometeu a entregá-la.

### Critérios de entrada
- Issue saiu de REFINADO
- Sprint definido e em andamento

### O que deve ser feito nesta etapa
- [ ] Branch criada com nomenclatura correta (ver padrão abaixo)
- [ ] Checklist de desenvolvimento preparado

### Nomenclatura de branches
```
feature/feat-XX-nome-curto    → novas funcionalidades
fix/bug-XX-nome-curto         → correção de bugs
refactor/ref-XX-nome-curto    → refatorações
docs/nome-curto               → documentação
```

### Critérios de saída (para mover a EM DESENVOLVIMENTO)
- [ ] Branch criada e publicada no repositório remoto
- [ ] Issue atribuída ao desenvolvedor responsável

---

## 5. EM DESENVOLVIMENTO

### Critérios de entrada
- Branch criada
- Desenvolvimento iniciado

### Regras obrigatórias durante o desenvolvimento
- [ ] Seguir o padrão de design de `docs/ROADMAP_SUGESTOES.md` (Seção 1)
- [ ] Escrever testes unitários para toda lógica nova (`tests/*.test.js`)
- [ ] Executar `npm test` localmente antes de qualquer commit — **commit bloqueado se testes falharem** (pre-commit hook)
- [ ] Executar `npm run lint` — zero erros e zero warnings
- [ ] Commits com mensagens no padrão Conventional Commits:
  ```
  feat: descrição (closes #N)
  fix: descrição (closes #N)
  refactor: descrição
  docs: descrição
  test: descrição
  ```
- [ ] Não fazer push direto na `master`
- [ ] Dark Mode testado em cada componente novo

### Critérios de saída (para mover a EM CODE REVIEW)
- [ ] Todos os critérios de aceite da issue implementados
- [ ] `npm test` — todos os testes passando (incluindo os novos)
- [ ] `npm run lint` — 0 erros, 0 warnings
- [ ] PR aberto referenciando a issue (`closes #N`)
- [ ] PR template preenchido com checklist completo
- [ ] CI verde (GitHub Actions)

---

## 6. EM CODE REVIEW

### Critérios de entrada
- PR aberto com CI verde
- Checklist do PR template preenchido

### Regras para o Reviewer
- [ ] Verificar se o código segue o padrão de design do projeto
- [ ] Verificar se os testes cobrem os novos comportamentos
- [ ] Testar localmente: `npm test` e abrir no navegador
- [ ] Verificar Light Mode e Dark Mode
- [ ] Verificar responsividade (mobile)
- [ ] Verificar que nenhuma regressão foi introduzida
- [ ] Aprovar ou solicitar alterações com comentários claros

### Critérios de saída (para mover a EM TESTE DE ACEITAÇÃO)
- [ ] PR aprovado por pelo menos 1 reviewer
- [ ] Todos os comentários de review resolvidos
- [ ] CI continua verde após eventuais ajustes

---

## 7. EM TESTE DE ACEITAÇÃO

### Definição
Última validação antes do merge. Testes automatizados + validação manual dos critérios de aceite.

### O que deve ser executado nesta etapa

#### Testes automatizados
```bash
# Executar suite completa
npm test

# Resultado esperado: todos os testes passando
# Nenhum teste pode ser ignorado ou comentado
```

#### Validação manual dos critérios de aceite
- [ ] Verificar **cada critério de aceite** da issue — um a um
- [ ] Testar fluxo completo do usuário (criar, editar, visualizar, excluir)
- [ ] Testar em Chrome e Firefox
- [ ] Testar em modo Light e Dark
- [ ] Testar em resolução mobile (375px) e desktop (1280px+)
- [ ] Verificar que o backup/restore ainda funciona após a mudança
- [ ] Verificar que a exportação CSV ainda funciona
- [ ] Sem erros no console do navegador (F12)

#### Checklist de segurança e qualidade
- [ ] Nenhum dado pessoal hardcoded no código
- [ ] Nenhum `console.log` de debug deixado
- [ ] Nenhum comentário TODO sem issue vinculada

### Critérios de saída (para mover a CONCLUÍDA e fazer o merge)
- [ ] **100% dos critérios de aceite validados**
- [ ] `npm test` — todos os testes passando
- [ ] Zero erros no console do navegador
- [ ] Aprovação final do responsável do produto (prbretas)
- [ ] Merge na `master` realizado pelo responsável
- [ ] Issue fechada automaticamente pelo commit de merge

---

## 8. CONCLUÍDA

### Critérios de entrada
- Merge na `master` realizado
- Issue fechada
- CI verde na `master`

### O que deve ser feito após concluir
- [ ] Branch deletada (após merge)
- [ ] Verificar se o PR fechou a issue automaticamente
- [ ] Atualizar `docs/ISSUES.md` se necessário
- [ ] Celebrar 🎉

---

## Regras Gerais do Projeto

### Proteção da branch master
- Push direto na `master` é **proibido**
- Todo código entra via PR com pelo menos 1 aprovação
- CI (testes + lint) deve estar verde para o merge ser liberado

### Pre-commit hook (obrigatório)
Instalar uma vez na máquina:
```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
```
Bloqueia commits se `npm test` falhar.

### Padrão de commits
```
feat: adiciona modulo de contatos (closes #20)
fix: corrige consulta CNPJ em modo readonly (closes #BUG-X)
refactor: remove codigo morto em forms.js
test: adiciona testes para validarCNPJ
docs: atualiza roadmap com sprint 2
```

### Referências
- `docs/ROADMAP_SUGESTOES.md` — Regras de design (Seção 1)
- `docs/TECHNICAL_DOCS.md` — Arquitetura técnica
- `docs/PRODUCT_SPEC.md` — Especificação do produto
- `.github/pull_request_template.md` — Template de PR
- `.github/workflows/ci.yml` — Pipeline de CI
