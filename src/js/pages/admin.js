/**
 * admin.js — Painel de controle do Administrador.
 * Permite gerenciar usuários da organização: ativar/desativar, alterar perfil, remover, atribuir papel.
 * Permite criar, editar e excluir papéis de trabalho.
 * Acesso exclusivo ao Admin.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Guard — apenas Admin
  const sessao = AuthService.requireAuth(true);
  if (!sessao) return;

  // Aplica config visual da organização
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Renderiza navbar padronizado
  if (window.NavbarController) NavbarController.init("admin");
  if (window.ThemeController) ThemeController.init();

  // Exibe identidade no campo legado (caso ainda exista em outro contexto)
  const elIdentidade = document.getElementById("admin-identidade");
  if (elIdentidade) elIdentidade.textContent = sessao.identidade || `${sessao.nome}#${sessao.id}`;
  const org = AuthService.buscarOrgPorId(sessao.orgId);
  if (org) {
    const elOrg = document.getElementById("admin-org-nome");
    if (elOrg) elOrg.textContent = `Org: ${org.nome}`;
    const elCodigo = document.getElementById("codigo-convite-display");
    if (elCodigo) elCodigo.textContent = org.codigoConvite;
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

  // ─── Papéis de Trabalho ───────────────────────────────────────────────────

  document.getElementById("btn-novo-papel")?.addEventListener("click", () => {
    abrirFormPapel();
  });

  document.getElementById("btn-salvar-papel")?.addEventListener("click", salvarPapel);
  document.getElementById("btn-cancelar-papel")?.addEventListener("click", fecharFormPapel);

  renderizarUsuarios();
  renderizarPapeis();
  renderizarAprovacoes();

  // ─── Cadastrar Usuário pelo Admin (#110) ────────────────────────────────
  document.getElementById("btn-criar-usuario")?.addEventListener("click", () => {
    const modalEl = document.getElementById("modal-criar-usuario");
    if (modalEl) {
      document.getElementById("form-criar-usuario")?.reset();
      _preencherPapeisNovoUsuario();
      new bootstrap.Modal(modalEl).show();
    }
  });

  document.getElementById("form-criar-usuario")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("novo-user-nome")?.value.trim();
    const role = document.getElementById("novo-user-role")?.value || "user";
    const papelId = document.getElementById("novo-user-papel")?.value || "";

    const resultado = await AuthService.criarUsuarioPeloAdmin(nome, role, papelId);
    if (!resultado.ok) {
      alert(`⚠️ ${resultado.erro}`);
      return;
    }

    // Mostra a senha gerada
    const senhaDisplay = document.getElementById("novo-user-senha-gerada");
    const senhaContainer = document.getElementById("novo-user-resultado");
    if (senhaDisplay && senhaContainer) {
      senhaDisplay.textContent = resultado.senhaGerada;
      senhaContainer.classList.remove("d-none");
    }

    renderizarUsuarios();
  });

  document.getElementById("btn-copiar-senha-gerada")?.addEventListener("click", () => {
    const senha = document.getElementById("novo-user-senha-gerada")?.textContent;
    if (senha) {
      navigator.clipboard.writeText(senha).then(() => alert("✅ Senha copiada!")).catch(() => prompt("Copie:", senha));
    }
  });
});

// ─── Usuários ─────────────────────────────────────────────────────────────────

function _preencherPapeisNovoUsuario() {
  const sessao = AuthService.obterSessao();
  const sel = document.getElementById("novo-user-papel");
  if (!sel || !sessao || !window.RolesController) return;
  const papeis = RolesController.obterPorOrg(sessao.orgId);
  sel.innerHTML = `<option value="">— Sem papel —</option>` +
    papeis.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
}

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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum usuário encontrado na organização.</td></tr>`;
    return;
  }

  const papeis = RolesController.obterPorOrg(sessao.orgId);

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

    // Seletor de papel de trabalho
    const papelAtual = u.papelId || "";
    const opcoesPapeis = papeis.map((p) =>
      `<option value="${p.id}" ${papelAtual === p.id ? "selected" : ""}>${p.nome}</option>`
    ).join("");
    const seletorPapel = isSelf
      ? `<span class="text-muted small">${papeis.find((p) => p.id === papelAtual)?.nome || "—"}</span>`
      : `<select class="form-select form-select-sm" style="min-width:120px"
            onchange="atribuirPapel('${u.id}', this.value)"
            aria-label="Papel de trabalho de ${u.nome}">
          <option value="">— sem papel —</option>
          ${opcoesPapeis}
        </select>`;

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
        <td>${seletorPapel}</td>
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
  usuarios[idx].papelId = null;
  AuthService.salvarUsuarios(usuarios);
  renderizarUsuarios();
}

/**
 * Atribui (ou remove) um papel de trabalho a um usuário.
 * @param {string} userId
 * @param {string} papelId - string vazia para remover
 */
function atribuirPapel(userId, papelId) {
  const resultado = RolesController.atribuirPapel(userId, papelId || null);
  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
  }
  renderizarUsuarios();
}

// ─── Papéis de Trabalho ────────────────────────────────────────────────────────

/**
 * Renderiza a tabela de papéis de trabalho.
 */
function renderizarPapeis() {
  const sessao = AuthService.obterSessao();
  const tbody = document.getElementById("admin-papeis-lista");
  if (!tbody || !sessao) return;

  const papeis = RolesController.obterPorOrg(sessao.orgId);

  if (papeis.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum papel criado. Clique em "➕ Novo Papel" para começar.</td></tr>`;
    return;
  }

  // Módulos disponíveis para papéis (exclui adminOnly)
  const modulosDisponiveis = MODULOS_CATALOGO.filter((m) => !m.adminOnly);

  tbody.innerHTML = papeis.map((p) => {
    const qtdUsuarios = RolesController.contarUsuariosPorPapel(sessao.orgId, p.id);
    const podeExcluir = qtdUsuarios === 0;
    const permitidos = p.modulosPermitidos || null;

    // Badge de módulos
    const badgesModulos = modulosDisponiveis.map((m) => {
      const ativo = permitidos === null || (Array.isArray(permitidos) && permitidos.includes(m.id));
      return `<span class="badge me-1 ${ativo ? "bg-success" : "bg-light text-muted border"}" title="${m.label}">${m.icon}</span>`;
    }).join("");

    const badgeVerTodos = p.podeVerTodos
      ? `<span class="badge bg-info text-dark ms-1" title="Pode ver registros de todos">👁️ Ver todos</span>`
      : "";

    return `
      <tr>
        <td class="fw-semibold">${p.nome}</td>
        <td>
          <span class="font-monospace small">${p.codigoConvite}</span>
          <button class="btn btn-xs btn-outline-secondary ms-2"
            onclick="copiarCodigoPapel('${p.codigoConvite}')" title="Copiar código">
            📋
          </button>
        </td>
        <td>${badgesModulos}${badgeVerTodos}</td>
        <td class="text-center">
          <span class="badge ${qtdUsuarios > 0 ? "bg-primary" : "bg-light text-dark border"}">
            ${qtdUsuarios} usuário${qtdUsuarios !== 1 ? "s" : ""}
          </span>
        </td>
        <td class="text-center">
          <button class="btn btn-xs btn-outline-primary me-1"
            onclick="editarPapel('${p.id}', decodeURIComponent('${encodeURIComponent(p.nome)}'))"
            title="Editar papel">
            ✏️ Editar
          </button>
          <button class="btn btn-xs btn-outline-danger ${podeExcluir ? "" : "disabled"}"
            onclick="${podeExcluir ? `excluirPapel('${p.id}', decodeURIComponent('${encodeURIComponent(p.nome)}'))` : "return false"}"
            title="${podeExcluir ? "Excluir papel" : "Não é possível excluir: há usuários vinculados"}"
            ${!podeExcluir ? 'aria-disabled="true"' : ""}>
            🗑️ Excluir
          </button>
        </td>
      </tr>`;
  }).join("");
}

/**
 * Abre o formulário para criar ou editar um papel.
 * @param {string} [id] - se informado, modo edição
 * @param {string} [nomeAtual] - nome atual do papel (modo edição)
 */
function abrirFormPapel(id = "", nomeAtual = "") {
  const card = document.getElementById("card-form-papel");
  const inputNome = document.getElementById("input-nome-papel");
  const inputId = document.getElementById("input-papel-id");
  const titulo = document.getElementById("form-papel-titulo");
  const containerModulos = document.getElementById("modulos-papel-checkboxes");

  if (!card) return;

  inputId.value = id;
  inputNome.value = nomeAtual;
  titulo.textContent = id ? "Editar Papel" : "Novo Papel";

  // Obtém dados do papel atual (modo edição) ou defaults (modo criação)
  const sessao = AuthService.obterSessao();
  let permitidos = null;
  let podeVerTodos = false;
  if (id && sessao) {
    const papel = RolesController.buscarPorId(sessao.orgId, id);
    permitidos = papel ? papel.modulosPermitidos : null;
    podeVerTodos = papel?.podeVerTodos === true;
  }

  // Renderiza checkboxes dos módulos (exclui adminOnly)
  if (containerModulos) {
    const modulosDisponiveis = MODULOS_CATALOGO.filter((m) => !m.adminOnly);
    containerModulos.innerHTML = modulosDisponiveis.map((m) => {
      const checked = permitidos === null || permitidos.includes(m.id) ? "checked" : "";
      return `
        <div class="form-check form-check-inline mb-2">
          <input class="form-check-input modulo-checkbox" type="checkbox"
            id="mod-check-${m.id}" value="${m.id}" ${checked} />
          <label class="form-check-label" for="mod-check-${m.id}">
            ${m.icon} ${m.label}
          </label>
        </div>`;
    }).join("");
  }

  // Define estado do checkbox podeVerTodos
  const cbVerTodos = document.getElementById("input-papel-ver-todos");
  if (cbVerTodos) cbVerTodos.checked = podeVerTodos;

  card.classList.remove("d-none");
  inputNome.focus();
}
/**
 * Fecha o formulário de papel sem salvar.
 */
function fecharFormPapel() {
  const card = document.getElementById("card-form-papel");
  if (!card) return;
  card.classList.add("d-none");
  document.getElementById("input-nome-papel").value = "";
  document.getElementById("input-papel-id").value = "";
  const containerModulos = document.getElementById("modulos-papel-checkboxes");
  if (containerModulos) containerModulos.innerHTML = "";
  const cbVerTodos = document.getElementById("input-papel-ver-todos");
  if (cbVerTodos) cbVerTodos.checked = false;
}

/**
 * Salva o papel (cria ou edita), incluindo modulosPermitidos e podeVerTodos.
 */
function salvarPapel() {
  const sessao = AuthService.obterSessao();
  if (!sessao) return;

  const nome = document.getElementById("input-nome-papel")?.value.trim();
  const papelId = document.getElementById("input-papel-id")?.value;
  const podeVerTodos = document.getElementById("input-papel-ver-todos")?.checked === true;

  // Coleta os módulos marcados
  const checkboxes = document.querySelectorAll(".modulo-checkbox");
  const modulosMarcados = Array.from(checkboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  // Se todos marcados → null (sem restrição); se parcial → array com selecionados
  const modulosDisponiveis = MODULOS_CATALOGO.filter((m) => !m.adminOnly);
  const modulosPermitidos = modulosMarcados.length === modulosDisponiveis.length
    ? null
    : modulosMarcados;

  let resultado;
  if (papelId) {
    resultado = RolesController.editar(sessao.orgId, papelId, nome);
    if (resultado.ok) {
      RolesController.definirModulos(sessao.orgId, papelId, modulosPermitidos);
      RolesController.setPodeVerTodos(sessao.orgId, papelId, podeVerTodos);
    }
  } else {
    const org = AuthService.buscarOrgPorId(sessao.orgId);
    resultado = RolesController.criar(sessao.orgId, nome, org ? org.codigoConvite : sessao.orgId);
    if (resultado.ok) {
      RolesController.definirModulos(sessao.orgId, resultado.papel.id, modulosPermitidos);
      RolesController.setPodeVerTodos(sessao.orgId, resultado.papel.id, podeVerTodos);
    }
  }

  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }

  fecharFormPapel();
  renderizarPapeis();
  renderizarUsuarios();
}

/**
 * Abre o formulário em modo edição para um papel existente.
 * @param {string} papelId
 * @param {string} nomeAtual
 */
function editarPapel(papelId, nomeAtual) {
  abrirFormPapel(papelId, nomeAtual);
}

/**
 * Exclui um papel de trabalho após confirmação.
 * @param {string} papelId
 * @param {string} nome
 */
function excluirPapel(papelId, nome) {
  const sessao = AuthService.obterSessao();
  if (!sessao) return;

  if (!confirm(`Excluir o papel "${nome}"?`)) return;

  const resultado = RolesController.remover(sessao.orgId, papelId);
  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }

  renderizarPapeis();
  renderizarUsuarios();
}

/**
 * Copia o código de convite de um papel para a área de transferência.
 * @param {string} codigo
 */
function copiarCodigoPapel(codigo) {
  navigator.clipboard.writeText(codigo).then(() => {
    alert(`✅ Código copiado: ${codigo}\nCompartilhe com usuários que devem entrar com este papel.`);
  }).catch(() => {
    prompt("Copie o código abaixo:", codigo);
  });
}

// ─── Aprovações ────────────────────────────────────────────────────────────────

/**
 * Renderiza a tabela de pendências de aprovação.
 */
function renderizarAprovacoes() {
  const tbody = document.getElementById("admin-aprovacoes-lista");
  if (!tbody || !window.ApprovalsController) return;

  const pendentes = ApprovalsController.buscarPendentes();
  const badgeCount = document.getElementById("aprovacoes-count");
  if (badgeCount) badgeCount.textContent = pendentes.length;

  if (pendentes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Nenhuma pendência de aprovação.</td></tr>`;
    return;
  }

  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
  const _fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  tbody.innerHTML = pendentes.map((p) => {
    const emp = empresas.find((e) => String(e.id) === String(p.empresaId));
    const dataSol = p.dataSolicitacao ? new Date(p.dataSolicitacao).toLocaleString("pt-BR") : "—";
    const tipoBadge = p.tipo === "proposta_aceita"
      ? `<span class="badge bg-success">📄 Proposta</span>`
      : `<span class="badge bg-primary">🎯 CRM</span>`;

    return `
      <tr>
        <td>${tipoBadge}</td>
        <td>
          <div class="fw-semibold">${p.descricao}</div>
          <div class="small text-muted">Solicitado por: ${p.solicitanteNome} em ${dataSol}</div>
          ${emp ? `<div class="small text-muted">Empresa: ${emp.nome}</div>` : ""}
        </td>
        <td class="fw-bold text-success">${_fmt(p.valor)}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-success me-1" onclick="aprovarPendencia('${p.id}')" title="Aprovar">
            ✅ Aprovar
          </button>
          <button class="btn btn-xs btn-outline-danger" onclick="rejeitarPendencia('${p.id}')" title="Rejeitar">
            ❌ Rejeitar
          </button>
        </td>
      </tr>`;
  }).join("");
}

/**
 * Aprova uma pendência.
 */
function aprovarPendencia(pendenciaId) {
  if (!confirm("Aprovar esta solicitação? A entrada financeira será gerada automaticamente.")) return;
  const resultado = ApprovalsController.aprovar(pendenciaId);
  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }
  alert("✅ Aprovado! Entrada financeira gerada com sucesso.");
  renderizarAprovacoes();
}

/**
 * Rejeita uma pendência.
 */
function rejeitarPendencia(pendenciaId) {
  const motivo = prompt("Motivo da rejeição (opcional):");
  if (motivo === null) return; // cancelou
  const resultado = ApprovalsController.rejeitar(pendenciaId, motivo);
  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }
  alert("❌ Rejeitado.");
  renderizarAprovacoes();
}
