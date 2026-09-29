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

  // #172 — Cria a Filial 01 no primeiro uso (idempotente) e #173 — seletor de filial ativa
  if (window.FiliaisStorage) {
    FiliaisStorage.garantirFilialPadrao();
    FiliaisStorage.garantirFilialAtiva();
    _renderizarSeletorFilial();
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
 * #173 — Renderiza o seletor de filial ativa na Home.
 * Mostra apenas as filiais que o usuário pode acessar (pelas filiais do papel).
 * Se houver apenas uma, seleciona automaticamente e mantém o seletor informativo.
 */
function _renderizarSeletorFilial() {
  const container = document.getElementById("home-filial-container");
  const select = document.getElementById("home-filial-select");
  if (!container || !select || !window.FiliaisStorage) return;

  const disponiveis = FiliaisStorage.filiaisDisponiveisParaUsuario();

  // Sem filiais para escolher → não exibe o seletor
  if (!disponiveis.length) {
    container.style.display = "none";
    return;
  }

  const ativaId = FiliaisStorage.obterFilialAtivaId();
  select.innerHTML = disponiveis
    .map((f) => `<option value="${f.id}" ${f.id === ativaId ? "selected" : ""}>${f.nome}</option>`)
    .join("");

  container.style.display = "";

  // Se só há uma opção, mantém selecionada e desabilita a troca
  select.disabled = disponiveis.length === 1;

  select.onchange = () => {
    FiliaisStorage.definirFilialAtiva(select.value);
  };
}
