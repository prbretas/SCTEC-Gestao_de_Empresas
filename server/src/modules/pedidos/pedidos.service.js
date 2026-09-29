/**
 * pedidos.service.js — Regras de negócio do Pedido de Venda.
 * Recebe o repositório por injeção (facilita testes com repo in-memory).
 */
function criarPedidosService(repo) {
  function _validar(dados) {
    const erros = {};
    if (!dados || !String(dados.titulo || "").trim()) erros.titulo = "obrigatório";
    if (!dados || !String(dados.empresaId || "").trim()) erros.empresaId = "obrigatório";
    return erros;
  }

  function _calcularTotal(itens) {
    return (itens || []).reduce((s, i) => s + Number(i.qtd || 0) * Number(i.valor || 0), 0);
  }

  return {
    async listar(orgId) {
      return repo.list(orgId);
    },
    async obter(orgId, id) {
      return repo.get(orgId, id);
    },
    async criar(orgId, dados, usuarioId) {
      const erros = _validar(dados);
      if (Object.keys(erros).length) {
        const e = new Error("Dados inválidos.");
        e.status = 400; e.code = "VALIDACAO"; e.fields = erros;
        throw e;
      }
      const total = _calcularTotal(dados.itens);
      return repo.insert(orgId, { ...dados, total, criadoPorId: usuarioId });
    },
    async atualizar(orgId, id, dados) {
      const erros = _validar(dados);
      if (Object.keys(erros).length) {
        const e = new Error("Dados inválidos.");
        e.status = 400; e.code = "VALIDACAO"; e.fields = erros;
        throw e;
      }
      const total = _calcularTotal(dados.itens);
      const atualizado = await repo.update(orgId, id, { ...dados, total });
      if (!atualizado) {
        const e = new Error("Pedido não encontrado."); e.status = 404; e.code = "NAO_ENCONTRADO"; throw e;
      }
      return atualizado;
    },
    async remover(orgId, id) {
      const r = await repo.remove(orgId, id);
      if (!r.ok) {
        const e = new Error("Pedido não encontrado."); e.status = 404; e.code = "NAO_ENCONTRADO"; throw e;
      }
      return r;
    },
  };
}

module.exports = { criarPedidosService };
