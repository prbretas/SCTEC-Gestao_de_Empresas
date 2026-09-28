# 🧩 Estudo Técnico — Camada de Abstração de Storage (`StorageProvider`) (Issue #144)

> **Status:** Estudo / Análise (não implementado)
> **Objetivo:** Detalhar a camada que permitirá **trocar a fonte de dados** (localStorage ↔ banco via API) **sem reescrever as rotinas** (agenda, CRM, financeiro, produtos, etc.), incluindo o *toggle* na config do Admin.
> **Complementa:** `ESTUDO_PERSISTENCIA_BANCO_144.md`, `ESTUDO_MODELO_DADOS_144.md`, `ESTUDO_BACKEND_API_144.md`, `ESTUDO_SEGURANCA_LGPD_144.md`.
> **Escopo:** contrato da abstração, providers, estratégia síncrono→assíncrono, plano de refatoração módulo a módulo, testes, toggle e rollback. **Nenhum código é alterado.**

---

## 1. Problema e Objetivo

Hoje cada módulo tem um objeto `XStorage` que fala **direto** com o `localStorage`, de forma **síncrona**:

```js
// Padrão atual (ex.: propostas.js) — SÍNCRONO
const PropostasStorage = {
  buscarTodos() { return JSON.parse(localStorage.getItem(chave) || "[]"); },
  adicionar(p) { /* ... */ localStorage.setItem(chave, JSON.stringify(lista)); return p; },
};
```

Queremos que a **fonte** (localStorage ou API/banco) seja intercambiável, sem que agenda/CRM/financeiro precisem saber qual é. A abstração introduz um único ponto de decisão: o **`StorageProvider`**.

---

## 2. Arquitetura

```
Módulos (agenda, crm, financeiro, produtos, pedidos, ...)
        │  usam XStorage.buscarTodos()/adicionar()/...
        ▼
  XStorage (fino)  ──delegam para──▶  StorageProvider (interface única)
                                          ├── LocalStorageProvider  (síncrono, atual)
                                          ├── ApiProvider           (assíncrono, HTTP→backend)
                                          └── InMemoryProvider       (testes)
```

- Os `XStorage` viram **camadas finas** que apenas chamam o provider com o nome da coleção.
- O provider ativo é escolhido em **um único lugar** (config), controlado pelo *toggle* do Admin.

---

## 3. Contrato do Provider (proposta)

```js
// Pseudocódigo de referência — NÃO implementado
const StorageProvider = {
  // colecao: "propostas" | "crm" | "financeiro" | ...
  // orgId: tenant atual (derivado da sessão)
  async list(colecao, orgId, opcoes = {}),          // { filtros, page, pageSize, sort } → { data, meta }
  async get(colecao, orgId, id),                    // → registro | null
  async insert(colecao, orgId, registro),           // → registro (com id)
  async update(colecao, orgId, id, dados),          // → registro
  async remove(colecao, orgId, id),                 // → { ok }
};
```

> **Decisão-chave:** o contrato é **assíncrono** (`async`) por definição, porque a API é assíncrona. O `LocalStorageProvider` implementa a mesma interface `async` (só resolve na hora) para manter **um contrato único**.

---

## 4. Implementações dos Providers

### 4.1 `LocalStorageProvider` (comportamento atual, embrulhado em Promise)
```js
const LocalStorageProvider = {
  _chave(colecao, orgId) { return `SCTEC_${colecao.toUpperCase()}_${orgId}`; },
  async list(colecao, orgId) {
    const arr = JSON.parse(localStorage.getItem(this._chave(colecao, orgId)) || "[]");
    return { data: arr, meta: { total: arr.length } };
  },
  async insert(colecao, orgId, registro) {
    const arr = (await this.list(colecao, orgId)).data;
    registro.id = Date.now().toString() + Math.random().toString(36).slice(2);
    arr.push(registro);
    localStorage.setItem(this._chave(colecao, orgId), JSON.stringify(arr));
    return registro;
  },
  // update/remove/get análogos
};
```

### 4.2 `ApiProvider` (fala com o backend — ver `ESTUDO_BACKEND_API_144.md`)
```js
const ApiProvider = {
  _base: "/api/v1",
  async _fetch(path, opts) {
    const res = await fetch(this._base + path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...(opts?.headers) },
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body?.error?.message || "Erro de API");
    return body;
  },
  async list(colecao, _orgId, opcoes = {}) {
    const qs = new URLSearchParams(opcoes).toString();
    const body = await this._fetch(`/${colecao}?${qs}`);
    return { data: body.data, meta: body.meta };
  },
  async insert(colecao, _orgId, registro) {
    const body = await this._fetch(`/${colecao}`, { method: "POST", body: JSON.stringify(registro) });
    return body.data;
  },
  // update/remove/get análogos ; orgId vem do token, não da query
};
```

### 4.3 `InMemoryProvider` (testes Jest)
```js
const InMemoryProvider = () => {
  const store = {}; // { "colecao:org": [...] }
  return { /* mesma interface, guardando em memória */ };
};
```

### 4.4 Seleção do provider ativo
```js
const StorageConfig = {
  // "local" (default/testes) | "api" (produção)
  _modo() { try { return localStorage.getItem("SCTEC_STORAGE_MODE") || "local"; } catch { return "local"; } },
  provider() { return this._modo() === "api" ? ApiProvider : LocalStorageProvider; },
};
```

---

## 5. Como os `XStorage` passam a usar o provider

Antes (síncrono, acoplado):
```js
const PropostasStorage = {
  buscarTodos() { return JSON.parse(localStorage.getItem(chave) || "[]"); },
};
```
Depois (fino, delegando — assíncrono):
```js
const PropostasStorage = {
  _colecao: "propostas",
  async buscarTodos() {
    const orgId = AuthService.obterSessao()?.orgId;
    const { data } = await StorageConfig.provider().list(this._colecao, orgId);
    return data;
  },
  async adicionar(p) {
    const orgId = AuthService.obterSessao()?.orgId;
    return StorageConfig.provider().insert(this._colecao, orgId, p);
  },
  // ...
};
```

> **Impacto:** os métodos viram `async`. Todo consumidor (`renderizarLista`, etc.) precisa usar `await`. Esse é o custo real da migração — ver §6.

---

## 6. Estratégia Síncrono → Assíncrono (o ponto crítico)

Três abordagens, com trade-offs:

| # | Estratégia | Como funciona | Prós | Contras |
|---|---|---|---|---|
| **A** | **Async total** | Todos os `XStorage` e chamadas viram `async/await` | Correto e definitivo | Refatoração ampla (toda UI que lê dados) |
| **B** | **Cache + sync em background** | Mantém API síncrona lendo de um cache em memória; sincroniza com a API em background | Migração incremental; UI quase intacta | Complexidade de sincronização; risco de dado obsoleto |
| **C** | **Híbrido por módulo** | Migra 1 módulo por vez para async, resto continua local | Risco controlado; entrega gradual | Conviver com dois modelos por um tempo |

**Recomendação:** **C + A** — migrar **módulo piloto** (Pedido de Venda) para async total, medir o esforço/UX, e então propagar. O `LocalStorageProvider` async garante que o piloto funcione mesmo antes do backend existir.

### 6.1 Checklist de refatoração de um módulo
- [ ] `XStorage.*` → `async`, delegando ao provider.
- [ ] Todos os `const x = XStorage.buscarTodos()` → `const x = await XStorage.buscarTodos()`.
- [ ] Funções que chamam isso (`renderizar*`, handlers) → `async`.
- [ ] Tratar estados de carregamento/erro na UI (spinner, mensagem).
- [ ] Testes do módulo passando com `InMemoryProvider`.

---

## 7. Plano de Refatoração Módulo a Módulo

Ordem sugerida (do mais isolado ao mais acoplado):

1. **Pedido de Venda** (piloto) — bom isolamento, já tocado recentemente.
2. **Produtos** e **Estoque** (posições/movimentações — atenção às transações).
3. **CRM** (depende de propostas para vínculo).
4. **Financeiro** (vínculos com pedido/CRM).
5. **Agenda**, **Entrada**.
6. **Núcleo**: `usuarios`, `papeis`, `filiais`, `params`, `aprovacoes`.

A cada módulo: manter o *toggle* permitindo voltar ao local se algo quebrar.

---

## 8. Toggle na Configuração do Admin (RF1 da #144)

- Chave `SCTEC_STORAGE_MODE` = `"local"` | `"api"` (persistida localmente por enquanto).
- UI na tela de config do Admin: switch **"Fonte de dados: localStorage (testes) ↔ Banco de dados (produção)"**.
- Quando `api`: exibir campo da **URL da API** (não a string do banco — credenciais ficam no backend).
- Modo `api` marcado como **preview/experimental** até o backend estar pronto.
- Trocar o modo **recarrega** a aplicação para reinicializar os providers com segurança.

---

## 9. Migração de Dados (local ↔ banco)

- Reaproveitar a **exportação/backup** já existente (`AuthService` gera backup assinado).
- Rotina "**Enviar dados locais para o banco**": lê cada coleção do localStorage e faz `POST` em lote na API (idempotente por id).
- Rotina inversa "**Baixar do banco para local**" para testes offline.
- **Fonte da verdade única por vez**: evitar escrever nos dois modos simultaneamente (risco de divergência).

---

## 10. Testes

- **Contrato do provider**: uma suíte que roda os mesmos casos contra `LocalStorageProvider`, `InMemoryProvider` e (com mock de `fetch`) `ApiProvider`.
- **Módulos**: usar `InMemoryProvider` no lugar do localStorage (o helper `loadModule`/`setup` pode injetar).
- Manter a suíte atual (Jest) verde; adaptar os mocks que hoje assumem localStorage síncrono.

---

## 11. Rollback e Segurança da Transição

- O *toggle* é o botão de pânico: voltar a `local` restaura o comportamento atual imediatamente.
- Nenhuma remoção do código de localStorage até o modo `api` estar validado em produção.
- Feature flag por ambiente; começar com o piloto habilitado só para o Admin.

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Refatoração async maior que o previsto | Medir no módulo piloto antes de propagar |
| Divergência de dados no modo híbrido | Fonte da verdade única; migração idempotente |
| Regressão de UX (telas "piscando") | Estados de loading/erro padronizados |
| Testes quebrando por async | Provider in-memory + adaptação dos mocks |
| Token expirado durante uso | Refresh automático no `ApiProvider` |

---

## 13. Perguntas em Aberto

- [ ] Estratégia **A (async total)** desde o piloto ou **B (cache)** para minimizar mudança de UI?
- [ ] O provider deve fazer **cache** local (offline-first) ou sempre buscar da API?
- [ ] Paginação: o front adota `page/pageSize` server-side já no piloto?
- [ ] Onde guardar o token JWT no front (memória vs `sessionStorage`) considerando XSS?
- [ ] O *toggle* fica por org (Admin decide) ou global do sistema?

---

## 14. Conclusão

A camada `StorageProvider` concentra num único ponto a decisão de "onde os dados vivem", permitindo o *toggle* localStorage↔banco pedido na #144 e uma migração **gradual, reversível e testável**. O maior custo é a transição **síncrono→assíncrono** dos módulos, que deve ser validada num **piloto (Pedido de Venda)** antes do rollout. Junto com os estudos de persistência, modelo de dados, backend/API e segurança/LGPD, este documento fecha o conjunto de análise para a decisão técnica da #144. **Nenhum código foi alterado.**
