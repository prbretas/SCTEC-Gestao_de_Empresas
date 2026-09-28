# 🖧 Estudo Técnico — Backend / API REST (Issue #144)

> **Status:** Estudo / Análise (não implementado)
> **Objetivo:** Desenhar o backend/API que fará a ponte entre o front-end (hoje 100% navegador) e o PostgreSQL, viabilizando a persistência em banco da issue #144.
> **Complementa:** `ESTUDO_PERSISTENCIA_BANCO_144.md`, `ESTUDO_MODELO_DADOS_144.md`, `ESTUDO_SEGURANCA_LGPD_144.md`.
> **Escopo:** arquitetura, stack, estrutura de projeto, catálogo completo de endpoints, autenticação, validação, erros, paginação, contratos, deploy. **Nenhum código é alterado.**

---

## 1. Por que um backend

O navegador não pode (e não deve) conectar direto no PostgreSQL: exporia credenciais e não há como aplicar autorização confiável no cliente. O backend concentra:

- **Segurança**: credenciais do banco, autenticação (JWT), autorização por `org_id`/papel/filial.
- **Integridade**: validação, transações, regras de negócio no servidor.
- **Isolamento multi-tenant**: todo acesso filtrado por `org_id` da sessão.
- **Portabilidade**: o front passa a falar HTTP, agnóstico da fonte de dados.

```
[ Navegador (front atual) ]  --HTTPS/JSON-->  [ API REST (backend) ]  --SQL-->  [ PostgreSQL ]
        ApiProvider                               Express + auth                 (Podman)
```

---

## 2. Stack Recomendada

| Camada | Escolha sugerida | Justificativa |
|---|---|---|
| Runtime | **Node.js LTS** | Mesma linguagem do front (JS), curva baixa |
| Framework HTTP | **Express** (ou Fastify) | Simples, maduro, muito material |
| Acesso a dados | **pg** (driver) + queries parametrizadas, ou **Knex**/**Prisma** | Controle x produtividade (a decidir) |
| Autenticação | **JWT** (`jsonwebtoken`) + **bcrypt/argon2** | Padrão de mercado |
| Validação | **zod** ou **express-validator** | Contratos e mensagens claras |
| Migrations | **node-pg-migrate** ou **Prisma Migrate** | Versionamento do schema |
| Testes | **Jest + supertest** | Alinhado à suíte atual (Jest) |
| Logs | **pino**/**winston** | Auditoria e observabilidade |

> Decisão em aberto: **driver puro (`pg`)** para controle total vs **ORM (Prisma)** para produtividade. Ver §11.

---

## 3. Estrutura de Projeto Proposta

Backend em pasta separada (ex.: `server/`), sem afetar o front atual:

```
server/
├── package.json
├── .env.example              # variáveis (NUNCA commitar .env real)
├── src/
│   ├── app.js                # cria o Express, middlewares globais
│   ├── server.js             # sobe o HTTP
│   ├── config/
│   │   └── db.js             # pool de conexão PostgreSQL
│   ├── middlewares/
│   │   ├── auth.js           # valida JWT, injeta req.user (org_id, papel)
│   │   ├── tenant.js         # garante filtro por org_id
│   │   ├── error.js          # handler central de erros
│   │   └── validate.js       # validação de schema (zod)
│   ├── modules/
│   │   ├── auth/             # login, refresh, troca de senha
│   │   ├── usuarios/
│   │   ├── papeis/
│   │   ├── filiais/
│   │   ├── empreendimentos/  # + contatos, tarefas, ocorrencias
│   │   ├── produtos/
│   │   ├── estoque/          # posicoes + movimentacoes
│   │   ├── pedidos/          # pedido de venda + itens
│   │   ├── crm/
│   │   ├── financeiro/
│   │   ├── entrada/
│   │   ├── aprovacoes/
│   │   └── anexos/
│   └── db/
│       ├── migrations/       # versionamento do schema
│       └── seeds/
└── tests/
```

Cada módulo segue o padrão **route → controller → service → repository**:
- **route**: define caminhos e middlewares.
- **controller**: lê request, chama service, formata response.
- **service**: regra de negócio, transações.
- **repository**: SQL parametrizado.

---

## 4. Convenções de API

- **Base URL:** `/api/v1`
- **Formato:** JSON (UTF-8).
- **Autenticação:** header `Authorization: Bearer <jwt>`.
- **Multi-tenant:** `org_id` **derivado do token**, nunca do corpo/query (evita adulteração).
- **Datas:** ISO 8601 (`2026-09-28T12:00:00Z`).
- **IDs:** string (compatível com o front atual) — no banco `BIGSERIAL`/`UUID`.
- **Versionamento:** prefixo `/v1` para evolução sem quebra.

### 4.1 Padrão de resposta

Sucesso:
```json
{ "ok": true, "data": { /* recurso ou lista */ }, "meta": { "page": 1, "pageSize": 50, "total": 123 } }
```
Erro:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Título é obrigatório", "fields": { "titulo": "obrigatório" } } }
```

### 4.2 Códigos HTTP
| Código | Uso |
|---|---|
| 200 | OK (GET/PUT) |
| 201 | Criado (POST) |
| 204 | Sem conteúdo (DELETE) |
| 400 | Validação |
| 401 | Não autenticado |
| 403 | Sem permissão (papel/filial) |
| 404 | Não encontrado |
| 409 | Conflito (duplicidade) |
| 422 | Regra de negócio |
| 500 | Erro interno |

---

## 5. Autenticação e Autorização

### 5.1 Fluxo de login
```
POST /api/v1/auth/login  { nome, senha }
  → valida com bcrypt/argon2
  → gera accessToken (JWT, ~15 min) + refreshToken (revogável, ~7 dias)
  → payload do JWT: { sub: userId, orgId, role, papelId, filialId, nivel }
```

### 5.2 Endpoints de auth
| Método | Caminho | Descrição |
|---|---|---|
| POST | `/auth/login` | Autentica e retorna tokens |
| POST | `/auth/refresh` | Renova accessToken |
| POST | `/auth/logout` | Revoga refreshToken |
| POST | `/auth/senha` | Troca de senha (autenticado) |

### 5.3 Autorização (server-side)
- Middleware `auth` valida o JWT e popula `req.user`.
- Middleware `tenant` injeta `org_id = req.user.orgId` em toda query.
- Regras de **papel/nível (#142)** e **filial (#143)** aplicadas no service (ex.: `filtrarPorVisibilidade` migra para o servidor).
- Rotas Admin exigem `role === 'admin'`.

---

## 6. Catálogo Completo de Endpoints (CRUD por coleção)

Todas as coleções seguem o mesmo padrão REST. Substituir `{colecao}` por: `usuarios`, `papeis`, `filiais`, `empreendimentos`, `produtos`, `pedidos`, `crm`, `financeiro`, `entrada`, `aprovacoes`.

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/api/v1/{colecao}` | Lista (com paginação/filtros) |
| GET | `/api/v1/{colecao}/:id` | Detalhe |
| POST | `/api/v1/{colecao}` | Cria |
| PUT | `/api/v1/{colecao}/:id` | Atualiza |
| DELETE | `/api/v1/{colecao}/:id` | Remove (ou soft delete) |

### 6.1 Sub-recursos (relações do modelo)
| Método | Caminho | Descrição |
|---|---|---|
| GET/POST | `/pedidos/:id/itens` | Itens do pedido de venda |
| GET/POST | `/entrada/:id/itens` | Itens do documento de entrada |
| GET/POST | `/empreendimentos/:id/contatos` | Contatos da empresa |
| GET/POST | `/empreendimentos/:id/tarefas` | Tarefas da empresa |
| GET/POST | `/empreendimentos/:id/ocorrencias` | Histórico da empresa |
| GET/PUT | `/filiais/:id/enderecos` | Endereços vinculados (N:N) |
| GET/PUT | `/papeis/:id/modulos` | Módulos permitidos (N:N) |
| GET | `/estoque/posicoes` / POST `/estoque/movimentacoes` | Estoque e movimentações |
| POST | `/aprovacoes/:id/aprovar` / `/rejeitar` | Ações de aprovação |
| GET/POST/DELETE | `/anexos?entidadeTipo=&entidadeId=` | Anexos polimórficos |

### 6.2 Exemplos de contrato

**Criar pedido de venda**
```
POST /api/v1/pedidos
Authorization: Bearer <jwt>
{
  "titulo": "Proposta ACME",
  "empresaId": "123",
  "status": "rascunho",
  "validade": "2026-10-30",
  "itens": [
    { "produtoId": "77", "qtd": 2, "valorUnit": 150.00 },
    { "descricao": "Serviço avulso", "qtd": 1, "valorUnit": 300.00 }
  ]
}
→ 201 { "ok": true, "data": { "id": "...", "numero": "2026-001", "total": 600.00, ... } }
```

**Listar com filtro e paginação**
```
GET /api/v1/pedidos?status=enviada&de=2026-08-01&ate=2026-09-30&page=1&pageSize=50&sort=-criadoEm
→ 200 { "ok": true, "data": [ ... ], "meta": { "page":1, "pageSize":50, "total":123 } }
```

---

## 7. Validação, Paginação, Filtros e Ordenação

- **Validação de entrada** por schema (zod): tipos, obrigatórios, faixas (ex.: `nivel` 1–5), enums (`status`, `tipo`).
- **Paginação** padrão: `page` (1-based) + `pageSize` (default 50, máx 200); resposta traz `meta.total`.
- **Filtros** por query string (`status`, intervalo de datas `de`/`ate`, `empresaId`, etc.).
- **Ordenação** via `sort` (`campo` asc, `-campo` desc) — espelha a ordenação por colunas já feita no front (#140).

---

## 8. Tratamento de Erros e Observabilidade

- **Handler central** converte exceções em resposta `{ ok:false, error }` padronizada.
- **Sem vazar detalhes internos** (stack, SQL) para o cliente; logar internamente.
- **Correlation ID** por request para rastrear nos logs.
- **Auditoria**: gravar operações de escrita em `audit_log` (quem/o quê/quando/antes/depois) — ver estudo de segurança.

---

## 9. Integrações Externas

O front já consome **ViaCEP** e **BrasilAPI** (CEP/CNPJ). Recomendação:
- Manter no front (consultas públicas) **ou** proxyar pelo backend para cache e resiliência.
- Registrar no ROPA (LGPD) o compartilhamento com terceiros.

---

## 10. Deploy e Ambiente

- **Desenvolvimento:** `podman-compose` com serviços `db` (PostgreSQL) + `api` (Node).
- **Variáveis** (`.env`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES`, `PORT`, `CORS_ORIGINS`.
- **CORS** restrito às origens do front.
- **Proxy reverso** (Nginx/Caddy) com TLS em produção.
- **Healthcheck** `GET /api/v1/health`.

```yaml
# compose.yaml (trecho) — proposta
services:
  db:
    image: docker.io/library/postgres:16
    environment: { POSTGRES_USER: sctec, POSTGRES_PASSWORD: troque, POSTGRES_DB: sctec }
    volumes: [ "sctec_pgdata:/var/lib/postgresql/data" ]
  api:
    build: ./server
    environment:
      DATABASE_URL: postgres://sctec:troque@db:5432/sctec
      JWT_SECRET: troque-por-segredo-forte
      CORS_ORIGINS: http://localhost:5500
    ports: [ "3000:3000" ]
    depends_on: [ db ]
volumes: { sctec_pgdata: {} }
```

---

## 11. Perguntas em Aberto

- [ ] **ORM (Prisma) x driver puro (`pg`)** — produtividade vs controle/curva.
- [ ] **Express x Fastify** — simplicidade vs performance.
- [ ] Estrutura de resposta: manter `{ ok, data }` (parecido com os controllers atuais) — confirmado?
- [ ] Refresh token: armazenar em tabela (revogável) ou stateless?
- [ ] Versionar API já em `/v1` desde o início? (recomendado: sim)
- [ ] Backend no mesmo repositório (`server/`) ou repositório separado?

---

## 12. Conclusão

Um backend Node/Express enxuto, organizado por módulos (route→controller→service→repository), com JWT + autorização multi-tenant por `org_id`/papel/filial, expõe um CRUD REST uniforme que espelha as coleções atuais do localStorage. Isso permite ao front migrar via um único ponto de troca (o `ApiProvider` — ver `ESTUDO_STORAGE_PROVIDER_144.md`), preservando os contratos existentes. **Nenhum código foi alterado** — documento para embasar a decisão técnica da #144.
