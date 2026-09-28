# 🗂️ Estudo Técnico — Modelo de Dados Relacional e Tabelas Intermediárias (Issue #144)

> **Status:** Estudo / Análise (não implementado)
> **Objetivo:** Definir um modelo de dados relacional coerente para o SCTEC ao migrar do `localStorage` para PostgreSQL, com **tabelas intermediárias (associativas)** que garantam que as entidades "conversem entre si" sem duplicação nem inconsistência ("bagunça") de informação.
> **Complementa:** `ESTUDO_PERSISTENCIA_BANCO_144.md`.
> **Escopo:** modelagem, chaves, relacionamentos, integridade referencial, índices e regras de exclusão. **Nenhum código é alterado.**

---

## 1. Princípios de Modelagem

1. **Multi-tenant por `org_id`** em todas as tabelas de negócio (isolamento entre organizações).
2. **Chaves substitutas** (`BIGSERIAL` ou `UUID`) como PK; nunca usar dado de negócio como PK.
3. **Integridade referencial** via `FOREIGN KEY` com regras `ON DELETE` explícitas.
4. **Relações N:N sempre por tabela associativa** (nunca listas embutidas ou colunas multivaloradas).
5. **Normalização** até 3FN nas entidades centrais; JSONB apenas para dados genuinamente flexíveis (ex.: parâmetros de rotina).
6. **Auditoria padronizada**: `criado_por`, `criado_em`, `atualizado_por`, `atualizado_em` nas tabelas transacionais.

---

## 2. Relações identificadas no código atual

Campos "FK-like" já existentes no front-end (base para as FKs reais):

| Campo no JS | Aponta para | Relação | Hoje (localStorage) |
|---|---|---|---|
| `orgId` | organização | 1:N | prefixo de chave |
| `empresaId` | empreendimento/empresa cliente | 1:N | id solto |
| `produtoId` | produto | 1:N / N:N | id solto |
| `enderecoId` | endereço de estoque | 1:N / N:N | id solto |
| `papelId` | papel de trabalho | 1:N | id solto |
| `filialId` | filial (#143) | 1:N | id solto |
| `propostaId` | pedido de venda | 1:1 / 1:N | id solto |
| `oportunidadeId` | negócio CRM | 1:N | id solto |
| `criadoPorId` | usuário criador | 1:N | id solto |
| `referenciaId` / `referenciaModulo` | registro genérico de aprovação | polimórfica | id + módulo |
| contatos / tarefas / histórico | vinculados a `empresaId` | 1:N | **embutidos** no registro da empresa |
| `filial.enderecosEstoque[]` (#143) | endereços | **N:N** | **array embutido** |
| `papel.modulosPermitidos[]` | módulos | **N:N** | array embutido (ou null=todos) |

> ⚠️ Os itens em **negrito** são exatamente os que hoje ficam como **arrays embutidos** e que causam "bagunça" ao crescer. São os principais candidatos a **tabelas intermediárias**.

---

## 3. Diagrama de Entidades (visão lógica)

```
orgs ──1:N── usuarios ──N:1── papeis
  │             │  └─N:1── filiais
  │             │
  │             └───(auditoria: criado_por em quase tudo)
  │
  ├─1:N── filiais ──N:N(filial_enderecos)── enderecos
  ├─1:N── papeis  ──N:N(papel_modulos)───── modulos
  ├─1:N── empreendimentos (empresas/clientes)
  │          ├─1:N── contatos
  │          ├─1:N── tarefas
  │          └─1:N── ocorrencias (histórico)
  │
  ├─1:N── produtos ──N:N(estoque_posicoes)── enderecos
  │          └─1:N── estoque_movimentacoes
  │
  ├─1:N── pedidos_venda ──1:N── pedido_itens ──N:1── produtos
  │          └─1:N── pedido_anexos
  ├─1:N── crm_oportunidades ──0:1── pedidos_venda
  ├─1:N── financeiro_lancamentos ──0:1── (pedido | oportunidade)
  ├─1:N── agenda_compromissos
  ├─1:N── entrada_documentos ──1:N── entrada_itens
  └─1:N── aprovacoes ──(polimórfica)── pedido | oportunidade
```

---

## 4. Tabelas Intermediárias (Associativas / Junction)

O coração do pedido: garantir que as entidades se relacionem por tabelas próprias, evitando arrays embutidos.

### 4.1 `filial_enderecos` — Filial ↔ Endereço de estoque (N:N) — #143

```sql
CREATE TABLE filial_enderecos (
  filial_id    BIGINT NOT NULL REFERENCES filiais(id)   ON DELETE CASCADE,
  endereco_id  BIGINT NOT NULL REFERENCES enderecos(id) ON DELETE RESTRICT,
  vinculado_em TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (filial_id, endereco_id)      -- impede vínculo duplicado
);
CREATE INDEX idx_filend_endereco ON filial_enderecos (endereco_id);
```
> Substitui o array `filial.enderecosEstoque[]`. A PK composta **impede duplicidade** do mesmo par.

### 4.2 `papel_modulos` — Papel ↔ Módulo permitido (N:N) — #51/#142

```sql
CREATE TABLE papel_modulos (
  papel_id   BIGINT NOT NULL REFERENCES papeis(id) ON DELETE CASCADE,
  modulo_id  TEXT   NOT NULL,                 -- id do catálogo (ex.: 'crm')
  PRIMARY KEY (papel_id, modulo_id)
);
```
> Substitui `papel.modulosPermitidos[]`. Regra "null = todos" vira **ausência de linhas** = todos, ou um flag `acesso_total BOOLEAN` no papel (a decidir).

### 4.3 `estoque_posicoes` — Produto ↔ Endereço com quantidade (N:N com atributo)

```sql
CREATE TABLE estoque_posicoes (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  produto_id  BIGINT NOT NULL REFERENCES produtos(id)  ON DELETE CASCADE,
  endereco_id BIGINT NOT NULL REFERENCES enderecos(id) ON DELETE RESTRICT,
  quantidade  NUMERIC(14,3) NOT NULL DEFAULT 0,
  estoque_min NUMERIC(14,3) DEFAULT 5,
  UNIQUE (produto_id, endereco_id)           -- 1 posição por produto+endereço
);
CREATE INDEX idx_estpos_org ON estoque_posicoes (org_id);
```
> É uma **N:N com atributo próprio** (quantidade). A constraint `UNIQUE(produto_id, endereco_id)` elimina a duplicação de posição que hoje causa condições de corrida.

### 4.4 `pedido_produtos` — Pedido de Venda ↔ Produto (itens) (1:N→N:N via item)

```sql
CREATE TABLE pedido_itens (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   BIGINT NOT NULL REFERENCES pedidos_venda(id) ON DELETE CASCADE,
  produto_id  BIGINT REFERENCES produtos(id) ON DELETE SET NULL, -- item pode ser manual
  descricao   TEXT,          -- preenchido quando item é manual (produto_id NULL)
  qtd         NUMERIC(12,3) NOT NULL DEFAULT 1,
  valor_unit  NUMERIC(14,2) NOT NULL DEFAULT 0,
  CHECK (produto_id IS NOT NULL OR descricao IS NOT NULL) -- não pode item vazio
);
```
> O item é a **entidade associativa** entre pedido e produto, carregando qtd/valor. `ON DELETE SET NULL` no produto preserva o histórico do pedido mesmo se o produto for removido.

### 4.5 `entrada_itens` — Documento de Entrada ↔ Produto (1:N)

```sql
CREATE TABLE entrada_itens (
  id           BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES entrada_documentos(id) ON DELETE CASCADE,
  produto_id   BIGINT REFERENCES produtos(id) ON DELETE SET NULL,
  qtd          NUMERIC(12,3) NOT NULL DEFAULT 1,
  valor_unit   NUMERIC(14,2) NOT NULL DEFAULT 0
);
```

### 4.6 `anexos` — Anexos polimórficos (N:1 para qualquer registro)

```sql
CREATE TABLE anexos (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entidade_tipo TEXT   NOT NULL,   -- 'produto' | 'pedido' | 'entrada' | ...
  entidade_id   BIGINT NOT NULL,   -- id do registro dono
  nome          TEXT NOT NULL,
  tipo_mime     TEXT,
  tamanho       BIGINT,
  url           TEXT,              -- referência p/ objeto (MinIO/S3), não Base64
  criado_em     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_anexos_entidade ON anexos (entidade_tipo, entidade_id);
```
> Relação **polimórfica**: um anexo pertence a "qualquer" registro. Como não há FK nativa polimórfica, a integridade é garantida por aplicação + índice. Alternativa mais rígida: uma tabela de anexos por entidade.

### 4.7 `aprovacoes` — Pendência polimórfica (referência a pedido/oportunidade)

```sql
CREATE TABLE aprovacoes (
  id                BIGSERIAL PRIMARY KEY,
  org_id            BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL,     -- 'proposta_aceita' | 'crm_fechado'
  referencia_modulo TEXT NOT NULL,     -- 'propostas' | 'crm'
  referencia_id     BIGINT NOT NULL,   -- id do registro de origem
  empresa_id        BIGINT REFERENCES empreendimentos(id) ON DELETE SET NULL,
  valor             NUMERIC(14,2) DEFAULT 0,
  descricao         TEXT,
  status            TEXT DEFAULT 'pendente',   -- pendente|aprovado|rejeitado
  solicitante_id    BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  aprovador_id      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  data_solicitacao  TIMESTAMPTZ DEFAULT now(),
  data_resolucao    TIMESTAMPTZ,
  motivo            TEXT
);
```

### 4.8 `financeiro_vinculos` — Lançamento ↔ origem (evita coluna dupla)

```sql
CREATE TABLE financeiro_lancamentos (
  id           BIGSERIAL PRIMARY KEY,
  org_id       BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  numero       TEXT,
  tipo         TEXT NOT NULL,          -- 'entrada' | 'saida'
  natureza     TEXT,
  valor        NUMERIC(14,2) NOT NULL DEFAULT 0,
  data         DATE,
  status_pagamento TEXT,
  empresa_id   BIGINT REFERENCES empreendimentos(id) ON DELETE SET NULL,
  criado_por_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em    TIMESTAMPTZ DEFAULT now()
);

-- vínculo do lançamento à sua origem (pedido OU oportunidade), sem 2 colunas soltas
CREATE TABLE financeiro_vinculos (
  lancamento_id  BIGINT NOT NULL REFERENCES financeiro_lancamentos(id) ON DELETE CASCADE,
  origem_tipo    TEXT NOT NULL,   -- 'pedido' | 'oportunidade'
  origem_id      BIGINT NOT NULL,
  PRIMARY KEY (lancamento_id, origem_tipo, origem_id)
);
```

---

## 5. Regras de Integridade (ON DELETE) — resumo de decisões

| Relação | Regra | Motivo |
|---|---|---|
| `org` → tudo | `CASCADE` | Excluir org remove seus dados |
| `filial` → `filial_enderecos` | `CASCADE` | Vínculos somem com a filial |
| `endereco` → vínculos/posições | `RESTRICT` | Não excluir endereço em uso |
| `produto` → `pedido_itens` | `SET NULL` | Preserva histórico do pedido |
| `pedido` → `pedido_itens` | `CASCADE` | Itens só existem com o pedido |
| `usuario` → `filialId`/auditoria | `SET NULL` | Preserva registros do ex-usuário |
| `papel` → `papel_modulos` | `CASCADE` | Permissões somem com o papel |

> **Regra de ouro:** nunca deletar fisicamente entidades com histórico financeiro/fiscal — preferir **soft delete** (`ativo=false` / `excluido_em`) nessas tabelas.

---

## 6. Índices Recomendados

- `(org_id)` em todas as tabelas de negócio (filtro multi-tenant).
- `(org_id, status)` em `pedidos_venda`, `aprovacoes`, `financeiro_lancamentos`.
- `(org_id, criado_em)` para ordenação/relatórios por período.
- Índices nas FKs "do lado N" (ex.: `pedido_itens(produto_id)`).
- `UNIQUE` já embutidos nas associativas (impede duplicidade).

---

## 7. Integridade Adicional (além de FKs)

- **CHECK** de domínio: `status IN (...)`, `tipo IN ('entrada','saida')`, `nivel BETWEEN 1 AND 5`.
- **UNIQUE** de negócio: `usuarios(org_id, nome)`, `filiais(org_id, lower(nome))`, `pedidos_venda(org_id, numero)`.
- **Transações**: operações compostas (ex.: transferência de estoque = saída + entrada) em **uma transação** para eliminar as condições de corrida vistas no localStorage.
- **Triggers** (opcional): `atualizado_em = now()` em update; validação de saldo de estoque não-negativo (se parâmetro exigir).

---

## 8. Mapa "localStorage → tabela" (referência de migração)

| Chave localStorage | Tabela destino | Observação |
|---|---|---|
| `SCTEC_USERS` / `SCTEC_ORGS` | `usuarios` / `orgs` | separar org_id |
| `SCTEC_ROLES_{org}` | `papeis` + `papel_modulos` | quebrar array de módulos |
| `SCTEC_FILIAIS_{org}` | `filiais` + `filial_enderecos` | quebrar array de endereços |
| `SCTEC_PRODUTOS_{org}` | `produtos` + `anexos` | anexos p/ tabela própria |
| `SCTEC_ESTOQUE_{org}` | `estoque_posicoes` | UNIQUE produto+endereço |
| `SCTEC_ESTOQUE_MOV_{org}` | `estoque_movimentacoes` | histórico imutável |
| `SCTEC_PROPOSTAS_{org}` | `pedidos_venda` + `pedido_itens` + `anexos` | quebrar itens embutidos |
| `SCTEC_CRM_{org}` | `crm_oportunidades` | FK opcional p/ pedido |
| `SCTEC_FINANCEIRO_{org}` | `financeiro_lancamentos` + `financeiro_vinculos` | separar vínculo |
| `SCTEC_ENTRADA_{org}` | `entrada_documentos` + `entrada_itens` | |
| `SCTEC_APPROVALS_{org}` | `aprovacoes` | referência polimórfica |
| contatos/tarefas/histórico (embutidos) | `contatos` / `tarefas` / `ocorrencias` | virar tabelas-filhas por `empresa_id` |
| `SCTEC_PARAMS_{org}` | `parametros_rotina` (JSONB) | flexível, mantém JSONB |

---

## 9. Perguntas em Aberto (para decisão técnica)

- [ ] PK: `BIGSERIAL` (simples/performático) ou `UUID` (distribuído/menos previsível)?
- [ ] Permissão de módulos: tabela `papel_modulos` **ou** JSONB + flag `acesso_total`?
- [ ] Anexos: tabela polimórfica única **ou** uma tabela por entidade (mais rígida)?
- [ ] Exclusões: **soft delete** global ou apenas nas tabelas fiscais/financeiras?
- [ ] Contatos/tarefas/histórico: tabelas próprias (recomendado) ou JSONB no empreendimento?

---

## 10. Conclusão

O modelo proposto elimina os arrays embutidos que hoje geram inconsistência, introduzindo **tabelas associativas** (`filial_enderecos`, `papel_modulos`, `estoque_posicoes`, `pedido_itens`, `anexos`, `financeiro_vinculos`) com **PKs compostas/UNIQUE** que impedem duplicidade, e **FKs com regras `ON DELETE`** que preservam histórico onde necessário. Isso garante que as tabelas "conversem entre si" com integridade, sem bagunçar as informações. **Nenhum código foi alterado** — documento para embasar a decisão técnica da #144.
