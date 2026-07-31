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

    // Identidade mostrada inline no template

    container.innerHTML = `
      <nav class="navbar navbar-dark shadow-sm mb-4" style="min-height:56px;">
        <div class="container-fluid px-3">
          <div class="d-flex align-items-center w-100">

            <!-- ESQUERDA: Logo + Sistema + Rotina -->
            <div class="d-flex align-items-center gap-2">
              ${logoHtml}
              <span class="text-white fw-semibold d-none d-md-inline" style="font-size:.9rem;">${nomesSistema}</span>
              ${labelRotina ? `<span class="text-white-50 d-none d-md-inline mx-1">›</span><span class="text-white" style="font-size:.85rem;">${labelRotina}</span>` : ""}
            </div>

            <!-- DIREITA: Ações -->
            <div class="d-flex align-items-center gap-1 ms-auto">
              <!-- Identidade -->
              ${sessao ? `<span class="text-white-50 small d-none d-lg-inline me-2">${sessao.nome}#${sessao.id}</span>` : ""}

              <!-- Home -->
              <a href="home.html" class="btn btn-link text-white p-1 nav-icon-btn" title="Home"><i class="bi bi-house" style="font-size:1.1rem;"></i></a>

              <!-- Parâmetros (admin only) -->
              ${sessao && sessao.role === "admin" ? `<button class="btn btn-link text-white p-1 nav-icon-btn" id="btn-params-rotina" title="Parâmetros"><i class="bi bi-sliders" style="font-size:1.1rem;"></i></button>` : ""}

              <!-- Alertas -->
              <button class="btn btn-link text-white position-relative p-1 nav-icon-btn" id="btn-alertas-nav" title="Alertas">
                <i class="bi bi-bell" style="font-size:1.1rem;"></i>
                <span id="badge-alertas-nav" class="d-none" style="position:absolute;top:0;right:0;background:#dc3545;color:#fff;font-size:.55rem;border-radius:50%;min-width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-weight:700;line-height:1;"></span>
              </button>

              <!-- Minha Conta -->
              <a href="settings.html" class="btn btn-link text-white p-1 nav-icon-btn" title="Minha Conta"><i class="bi bi-person-circle" style="font-size:1.1rem;"></i></a>

              <!-- Separador -->
              <span class="text-white-50 mx-1 d-none d-md-inline">|</span>

              <!-- Dark Mode -->
              <div class="form-check form-switch mb-0 ms-1" title="Modo Escuro">
                <input class="form-check-input" type="checkbox" id="dark-mode-switch" role="switch" />
              </div>

              <!-- Sair -->
              <button class="btn btn-link text-white p-1 ms-1 nav-icon-btn" id="btn-logout-nav" title="Sair"><i class="bi bi-box-arrow-right" style="font-size:1.1rem;"></i></button>
            </div>

          </div>
        </div>
      </nav>`;

    // Inicializa dark mode e logout
    if (window.ThemeController) ThemeController.init("dark-mode-switch");

    document.getElementById("btn-logout-nav")?.addEventListener("click", () => {
      if (confirm("Deseja sair do sistema?") && window.AuthService) AuthService.logout();
    });

    // Indicador de alertas (tarefas vencidas + aprovações pendentes + estoque baixo)
    const vencidas = window.TarefasController ? TarefasController.contarVencidasGlobal() : 0;
    const aprovacoes = window.ApprovalsController ? ApprovalsController.contarPendentes() : 0;

    // Alertas de estoque baixo
    let estoqueBaixo = 0;
    const paramsEstoque = window.ParamsController ? ParamsController.obter("estoque") : {};
    if (paramsEstoque.alertarEstoqueBaixo && window.EstoqueStorage && window.ProdutosStorage) {
      const posicoes = EstoqueStorage.buscarTodos();
      estoqueBaixo = posicoes.filter((p) => p.quantidade <= (p.estoqueMin || paramsEstoque.estoqueMinimoPadrao || 5)).length;
      if (paramsEstoque.limiteAlertasNavbar && estoqueBaixo > paramsEstoque.limiteAlertasNavbar) {
        estoqueBaixo = paramsEstoque.limiteAlertasNavbar;
      }
    }

    const totalAlertas = vencidas + aprovacoes + estoqueBaixo;
    const badgeAlertas = document.getElementById("badge-alertas-nav");
    if (badgeAlertas && totalAlertas > 0) {
      badgeAlertas.textContent = totalAlertas;
      badgeAlertas.classList.remove("d-none");
    }

    document.getElementById("btn-alertas-nav")?.addEventListener("click", () => {
      let msg = "🔔 Alertas:\n\n";
      if (vencidas > 0) msg += `⚠️ ${vencidas} tarefa(s) vencida(s)\n`;
      if (aprovacoes > 0) msg += `📋 ${aprovacoes} aprovação(ões) pendente(s)\n`;
      if (estoqueBaixo > 0) msg += `📦 ${estoqueBaixo} posição(ões) de estoque abaixo do mínimo\n`;
      if (totalAlertas === 0) msg += "✅ Nenhum alerta pendente!";
      alert(msg);
    });

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
