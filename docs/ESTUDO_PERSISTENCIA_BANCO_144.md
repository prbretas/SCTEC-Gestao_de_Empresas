# 📊 Estudo Técnico — Persistência de Dados em Banco (Issue #144)

> **Status:** Estudo / Análise de Requisitos (não implementado)
> **Objetivo:** Embasar a decisão técnica de migrar o armazenamento do SCTEC de `localStorage` para um banco de dados real (PostgreSQL), mantendo a opção de `localStorage` para testes através de um *toggle* na tela de configuração do Admin.
> **Escopo deste documento:** requisitos, arquitetura proposta, modelagem inicial, setup de infraestrutura (Podman), plano de migração e riscos. **Nenhum código de produção é alterado por este estudo.**

---

## 1. Contexto e Motivação

Hoje o SCTEC é uma aplicação **100% front-end** (HTML + JavaScript vanilla, sem framework e sem etapa de build). Todos os dados são persistidos no **`localStorage`** do navegador, o que é excelente para prototipagem e testes rápidos, mas tem limitações claras para produção:

| Limitação do localStorage | Impacto |
|---|---|
| Dados presos a um navegador/dispositivo | Usuário não vê os mesmos dados em outra máquina |
| Sem compartilhamento real entre usuários da mesma org | Colaboração é simulada, não persistida centralmente |
| Limite de ~5–10 MB por origem | Anexos em Base64 estouram o limite rapidamente |
| Sem backup/auditoria centralizada | Perda de dados ao limpar o navegador |
| Sem concorrência/transações | Condições de corrida (já vistas em transferência de estoque e IDs) |
| Sem consultas/relatórios server-side | Tudo é carregado e filtrado no cliente |

A issue #144 pede: **toggle localStorage ↔ Banco**, **configuração de conexão**, **camada de abstração de storage** e **documentação de setup com Podman**.

### 1.1 Limitação arquitetural importante

> ⚠️ Um navegador **não conecta diretamente** a um PostgreSQL de forma segura. É necessário um **backend/API** (Node.js/Express, por exemplo) que exponha os dados via HTTP e fale com o banco. Portanto, "ligar o banco" implica introduzir uma camada de servidor que hoje **não existe** no projeto.

Este estudo trata dessa introdução de forma faseada e reversível.

---

## 2. Inventário do Estado Atual (levantado do código)

### 2.1 Objetos de armazenamento (Storages/Controllers que persistem)

| Módulo/arquivo | Objeto | Chave localStorage | Escopo |
|---|---|---|---|
| `core/auth.js` | `AuthService` | `SCTEC_USERS`, `SCTEC_ORGS`, `SCTEC_SESSION` | Global / sessão |
| `core/storage.js` | `EmpreendimentoStorage` | `SCTEC_EMPREENDIMENTOS_DB`, `SCTEC_DATA_ORG_*` | Por org |
| `core/roles.js` | `RolesController` | `SCTEC_ROLES_{orgId}` | Por org |
| `core/filiais.js` | `FiliaisStorage` | `SCTEC_FILIAIS_{orgId}` | Por org |
| `core/params.js` | `ParamsController` | `SCTEC_PARAMS_{orgId}` | Por org |
| `core/modules.js` | `ModulesController` | `SCTEC_MODULES_{orgId}` | Por org |
| `core/approvals.js` | `ApprovalsController` | `SCTEC_APPROVALS_{orgId}` | Por org |
| `core/estoque.js` | `EnderecosStorage`, `EstoqueStorage` | `SCTEC_ENDERECOS_*`, `SCTEC_ESTOQUE_*`, `SCTEC_ESTOQUE_MOV_*` | Por org |
| `core/config.js` | `ConfigController` | `SCTEC_CONFIG_{orgId}` | Por org |
| `core/dashboard-config.js` | `DashboardConfigController` | `SCTEC_DASHBOARD_CONFIG_{orgId}` | Por org |
| `modules/agenda.js` | `AgendaStorage` | `SCTEC_AGENDA_{orgId}` | Por org |
| `modules/crm.js` | `CrmStorage` | `SCTEC_CRM_{orgId}` | Por org |
| `modules/propostas.js` | `PropostasStorage` | `SCTEC_PROPOSTAS_{orgId}` | Por org |
| `modules/produtos.js` | `ProdutosStorage` | `SCTEC_PRODUTOS_{orgId}` | Por org |
| `modules/entrada.js` | `EntradaStorage` | `SCTEC_ENTRADA_{orgId}` | Por org |
| `modules/financeiro.js` | `FinanceiroStorage` | `SCTEC_FINANCEIRO_{orgId}` | Por org |
| `shared/tarefas.js`, `shared/contatos.js`, `shared/historico.js` | Controllers | derivadas por registro | Por org |
| `core/theme.js` | `ThemeController` | `SCTEC_THEME` | Preferência local (fica no cliente) |

### 2.2 Padrão comum de acesso a dados

Quase todos os storages seguem o mesmo contrato implícito:

```js
const XStorage = {
  _obterChave() { /* SCTEC_X_{orgId} */ },
  buscarTodos() { return JSON.parse(localStorage.getItem(chave) || "[]"); },
  salvarTodos(lista) { localStorage.setItem(chave, JSON.stringify(lista)); },
  adicionar(registro) { /* gera id, push, salva */ },
  atualizar(id, dados) { /* find, merge, salva */ },
  excluir(id) { /* filter, salva */ },
};
```

> ✅ **Boa notícia:** essa uniformidade é a base ideal para uma **camada de abstração** — a maioria dos módulos já fala "CRUD por coleção", o que mapeia bem para tabelas/endpoints.

### 2.3 Observações relevantes

- **IDs:** já padronizados para `Date.now().toString() + Math.random()...` (correção recente), evitando colisão. No banco, migrar para `BIGSERIAL`/`UUID`.
- **Isolamento multi-tenant:** hoje via prefixo de chave `{orgId}`. No banco vira coluna `org_id` + índices.
- **Auditoria:** registros já carregam `criadoPor/criadoEm/atualizadoPor/atualizadoEm/criadoPorId` — mapeiam direto para colunas.
- **Anexos:** hoje Base64 dentro do JSON. No banco, migrar para `BYTEA`/armazenamento de objetos (S3/MinIO) referenciado por URL.

---

## 3. Requisitos

### 3.1 Funcionais

- **RF1** — Toggle na configuração do Admin para escolher a fonte de dados: `localStorage` (testes) ou `Database` (produção).
- **RF2** — Tela para configurar a conexão com o banco (host, porta, database, usuário, senha) **quando** o modo Database estiver ativo. *(A conexão é usada pelo backend, não pelo navegador — ver §5.)*
- **RF3** — Camada de abstração de storage: trocar a fonte **sem alterar o código das rotinas** (agenda, CRM, financeiro, etc.).
- **RF4** — Migração de dados: exportar do localStorage e importar no banco (e vice-versa) para não perder o que já existe.
- **RF5** — Documentação de setup com Podman (PostgreSQL conteinerizado).

### 3.2 Não Funcionais

- **RNF1** — Reversibilidade: poder voltar ao localStorage a qualquer momento (segurança durante a transição).
- **RNF2** — Segurança: credenciais do banco **nunca** no front-end; autenticação via token no backend.
- **RNF3** — Compatibilidade: manter o contrato atual dos storages para minimizar refatoração.
- **RNF4** — Isolamento multi-tenant preservado (`org_id`).
- **RNF5** — Testes: a suíte atual (Jest) deve continuar verde usando o provider de localStorage/in-memory.

---

## 4. Arquitetura Proposta — Camada de Abstração (`StorageProvider`)

A ideia central é introduzir uma **interface única de persistência** que os storages passam a consumir, com duas (ou três) implementações intercambiáveis.

```
┌─────────────────────────────────────────────────────────────┐
│  Módulos de rotina (agenda, crm, financeiro, produtos, ...)  │
│  Continuam chamando XStorage.buscarTodos()/adicionar()/...   │
└───────────────────────────────┬─────────────────────────────┘
                                 │  (contrato inalterado)
                    ┌────────────▼────────────┐
                    │      StorageProvider     │  ← camada nova
                    │  get(col) / set(col,val) │
                    │  list/insert/update/del  │
                    └────┬───────────┬─────────┘
             ┌───────────┘           └───────────┐
   ┌─────────▼─────────┐            ┌─────────────▼─────────────┐
   │ LocalStorageProvider │          │   ApiProvider (HTTP)      │
   │  (atual, síncrono)   │          │  fetch → backend → PgSQL  │
   └──────────────────────┘          └─────────────┬─────────────┘
                                                    │
                                       ┌────────────▼────────────┐
                                       │  Backend API (Node/Express) │
                                       │  + PostgreSQL (Podman)      │
                                       └─────────────────────────────┘
```

### 4.1 Contrato sugerido do provider

```js
// Pseudocódigo — proposta, NÃO implementado
const StorageProvider = {
  // coleção = nome lógico (ex: "propostas", "crm"), orgId = tenant
  async list(colecao, orgId) { /* retorna array */ },
  async insert(colecao, orgId, registro) { /* retorna registro c/ id */ },
  async update(colecao, orgId, id, dados) { /* retorna registro */ },
  async remove(colecao, orgId, id) { /* retorna ok */ },
};
```

### 4.2 Impacto: síncrono → assíncrono

> ⚠️ **Ponto crítico de decisão técnica.** Hoje o localStorage é **síncrono** (`buscarTodos()` retorna direto). Um banco via HTTP é **assíncrono** (`await`). Existem dois caminhos:

| Estratégia | Prós | Contras |
|---|---|---|
| **A. Tornar os storages `async`** | Modelo correto e definitivo | Refatoração ampla: todo `buscarTodos()` vira `await`; muitos pontos de UI |
| **B. Cache local + sync em background** | Mantém API síncrona; migração incremental | Complexidade de sincronização; risco de dados obsoletos |

Recomendação para análise: **começar pela Estratégia A em um módulo piloto** (ex: `propostas`/Pedido de Venda) para medir o esforço real antes de propagar.

---

## 5. Backend e Configuração de Conexão (RF2)

O navegador não acessa o PostgreSQL diretamente. Proposta:

- **Backend mínimo** (Node.js + Express) expondo endpoints REST por coleção:
  `GET/POST/PUT/DELETE /api/{colecao}` com header de autenticação e filtro por `org_id`.
- **Credenciais do banco** ficam **no backend** (variáveis de ambiente / `.env`), **nunca** no front-end.
- A "tela de configuração de conexão" no Admin, quando o modo Database estiver ligado, deve:
  - No cenário realista, **apontar para a URL da API** (ex: `http://localhost:3000`), não para o Postgres direto.
  - Opcionalmente, um Admin de infra configura a string de conexão do banco **no backend** (fora do navegador).

---

## 6. Modelagem Inicial do Banco (PostgreSQL)

Modelagem derivada do inventário (§2). Multi-tenant por `org_id`. Exemplos das principais tabelas:

```sql
-- Organizações e usuários
CREATE TABLE orgs (
  id            BIGSERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  codigo_convite TEXT UNIQUE,
  criado_em     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usuarios (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT REFERENCES orgs(id),
  nome        TEXT NOT NULL,
  senha_hash  TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',   -- 'admin' | 'user'
  papel_id    BIGINT,                          -- FK papeis(id)
  filial_id   BIGINT,                          -- FK filiais(id)  (#143)
  ativo       BOOLEAN DEFAULT true,
  criado_em   TIMESTAMPTZ DEFAULT now()
);

-- Papéis de trabalho (#41, #142)
CREATE TABLE papeis (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT REFERENCES orgs(id),
  nome          TEXT NOT NULL,
  nivel         SMALLINT DEFAULT 4,            -- #142 (1=topo)
  modulos_permitidos JSONB,                    -- null = todos
  pode_ver_todos BOOLEAN DEFAULT false,
  codigo_convite TEXT
);

-- Filiais (#143)
CREATE TABLE filiais (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT REFERENCES orgs(id),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  criado_em   TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE filial_enderecos (         -- N:N filial ↔ endereço de estoque
  filial_id   BIGINT REFERENCES filiais(id),
  endereco_id BIGINT REFERENCES enderecos(id),
  PRIMARY KEY (filial_id, endereco_id)
);

-- Pedido de Venda / Propostas
CREATE TABLE pedidos_venda (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT REFERENCES orgs(id),
  numero      TEXT,
  titulo      TEXT NOT NULL,
  empresa_id  BIGINT,
  status      TEXT DEFAULT 'rascunho',
  total       NUMERIC(14,2) DEFAULT 0,
  validade    DATE,
  obs         TEXT,
  criado_por_id BIGINT,
  criado_em   TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ
);
CREATE TABLE pedido_itens (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   BIGINT REFERENCES pedidos_venda(id) ON DELETE CASCADE,
  descricao   TEXT,
  qtd         NUMERIC(12,3) DEFAULT 1,
  valor       NUMERIC(14,2) DEFAULT 0,
  produto_id  BIGINT
);

-- Demais coleções seguem o mesmo padrão: crm, financeiro, produtos,
-- estoque, estoque_mov, enderecos, agenda, entrada, approvals, params...
-- Índices recomendados: (org_id) em todas; (org_id, status), (org_id, criado_em).
```

### 6.1 Estratégia para dados heterogêneos

Como o front-end guarda objetos flexíveis, uma alternativa pragmática de transição é uma tabela genérica **key-value/JSONB** por coleção:

```sql
CREATE TABLE colecao_registros (
  id         BIGSERIAL PRIMARY KEY,
  org_id     BIGINT NOT NULL,
  colecao    TEXT NOT NULL,     -- 'propostas', 'crm', ...
  registro   JSONB NOT NULL,    -- o objeto inteiro
  criado_em  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_colecao ON colecao_registros (org_id, colecao);
```

> Isso permite espelhar o localStorage **quase 1:1** no início (baixo esforço) e depois normalizar tabela a tabela. Trade-off: menos integridade referencial no começo.

---

## 7. Setup de Infraestrutura com Podman

> Documentação de referência para subir o PostgreSQL localmente. (Ainda não há backend no repo; isto prepara o terreno.)

### 7.1 PostgreSQL em contêiner (comando direto)

```bash
podman run -d --name sctec-postgres \
  -e POSTGRES_USER=sctec \
  -e POSTGRES_PASSWORD=troque-esta-senha \
  -e POSTGRES_DB=sctec \
  -p 5432:5432 \
  -v sctec_pgdata:/var/lib/postgresql/data \
  docker.io/library/postgres:16
```

### 7.2 `podman-compose` (recomendado)

```yaml
# compose.yaml — proposta
services:
  db:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_USER: sctec
      POSTGRES_PASSWORD: troque-esta-senha
      POSTGRES_DB: sctec
    ports:
      - "5432:5432"
    volumes:
      - sctec_pgdata:/var/lib/postgresql/data
volumes:
  sctec_pgdata:
```

```bash
podman-compose up -d          # sobe o banco
podman-compose down           # derruba (mantém volume)
```

### 7.3 Conexão via DBeaver (para inspeção)

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Database | `sctec` |
| Usuário | `sctec` |
| Senha | (a definida acima) |

---

## 8. Plano de Migração (faseado e reversível)

1. **Fase 0 — Estudo (este documento).** Decisão técnica de arquitetura (síncrono vs assíncrono, tabela normalizada vs JSONB).
2. **Fase 1 — Abstração sem trocar backend.** Introduzir `StorageProvider` com `LocalStorageProvider` (comportamento idêntico ao atual). Refatorar 1 módulo piloto. Testes verdes.
3. **Fase 2 — Backend mínimo + Podman.** API REST + PostgreSQL conteinerizado. `ApiProvider`.
4. **Fase 3 — Toggle no Admin.** Alternar provider em runtime; modo Database marcado como *preview*.
5. **Fase 4 — Migração de dados.** Exportar localStorage → importar no banco (reaproveitar backup/exportação já existente em `auth.js`).
6. **Fase 5 — Rollout gradual** módulo a módulo, mantendo o fallback para localStorage.

---

## 9. Riscos e Mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Refatoração síncrono→assíncrono grande | Alta | Módulo piloto para medir esforço antes de propagar |
| Credenciais expostas no front-end | Crítica | Credenciais só no backend; front fala com API autenticada |
| Perda de dados na migração | Alta | Exportar/backup antes; migração idempotente e reversível |
| Anexos Base64 estourando o banco | Média | Migrar anexos para armazenamento de objetos (MinIO/S3) |
| Divergência de dados no modo híbrido | Média | Definir "fonte da verdade" única por vez; evitar escrever nos dois |
| Quebra da suíte de testes | Média | Provider in-memory para testes; manter contrato dos storages |

---

## 10. Perguntas em Aberto (para a análise técnica)

- [ ] Adotar **async** definitivo (Estratégia A) ou **cache+sync** (Estratégia B)?
- [ ] Modelagem **normalizada** desde já ou **JSONB genérico** na transição?
- [ ] Stack do backend: **Node/Express** (mesma linguagem do front) ou outra?
- [ ] Anexos: manter Base64 no banco ou migrar para armazenamento de objetos?
- [ ] Autenticação da API: JWT? Sessão? Reaproveitar o hash de senha atual?
- [ ] Hospedagem de produção: on-premise (Podman) ou serviço gerenciado?

---

## 11. Conclusão

A uniformidade atual dos storages torna a introdução de uma **camada de abstração** viável e de baixo risco na Fase 1, sem alterar as rotinas. A parte pesada e que exige decisão é: (a) o modelo **síncrono → assíncrono** e (b) a necessidade de um **backend** para falar com o PostgreSQL de forma segura. Recomenda-se validar essas duas questões com um **módulo piloto** antes de qualquer rollout amplo.

Este documento serve de base para a análise técnica da issue #144. **Nenhum código de produção foi alterado.**
