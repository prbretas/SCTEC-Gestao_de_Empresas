# 🚀 SCTEC v2.0 — Release "Orion"

**Data:** 27/07/2026  
**Versão:** 2.0.0  
**Codinome:** Orion  
**Autor:** Philippe Bretas + Kiro AI  

---

## 📋 Resumo Executivo

A release **Orion** transforma o SCTEC de um sistema de cadastros em uma **plataforma completa de gestão empresarial** com controle de acesso granular, fluxo de trabalho integrado entre módulos, aprovações gerenciais e dashboard personalizável.

---

## 🏗️ Novas Funcionalidades

### 🔐 Sistema de Papéis de Trabalho (PRs #50, #52, #54)
- CRUD completo de papéis por organização
- Código de convite diferenciado por papel (sufixo numérico)
- Controle de acesso a módulos por papel (checkboxes no admin)
- Isolamento de registros por usuário (cada um vê só os seus)
- Flag `podeVerTodos` para gerentes/supervisores
- Guard de acesso por URL (redireciona se não autorizado)

### 🔄 Integração entre Módulos (PR #56)
- **Proposta "enviada" → CRM**: cria/move oportunidade automaticamente
- **Proposta "aceita" → Financeiro**: gera entrada com itens detalhados (NFe)
- **CRM "Fechado" → Financeiro**: gera entrada com aprovação
- **Agenda + empresa → CRM**: cria prospecção automaticamente
- Referências bidirecionais evitam duplicatas

### ✅ Sistema de Aprovações Gerenciais (PR #56)
- Ações financeiras requerem aprovação para usuários sem `podeVerTodos`
- Painel de aprovações no admin com Aprovar/Rejeitar
- Aprovação automática para admin e gerentes
- Motivo registrado nas rejeições

### 📊 Dashboard Personalizável (PRs #64, #65, #66, #67)
- 16 widgets disponíveis (cards + gráficos Chart.js)
- Configuração individual por usuário
- Sistema de **modelos (presets)**: salvar, alternar, excluir
- Filtro de período com presets rápidos (7d, 30d, 90d, 1 ano)
- Widgets filtrados pelo acesso do papel
- Renderização 100% dinâmica

### 📄 NFe Detalhada + Anexos (PR #60)
- Proposta aceita gera registro financeiro com itens detalhados
- Sistema de anexos: upload JPG/PNG/PDF (Base64, max 5MB, max 5 por registro)
- Preview com thumbnails, download direto
- Disponível em Financeiro e Propostas

### 🎯 CRM: Fluxo Automatizado Completo (PRs #69, #70)
- Proposta obrigatória para etapas Negociação e Fechado
- Campo "Proposta Vinculada" no modal de oportunidade
- Valor da oportunidade sincroniza automaticamente com o total da proposta
- Fluxo: Prospecção → Contato → Proposta → Negociação → Fechado → Financeiro

### 📅 Mini-Dashboards por Módulo (PR #62)
- CRM: pipeline total + contagem por etapa
- Agenda: total + pendentes/concluídos/cancelados
- Propostas: total + enviadas/aceitas + valor aceitas
- Financeiro: já existia (entradas/saídas/saldo)

### ✓ Badge de Tarefas Vencidas (PR #61)
- Badge amarelo na tabela de cadastros (tarefas abertas por empresa)
- Indicador vermelho no navbar (total de tarefas vencidas do sistema)

---

## 🐛 Bugs Corrigidos

| PR | Descrição |
|---|---|
| #59 | Contatos e Tarefas não persistiam ao fechar modal |
| Fix direto | `roles.js` faltando em 8 HTMLs (módulos não filtravam) |
| #66 | Dashboard exibia widgets em branco (Storages ausentes) |

---

## 📈 Métricas

| Indicador | Valor |
|---|---|
| Issues entregues | 12 |
| Pull Requests merged | 18 |
| Testes automatizados | 220 |
| Lint warnings | 0 |
| Arquivos JS novos | 7 |
| Linhas de código adicionadas | ~3.500 |

---

## 📂 Novos Arquivos

```
src/js/core/
  roles.js              — Papéis de trabalho
  approvals.js          — Pendências de aprovação
  integrations.js       — Sincronização entre módulos
  dashboard-config.js   — Configuração de widgets por usuário
  dashboard-storages.js — Storages read-only para dashboard

src/js/shared/
  attachments.js        — Sistema de anexos (upload Base64)

tests/
  roles.test.js         — 36 testes
  modules.test.js       — 13 testes (reescrito)
  integrations.test.js  — 14 testes
```

---

## 🔮 Próximas Issues (Backlog)

| # | Título |
|---|--------|
| #39 | Relatórios Avançados consolidados |
| #27 | PWA instalável com suporte offline |
| #26 | Importação CSV com preview e mapeamento |
| #23 | Histórico de interações e ocorrências |

---

## 🏷️ Tag

```
git tag -a v2.0.0 -m "Release Orion — Gestão completa com papéis, integrações e dashboard"
```

---

*"A constelação de Orion guia navegadores. Esta release guia o gestor."*
