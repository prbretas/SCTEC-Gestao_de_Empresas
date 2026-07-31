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

            <!-- DIREITA: usuário + tarefas vencidas + home + dark mode + sair -->
            <div class="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
              ${identidade}
              <span id="navbar-tarefas-vencidas" class="badge bg-danger d-none" title="Tarefas vencidas" style="font-size:.7rem;"></span>
              ${sessao && sessao.role === "admin" ? `<button class="btn btn-outline-light btn-sm" id="btn-params-rotina" title="Parâmetros da Rotina">⚙️</button>` : ""}
              <a href="settings.html" class="btn btn-outline-light btn-sm" title="Minha Conta">🔒</a>
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

    // Indicador de tarefas vencidas
    if (window.TarefasController) {
      const vencidas = TarefasController.contarVencidasGlobal();
      const badge = document.getElementById("navbar-tarefas-vencidas");
      if (badge && vencidas > 0) {
        badge.textContent = `⚠️ ${vencidas} tarefa${vencidas > 1 ? "s" : ""} vencida${vencidas > 1 ? "s" : ""}`;
        badge.classList.remove("d-none");
      }
    }

    // Botão de parâmetros (admin only) — abre modal com config da rotina atual
    document.getElementById("btn-params-rotina")?.addEventListener("click", () => {
      if (window.ParamsController) {
        NavbarController._abrirModalParams(paginaAtual);
      }
    });
  },

  /**
   * Abre modal de parâmetros para a rotina especificada.
   * @param {string} rotina - id do módulo atual
   */
  _abrirModalParams(rotina) {
    if (!window.ParamsController || !rotina) return;
    const params = ParamsController.obter(rotina);
    const defaults = ParamsController.obterPadrao(rotina);
    if (!defaults || Object.keys(defaults).length === 0) {
      alert("Esta rotina não possui parâmetros configuráveis.");
      return;
    }

    // Cria modal dinamicamente
    let modalEl = document.getElementById("modal-params-rotina");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "modal-params-rotina";
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }

    // Gera campos baseado nos parâmetros
    let camposHtml = "";
    Object.entries(params).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      if (typeof value === "boolean") {
        camposHtml += `<div class="form-check form-switch mb-3">
          <input class="form-check-input param-field" type="checkbox" id="param-${key}" data-key="${key}" data-type="boolean" ${value ? "checked" : ""} />
          <label class="form-check-label" for="param-${key}">${label}</label>
        </div>`;
      } else if (typeof value === "number") {
        camposHtml += `<div class="mb-3">
          <label class="form-label fw-bold small">${label}</label>
          <input type="number" class="form-control form-control-sm param-field" id="param-${key}" data-key="${key}" data-type="number" value="${value}" />
        </div>`;
      } else if (typeof value === "string") {
        camposHtml += `<div class="mb-3">
          <label class="form-label fw-bold small">${label}</label>
          <input type="text" class="form-control form-control-sm param-field" id="param-${key}" data-key="${key}" data-type="string" value="${value}" />
        </div>`;
      } else if (Array.isArray(value)) {
        camposHtml += `<div class="mb-3">
          <label class="form-label fw-bold small">${label}</label>
          <input type="text" class="form-control form-control-sm param-field" id="param-${key}" data-key="${key}" data-type="array" value="${value.join(", ")}" />
          <div class="form-text small">Separe por vírgula</div>
        </div>`;
      }
    });

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header"><h5 class="modal-title">⚙️ Parâmetros: ${rotina}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body">${camposHtml}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-success" id="btn-salvar-params">💾 Salvar Parâmetros</button>
          </div>
        </div>
      </div>`;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    document.getElementById("btn-salvar-params")?.addEventListener("click", () => {
      if (!confirm("Deseja salvar as alterações? Os parâmetros serão aplicados imediatamente.")) return;
      const novosParams = {};
      document.querySelectorAll(".param-field").forEach((el) => {
        const k = el.dataset.key;
        const t = el.dataset.type;
        if (t === "boolean") novosParams[k] = el.checked;
        else if (t === "number") novosParams[k] = parseFloat(el.value) || 0;
        else if (t === "array") novosParams[k] = el.value.split(",").map((s) => s.trim()).filter(Boolean);
        else novosParams[k] = el.value;
      });
      ParamsController.salvar(rotina, novosParams);
      bsModal.hide();
      alert("✅ Parâmetros salvos com sucesso!");
    });
  },
};

window.NavbarController = NavbarController;
