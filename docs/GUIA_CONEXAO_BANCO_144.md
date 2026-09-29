# 🔌 Guia Passo a Passo — Conectar o SCTEC ao Banco de Dados (Issue #144)

> **Objetivo:** ligar o SCTEC ao **PostgreSQL** (via **Podman**) usando o backend (`server/`) e o toggle **Fonte de Dados** do Painel do Administrador.
> **Contexto:** implementação das Fases 1, 2 e 3 da #144. Piloto atual: **Pedido de Venda**.
> **Público:** desenvolvedor rodando o projeto localmente no Windows (PowerShell).

---

## 0. Visão geral do fluxo

```
[ Navegador / SCTEC ]  →  [ Backend Node/Express (server/) ]  →  [ PostgreSQL (Podman) ]
     ApiProvider                 http://localhost:3000/api/v1          localhost:5432
```

Você vai, nesta ordem:
1. Subir o **PostgreSQL** num contêiner Podman.
2. Configurar e rodar o **backend**.
3. Criar um usuário e apontar o **front** para a API (toggle no Admin).
4. **Verificar** que os dados vão para o banco.

---

## 1. Pré-requisitos

Confirme no PowerShell (todos devem responder com versão):

```powershell
node --version      # precisa ser 18+ (testado no 22)
npm --version
podman --version    # testado no 5.8.2
```

- Se **Node** não existir: instale a versão LTS em https://nodejs.org.
- Se **Podman** não existir: instale o Podman Desktop (https://podman.io) ou via `winget install RedHat.Podman`.
- (Opcional) **DBeaver** para inspecionar o banco visualmente.

---

## 2. Iniciar a máquina do Podman (Windows)

No Windows, o Podman roda dentro de uma VM Linux. Inicie-a **uma vez**:

```powershell
podman machine init      # só na primeira vez (cria a VM)
podman machine start     # inicia a VM
```

Verifique que está no ar:

```powershell
podman info               # deve exibir dados do servidor sem erro de conexão
```

> ❗ Se aparecer *"Cannot connect to Podman ... machine"*, a VM não está iniciada — rode `podman machine start`.

---

## 3. Subir o PostgreSQL com o compose do projeto

O projeto já traz `server/compose.yaml` (PostgreSQL 16) que **aplica o schema automaticamente** na primeira subida.

A partir da **raiz do projeto** (`src/SCTEC-Gestao_de_Empresas`):

```powershell
podman compose -f server/compose.yaml up -d
```

Confira o contêiner rodando:

```powershell
podman ps                 # deve listar "sctec-postgres" na porta 5432
```

O que o compose faz:
- Sobe o Postgres em `localhost:5432`
- Cria o banco `sctec`, usuário `sctec`, senha `troque-esta-senha`
- Executa `server/db/schema.sql` (tabelas `orgs`, `usuarios`, `pedidos_venda`, `pedido_itens`)

> 🔐 **Troque a senha padrão** em `server/compose.yaml` antes de qualquer uso além de teste local.

### Ver os logs / parar / recriar

```powershell
podman logs sctec-postgres                 # logs do banco
podman compose -f server/compose.yaml down # para (mantém os dados no volume)
```

> ⚠️ Se você **alterar o `schema.sql`**, ele só é reaplicado num volume novo. Para recriar do zero (apaga os dados):
> ```powershell
> podman compose -f server/compose.yaml down
> podman volume rm sctec_pgdata
> podman compose -f server/compose.yaml up -d
> ```

---

## 4. Configurar e rodar o backend

Na pasta `server/`:

```powershell
cd server
Copy-Item .env.example .env       # cria seu .env local
```

Edite o `server/.env` e ajuste:
- `DATABASE_URL` — se você trocou a senha do Postgres, reflita aqui. Padrão:
  `postgres://sctec:troque-esta-senha@localhost:5432/sctec`
- `JWT_SECRET` — troque por um valor forte e aleatório.
- `CORS_ORIGINS` — a origem de onde o front é servido (ex.: `http://localhost:5500`).

Instale as dependências e suba a API:

```powershell
npm install
npm start        # sobe em http://localhost:3000  (API em /api/v1)
```

Você deve ver: `SCTEC backend ouvindo em http://localhost:3000 (API: /api/v1)`.

### Teste rápido de saúde (healthcheck)

Em outro terminal:

```powershell
curl http://localhost:3000/api/v1/health
# → {"ok":true,"data":{"status":"up"}}
```

Se respondeu `up`, o backend está no ar. Se der erro de conexão com o banco ao usar rotas de dados, revise o passo 3 e a `DATABASE_URL`.

---

## 5. Criar o primeiro usuário (org + admin)

O registro cria a **organização** e o **usuário admin** de uma vez, retornando o **token JWT**:

```powershell
curl -Method POST http://localhost:3000/api/v1/auth/register `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"nome":"Admin","email":"admin@exemplo.com","senha":"secreta123","nomeOrg":"Minha Empresa"}'
```

Resposta (resumo):
```json
{ "ok": true, "data": { "token": "eyJhbGciOiJI...", "usuario": { "id": "1", "role": "admin", "orgId": "1" } } }
```

> Guarde o `token` — o front o utiliza para autenticar as chamadas. Login posterior: `POST /api/v1/auth/login` com `{ email, senha }`.

---

## 6. Apontar o front (SCTEC) para o banco

Sirva o front localmente (ex.: extensão *Live Server* do VS Code, na porta `5500`) e abra o **Painel do Administrador**.

Na seção **🗄️ Fonte de Dados**:
1. Selecione **Banco de dados**.
2. Informe a **URL da API**: `http://localhost:3000/api/v1`.
3. Clique em **🔌 Testar conexão** → deve exibir "✅ Conexão OK".
4. Clique em **💾 Salvar fonte de dados** (a página recarrega usando o `ApiProvider`).

### Fornecer o token ao front (fase atual)

Nesta fase o login pelo front ainda não emite o token do backend automaticamente. Para testar de ponta a ponta, defina o token obtido no passo 5 no console do navegador (F12):

```js
ApiProvider.definirToken("COLE_AQUI_O_TOKEN_DO_REGISTER");
StorageConfig.definirModo("api");
location.reload();
```

> Alternativamente, o toggle do Admin já grava o modo `api` e a URL; o `definirToken` é o passo manual temporário até a Fase 4 integrar o login do front ao backend.

---

## 7. Verificar que os dados vão para o banco

1. No SCTEC, abra **Pedido de Venda** e crie um pedido.
2. Confirme no banco (via `podman exec` ou DBeaver):

```powershell
podman exec -it sctec-postgres psql -U sctec -d sctec -c "SELECT id, titulo, total FROM pedidos_venda;"
```

Se o pedido aparecer na tabela, a conexão ponta a ponta está funcionando. 🎉

### Inspecionar com DBeaver (opcional)
| Campo | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Database | `sctec` |
| Usuário | `sctec` |
| Senha | a do `compose.yaml` |

---

## 8. Voltar para o modo de testes (localStorage)

No Painel do Administrador → **Fonte de Dados** → selecione **localStorage** → **Salvar**.
Ou, no console: `StorageConfig.definirModo("local"); location.reload();`

> ⚠️ **Os dados não migram automaticamente** entre localStorage e banco. Cada modo tem seu próprio armazenamento. A rotina de migração é uma etapa da **Fase 4**.

---

## 9. Solução de problemas (troubleshooting)

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot connect to Podman` | VM do Podman parada | `podman machine start` |
| `podman ps` não lista o container | compose não subiu | Reveja o passo 3; veja `podman logs sctec-postgres` |
| Backend falha ao consultar dados | `DATABASE_URL` errada / banco fora | Confira `.env` e o passo 3 |
| Front: "Falha na conexão" ao testar | Backend parado ou URL errada | Suba o backend (passo 4); confira a URL |
| Erro de **CORS** no navegador | Origem do front fora de `CORS_ORIGINS` | Ajuste `CORS_ORIGINS` no `.env` e reinicie o backend |
| `401` nas rotas de pedidos | Token ausente/expirado | Refaça login (passo 5) e `ApiProvider.definirToken(...)` |
| Alterei `schema.sql` e não aplicou | Volume já existia | Recrie o volume (fim do passo 3) |

---

## 10. Comandos úteis (resumo)

```powershell
# Podman / Postgres
podman machine start
podman compose -f server/compose.yaml up -d
podman ps
podman logs sctec-postgres
podman exec -it sctec-postgres psql -U sctec -d sctec

# Backend
cd server; npm install; npm start
curl http://localhost:3000/api/v1/health

# Parar tudo
podman compose -f server/compose.yaml down
```

---

## Referências no projeto
- `server/README.md` — visão do backend e endpoints.
- `server/compose.yaml` — definição do PostgreSQL.
- `server/db/schema.sql` — esquema das tabelas.
- `docs/ESTUDO_BACKEND_API_144.md` — desenho da API.
- `docs/ESTUDO_STORAGE_PROVIDER_144.md` — camada de abstração e toggle.

> Este guia cobre o ambiente **local de desenvolvimento**. Para produção (TLS, secrets, hardening), consulte `docs/ESTUDO_SEGURANCA_LGPD_144.md`.
