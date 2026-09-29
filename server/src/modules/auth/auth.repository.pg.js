/**
 * auth.repository.pg.js — Repositório de usuários/orgs no PostgreSQL.
 * Queries parametrizadas. Uma organização é criada junto do primeiro usuário
 * (que vira admin), espelhando o comportamento do SCTEC.
 */
const { query } = require("../../config/db");

module.exports = {
  async buscarPorEmail(email) {
    const r = await query("SELECT * FROM usuarios WHERE lower(email) = lower($1)", [email]);
    if (r.rows.length === 0) return null;
    const u = r.rows[0];
    return { id: String(u.id), nome: u.nome, email: u.email, senhaHash: u.senha_hash, orgId: String(u.org_id), role: u.role };
  },
  async criarOrg(nome) {
    const r = await query("INSERT INTO orgs (nome) VALUES ($1) RETURNING *", [nome]);
    return { id: String(r.rows[0].id), nome: r.rows[0].nome };
  },
  async criarUsuario({ nome, email, senhaHash, orgId, role }) {
    const r = await query(
      "INSERT INTO usuarios (nome, email, senha_hash, org_id, role) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [nome, email, senhaHash, orgId, role || "admin"]
    );
    const u = r.rows[0];
    return { id: String(u.id), nome: u.nome, email: u.email, senhaHash: u.senha_hash, orgId: String(u.org_id), role: u.role };
  },
  async buscarPorId(id) {
    const r = await query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (r.rows.length === 0) return null;
    const u = r.rows[0];
    return { id: String(u.id), nome: u.nome, email: u.email, senhaHash: u.senha_hash, orgId: String(u.org_id), role: u.role };
  },
};
