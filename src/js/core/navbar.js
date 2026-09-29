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

    // #174 — Filial ativa (se houver) exibida no header
    let labelFilial = "";
    if (window.FiliaisStorage) {
      const filialAtiva = FiliaisStorage.obterFilialAtiva();
      if (filialAtiva) labelFilial = filialAtiva.nome;
    }

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
              ${labelFilial ? `<span class="text-white-50 d-none d-md-inline mx-1">›</span><span class="text-white d-none d-md-inline" style="font-size:.85rem;">🏢 ${labelFilial}</span>` : ""}
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
    const totalAlertas = this._contarAlertas();
    const badgeAlertas = document.getElementById("badge-alertas-nav");
    if (badgeAlertas && totalAlertas > 0) {
      badgeAlertas.textContent = totalAlertas;
      badgeAlertas.classList.remove("d-none");
    }

    // #145 — Popup de notificações detalhado (substitui o alert simples)
    document.getElementById("btn-alertas-nav")?.addEventListener("click", () => {
      NavbarController._abrirModalNotificacoes();
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

  // ─── Notificações (#145) ────────────────────────────────────────────────

  /**
   * Conta as posições de estoque abaixo do mínimo (respeitando parâmetros).
   * @returns {number}
   */
  _contarEstoqueBaixo() {
    const paramsEstoque = window.ParamsController ? ParamsController.obter("estoque") : {};
    if (!paramsEstoque.alertarEstoqueBaixo || !window.EstoqueStorage) return 0;
    const posicoes = EstoqueStorage.buscarTodos();
    let baixo = posicoes.filter((p) => p.quantidade <= (p.estoqueMin || paramsEstoque.estoqueMinimoPadrao || 5)).length;
    if (paramsEstoque.limiteAlertasNavbar && baixo > paramsEstoque.limiteAlertasNavbar) {
      baixo = paramsEstoque.limiteAlertasNavbar;
    }
    return baixo;
  },

  /**
   * Total de alertas para o badge do sino.
   * @returns {number}
   */
  _contarAlertas() {
    const vencidas = window.TarefasController ? TarefasController.contarVencidasGlobal() : 0;
    const aprovacoes = window.ApprovalsController ? ApprovalsController.contarPendentes() : 0;
    return vencidas + aprovacoes + this._contarEstoqueBaixo();
  },

  /**
   * Resolve a URL da rotina a partir do catálogo de módulos.
   * @param {string} moduloId
   * @returns {string|null}
   */
  _urlDaRotina(moduloId) {
    if (!window.MODULOS_CATALOGO) return null;
    const mod = MODULOS_CATALOGO.find((m) => m.id === moduloId);
    return mod ? mod.url : null;
  },

  /**
   * Abre o popup de notificações com aprovações pendentes (por rotina),
   * tarefas vencidas e estoque baixo. Cada aprovação é clicável e leva ao registro.
   */
  _abrirModalNotificacoes() {
    const _fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const pendentes = window.ApprovalsController ? ApprovalsController.buscarPendentes() : [];
    const vencidas = window.TarefasController ? TarefasController.contarVencidasGlobal() : 0;
    const estoqueBaixo = this._contarEstoqueBaixo();

    // Rótulo legível da rotina de origem da aprovação
    const rotuloRotina = (moduloId) => {
      if (!window.MODULOS_CATALOGO) return moduloId;
      const mod = MODULOS_CATALOGO.find((m) => m.id === moduloId);
      return mod ? `${mod.icon} ${mod.label}` : moduloId;
    };

    // Seção de aprovações pendentes (clicáveis → registro)
    let aprovacoesHtml = "";
    if (pendentes.length > 0) {
      aprovacoesHtml = pendentes.map((p) => {
        const url = this._urlDaRotina(p.referenciaModulo);
        const dataSol = p.dataSolicitacao ? new Date(p.dataSolicitacao).toLocaleString("pt-BR") : "—";
        const link = url ? `${url}?ref=${encodeURIComponent(p.referenciaId)}` : "#";
        return `
          <div class="list-group-item list-group-item-action" role="button"
            onclick="NavbarController._irParaRegistro('${link}')" style="cursor:pointer;">
            <div class="d-flex justify-content-between align-items-start">
              <div class="me-2">
                <div class="small text-muted">${rotuloRotina(p.referenciaModulo)}</div>
                <div class="fw-semibold">${p.descricao || "Aprovação pendente"}</div>
                <div class="small text-muted">Solicitado por ${p.solicitanteNome || "—"} em ${dataSol}</div>
              </div>
              <span class="fw-bold text-success text-nowrap">${_fmt(p.valor)}</span>
            </div>
            <div class="mt-2 d-flex gap-2" onclick="event.stopPropagation()">
              <button class="btn btn-xs btn-success" onclick="NavbarController._aprovarNotificacao('${p.id}')">✅ Aprovar</button>
              <button class="btn btn-xs btn-outline-danger" onclick="NavbarController._rejeitarNotificacao('${p.id}')">❌ Rejeitar</button>
              ${url ? `<button class="btn btn-xs btn-outline-primary ms-auto" onclick="NavbarController._irParaRegistro('${link}')">🔗 Ver registro</button>` : ""}
            </div>
          </div>`;
      }).join("");
    }

    const secaoAprovacoes = `
      <div class="fw-semibold small text-uppercase text-muted mb-2">📋 Aprovações pendentes (${pendentes.length})</div>
      <div class="list-group mb-3">
        ${aprovacoesHtml || '<div class="list-group-item text-muted small">Nenhuma aprovação pendente.</div>'}
      </div>`;

    const secaoOutros = `
      <div class="fw-semibold small text-uppercase text-muted mb-2">🔔 Outros alertas</div>
      <ul class="list-group mb-1">
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>⚠️ Tarefas vencidas</span>
          <span class="badge ${vencidas > 0 ? "bg-warning text-dark" : "bg-light text-muted border"}">${vencidas}</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center" role="button"
          onclick="${this._urlDaRotina("estoque") ? `NavbarController._irParaRegistro('${this._urlDaRotina("estoque")}')` : ""}" style="cursor:pointer;">
          <span>📦 Estoque abaixo do mínimo</span>
          <span class="badge ${estoqueBaixo > 0 ? "bg-danger" : "bg-light text-muted border"}">${estoqueBaixo}</span>
        </li>
      </ul>`;

    let modalEl = document.getElementById("modal-notificacoes");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "modal-notificacoes";
      modalEl.className = "modal fade";
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">🔔 Notificações</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            ${secaoAprovacoes}
            ${secaoOutros}
          </div>
        </div>
      </div>`;

    new bootstrap.Modal(modalEl).show();
  },

  /**
   * Navega para o registro/rotina de uma notificação.
   * @param {string} url
   */
  _irParaRegistro(url) {
    if (url && url !== "#") window.location.href = url;
  },

  /**
   * Aprova uma pendência a partir do popup e atualiza a tela.
   * @param {string} pendenciaId
   */
  _aprovarNotificacao(pendenciaId) {
    if (!window.ApprovalsController) return;
    if (!confirm("Aprovar esta solicitação? A entrada financeira será gerada automaticamente.")) return;
    const r = ApprovalsController.aprovar(pendenciaId);
    if (!r.ok) { alert(`⚠️ ${r.erro}`); return; }
    alert("✅ Aprovado! Entrada financeira gerada.");
    this._abrirModalNotificacoes();
    const badge = document.getElementById("badge-alertas-nav");
    const total = this._contarAlertas();
    if (badge) {
      badge.textContent = total;
      badge.classList.toggle("d-none", total === 0);
    }
  },

  /**
   * Rejeita uma pendência a partir do popup e atualiza a tela.
   * @param {string} pendenciaId
   */
  _rejeitarNotificacao(pendenciaId) {
    if (!window.ApprovalsController) return;
    const motivo = prompt("Motivo da rejeição (opcional):");
    if (motivo === null) return;
    const r = ApprovalsController.rejeitar(pendenciaId, motivo);
    if (!r.ok) { alert(`⚠️ ${r.erro}`); return; }
    alert("❌ Rejeitado.");
    this._abrirModalNotificacoes();
    const badge = document.getElementById("badge-alertas-nav");
    const total = this._contarAlertas();
    if (badge) {
      badge.textContent = total;
      badge.classList.toggle("d-none", total === 0);
    }
  },
};

window.NavbarController = NavbarController;
