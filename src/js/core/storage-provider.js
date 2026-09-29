/**
 * storage-provider.js — Camada de abstração de persistência (#144, Fase 1).
 *
 * Introduz uma interface única (`StorageProvider`) para onde os dados vivem,
 * permitindo trocar a fonte (localStorage ↔ banco via API) sem reescrever as
 * rotinas. Nesta Fase 1 apenas o `LocalStorageProvider` está ativo — o
 * comportamento é idêntico ao atual, então nada quebra.
 *
 * Contrato ASSÍNCRONO (definitivo, alinhado ao ESTUDO_STORAGE_PROVIDER_144.md):
 *   list(colecao, orgId, opcoes)   → Promise<{ data, meta }>
 *   get(colecao, orgId, id)        → Promise<registro|null>
 *   insert(colecao, orgId, reg)    → Promise<registro>
 *   update(colecao, orgId, id, d)  → Promise<registro|null>
 *   remove(colecao, orgId, id)     → Promise<{ ok }>
 *
 * Fast-path SÍNCRONO (transição — mantém os consumidores atuais funcionando
 * enquanto a migração para async é gradual):
 *   listSync / getSync / insertSync / updateSync / removeSync
 *
 * O `ApiProvider` (banco via backend) será adicionado na Fase 2; ele implementa
 * apenas o contrato assíncrono (o fast-path síncrono lança erro, forçando o uso
 * de await onde a fonte remota exigir).
 */

/** Gera um ID único mesmo em chamadas no mesmo milissegundo. */
function _gerarIdStorage() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

// ─── LocalStorageProvider ─────────────────────────────────────────────────────

const LocalStorageProvider = {
  nome: "local",

  /** Monta a chave de storage: SCTEC_{COLECAO}_{orgId}. */
  _chave(colecao, orgId) {
    const tenant = orgId || "local";
    return `SCTEC_${String(colecao).toUpperCase()}_${tenant}`;
  },

  // ── Fast-path síncrono (localStorage é síncrono por natureza) ──────────────

  listSync(colecao, orgId) {
    try {
      return JSON.parse(localStorage.getItem(this._chave(colecao, orgId)) || "[]");
    } catch {
      return [];
    }
  },

  getSync(colecao, orgId, id) {
    return this.listSync(colecao, orgId).find((r) => r.id === id) || null;
  },

  insertSync(colecao, orgId, registro) {
    const lista = this.listSync(colecao, orgId);
    if (!registro.id) registro.id = _gerarIdStorage();
    lista.push(registro);
    this._salvar(colecao, orgId, lista);
    return registro;
  },

  updateSync(colecao, orgId, id, dados) {
    const lista = this.listSync(colecao, orgId);
    const idx = lista.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    lista[idx] = { ...lista[idx], ...dados, id };
    this._salvar(colecao, orgId, lista);
    return lista[idx];
  },

  removeSync(colecao, orgId, id) {
    const lista = this.listSync(colecao, orgId);
    const novos = lista.filter((r) => r.id !== id);
    this._salvar(colecao, orgId, novos);
    return { ok: novos.length !== lista.length };
  },

  /** Substitui a coleção inteira (usado por migração/compat). */
  replaceAllSync(colecao, orgId, lista) {
    this._salvar(colecao, orgId, Array.isArray(lista) ? lista : []);
  },

  _salvar(colecao, orgId, lista) {
    localStorage.setItem(this._chave(colecao, orgId), JSON.stringify(lista));
  },

  // ── Contrato assíncrono (envolve o fast-path em Promise) ───────────────────

  async list(colecao, orgId, opcoes = {}) {
    let data = this.listSync(colecao, orgId);
    if (opcoes.filtro && typeof opcoes.filtro === "function") {
      data = data.filter(opcoes.filtro);
    }
    return { data, meta: { total: data.length } };
  },
  async get(colecao, orgId, id) { return this.getSync(colecao, orgId, id); },
  async insert(colecao, orgId, registro) { return this.insertSync(colecao, orgId, registro); },
  async update(colecao, orgId, id, dados) { return this.updateSync(colecao, orgId, id, dados); },
  async remove(colecao, orgId, id) { return this.removeSync(colecao, orgId, id); },
};

// ─── Seleção do provider ativo (toggle) ───────────────────────────────────────

const StorageConfig = {
  MODE_KEY: "SCTEC_STORAGE_MODE",

  /** Modo atual: "local" (padrão/testes) ou "api" (banco — Fase 2). */
  modo() {
    try {
      return localStorage.getItem(this.MODE_KEY) || "local";
    } catch {
      return "local";
    }
  },

  /** Define o modo de persistência (usado pelo toggle do Admin na Fase 3). */
  definirModo(modo) {
    try {
      localStorage.setItem(this.MODE_KEY, modo === "api" ? "api" : "local");
    } catch { /* ambiente sem localStorage */ }
  },

  /** Retorna o provider ativo. Na Fase 1 sempre o local. */
  provider() {
    // Fase 2: if (this.modo() === "api" && window.ApiProvider) return window.ApiProvider;
    return LocalStorageProvider;
  },
};

// ─── Fachada StorageProvider (delega ao provider ativo) ────────────────────────

const StorageProvider = {
  // Assíncrono
  async list(colecao, orgId, opcoes) { return StorageConfig.provider().list(colecao, orgId, opcoes); },
  async get(colecao, orgId, id) { return StorageConfig.provider().get(colecao, orgId, id); },
  async insert(colecao, orgId, registro) { return StorageConfig.provider().insert(colecao, orgId, registro); },
  async update(colecao, orgId, id, dados) { return StorageConfig.provider().update(colecao, orgId, id, dados); },
  async remove(colecao, orgId, id) { return StorageConfig.provider().remove(colecao, orgId, id); },

  // Fast-path síncrono (disponível enquanto o provider ativo suportar)
  listSync(colecao, orgId) {
    const p = StorageConfig.provider();
    if (typeof p.listSync !== "function") throw new Error("Provider atual não suporta acesso síncrono. Use a API assíncrona.");
    return p.listSync(colecao, orgId);
  },
  getSync(colecao, orgId, id) { return StorageConfig.provider().getSync(colecao, orgId, id); },
  insertSync(colecao, orgId, registro) { return StorageConfig.provider().insertSync(colecao, orgId, registro); },
  updateSync(colecao, orgId, id, dados) { return StorageConfig.provider().updateSync(colecao, orgId, id, dados); },
  removeSync(colecao, orgId, id) { return StorageConfig.provider().removeSync(colecao, orgId, id); },
  replaceAllSync(colecao, orgId, lista) { return StorageConfig.provider().replaceAllSync(colecao, orgId, lista); },

  gerarId: _gerarIdStorage,
};

window.StorageProvider = StorageProvider;
window.StorageConfig = StorageConfig;
window.LocalStorageProvider = LocalStorageProvider;
