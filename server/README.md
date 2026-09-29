# SCTEC Backend — Fase 2 da Issue #144

API REST (Node/Express + PostgreSQL) que viabiliza a persistência em banco do SCTEC.
Nesta fase, a coleção **piloto** é o **Pedido de Venda** (`/api/v1/pedidos`), além da autenticação (`/api/v1/auth`).

> Consome/estende os estudos: `docs/ESTUDO_BACKEND_API_144.md`, `docs/ESTUDO_MODELO_DADOS_144.md`, `docs/ESTUDO_STORAGE_PROVIDER_144.md`.

## Pré-requisitos
- Node.js 18+ (testado no 22)
- Podman (para o PostgreSQL) — `podman --version`

## 1. Subir o PostgreSQL com Podman
```bash
podman machine start                       # apenas uma vez, se ainda não estiver rodando
podman compose -f server/compose.yaml up -d
```
Isso sobe o Postgres em `localhost:5432` e aplica `db/schema.sql` automaticamente na primeira vez.

## 2. Configurar e rodar o backend
```bash
cd server
cp .env.example .env          # ajuste JWT_SECRET e a senha do banco
npm install
npm start                     # sobe em http://localhost:3000 (API em /api/v1)
```

Healthcheck: `GET http://localhost:3000/api/v1/health`

## Endpoints (piloto)
| Método | Caminho | Descrição |
|---|---|---|
| POST | `/api/v1/auth/register` | Cria organização + usuário admin, retorna JWT |
| POST | `/api/v1/auth/login` | Autentica, retorna JWT |
| GET | `/api/v1/pedidos` | Lista pedidos da org (via token) |
| GET | `/api/v1/pedidos/:id` | Detalhe |
| POST | `/api/v1/pedidos` | Cria (com itens) |
| PUT | `/api/v1/pedidos/:id` | Atualiza |
| DELETE | `/api/v1/pedidos/:id` | Remove |

Todas as rotas de pedidos exigem `Authorization: Bearer <token>`; o `org_id` vem do token (multi-tenant).

## Testes
```bash
cd server
npm install
npm test          # Jest + supertest, usando repositórios in-memory (não requer banco)
```

## Ligar o front (SCTEC) ao banco
No SCTEC, a camada `StorageProvider` (Fase 1) tem o `ApiProvider`. Ative o modo API:
```js
StorageConfig.definirModo("api");   // toggle; Fase 3 exporá isso na tela do Admin
```
O `ApiProvider` aponta para `http://localhost:3000/api/v1` por padrão (configurável).
