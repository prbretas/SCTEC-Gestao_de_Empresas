/**
 * admin.js — Painel de controle do Administrador.
 * Permite gerenciar usuários da organização: ativar/desativar, alterar perfil, remover, atribuir papel.
 * Permite criar, editar e excluir papéis de trabalho.
 * Empresa/ filial e seus endereços
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

  // ─── Filiais (#143) ─────────────────────────────────────────────────────
  document.getElementById("btn-nova-filial")?.addEventListener("click", () => abrirFormFilial());
  document.getElementById("btn-salvar-filial")?.addEventListener("click", salvarFilial);
  document.getElementById("btn-cancelar-filial")?.addEventListener("click", fecharFormFilial);

  // ─── Fonte de Dados (#144, Fase 3) ──────────────────────────────────────
  document.getElementById("btn-salvar-storage-mode")?.addEventListener("click", salvarFonteDados);
  document.getElementById("btn-testar-conexao")?.addEventListener("click", testarConexaoApi);
  document.querySelectorAll("input[name='storage-mode']").forEach((r) =>
    r.addEventListener("change", _atualizarVisibilidadeConfigApi)
  );

  renderizarUsuarios();
  renderizarPapeis();
  renderizarFiliais();
  inicializarFonteDados();

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
  usuarios[idx].filialId = null;
  AuthService.salvarUsuarios(usuarios);
  renderizarUsuarios();
  renderizarFiliais();
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
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhum papel criado. Clique em "➕ Novo Papel" para começar.</td></tr>`;
    return;
  }

  // Módulos disponíveis para papéis (exclui adminOnly)
  const modulosDisponiveis = MODULOS_CATALOGO.filter((m) => !m.adminOnly);
  const filiaisOrg = window.FiliaisStorage ? FiliaisStorage.buscarTodos() : [];

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

    const nivelInfo = (window.NIVEIS_HIERARQUICOS || []).find((n) => n.nivel === p.nivel);
    const nivelLabel = nivelInfo ? `${nivelInfo.nivel} — ${nivelInfo.label}` : (p.nivel || "—");

    // #166 — Filiais vinculadas ao papel
    const filiaisPapel = Array.isArray(p.filiais) ? p.filiais : [];
    const badgesFiliais = filiaisPapel.length
      ? filiaisPapel.map((fid) => {
        const f = filiaisOrg.find((x) => x.id === fid);
        return `<span class="badge bg-light text-dark border me-1 mb-1">🏢 ${f ? f.nome : "?"}</span>`;
      }).join("")
      : `<span class="text-muted small">Todas</span>`;

    return `
      <tr>
        <td class="fw-semibold">${p.nome}</td>
        <td><span class="badge bg-info text-dark">🪜 ${nivelLabel}</span></td>
        <td>${badgesFiliais}</td>
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
  let nivelAtual = 4; // NIVEL_PADRAO
  let filiaisPapel = []; // #166
  if (id && sessao) {
    const papel = RolesController.buscarPorId(sessao.orgId, id);
    permitidos = papel ? papel.modulosPermitidos : null;
    podeVerTodos = papel?.podeVerTodos === true;
    if (papel && Number.isInteger(papel.nivel)) nivelAtual = papel.nivel;
    if (papel && Array.isArray(papel.filiais)) filiaisPapel = papel.filiais;
  }

  // Popula o seletor de nível hierárquico (#142)
  const selNivel = document.getElementById("input-papel-nivel");
  if (selNivel && window.NIVEIS_HIERARQUICOS) {
    selNivel.innerHTML = NIVEIS_HIERARQUICOS.map((n) =>
      `<option value="${n.nivel}" ${n.nivel === nivelAtual ? "selected" : ""}>Nível ${n.nivel} — ${n.label}</option>`
    ).join("");
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

  // #166 — Renderiza checkboxes de empresas/filiais vinculadas ao papel
  const containerFiliais = document.getElementById("filiais-papel-checkboxes");
  if (containerFiliais) {
    const filiais = window.FiliaisStorage ? FiliaisStorage.buscarTodos() : [];
    containerFiliais.innerHTML = filiais.length
      ? filiais.map((f) => {
        const checked = filiaisPapel.includes(f.id) ? "checked" : "";
        return `
          <div class="form-check form-check-inline mb-2">
            <input class="form-check-input filial-papel-checkbox" type="checkbox"
              id="filial-papel-${f.id}" value="${f.id}" ${checked} />
            <label class="form-check-label" for="filial-papel-${f.id}">🏢 ${f.nome}</label>
          </div>`;
      }).join("")
      : `<span class="text-muted small">Nenhuma filial cadastrada.</span>`;
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
  const containerFiliaisPapel = document.getElementById("filiais-papel-checkboxes");
  if (containerFiliaisPapel) containerFiliaisPapel.innerHTML = "";
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
  const nivel = parseInt(document.getElementById("input-papel-nivel")?.value, 10) || 4;

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

  // #166 — Coleta as filiais marcadas ([] = sem restrição por filial)
  const filiaisMarcadas = Array.from(document.querySelectorAll(".filial-papel-checkbox"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  let resultado;
  if (papelId) {
    resultado = RolesController.editar(sessao.orgId, papelId, nome);
    if (resultado.ok) {
      RolesController.definirModulos(sessao.orgId, papelId, modulosPermitidos);
      RolesController.setPodeVerTodos(sessao.orgId, papelId, podeVerTodos);
      RolesController.definirNivel(sessao.orgId, papelId, nivel);
      RolesController.definirFiliais(sessao.orgId, papelId, filiaisMarcadas);
    }
  } else {
    const org = AuthService.buscarOrgPorId(sessao.orgId);
    resultado = RolesController.criar(sessao.orgId, nome, org ? org.codigoConvite : sessao.orgId);
    if (resultado.ok) {
      RolesController.definirModulos(sessao.orgId, resultado.papel.id, modulosPermitidos);
      RolesController.setPodeVerTodos(sessao.orgId, resultado.papel.id, podeVerTodos);
      RolesController.definirNivel(sessao.orgId, resultado.papel.id, nivel);
      RolesController.definirFiliais(sessao.orgId, resultado.papel.id, filiaisMarcadas);
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

// Aprovações movidas para o popup de notificações (navbar) — #145

// ─── Empresas / Filiais (#143) ───────────────────────────────────────────────

/**
 * Renderiza a tabela de filiais da organização.
 */
function renderizarFiliais() {
  const tbody = document.getElementById("admin-filiais-lista");
  if (!tbody || !window.FiliaisStorage) return;

  const sessao = AuthService.obterSessao();
  const filiais = FiliaisStorage.buscarTodos();
  const enderecos = window.EnderecosStorage ? EnderecosStorage.buscarTodos() : [];
  const usuarios = sessao ? AuthService.obterUsuarios().filter((u) => u.orgId === sessao.orgId) : [];
  // Mapa papelId → filiais do papel (para contar usuários por filial via papel)
  const papeis = sessao && window.RolesController ? RolesController.obterPorOrg(sessao.orgId) : [];
  const filiaisPorPapel = {};
  papeis.forEach((p) => { filiaisPorPapel[p.id] = Array.isArray(p.filiais) ? p.filiais : []; });

  if (filiais.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma filial cadastrada. Clique em "➕ Nova Filial" para começar.</td></tr>`;
    return;
  }

  tbody.innerHTML = filiais.map((f) => {
    const nomesEnderecos = (f.enderecosEstoque || [])
      .map((eid) => enderecos.find((e) => e.id === eid)?.nome)
      .filter(Boolean);
    const badgesEnd = nomesEnderecos.length
      ? nomesEnderecos.map((n) => `<span class="badge bg-light text-dark border me-1">📦 ${n}</span>`).join("")
      : `<span class="text-muted small">—</span>`;
    // Conta usuários cujo PAPEL inclui esta filial (funil por papel de trabalho)
    const qtdUsuarios = usuarios.filter((u) => u.papelId && (filiaisPorPapel[u.papelId] || []).includes(f.id)).length;
    const enderecoPrincipal = _formatarEnderecoFilial(f.endereco);

    return `
      <tr>
        <td class="fw-semibold">${f.nome}</td>
        <td class="small">${f.cnpj || "—"}</td>
        <td class="small">${enderecoPrincipal}</td>
        <td>${badgesEnd}</td>
        <td class="text-center">
          <span class="badge ${qtdUsuarios > 0 ? "bg-primary" : "bg-light text-dark border"}">
            ${qtdUsuarios} usuário${qtdUsuarios !== 1 ? "s" : ""}
          </span>
        </td>
        <td class="text-center">
          <button class="btn btn-xs btn-outline-primary me-1"
            onclick="editarFilial('${f.id}')" title="Editar filial">
            ✏️ Editar
          </button>
          <button class="btn btn-xs btn-outline-danger"
            onclick="excluirFilial('${f.id}', decodeURIComponent('${encodeURIComponent(f.nome)}'))"
            title="Excluir filial">
            🗑️ Excluir
          </button>
        </td>
      </tr>`;
  }).join("");
}

/**
 * Abre o formulário de filial (criação ou edição).
 * @param {string} [id] - se informado, modo edição
 */
function abrirFormFilial(id = "") {
  const card = document.getElementById("card-form-filial");
  if (!card) return;

  const filial = id && window.FiliaisStorage ? FiliaisStorage.buscarPorId(id) : null;
  document.getElementById("input-filial-id").value = id;
  document.getElementById("input-nome-filial").value = filial ? filial.nome : "";
  document.getElementById("input-cnpj-filial").value = filial ? filial.cnpj || "" : "";
  document.getElementById("form-filial-titulo").textContent = id ? "Editar Filial" : "Nova Filial";

  // #164 — Endereço principal (postal) da filial
  const end = (filial && filial.endereco) || {};
  const setVal = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v || ""; };
  setVal("input-filial-logradouro", end.logradouro);
  setVal("input-filial-numero", end.numero);
  setVal("input-filial-municipio", end.municipio);
  setVal("input-filial-uf", end.uf);
  setVal("input-filial-cep", end.cep);

  // Checkboxes de endereços de estoque
  const container = document.getElementById("filial-enderecos-checkboxes");
  const enderecos = window.EnderecosStorage ? EnderecosStorage.buscarTodos() : [];
  const vinculados = filial ? filial.enderecosEstoque || [] : [];
  if (container) {
    container.innerHTML = enderecos.length
      ? enderecos.map((e) => {
        const checked = vinculados.includes(e.id) ? "checked" : "";
        return `
          <div class="form-check form-check-inline mb-1">
            <input class="form-check-input filial-endereco-checkbox" type="checkbox"
              id="filial-end-${e.id}" value="${e.id}" ${checked} />
            <label class="form-check-label" for="filial-end-${e.id}">📦 ${e.nome}</label>
          </div>`;
      }).join("")
      : `<span class="text-muted small">Nenhum endereço de estoque cadastrado.</span>`;
  }

  card.classList.remove("d-none");
  document.getElementById("input-nome-filial").focus();
}

/**
 * Fecha o formulário de filial sem salvar.
 */
function fecharFormFilial() {
  const card = document.getElementById("card-form-filial");
  if (!card) return;
  card.classList.add("d-none");
  document.getElementById("input-filial-id").value = "";
  document.getElementById("input-nome-filial").value = "";
  document.getElementById("input-cnpj-filial").value = "";
  ["input-filial-logradouro", "input-filial-numero", "input-filial-municipio", "input-filial-uf", "input-filial-cep"]
    .forEach((elId) => { const el = document.getElementById(elId); if (el) el.value = ""; });
  const container = document.getElementById("filial-enderecos-checkboxes");
  if (container) container.innerHTML = "";
}

/**
 * #164 — Formata o endereço principal da filial para exibição na tabela.
 * @param {Object} end
 * @returns {string}
 */
function _formatarEnderecoFilial(end) {
  if (!end) return `<span class="text-muted">—</span>`;
  const linha1 = [end.logradouro, end.numero].filter(Boolean).join(", ");
  const linha2 = [end.municipio, end.uf].filter(Boolean).join(" - ");
  const partes = [linha1, linha2, end.cep].filter(Boolean);
  return partes.length ? partes.join(" · ") : `<span class="text-muted">—</span>`;
}

/**
 * Salva a filial (cria ou edita) com os endereços de estoque selecionados.
 */
function salvarFilial() {
  if (!window.FiliaisStorage) return;
  const id = document.getElementById("input-filial-id")?.value;
  const nome = document.getElementById("input-nome-filial")?.value.trim();
  const cnpj = document.getElementById("input-cnpj-filial")?.value.trim();
  const enderecosEstoque = Array.from(document.querySelectorAll(".filial-endereco-checkbox"))
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
  const endereco = {
    logradouro: document.getElementById("input-filial-logradouro")?.value.trim() || "",
    numero: document.getElementById("input-filial-numero")?.value.trim() || "",
    municipio: document.getElementById("input-filial-municipio")?.value.trim() || "",
    uf: document.getElementById("input-filial-uf")?.value.trim() || "",
    cep: document.getElementById("input-filial-cep")?.value.trim() || "",
  };

  const resultado = id
    ? FiliaisStorage.atualizar(id, { nome, cnpj, enderecosEstoque, endereco })
    : FiliaisStorage.adicionar({ nome, cnpj, enderecosEstoque, endereco });

  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }

  fecharFormFilial();
  renderizarFiliais();
  renderizarUsuarios();
}

/**
 * Abre o formulário em modo edição.
 * @param {string} id
 */
function editarFilial(id) {
  abrirFormFilial(id);
}

/**
 * Exclui uma filial após confirmação.
 * @param {string} id
 * @param {string} nome
 */
function excluirFilial(id, nome) {
  if (!window.FiliaisStorage) return;
  if (!confirm(`Excluir a filial "${nome}"?`)) return;
  const resultado = FiliaisStorage.excluir(id);
  if (!resultado.ok) {
    alert(`⚠️ ${resultado.erro}`);
    return;
  }
  renderizarFiliais();
  renderizarUsuarios();
}

// ─── Fonte de Dados: toggle localStorage ↔ banco (#144, Fase 3) ───────────────

/**
 * Inicializa a seção de fonte de dados com o modo e a URL atuais.
 */
function inicializarFonteDados() {
  if (!window.StorageConfig) return;
  const modo = StorageConfig.modo();
  const radio = document.getElementById(modo === "api" ? "storage-mode-api" : "storage-mode-local");
  if (radio) radio.checked = true;

  const inputBase = document.getElementById("storage-api-base");
  if (inputBase && window.ApiProvider) {
    inputBase.value = ApiProvider._base();
  }

  _atualizarVisibilidadeConfigApi();
  _atualizarLabelModoAtual(modo);
}

/**
 * Mostra/oculta a configuração da API conforme o modo selecionado.
 */
function _atualizarVisibilidadeConfigApi() {
  const selecionado = document.querySelector("input[name='storage-mode']:checked");
  const modo = selecionado ? selecionado.value : "local";
  const bloco = document.getElementById("storage-api-config");
  if (bloco) bloco.style.display = modo === "api" ? "" : "none";
}

/**
 * Atualiza o rótulo com o modo atualmente ativo.
 * @param {string} modo
 */
function _atualizarLabelModoAtual(modo) {
  const el = document.getElementById("storage-mode-atual");
  if (el) el.textContent = `Fonte ativa: ${modo === "api" ? "Banco de dados (API)" : "localStorage"}`;
}

/**
 * Salva o modo escolhido e a URL da API. Recarrega para reinicializar os providers.
 */
function salvarFonteDados() {
  if (!window.StorageConfig) return;
  const selecionado = document.querySelector("input[name='storage-mode']:checked");
  const modo = selecionado ? selecionado.value : "local";

  if (modo === "api" && window.ApiProvider) {
    const base = document.getElementById("storage-api-base")?.value.trim();
    if (!base) {
      alert("⚠️ Informe a URL da API para usar o banco de dados.");
      return;
    }
    ApiProvider.definirBase(base);
  }

  StorageConfig.definirModo(modo);
  _atualizarLabelModoAtual(modo);

  const aviso = modo === "api"
    ? "Fonte de dados definida como Banco de dados (API). A página será recarregada."
    : "Fonte de dados definida como localStorage. A página será recarregada.";
  alert(`✅ ${aviso}`);
  window.location.reload();
}

/**
 * Testa a conexão com a API via healthcheck.
 */
async function testarConexaoApi() {
  const status = document.getElementById("storage-conexao-status");
  const base = document.getElementById("storage-api-base")?.value.trim();
  if (!base) {
    if (status) { status.textContent = "⚠️ Informe a URL da API."; status.className = "small d-block mt-1 text-warning"; }
    return;
  }
  if (status) { status.textContent = "⏳ Testando..."; status.className = "small d-block mt-1 text-muted"; }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/health`);
    const body = await res.json();
    if (res.ok && body && body.ok) {
      if (status) { status.textContent = "✅ Conexão OK — servidor respondeu."; status.className = "small d-block mt-1 text-success"; }
    } else {
      throw new Error("Resposta inesperada");
    }
  } catch {
    if (status) {
      status.textContent = "❌ Falha na conexão. Verifique se o backend está em execução (server/README.md).";
      status.className = "small d-block mt-1 text-danger";
    }
  }
}
