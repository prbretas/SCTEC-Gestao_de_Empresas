/**
 * api-provider.js — Provider de dados via API REST (#144, Fase 2).
 *
 * Implementa o contrato ASSÍNCRONO do StorageProvider falando com o backend
 * (server/, Node/Express + PostgreSQL). É selecionado quando
 * StorageConfig.definirModo("api") está ativo.
 *
 * O fast-path síncrono NÃO é suportado numa fonte remota: os métodos *Sync
 * lançam erro explícito, forçando o uso da API assíncrona (await) — conforme
 * ESTUDO_STORAGE_PROVIDER_144.md.
 *
 * Mapeamento de coleção → recurso REST: por ora apenas "propostas" (piloto)
 * mapeia para /pedidos. Novas coleções entram aqui nas próximas fases.
 */

const ApiProvider = {
  nome: "api",

  BASE_KEY: "SCTEC_API_BASE",
  TOKEN_KEY: "SCTEC_API_TOKEN",

  _base() {
    try {
      return localStorage.getItem(this.BASE_KEY) || "http://localhost:3000/api/v1";
    } catch {
      return "http://localhost:3000/api/v1";
    }
  },

  definirBase(url) {
    try { localStorage.setItem(this.BASE_KEY, url); } catch { /* sem localStorage */ }
  },

  _token() {
    try { return localStorage.getItem(this.TOKEN_KEY) || null; } catch { return null; }
  },

  definirToken(token) {
    try {
      if (token) localStorage.setItem(this.TOKEN_KEY, token);
      else localStorage.removeItem(this.TOKEN_KEY);
    } catch { /* sem localStorage */ }
  },

  /** Coleção lógica → caminho REST. */
  _recurso(colecao) {
    const mapa = { propostas: "pedidos" };
    return mapa[colecao] || colecao;
  },

  async _fetch(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    const token = this._token();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(this._base() + path, { ...opts, headers });
    let body = null;
    try { body = await res.json(); } catch { /* 204 sem corpo */ }
    if (!res.ok || (body && body.ok === false)) {
      const msg = (body && body.error && body.error.message) || `Erro de API (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = body && body.error ? body.error.code : "ERRO_API";
      throw err;
    }
    return body;
  },

  // ── Contrato assíncrono ────────────────────────────────────────────────────

  async list(colecao, _orgId, opcoes = {}) {
    const qs = new URLSearchParams(opcoes.query || {}).toString();
    const path = `/${this._recurso(colecao)}${qs ? "?" + qs : ""}`;
    const body = await this._fetch(path);
    return { data: body.data || [], meta: body.meta || { total: (body.data || []).length } };
  },

  async get(colecao, _orgId, id) {
    const body = await this._fetch(`/${this._recurso(colecao)}/${encodeURIComponent(id)}`);
    return body ? body.data : null;
  },

  async insert(colecao, _orgId, registro) {
    const body = await this._fetch(`/${this._recurso(colecao)}`, {
      method: "POST",
      body: JSON.stringify(registro),
    });
    return body.data;
  },

  async update(colecao, _orgId, id, dados) {
    const body = await this._fetch(`/${this._recurso(colecao)}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(dados),
    });
    return body.data;
  },

  async remove(colecao, _orgId, id) {
    await this._fetch(`/${this._recurso(colecao)}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return { ok: true };
  },

  // ── Fast-path síncrono: indisponível numa fonte remota ─────────────────────

  _semSync() {
    throw new Error("ApiProvider não suporta acesso síncrono. Use a API assíncrona (await).");
  },
  listSync() { return this._semSync(); },
  getSync() { return this._semSync(); },
  insertSync() { return this._semSync(); },
  updateSync() { return this._semSync(); },
  removeSync() { return this._semSync(); },
  replaceAllSync() { return this._semSync(); },
};

window.ApiProvider = ApiProvider;
