/**
 * navbar.js — Navbar padronizado para todas as telas de módulos.
 * Injeta o HTML do navbar no elemento com id="app-navbar".
 * Inclui: logo/nome, links de módulos ativos, nickname#ID, logout.
 * NÃO inclui botão de Configurações — esse fica apenas na Home.
 */

const NavbarController = {

  /**
   * Renderiza o navbar no elemento #app-navbar.
   * Deve ser chamado após auth.js, config.js e modules.js carregarem.
   * @param {string} paginaAtual - id do módulo atual (para marcar como ativo)
   */
  init(paginaAtual = "") {
    const container = document.getElementById("app-navbar");
    if (!container) return;

    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    const config = window.ConfigController ? ConfigController.obter() : { nomeSistema: "SCTEC" };

    // Módulos visíveis (sem os adminOnly de configuração)
    const modulosNav = window.ModulesController
      ? ModulesController.obterModulosVisiveis().filter(
          (m) => m.id !== "settings" && m.id !== "admin"
        )
      : [];

    const logoHtml = config.logoBase64
      ? `<img src="${config.logoBase64}" alt="Logo" style="height:40px;max-width:140px;object-fit:contain;vertical-align:middle;" />`
      : `🏭`;

    const linksModulos = modulosNav.map((m) => {
      const ativo = m.id === paginaAtual ? "active fw-bold" : "";
      return `<a href="${m.url}" class="btn btn-outline-light btn-sm ${ativo}" title="${m.label}">${m.icon} ${m.label}</a>`;
    }).join("");

    const identidade = sessao
      ? `<span class="text-white small d-none d-lg-inline">${sessao.identidade || sessao.nome}</span>`
      : "";

    container.innerHTML = `
      <nav class="navbar navbar-dark shadow-sm mb-4">
        <div class="container-fluid px-3 d-flex align-items-center gap-2 flex-wrap">

          <a href="home.html" class="navbar-brand mb-0 d-flex align-items-center gap-2 text-decoration-none">
            ${logoHtml}
            <span class="h6 mb-0 text-white d-none d-md-inline">${config.nomeSistema}</span>
          </a>

          <!-- Links de módulos -->
          <div class="d-flex align-items-center gap-1 flex-wrap flex-grow-1 mx-2">
            ${linksModulos}
            <!--  <a href="dashboard.html" class="btn btn-outline-light btn-sm ${paginaAtual === "dashboard" ? "active fw-bold" : ""}" title="Dashboard">📊 Dashboard</a> -->
          </div>

          <!-- Usuário + toggle + logout -->
          <div class="d-flex align-items-center gap-2 ms-auto">
            ${identidade}
            <div class="form-check form-switch text-light mb-0">
              <input class="form-check-input" type="checkbox" id="dark-mode-switch" />
              <label class="form-check-label small d-none d-md-inline">Escuro</label>
            </div>
            <button class="btn btn-outline-light btn-sm" id="btn-logout-nav" title="Sair">🚪</button>
          </div>
        </div>
      </nav>`;

    // Inicializa dark mode e logout
    if (window.ThemeController) ThemeController.init("dark-mode-switch");

    document.getElementById("btn-logout-nav")?.addEventListener("click", () => {
      if (confirm("Deseja sair do sistema?") && window.AuthService) AuthService.logout();
    });
  },
};

window.NavbarController = NavbarController;
