/**
 * pedidos.repository.pg.js — Repositório PostgreSQL do Pedido de Venda.
 * Usa queries PARAMETRIZADAS (proteção contra SQL Injection). Os itens são
 * gravados na tabela pedido_itens (1:N). Todas as consultas filtram por org_id.
 */
const { query } = require("../../config/db");

function _mapPedido(row, itens = []) {
  return {
    id: String(row.id),
    orgId: String(row.org_id),
    numero: row.numero,
    titulo: row.titulo,
    empresaId: row.empresa_id != null ? String(row.empresa_id) : null,
    status: row.status,
    total: Number(row.total),
    validade: row.validade,
    obs: row.obs,
    criadoPorId: row.criado_por_id != null ? String(row.criado_por_id) : null,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    itens: itens.map((i) => ({
      id: String(i.id),
      produtoId: i.produto_id != null ? String(i.produto_id) : null,
      descricao: i.descricao,
      qtd: Number(i.qtd),
      valor: Number(i.valor_unit),
    })),
  };
}

async function _itensDoPedido(pedidoId) {
  const r = await query("SELECT * FROM pedido_itens WHERE pedido_id = $1 ORDER BY id", [pedidoId]);
  return r.rows;
}

async function _inserirItens(pedidoId, itens) {
  for (const it of itens || []) {
    await query(
      "INSERT INTO pedido_itens (pedido_id, produto_id, descricao, qtd, valor_unit) VALUES ($1,$2,$3,$4,$5)",
      [pedidoId, it.produtoId || null, it.descricao || null, Number(it.qtd || 1), Number(it.valor || 0)]
    );
  }
}

module.exports = {
  async list(orgId) {
    const r = await query(
      "SELECT * FROM pedidos_venda WHERE org_id = $1 ORDER BY criado_em DESC",
      [orgId]
    );
    const pedidos = [];
    for (const row of r.rows) {
      pedidos.push(_mapPedido(row, await _itensDoPedido(row.id)));
    }
    return pedidos;
  },

  async get(orgId, id) {
    const r = await query("SELECT * FROM pedidos_venda WHERE org_id = $1 AND id = $2", [orgId, id]);
    if (r.rows.length === 0) return null;
    return _mapPedido(r.rows[0], await _itensDoPedido(id));
  },

  async insert(orgId, dados) {
    const r = await query(
      `INSERT INTO pedidos_venda (org_id, numero, titulo, empresa_id, status, total, validade, obs, criado_por_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [orgId, dados.numero || null, dados.titulo, dados.empresaId || null, dados.status || "rascunho",
        Number(dados.total || 0), dados.validade || null, dados.obs || null, dados.criadoPorId || null]
    );
    const pedido = r.rows[0];
    await _inserirItens(pedido.id, dados.itens);
    return _mapPedido(pedido, await _itensDoPedido(pedido.id));
  },

  async update(orgId, id, dados) {
    const r = await query(
      `UPDATE pedidos_venda SET titulo=$3, empresa_id=$4, status=$5, total=$6, validade=$7, obs=$8, numero=$9,
         atualizado_em=now()
       WHERE org_id=$1 AND id=$2 RETURNING *`,
      [orgId, id, dados.titulo, dados.empresaId || null, dados.status || "rascunho",
        Number(dados.total || 0), dados.validade || null, dados.obs || null, dados.numero || null]
    );
    if (r.rows.length === 0) return null;
    // Regrava itens (simples: apaga e reinsere)
    await query("DELETE FROM pedido_itens WHERE pedido_id = $1", [id]);
    await _inserirItens(id, dados.itens);
    return _mapPedido(r.rows[0], await _itensDoPedido(id));
  },

  async remove(orgId, id) {
    const r = await query("DELETE FROM pedidos_venda WHERE org_id=$1 AND id=$2", [orgId, id]);
    return { ok: r.rowCount > 0 };
  },
};
