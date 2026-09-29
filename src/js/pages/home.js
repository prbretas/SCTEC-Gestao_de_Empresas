/**
 * home.js — Lógica da tela home (hub de navegação).
 * Os cards são renderizados dinamicamente com base nos módulos ativos da organização.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Guard de rota
  const sessao = AuthService.requireAuth();
  if (!sessao) return;

  // Aplica config visual da organização
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Preenche saudação com nickname#ID
  document.getElementById("home-nome-usuario").textContent = sessao.nome;
  document.getElementById("home-id-usuario").textContent =
    sessao.identidade || `${sessao.nome}#${sessao.id}`;

  // Badge de role
  const badgeRole = document.getElementById("home-role-badge");
  if (badgeRole) {
    if (sessao.role === "admin") {
      badgeRole.textContent = "👑 Admin";
      badgeRole.className = "badge bg-warning text-dark ms-2";
    } else {
      badgeRole.textContent = "👤 Usuário";
      badgeRole.className = "badge bg-secondary ms-2";
    }
  }

  // Código de convite — apenas Admin
  const codigoEl = document.getElementById("home-codigo-convite");
  if (codigoEl && sessao.role === "admin") {
    const codigo = AuthService.obterCodigoConvite();
    if (codigo) {
      codigoEl.textContent = `Convite: ${codigo}`;
      codigoEl.style.display = "inline-block";
    }
  }

  // #172 — Cria a Filial 01 no primeiro uso (idempotente) e #177 — seleção de filial via popup
  if (window.FiliaisStorage) {
    FiliaisStorage.garantirFilialPadrao();
    _inicializarFilialAtiva();
  }

  // Renderiza cards de módulos dinamicamente
  _renderizarCards(sessao);

  // Dark mode
  const switchBtn = document.getElementById("dark-mode-switch");
  const aplicarDark = (dark) => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("SCTEC_THEME", dark ? "dark" : "light");
    if (switchBtn) switchBtn.checked = dark;
  };
  aplicarDark(localStorage.getItem("SCTEC_THEME") === "dark");
  switchBtn?.addEventListener("change", (e) => aplicarDark(e.target.checked));

  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Deseja sair do sistema?")) AuthService.logout();
  });
});

/**
 * Renderiza os cards de módulos no grid da home.
 * Módulos adminOnly ficam em linha separada.
 */
function _renderizarCards(sessao) {
  const modulos = window.ModulesController
    ? ModulesController.obterModulosVisiveis()
    : [];

  const gridPrincipal = document.getElementById("cards-grid");
  const gridAdmin = document.getElementById("cards-grid-admin");

  if (!gridPrincipal) return;

  // Separar módulos normais dos admin-only
  const modulosNormais = modulos.filter((m) => !m.adminOnly);
  const modulosAdmin = modulos.filter((m) => m.adminOnly);

  // Render principal
  gridPrincipal.innerHTML = modulosNormais.map((m) => `
    <div class="col-md-4">
      <a href="${m.url}" class="home-card card shadow-sm text-center">
        <div class="card-body">
          <div class="card-icon mb-3">${m.icon}</div>
          <h5 class="fw-bold mb-1">${m.label}</h5>
        </div>
      </a>
    </div>`).join("");

  // Render admin
  if (gridAdmin) {
    if (modulosAdmin.length > 0) {
      gridAdmin.innerHTML = modulosAdmin.map((m) => `
        <div class="col-md-4">
          <a href="${m.url}" class="home-card card shadow-sm text-center border border-warning">
            <div class="card-body">
              <div class="card-icon mb-3">${m.icon}</div>
              <h5 class="fw-bold mb-1">${m.label}</h5>
            </div>
          </a>
        </div>`).join("");
      gridAdmin.style.removeProperty("display");
    } else {
      gridAdmin.style.display = "none";
    }
  }
}

/**
 * #177 — Inicializa a filial ativa na Home.
 * - 0 filiais disponíveis: não mostra badge nem popup.
 * - 1 filial: seleciona automaticamente (sem popup) e mostra o badge.
 * - 2+ filiais: se ainda não há filial ativa válida, abre o popup de seleção.
 * O badge no header é clicável para reabrir o popup.
 */
function _inicializarFilialAtiva() {
  const badge = document.getElementById("home-filial-badge");
  if (!badge || !window.FiliaisStorage) return;

  const disponiveis = FiliaisStorage.filiaisDisponiveisParaUsuario();

  if (!disponiveis.length) {
    badge.classList.add("d-none");
    FiliaisStorage.definirFilialAtiva(null);
    return;
  }

  // 1 filial → auto-seleciona sem popup
  if (disponiveis.length === 1) {
    FiliaisStorage.definirFilialAtiva(disponiveis[0].id);
    _atualizarBadgeFilial();
    return;
  }

  // 2+ filiais: se já há uma ativa válida, só mostra o badge; senão abre o popup
  const ativaId = FiliaisStorage.obterFilialAtivaId();
  const jaValida = ativaId && disponiveis.some((f) => f.id === ativaId);
  _atualizarBadgeFilial();

  // Badge clicável reabre o popup
  badge.onclick = () => _abrirPopupFilial(disponiveis);

  if (!jaValida) {
    _abrirPopupFilial(disponiveis);
  }
}

/**
 * Atualiza o badge da filial ativa no header da Home.
 */
function _atualizarBadgeFilial() {
  const badge = document.getElementById("home-filial-badge");
  const nomeEl = document.getElementById("home-filial-nome");
  if (!badge || !nomeEl || !window.FiliaisStorage) return;
  const ativa = FiliaisStorage.obterFilialAtiva();
  if (ativa) {
    nomeEl.textContent = ativa.nome;
    badge.classList.remove("d-none");
  } else {
    badge.classList.add("d-none");
  }
}

/**
 * #177 — Abre o popup (modal) de seleção de filial.
 * @param {Array} disponiveis - filiais que o usuário pode escolher
 */
function _abrirPopupFilial(disponiveis) {
  const modalEl = document.getElementById("modal-selecao-filial");
  const lista = document.getElementById("modal-filial-lista");
  const btnConfirmar = document.getElementById("btn-confirmar-filial");
  if (!modalEl || !lista || !btnConfirmar || !window.bootstrap) return;

  const ativaId = FiliaisStorage.obterFilialAtivaId();
  let selecionadaId = ativaId && disponiveis.some((f) => f.id === ativaId) ? ativaId : null;

  lista.innerHTML = disponiveis.map((f) => `
    <button type="button" class="list-group-item list-group-item-action ${f.id === selecionadaId ? "active" : ""}"
      data-filial-id="${f.id}">🏢 ${f.nome}</button>`).join("");

  btnConfirmar.disabled = !selecionadaId;

  lista.querySelectorAll("[data-filial-id]").forEach((item) => {
    item.addEventListener("click", () => {
      selecionadaId = item.getAttribute("data-filial-id");
      lista.querySelectorAll("[data-filial-id]").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      btnConfirmar.disabled = false;
    });
  });

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  btnConfirmar.onclick = () => {
    if (!selecionadaId) return;
    FiliaisStorage.definirFilialAtiva(selecionadaId);
    _atualizarBadgeFilial();
    modal.hide();
  };

  modal.show();
}
