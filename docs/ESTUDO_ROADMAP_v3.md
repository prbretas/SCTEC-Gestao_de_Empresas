# 📊 Estudo Detalhado — Roadmap SCTEC v3.0 "Atlas"

**Data:** 28/07/2026  
**Versão Proposta:** 3.0.0  
**Codinome:** Atlas  
**Autor:** Philippe Bretas + Kiro AI  

---

## 1. Contexto e Objetivos

O SCTEC v2.0 "Orion" entregou uma plataforma funcional com 8 módulos integrados. A v3.0 "Atlas" visa transformar o sistema de uma **ferramenta operacional** em uma **plataforma de gestão empresarial completa**, com foco em:

1. **Ciclo comercial completo** — do produto à entrega e pós-venda
2. **Automação de processos** — menos entrada manual, mais regras de negócio
3. **Visibilidade gerencial** — metas, indicadores e alertas proativos
4. **Experiência do usuário** — filtros, busca avançada e navegação fluida

---

## 2. Arquitetura Atual (v2.0)

```
┌─────────────────────────────────────────────────────────────┐
│                    SCTEC v2.0 "Orion"                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Cadastros │  │   CRM    │  │Propostas │  │Financeiro│   │
│  │(Empresas)│  │  (Funil) │  │(Orçamento)│  │(Caixa)   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐   │
│  │  Agenda  │  │Dashboard │  │Relatórios│  │  Admin   │   │
│  │(Comprom.)│  │(Widgets) │  │  (CSV)   │  │ (Papéis) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  Infraestrutura: localStorage, Auth, Roles, Approvals       │
└─────────────────────────────────────────────────────────────┘
```

**Limitações atuais:**
- Não há catálogo de produtos (itens de proposta são digitados manualmente)
- Não há formalização de entrega (pós-venda)
- Não há metas ou indicadores de performance individual
- Não há sistema de alertas/notificações
- Não há controle de documentos e contratos
- Não há kanban de tarefas internas da equipe (separado de tarefas por empresa)
- Não há integração com calendário externo

---

## 3. Novos Módulos Propostos (Detalhados)

---

### 3.1 📦 Módulo de Produtos e Estoque

**Objetivo:** Catálogo de produtos e serviços com controle de estoque, servindo como base para propostas e financeiro.

#### Campos do Cadastro de Produto:
| Campo | Tipo | Obrigatório |
|-------|------|---|
| Nome | text | ✅ |
| SKU / Código | text | ✅ |
| Descrição | textarea | ❌ |
| Categoria | select (Produto/Serviço/Insumo) | ✅ |
| Unidade | select (un/kg/hr/m²/pct) | ✅ |
| Preço de Venda | number | ✅ |
| Preço de Custo | number | ❌ |
| Margem (%) | calculado auto | — |
| Qtd em Estoque | number | ❌ (0 para serviços) |
| Estoque Mínimo | number | ❌ |
| Fornecedor | select (empresas) | ❌ |
| Status | select (Ativo/Inativo/Descontinuado) | ✅ |
| Imagem | Base64 (thumbnail) | ❌ |

#### Funcionalidades:
- CRUD completo com busca e filtros
- Alerta visual quando estoque < mínimo
- Movimentação de estoque (entrada/saída com motivo)
- Histórico de movimentações
- Badge na Home: "⚠️ X produtos abaixo do mínimo"

#### Integrações:
| Módulo Destino | Integração |
|---|---|
| **Propostas** | Ao criar item, select busca do catálogo (preenche descrição, valor, SKU) |
| **Financeiro** | Compra de produto gera saída financeira + entrada de estoque |
| **Financeiro** | Venda (proposta aceita) pode dar baixa no estoque automaticamente |
| **Dashboard** | Widget: "Produtos abaixo do estoque mínimo" |
| **Relatórios** | Seção: "Movimentação de Estoque por Período" |

#### Storage: `SCTEC_PRODUTOS_{orgId}`
#### Estimativa: 3-4 dias

---

### 3.2 📋 Ordens de Serviço (OS)

**Objetivo:** Formalizar a entrega de serviços após fechamento do negócio. Rastreia execução e conclusão.

#### Campos:
| Campo | Tipo | Obrigatório |
|-------|------|---|
| Número | auto-incremento | ✅ |
| Empresa (cliente) | select | ✅ |
| Proposta vinculada | select | ❌ |
| Oportunidade CRM | select | ❌ |
| Descrição do Serviço | textarea | ✅ |
| Itens/Escopo | array (herdado da proposta) | ❌ |
| Responsável Técnico | text | ✅ |
| Data Abertura | date (auto hoje) | ✅ |
| Data Prevista Conclusão | date | ✅ |
| Data Conclusão Real | date | ❌ |
| Status | select | ✅ |
| Prioridade | select (Alta/Média/Baixa) | ✅ |
| Observações | textarea | ❌ |
| Anexos | array (fotos, documentos) | ❌ |

#### Status possíveis:
`Aberta` → `Em Execução` → `Aguardando Aprovação` → `Concluída` / `Cancelada`

#### Funcionalidades:
- Kanban visual por status (similar ao CRM)
- Ao concluir OS → gera fatura no Financeiro (entrada)
- Ao concluir OS → notifica cliente (futuro: e-mail)
- Timeline de atualizações de status
- Filtro por período, responsável, empresa
- Impressão de OS (window.print)

#### Integrações:
| Módulo Origem | Gatilho | Ação |
|---|---|---|
| CRM "Fechado" | Após aprovação | Sugere criar OS com dados da oportunidade |
| Proposta "Aceita" | Automático | Pode gerar OS com itens da proposta como escopo |
| OS "Concluída" | Manual/Auto | Gera entrada no Financeiro |
| Agenda | Data prevista | Cria compromisso de entrega automático |

#### Storage: `SCTEC_OS_{orgId}`
#### Estimativa: 4-5 dias

---

### 3.3 📊 Metas e KPIs por Papel

**Objetivo:** Definir metas mensuráveis por papel de trabalho e acompanhar progresso em tempo real.

#### Modelo de Meta:
```json
{
  "id": "meta_001",
  "papelId": "12345",
  "periodo": "2026-08",
  "indicador": "crm_oportunidades_criadas",
  "meta": 10,
  "descricao": "Criar 10 novas oportunidades no mês",
  "tipo": "quantidade"
}
```

#### Indicadores disponíveis:
| Indicador | Módulo | Cálculo |
|---|---|---|
| `crm_oportunidades_criadas` | CRM | count(criadas no período) |
| `crm_valor_fechado` | CRM | sum(valor onde etapa=fechado) |
| `crm_taxa_conversao` | CRM | fechado/total * 100 |
| `propostas_enviadas` | Propostas | count(status=enviada) |
| `propostas_valor_aceito` | Propostas | sum(total onde status=aceita) |
| `financeiro_entradas` | Financeiro | sum(entradas no período) |
| `financeiro_saldo_positivo` | Financeiro | saldo >= 0 (boolean) |
| `agenda_conclusao` | Agenda | concluidos/total * 100 |
| `tarefas_vencidas_zero` | Tarefas | vencidas == 0 (boolean) |

#### Funcionalidades:
- Admin configura metas por papel por mês
- Dashboard mostra barra de progresso por meta
- Relatório de cumprimento de metas por período
- Badge: "🎯 3/5 metas atingidas"

#### Storage: `SCTEC_METAS_{orgId}`
#### Estimativa: 3-4 dias

---

### 3.4 💬 Sistema de Notificações Internas

**Objetivo:** Alertar usuários sobre eventos importantes sem precisar ficar verificando cada módulo.

#### Tipos de Notificação:
| Gatilho | Destinatário | Mensagem |
|---|---|---|
| Tarefa vencida | Responsável | "⚠️ Tarefa 'X' venceu em DD/MM" |
| Aprovação pendente | Gerente/Admin | "📋 Nova aprovação: Proposta 'X' aceita" |
| Proposta aceita | Criador | "✅ Proposta 'X' foi aceita!" |
| Oportunidade fechada | Equipe de vendas | "🎯 Oportunidade 'X' fechada por Y" |
| Compromisso em 1h | Participante | "📅 Compromisso 'X' em 1 hora" |
| Estoque abaixo do mínimo | Admin | "⚠️ Produto 'X' abaixo do estoque mínimo" |
| OS vencendo hoje | Responsável | "📋 OS #001 prevista para hoje" |
| Meta atingida | Usuário | "🎯 Parabéns! Meta 'X' atingida!" |

#### UI:
- Badge numérico no navbar (🔔 3)
- Dropdown com lista das últimas 20 notificações
- Marcar como lida / Marcar todas como lidas
- Persistência: `SCTEC_NOTIFICATIONS_{userId}`

#### Estimativa: 2-3 dias

---

### 3.5 📁 Documentos e Contratos

**Objetivo:** Repositório de documentos vinculados a empresas com controle de vencimento.

#### Campos:
| Campo | Tipo |
|-------|------|
| Título | text |
| Tipo | select (Contrato/Certidão/Acordo/Alvará/Licença/Outro) |
| Empresa vinculada | select |
| Data Emissão | date |
| Data Vencimento | date |
| Valor (se aplicável) | number |
| Arquivo | Base64 (PDF/imagem) |
| Status | auto (Vigente/Vencendo/Vencido) |
| Observações | textarea |

#### Funcionalidades:
- Aba "Documentos" no modal da empresa (similar a Contatos/Tarefas/Histórico)
- Destaque visual para documentos vencendo em 30 dias
- Alerta de vencimento no Dashboard
- Download direto do arquivo
- Filtro por tipo e status

#### Integrações:
- **Cadastros** → nova aba no modal
- **Dashboard** → widget "Documentos vencendo em 30 dias"
- **Notificações** → alerta quando documento vence
- **Financeiro** → contrato como referência em transações recorrentes

#### Storage: persistido dentro do objeto da empresa (`emp.documentos`)
#### Estimativa: 2-3 dias

---

### 3.6 📌 Kanban de Tarefas da Equipe

**Objetivo:** Board de tarefas internas da equipe (não vinculadas a uma empresa específica). Gestão de atividades internas, projetos, demandas.

#### Colunas:
`Backlog` → `A Fazer` → `Em Andamento` → `Em Revisão` → `Concluído`

#### Campos:
| Campo | Tipo |
|-------|------|
| Título | text |
| Descrição | textarea |
| Responsável | select (usuários da org) |
| Prioridade | Alta/Média/Baixa |
| Data limite | date |
| Tags/Labels | multi-select |
| Checklist | array de itens |

#### Diferencial vs Tarefas atuais:
- Tarefas atuais são **vinculadas a uma empresa** (follow-up comercial)
- Este kanban é para **tarefas internas da equipe** (projetos, demandas, melhorias)

#### Integrações:
- **Notificações** → tarefa atribuída notifica responsável
- **Dashboard** → widget "Minhas tarefas pendentes"
- **Metas** → pode ter meta de "zero tarefas vencidas"

#### Storage: `SCTEC_KANBAN_{orgId}`
#### Estimativa: 3-4 dias

---

### 3.7 📧 Templates de E-mail e Propostas

**Objetivo:** Criar e reutilizar templates para envio de propostas e comunicações padronizadas.

#### Funcionalidades:
- CRUD de templates com variáveis dinâmicas (`{{empresa}}`, `{{valor}}`, `{{data}}`)
- Ao criar proposta: selecionar template → preenche estrutura de itens/observações
- Preview do template antes de usar
- Categorias: Proposta Comercial, Orçamento, Carta de Apresentação, Follow-up

#### Campos:
| Campo | Tipo |
|-------|------|
| Nome do template | text |
| Categoria | select |
| Conteúdo | textarea (com variáveis) |
| Itens padrão | array (descrição, qtd, valor) |
| Observações padrão | textarea |

#### Storage: `SCTEC_TEMPLATES_{orgId}`
#### Estimativa: 2-3 dias

---

### 3.8 📈 Funil de Pós-Venda / Customer Success

**Objetivo:** Acompanhar o cliente após o fechamento, garantir satisfação e identificar oportunidades de upsell.

#### Etapas:
`Onboarding` → `Implantação` → `Acompanhamento` → `Renovação` → `Expansão`

#### Campos:
| Campo | Tipo |
|-------|------|
| Empresa | select |
| OS vinculada | select |
| Responsável CS | text |
| NPS (0-10) | number |
| Status | etapa do funil |
| Próximo contato | date |
| Observações | textarea |

#### Integrações:
- **CRM** → oportunidade fechada pode gerar registro de pós-venda automaticamente
- **OS** → conclusão da OS move o cliente para "Acompanhamento"
- **Agenda** → próximo contato gera compromisso
- **Financeiro** → renovação gera nova entrada

#### Storage: `SCTEC_CS_{orgId}`
#### Estimativa: 3-4 dias

---

## 4. Melhorias nos Módulos Existentes (Detalhadas)

### 4.1 CRM — Filtro por Período + Arquivamento (#90)
- Input de data início/fim no topo
- Oportunidades Fechadas/Perdidas após 7 dias → movidas automaticamente para "Arquivados"
- Seção "Arquivados" no final da página com tabela simples
- Botão "Desarquivar" para voltar ao kanban
- **Estimativa: 1 dia**

### 4.2 Propostas — Grid/Linhas + Filtro (#89)
- Toggle: Cards (atual) ↔ Tabela (linhas com colunas sortáveis)
- Filtro de período (data início/fim)
- Filtro por status (select)
- Filtro por empresa (select)
- **Estimativa: 1 dia**

### 4.3 Relatórios — Seleção de Módulos (#88)
- Checkboxes: quais módulos incluir no relatório
- Checkboxes: quais campos exportar no CSV
- Preview antes de exportar
- **Estimativa: 1 dia**

### 4.4 Links Bidirecionais Visíveis (#79)
- Seção "🔗 Vínculos" no modal de cada registro
- Links clicáveis que abrem o registro vinculado
- Badge na listagem: "🔗 2 vínculos"
- **Estimativa: 2 dias**

### 4.5 Busca Global
- Campo de busca no navbar que busca em TODOS os módulos
- Resultados agrupados por módulo
- Atalho de teclado (Ctrl+K)
- **Estimativa: 2 dias**

### 4.6 Modo Offline Melhorado
- Indicador visual quando offline
- Fila de operações pendentes
- Sincronização ao voltar online
- **Estimativa: 2-3 dias**

---

## 5. Mapa de Integrações Completo (v3.0)

```
                         ┌───────────────┐
                         │   TEMPLATES   │
                         │  (E-mail/Prop)│
                         └───────┬───────┘
                                 │
    ┌────────────┐       ┌───────▼───────┐       ┌────────────┐
    │  PRODUTOS  │◄──────┤   PROPOSTAS   ├──────►│    CRM     │
    │  & ESTOQUE │       │  (Orçamentos) │       │   (Funil)  │
    └──────┬─────┘       └───────┬───────┘       └──────┬─────┘
           │                     │                      │
           │              ┌──────▼───────┐       ┌──────▼─────┐
           └─────────────►│  FINANCEIRO  │◄──────┤    O.S.    │
                          │   (Caixa)    │       │ (Entrega)  │
                          └──────┬───────┘       └──────┬─────┘
                                 │                      │
                          ┌──────▼───────┐       ┌──────▼─────┐
                          │  RELATÓRIOS  │       │ PÓS-VENDA  │
                          │   (Export)   │       │    (CS)     │
                          └──────────────┘       └────────────┘

    ┌────────────┐       ┌──────────────┐       ┌────────────┐
    │   AGENDA   │◄──────┤  NOTIFICAÇÕES │──────►│   METAS    │
    │(Compromiss)│       │   (Alertas)  │       │   (KPIs)   │
    └────────────┘       └──────────────┘       └────────────┘

    ┌────────────┐       ┌──────────────┐       ┌────────────┐
    │  KANBAN    │       │  DOCUMENTOS  │       │ DASHBOARD  │
    │  (Equipe)  │       │ (Contratos)  │       │ (Widgets)  │
    └────────────┘       └──────────────┘       └────────────┘
```

---

## 6. Fluxo Completo do Ciclo Comercial (v3.0)

```
1. PROSPECÇÃO
   └─► Cadastro de empresa + Agenda (compromisso) + CRM (prospecção)

2. QUALIFICAÇÃO
   └─► CRM move para "Contato" → Histórico registra interações

3. PROPOSTA
   └─► Proposta criada (template) com Produtos do catálogo
   └─► CRM move para "Proposta" automaticamente

4. NEGOCIAÇÃO
   └─► CRM move para "Negociação" (obriga proposta vinculada)
   └─► Notificação para gerente

5. FECHAMENTO
   └─► CRM move para "Fechado" (aprovação gerencial)
   └─► Financeiro: entrada gerada automaticamente
   └─► OS gerada automaticamente (escopo = itens da proposta)
   └─► Estoque: baixa automática dos produtos vendidos

6. ENTREGA
   └─► OS acompanha execução (kanban de status)
   └─► Agenda: compromissos de entrega
   └─► Anexos: fotos, comprovantes

7. PÓS-VENDA
   └─► Pós-Venda registra onboarding
   └─► NPS coletado
   └─► Oportunidade de upsell → volta para CRM

8. RENOVAÇÃO
   └─► Documento/Contrato com vencimento → alerta
   └─► Nova proposta → ciclo recomeça
```

---

## 7. Priorização por Sprint

### Sprint 3A (Próxima — UX e Filtros)
| # | Item | Dias |
|---|------|------|
| #90 | CRM: filtro + arquivar | 1 |
| #89 | Propostas: grid + filtro | 1 |
| #88 | Relatórios: seleção campos | 1 |
| #79 | Links bidirecionais | 2 |
| **Total** | | **5 dias** |

### Sprint 3B (Produtos e OS)
| # | Item | Dias |
|---|------|------|
| #87 | Módulo Produtos e Estoque | 4 |
| — | Ordens de Serviço | 5 |
| — | Templates de Propostas | 3 |
| **Total** | | **12 dias** |

### Sprint 3C (Metas e Notificações)
| # | Item | Dias |
|---|------|------|
| — | Metas e KPIs por Papel | 4 |
| — | Notificações Internas | 3 |
| — | Documentos e Contratos | 3 |
| **Total** | | **10 dias** |

### Sprint 3D (Avançado)
| # | Item | Dias |
|---|------|------|
| — | Kanban de Equipe | 4 |
| — | Pós-Venda / CS | 4 |
| — | Busca Global | 2 |
| #27 | PWA | 3 |
| **Total** | | **13 dias** |

---

## 8. Tecnologias e Considerações

| Item | Decisão |
|---|---|
| Backend | Manter localStorage para v3.0. Backend (Supabase/Firebase) na v4.0 |
| Framework | Manter Vanilla JS. Considerar migrar para módulos ES na v4.0 |
| Mobile | PWA (#27) resolve acesso mobile sem app nativo |
| Limite localStorage | ~5-10MB. Monitorar e alertar quando > 80% |
| Testes | Manter Jest. Adicionar testes E2E (Playwright) na v4.0 |
| Deploy | GitHub Pages (mantido). CI/CD já funcional |

---

## 9. Métricas de Sucesso (v3.0)

| Indicador | Meta |
|---|---|
| Módulos totais | 14+ (hoje: 8) |
| Testes automatizados | 300+ |
| Integrações ativas | 15+ (hoje: ~8) |
| Tempo médio de uma feature | < 1 dia |
| Bugs abertos | 0 |

---

## 10. Conclusão e Recomendação

A v3.0 "Atlas" deve ser implementada em **4 sprints progressivas**, cada uma entregando valor imediato:

1. **Sprint 3A** — resolve a dor imediata de UX (filtros, arquivamento)
2. **Sprint 3B** — completa o ciclo comercial (produtos → proposta → entrega)
3. **Sprint 3C** — adiciona visibilidade gerencial (metas, alertas, documentos)
4. **Sprint 3D** — adiciona produtividade (kanban equipe, pós-venda, busca, PWA)

**Recomendação:** Iniciar pela Sprint 3A imediatamente (5 dias de trabalho) enquanto refinamos os detalhes das sprints seguintes.

---

*"Atlas carregou o mundo nas costas. Esta versão carrega todo o ciclo de negócios."*
