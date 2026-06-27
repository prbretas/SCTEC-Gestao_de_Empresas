/**
 * admin.js — Painel de controle do Administrador.
 * Permite gerenciar usuários da organização: ativar/desativar, alterar perfil, remover.
 * Acesso exclusivo ao Admin.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Guard — apenas Admin
  const sessao = AuthService.requireAuth(true);
  if (!sessao) return;

  // Aplica config visual da organização
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Exibe identidade e nome da org
  document.getElementById("admin-identidade").textContent = sessao.identidade || `${sessao.nome}#${sessao.id}`;
  const org = AuthService.buscarOrgPorId(sessao.orgId);
  if (org) {
    document.getElementById("admin-org-nome").textContent = `Org: ${org.nome}`;
    document.getElementById("codigo-convite-display").textContent = org.codigoConvite;
  }

  // Copiar código de convite
  document.getElementById("btn-copiar-convite")?.addEventListener("click", copiarCodigo);
  document.getElementById("btn-copiar-codigo")?.addEventListener("click", copiarCodigo);

  function copiarCodigo() {
    const codigo = document.getElementById("codigo-convite-display").textContent;
    if (!codigo) return;
    navigator.clipboard.writeText(codigo).then(() => {
      alert(`✅ Código copiado: ${codigo}\nCompartilhe com novos usuários para convidá-los.`);
    }).catch(() => {
      prompt("Copie o código abaixo:", codigo);
    });
  }

  renderizarUsuarios();
});

/**
 * Renderiza a lista de usuários da organização atual.
 */
function renderizarUsuarios() {
  const sessao = AuthService.obterSessao();
  const tbody = document.getElementById("admin-usuarios-lista");
  if (!tbody || !sessao) return;

  const todos = AuthService.obterUsuarios();
  const membros = todos.filter((u) => u.orgId === sessao.orgId);

  if (membros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum usuário encontrado na organização.</td></tr>`;
    return;
  }

  tbody.innerHTML = membros.map((u) => {
    const isAtivo = u.ativo !== false; // default true
    const isAdmin = u.role === "admin";
    const isSelf = u.id === sessao.id;
    const dataCad = u.dataCadastro
      ? new Date(u.dataCadastro).toLocaleDateString("pt-BR")
      : "N/D";

    const roleBadge = isAdmin
      ? `<span class="badge bg-warning text-dark">👑 Admin</span>`
      : `<span class="badge bg-secondary">👤 Usuário</span>`;

    const statusBadge = isAtivo
      ? `<span class="badge bg-success">✅ Ativo</span>`
      : `<span class="badge bg-danger">❌ Inativo</span>`;

    const acoes = isSelf
      ? `<span class="text-muted small">— você mesmo —</span>`
      : `
        <button class="btn btn-xs btn-outline-${isAtivo ? "warning" : "success"} me-1"
          onclick="toggleAtivo('${u.id}')" title="${isAtivo ? "Desativar" : "Ativar"} acesso">
          ${isAtivo ? "🚫 Desativar" : "✅ Ativar"}
        </button>
        <button class="btn btn-xs btn-outline-primary me-1"
          onclick="toggleRole('${u.id}')" title="${isAdmin ? "Rebaixar para Usuário" : "Promover a Admin"}">
          ${isAdmin ? "⬇️ Usuário" : "⬆️ Admin"}
        </button>
        <button class="btn btn-xs btn-outline-danger"
          onclick="removerUsuario('${u.id}', '${u.nome}')" title="Remover da organização">
          🗑️
        </button>`;

    return `
      <tr class="${isAtivo ? "" : "table-secondary text-muted"}">
        <td>
          <div class="fw-bold">${u.nome}<span class="text-muted fw-normal">#${u.id}</span></div>
        </td>
        <td>${roleBadge}</td>
        <td class="small">${dataCad}</td>
        <td>${statusBadge}</td>
        <td class="text-center">${acoes}</td>
      </tr>`;
  }).join("");
}

/**
 * Ativa ou desativa o acesso de um usuário.
 */
function toggleAtivo(userId) {
  const usuarios = AuthService.obterUsuarios();
  const idx = usuarios.findIndex((u) => u.id === userId);
  if (idx === -1) return;

  const novoStatus = usuarios[idx].ativo === false ? true : false;
  const acao = novoStatus ? "ativar" : "desativar";

  if (!confirm(`Deseja ${acao} o acesso de "${usuarios[idx].nome}#${usuarios[idx].id}"?`)) return;

  usuarios[idx].ativo = novoStatus;
  AuthService.salvarUsuarios(usuarios);
  renderizarUsuarios();
}

/**
 * Alterna o perfil do usuário entre admin e user.
 */
function toggleRole(userId) {
  const sessao = AuthService.obterSessao();
  const usuarios = AuthService.obterUsuarios();
  const idx = usuarios.findIndex((u) => u.id === userId);
  if (idx === -1) return;

  const novoRole = usuarios[idx].role === "admin" ? "user" : "admin";
  const acao = novoRole === "admin" ? "promover a Admin" : "rebaixar para Usuário";

  if (!confirm(`Deseja ${acao} "${usuarios[idx].nome}#${usuarios[idx].id}"?`)) return;

  // Garante que a org sempre tenha pelo menos 1 admin
  if (novoRole === "user") {
    const adminsRestantes = usuarios.filter(
      (u) => u.orgId === sessao.orgId && u.role === "admin" && u.id !== userId
    );
    if (adminsRestantes.length === 0) {
      return alert("⚠️ Não é possível rebaixar o único Admin da organização.");
    }
  }

  usuarios[idx].role = novoRole;
  AuthService.salvarUsuarios(usuarios);
  renderizarUsuarios();
}

/**
 * Remove um usuário da organização (desvincula, não exclui a conta).
 */
function removerUsuario(userId, nome) {
  const sessao = AuthService.obterSessao();
  if (!confirm(`Remover "${nome}#${userId}" da organização?\nO usuário perderá acesso aos dados compartilhados.`)) return;

  const usuarios = AuthService.obterUsuarios();
  const idx = usuarios.findIndex((u) => u.id === userId);
  if (idx === -1) return;

  // Garante ao menos 1 admin restante
  if (usuarios[idx].role === "admin") {
    const adminsRestantes = usuarios.filter(
      (u) => u.orgId === sessao.orgId && u.role === "admin" && u.id !== userId
    );
    if (adminsRestantes.length === 0) {
      return alert("⚠️ Não é possível remover o único Admin da organização.");
    }
  }

  // Desvincula da org (não deleta a conta)
  usuarios[idx].orgId = null;
  usuarios[idx].role = "user";
  AuthService.salvarUsuarios(usuarios);
  renderizarUsuarios();
}
