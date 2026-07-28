# 📊 Estudo de Novas Rotinas e Integrações — Roadmap v3.0

**Data:** 28/07/2026  
**Versão:** Proposta para v3.0  
**Autor:** Philippe Bretas + Kiro AI  

---

## 1. Visão Geral

O SCTEC v2.0 "Orion" consolidou uma plataforma de gestão com 8 módulos integrados. Este estudo propõe novas rotinas e melhorias para a v3.0, focando em **completude operacional** e **automação de processos**.

---

## 2. Módulos Atuais e Lacunas

| Módulo | Status | Lacuna Identificada |
|--------|--------|---------------------|
| Cadastros | ✅ Completo | Falta categorização por porte (MEI, ME, EPP, etc.) |
| CRM/Funil | ✅ Completo | Falta métricas de tempo médio por etapa |
| Propostas | ✅ Completo | Falta templates reutilizáveis |
| Financeiro | ✅ Completo | Falta fluxo de caixa projetado |
| Agenda | ✅ Completo | Falta integração com Google Calendar |
| Dashboard | ✅ Completo | Falta exportação de gráficos como imagem |
| Relatórios | ✅ Completo | Falta relatórios por período comparativo (mês vs mês) |
| Admin/Papéis | ✅ Completo | Falta log de atividades do sistema |

---

## 3. Novos Módulos Propostos

### 3.1 📦 Produtos e Estoque (Issue #87)

**Descrição:** Cadastro de produtos/serviços com controle de estoque.

**Campos:** nome, SKU, descrição, unidade, preço de venda, preço de custo, quantidade em estoque, estoque mínimo, categoria, fornecedor (empresa vinculada), status ativo/inativo.

**Integrações:**
- **Propostas** → ao criar item da proposta, poder selecionar do catálogo de produtos (preenche descrição e valor automaticamente)
- **Financeiro** → entrada de mercadoria gera registro de saída financeira; venda gera entrada
- **Dashboard** → widget de "Produtos abaixo do estoque mínimo"
- **Relatório** → seção de movimentação de estoque por período

**Complexidade:** Média (2-3 dias)

---

### 3.2 📋 Ordens de Serviço (OS)

**Descrição:** Módulo para gerenciar ordens de serviço vinculadas a empresas, com status de execução.

**Campos:** número, empresa, descrição do serviço, responsável técnico, data abertura, data prevista, data conclusão, status (aberta/em execução/concluída/cancelada), prioridade, observações.

**Integrações:**
- **CRM** → oportunidade "fechada" pode gerar OS automaticamente
- **Propostas** → proposta aceita pode gerar OS com os itens como escopo
- **Financeiro** → OS concluída gera fatura (entrada)
- **Agenda** → OS com data prevista cria compromisso automático

**Complexidade:** Média (3-4 dias)

---

### 3.3 📊 Metas e KPIs por Papel

**Descrição:** Definição de metas mensais por papel de trabalho com acompanhamento visual.

**Exemplos:**
- Vendedor: 10 oportunidades/mês, R$ 50.000 em pipeline
- Financeiro: manter saldo positivo, 100% faturas pagas em dia
- Gerente: taxa de conversão > 30%, tempo médio de fechamento < 15 dias

**Integrações:**
- **Dashboard** → widget de progresso de metas (barra de progresso)
- **Relatórios** → seção de cumprimento de metas por período
- **Admin** → configuração de metas por papel

**Complexidade:** Média (2-3 dias)

---

### 3.4 💬 Notificações Internas

**Descrição:** Sistema de notificações dentro do app para alertar sobre eventos importantes.

**Gatilhos:**
- Tarefa vencida → notifica responsável
- Aprovação pendente → notifica gerente
- Proposta aceita → notifica quem criou
- Oportunidade fechada → notifica equipe
- Compromisso em 1h → notifica participante

**UI:** Badge no navbar + dropdown com lista de notificações

**Complexidade:** Média (2-3 dias)

---

### 3.5 📁 Documentos e Contratos

**Descrição:** Repositório de documentos vinculados a empresas (contratos, acordos, certidões).

**Campos:** título, tipo (contrato/certidão/acordo/outro), empresa vinculada, data emissão, data vencimento, arquivo (Base64), status (vigente/vencido/cancelado).

**Integrações:**
- **Cadastros** → aba "Documentos" no modal da empresa
- **Financeiro** → contrato vigente como referência em transações
- **Dashboard** → widget "Contratos vencendo em 30 dias"

**Complexidade:** Baixa (1-2 dias, similar a Anexos)

---

## 4. Melhorias nos Módulos Existentes

| # | Melhoria | Módulo | Complexidade |
|---|----------|--------|---|
| #88 | Seleção de campos no CSV | Relatórios | Baixa |
| #89 | Grid/Linhas + filtro período | Propostas | Baixa |
| #90 | Filtro período + arquivar | CRM | Baixa |
| #79 | Links clicáveis entre módulos | Todos | Média |
| — | Templates de propostas reutilizáveis | Propostas | Média |
| — | Fluxo de caixa projetado | Financeiro | Média |
| — | Relatório comparativo (mês vs mês) | Relatórios | Baixa |
| — | Log de atividades do sistema | Admin | Média |

---

## 5. Mapa de Integrações Proposto (v3.0)

```
                    ┌──────────────┐
                    │   PRODUTOS   │
                    │   & ESTOQUE  │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌─────▼──────┐  ┌──▼──────────┐
    │ PROPOSTAS  │  │ FINANCEIRO │  │  RELATÓRIOS  │
    │            ├──►            │  │              │
    └─────┬──────┘  └─────┬──────┘  └──────────────┘
          │               │
    ┌─────▼──────┐  ┌─────▼──────┐
    │    CRM     ├──►   AGENDA   │
    │   FUNIL    │  │            │
    └─────┬──────┘  └────────────┘
          │
    ┌─────▼──────┐
    │  ORDENS    │
    │ DE SERVIÇO │
    └────────────┘
```

---

## 6. Priorização Sugerida (Sprint 3)

| Prioridade | Item | Justificativa |
|---|---|---|
| 🔴 Alta | #91 Troca de senha todos | Bug de usabilidade |
| 🔴 Alta | #90 CRM filtro + arquivar | UX crítica (tela polui) |
| 🔴 Alta | #89 Propostas filtro + grid | UX crítica |
| 🟡 Média | #87 Produtos e Estoque | Completa fluxo comercial |
| 🟡 Média | #88 Relatórios seleção | UX de exportação |
| 🟡 Média | #79 Links bidirecionais | Navegação fluida |
| 🟢 Baixa | OS (nova) | Após produtos estar pronto |
| 🟢 Baixa | Metas/KPIs | Após dashboards estáveis |
| 🟢 Baixa | Notificações | Após fluxos consolidados |
| ⚪ Futuro | #27 PWA | Quando backend existir |
| ⚪ Futuro | #26 Import CSV preview | Nice-to-have |

---

## 7. Conclusão

A v3.0 deve focar em:
1. **Corrigir UX** (filtros, arquivamento, senha) — 3 issues rápidas
2. **Módulo de Produtos** — completa o ciclo comercial (produto → proposta → venda → financeiro)
3. **Ordens de Serviço** — formaliza a entrega após fechamento do negócio
4. **Metas** — dá visibilidade de performance por papel

O roadmap completo levaria ~3-4 sprints para implementar tudo.

---

*"Um sistema de gestão completo não é o que tem mais módulos, é o que tem os módulos certos conectados da forma certa."*
