/**
 * navbar.js — Navbar padronizado para todas as telas de módulos.
 *
 * Layout: [Logo + Nome Sistema] | [Nome da Rotina] | [nickname#ID] [🏠 Home] [Dark Mode] [🚪 Sair]
 *
 * Não exibe links de outras rotinas — navegação é feita pela Home.
 */

const NavbarController = {

  /**
   * Renderiza o navbar no elemento #app-navbar.
   * @param {string} paginaAtual - id do módulo atual (para exibir o nome da rotina)
   * @param {string} [nomeRotina] - nome legível da rotina (ex: "Agenda de Compromissos")
   */
  init(paginaAtual = "", nomeRotina = "") {
    const container = document.getElementById("app-navbar");
    if (!container) return;

    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    const config = window.ConfigController ? ConfigController.obter() : { nomeSistema: "SCTEC", logoBase64: null };

    // Logo ou emoji padrão
    const logoHtml = config.logoBase64
      ? `<img src="${config.logoBase64}" alt="Logo" style="height:40px;max-width:140px;object-fit:contain;vertical-align:middle;margin-right:8px;" />`
      : `<span style="font-size:1.5rem;margin-right:6px;">🏭</span>`;

    // Nome do sistema
    const nomesSistema = config.nomeSistema || "SCTEC";

    // Nome da rotina — usa o mapeamento do catálogo se não for passado
    let labelRotina = nomeRotina;
    if (!labelRotina && paginaAtual && window.MODULOS_CATALOGO) {
      const mod = MODULOS_CATALOGO.find((m) => m.id === paginaAtual);
      if (mod) labelRotina = `${mod.icon} ${mod.label}`;
    }

    // Identidade do usuário
    const identidade = sessao
      ? `<span class="text-white-50 small">${sessao.identidade || `${sessao.nome}#${sessao.id}`}</span>`
      : "";

    container.innerHTML = `
      <nav class="navbar navbar-dark shadow-sm mb-4">
        <div class="container-fluid px-3">
          <div class="d-flex align-items-center w-100 gap-3">

            <!-- ESQUERDA: Logo + Nome Sistema + Separador + Nome Rotina -->
            <div class="d-flex align-items-center gap-2 flex-shrink-0">
              ${logoHtml}
              <span class="text-white fw-bold d-none d-md-inline" style="font-size:.95rem;white-space:nowrap;">${nomesSistema}</span>
              ${labelRotina ? `
                <span class="text-white-50 mx-1 d-none d-md-inline">|</span>
                <span class="text-white" style="font-size:.9rem;white-space:nowrap;">${labelRotina}</span>
              ` : ""}
            </div>

            <!-- DIREITA: usuário + home + dark mode + sair -->
            <div class="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
              ${identidade}
              <a href="home.html" class="btn btn-outline-light btn-sm" title="Voltar para Home">🏠 Home</a>
              <div class="form-check form-switch text-light mb-0" title="Modo Escuro">
                <input class="form-check-input" type="checkbox" id="dark-mode-switch" />
              </div>
              <button class="btn btn-outline-light btn-sm" id="btn-logout-nav" title="Sair do sistema">🚪</button>
            </div>

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
