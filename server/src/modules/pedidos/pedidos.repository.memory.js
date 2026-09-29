/**
 * pedidos.repository.memory.js — Repositório em memória (para testes e dev
 * sem banco). Implementa o mesmo contrato do repositório PostgreSQL.
 * Isolamento por orgId. Itens do pedido guardados junto (JSON).
 */
function criarRepoMemoria() {
  /** @type {Map<string, Array>} chave = orgId → lista de pedidos */
  const store = new Map();

  function _lista(orgId) {
    if (!store.has(orgId)) store.set(orgId, []);
    return store.get(orgId);
  }

  function _gerarId() {
    return Date.now().toString() + Math.random().toString(36).slice(2);
  }

  return {
    async list(orgId) {
      return _lista(orgId).slice().sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    },
    async get(orgId, id) {
      return _lista(orgId).find((p) => p.id === id) || null;
    },
    async insert(orgId, dados) {
      const pedido = {
        ...dados,
        id: _gerarId(),
        orgId,
        itens: Array.isArray(dados.itens) ? dados.itens : [],
        total: Number(dados.total || 0),
        criadoEm: new Date().toISOString(),
        atualizadoEm: null,
      };
      _lista(orgId).push(pedido);
      return pedido;
    },
    async update(orgId, id, dados) {
      const lista = _lista(orgId);
      const idx = lista.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      lista[idx] = {
        ...lista[idx],
        ...dados,
        id,
        orgId,
        itens: Array.isArray(dados.itens) ? dados.itens : lista[idx].itens,
        atualizadoEm: new Date().toISOString(),
      };
      return lista[idx];
    },
    async remove(orgId, id) {
      const lista = _lista(orgId);
      const antes = lista.length;
      const novos = lista.filter((p) => p.id !== id);
      store.set(orgId, novos);
      return { ok: novos.length !== antes };
    },
    _reset() { store.clear(); },
  };
}

module.exports = { criarRepoMemoria };
