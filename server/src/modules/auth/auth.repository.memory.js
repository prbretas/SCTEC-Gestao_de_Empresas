/**
 * auth.repository.memory.js — Repositório de usuários/orgs em memória (testes/dev).
 */
function criarAuthRepoMemoria() {
  const usuarios = [];
  const orgs = [];
  let seq = 1;

  return {
    async buscarPorEmail(email) {
      return usuarios.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
    },
    async criarOrg(nome) {
      const org = { id: String(seq++), nome };
      orgs.push(org);
      return org;
    },
    async criarUsuario({ nome, email, senhaHash, orgId, role }) {
      const u = { id: String(seq++), nome, email, senhaHash, orgId, role: role || "admin" };
      usuarios.push(u);
      return u;
    },
    async buscarPorId(id) {
      return usuarios.find((u) => u.id === id) || null;
    },
    _reset() { usuarios.length = 0; orgs.length = 0; seq = 1; },
  };
}

module.exports = { criarAuthRepoMemoria };
