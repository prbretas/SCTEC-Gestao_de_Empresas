/**
 * dashboard.js — Dashboard dinâmico com widgets personalizáveis (#63)
 * Renderiza widgets baseado na configuração do usuário + modelos salvos.
 * Utiliza Chart.js para gráficos e DashboardConfigController para config.
 */

const DashboardController = {
  charts: {},
  dataInicio: null,
  dataFim: null,

  init() {
    const sessao = window.AuthService ? AuthService.requireAuth() : null;
    if (!sessao) return;
    if (window.ModulesController && !ModulesController.requireModuleAccess("dashboard")) return;

    if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
    if (window.NavbarController) NavbarController.init("dashboard");
    if (window.ThemeController) ThemeController.init();

    this._initEventos();
    this._initFiltroData();
    this._carregarModelos();
    this.renderizar();
  },

  _initFiltroData() {
    // Default: últimos 30 dias
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 30);
    document.getElementById("dash-data-inicio").value = inicio.toISOString().split("T")[0];
    document.getElementById("dash-data-fim").value = hoje.toISOString().split("T")[0];
    this.dataInicio = inicio.toISOString().split("T")[0];
    this.dataFim = hoje.toISOString().split("T")[0];

    document.getElementById("btn-aplicar-filtro-dash")?.addEventListener("click", () => {
      this.dataInicio = document.getElementById("dash-data-inicio").value || null;
      this.dataFim = document.getElementById("dash-data-fim").value || null;
      this.renderizar();
    });

    document.getElementById("btn-limpar-filtro-dash")?.addEventListener("click", () => {
      document.getElementById("dash-data-inicio").value = "";
      document.getElementById("dash-data-fim").value = "";
      this.dataInicio = null;
      this.dataFim = null;
      this.renderizar();
    });

    document.querySelectorAll(".dash-preset-periodo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dias = parseInt(btn.getAttribute("data-dias"));
        const fim = new Date();
        const ini = new Date();
        ini.setDate(ini.getDate() - dias);
        document.getElementById("dash-data-inicio").value = ini.toISOString().split("T")[0];
        document.getElementById("dash-data-fim").value = fim.toISOString().split("T")[0];
        this.dataInicio = ini.toISOString().split("T")[0];
        this.dataFim = fim.toISOString().split("T")[0];
        this.renderizar();
      });
    });
  },

  /**
   * Filtra um array de registros pela data.
   * Suporta campos: data, criadoEm, dataCadastro.
   * @param {Array} registros
   * @returns {Array}
   */
  _filtrarPorData(registros) {
    if (!this.dataInicio && !this.dataFim) return registros;
    return registros.filter((r) => {
      const dataReg = r.data || r.criadoEm || r.dataCadastro || null;
      if (!dataReg) return true; // sem data = inclui
      const d = dataReg.slice(0, 10); // YYYY-MM-DD
      if (this.dataInicio && d < this.dataInicio) return false;
      if (this.dataFim && d > this.dataFim) return false;
      return true;
    });
  },

  _initEventos() {
    document.getElementById("btn-configurar-dash")?.addEventListener("click", () => {
      this._renderizarModalConfig();
      new bootstrap.Modal(document.getElementById("modal-config-dash")).show();
    });

    document.getElementById("btn-salvar-config-dash")?.addEventListener("click", () => {
      this._salvarConfig();
      bootstrap.Modal.getInstance(document.getElementById("modal-config-dash"))?.hide();
      this.renderizar();
    });

    document.getElementById("select-modelo-dash")?.addEventListener("change", (e) => {
      DashboardConfigController.setModeloAtivo(e.target.value);
      this.renderizar();
    });

    document.getElementById("btn-salvar-modelo")?.addEventListener("click", () => {
      const nome = prompt("Nome do modelo:");
      if (!nome || !nome.trim()) return;
      DashboardConfigController.salvarModelo(nome.trim());
      this._carregarModelos();
    });

    document.getElementById("btn-excluir-modelo")?.addEventListener("click", () => {
      const select = document.getElementById("select-modelo-dash");
      const modeloId = select?.value;
      if (modeloId === "__default__") return alert("Não é possível excluir o modelo padrão.");
      if (!confirm("Excluir este modelo?")) return;
      DashboardConfigController.excluirModelo(modeloId);
      this._carregarModelos();
      this.renderizar();
    });
  },

  _carregarModelos() {
    const select = document.getElementById("select-modelo-dash");
    const btnExcluir = document.getElementById("btn-excluir-modelo");
    if (!select) return;

    const modelos = DashboardConfigController.obterModelos();
    const ativo = DashboardConfigController.getModeloAtivo();

    select.innerHTML = `<option value="__default__">Modelo Padrão</option>`;
    modelos.forEach((m) => {
      select.innerHTML += `<option value="${m.id}" ${ativo === m.id ? "selected" : ""}>${m.nome}</option>`;
    });

    if (ativo !== "__default__") {
      select.value = ativo;
      btnExcluir?.classList.remove("d-none");
    } else {
      btnExcluir?.classList.add("d-none");
    }
  },

  /**
   * Renderiza todos os widgets ativos no grid.
   */
  renderizar() {
    const grid = document.getElementById("dashboard-grid");
    if (!grid) return;

    // Destrói charts antigos
    Object.values(this.charts).forEach((c) => c.destroy());
    this.charts = {};

    const widgetsAtivos = DashboardConfigController.obterWidgetsAtivos();

    if (widgetsAtivos.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center text-muted py-5">
        <div style="font-size:3rem;">📊</div>
        <h5 class="mt-3">Nenhum widget selecionado</h5>
        <p>Clique em "⚙️ Configurar" para escolher seus widgets.</p>
      </div>`;
      return;
    }

    grid.innerHTML = widgetsAtivos.map((w) => {
      const colClass = w.tipo === "card" ? "col-md-3" : "col-md-6";
      return `<div class="${colClass}" id="widget-${w.id}">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body text-center">
            <h6 class="card-subtitle mb-2 text-muted small">${w.icon} ${w.label}</h6>
            <div id="widget-content-${w.id}"></div>
          </div>
        </div>
      </div>`;
    }).join("");

    // Renderiza conteúdo de cada widget
    widgetsAtivos.forEach((w) => this._renderizarWidget(w));
  },

  _renderizarWidget(widget) {
    const container = document.getElementById(`widget-content-${widget.id}`);
    if (!container) return;

    const dados = this._obterDadosWidget(widget.id);

    if (widget.tipo === "card") {
      container.innerHTML = `<h2 class="display-5 fw-bold ${dados.cor || ""}">${dados.valor}</h2>`;
    } else if (widget.tipo.startsWith("chart-")) {
      const canvas = document.createElement("canvas");
      canvas.id = `chart-${widget.id}`;
      canvas.height = 250;
      container.appendChild(canvas);
      this._renderizarGrafico(widget, canvas, dados);
    }
  },

  _obterDadosWidget(widgetId) {
    const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
    const crmBruto = window.CrmStorage ? CrmStorage.buscarTodos() : [];
    const propostasBruto = window.PropostasStorage ? PropostasStorage.buscarTodos() : [];
    const agendaBruto = window.AgendaStorage ? AgendaStorage.buscarTodos() : [];
    const financeiroBruto = window.FinanceiroStorage ? FinanceiroStorage.buscarTodos() : [];

    // Aplica filtro de data
    const crm = this._filtrarPorData(crmBruto);
    const propostas = this._filtrarPorData(propostasBruto);
    const agenda = this._filtrarPorData(agendaBruto);
    const financeiro = this._filtrarPorData(financeiroBruto);

    const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    switch (widgetId) {
    case "cadastros-total":
      return { valor: empresas.length, cor: "text-primary" };
    case "cadastros-status": {
      const ativos = empresas.filter((e) => e.status === "Ativo").length;
      return { labels: ["Ativo", "Inativo"], data: [ativos, empresas.length - ativos], colors: ["#198754", "#dc3545"] };
    }
    case "cadastros-segmento": {
      const seg = {};
      empresas.forEach((e) => { seg[e.segmento || "Outros"] = (seg[e.segmento || "Outros"] || 0) + 1; });
      return { labels: Object.keys(seg), data: Object.values(seg), colors: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#C9CBCF", "#6c757d"] };
    }
    case "cadastros-municipios": {
      const mun = {};
      empresas.forEach((e) => { mun[e.municipio || "N/D"] = (mun[e.municipio || "N/D"] || 0) + 1; });
      const sorted = Object.entries(mun).sort(([, a], [, b]) => b - a).slice(0, 10);
      return { labels: sorted.map(([l]) => l), data: sorted.map(([, v]) => v), colors: ["#36A2EB"] };
    }
    case "crm-pipeline": {
      const val = crm.filter((o) => !["fechado", "perdido"].includes(o.etapa)).reduce((s, o) => s + (Number(o.valor) || 0), 0);
      return { valor: fmt(val), cor: "text-success" };
    }
    case "crm-etapas": {
      const etapas = { prospeccao: 0, contato: 0, proposta: 0, negociacao: 0, fechado: 0, perdido: 0 };
      crm.forEach((o) => { if (etapas[o.etapa] !== undefined) etapas[o.etapa]++; });
      return { labels: Object.keys(etapas), data: Object.values(etapas), colors: ["#6c757d", "#0d6efd", "#6f42c1", "#fd7e14", "#198754", "#dc3545"] };
    }
    case "crm-conversao": {
      const total = crm.length || 1;
      const fechados = crm.filter((o) => o.etapa === "fechado").length;
      return { valor: `${Math.round((fechados / total) * 100)}%`, cor: "text-info" };
    }
    case "propostas-status": {
      const st = { rascunho: 0, enviada: 0, aceita: 0, recusada: 0 };
      propostas.forEach((p) => { if (st[p.status] !== undefined) st[p.status]++; });
      return { labels: Object.keys(st), data: Object.values(st), colors: ["#6c757d", "#0d6efd", "#198754", "#dc3545"] };
    }
    case "propostas-valor": {
      const val = propostas.filter((p) => p.status === "aceita").reduce((s, p) => s + (p.total || 0), 0);
      return { valor: fmt(val), cor: "text-success" };
    }
    case "agenda-pendentes":
      return { valor: agenda.filter((c) => c.status === "pendente").length, cor: "text-warning" };
    case "agenda-status": {
      const as = { pendente: 0, concluido: 0, cancelado: 0 };
      agenda.forEach((c) => { if (as[c.status] !== undefined) as[c.status]++; });
      return { labels: Object.keys(as), data: Object.values(as), colors: ["#ffc107", "#198754", "#dc3545"] };
    }
    case "financeiro-saldo": {
      const entradas = financeiro.filter((t) => t.tipo === "entrada").reduce((s, t) => s + (t.valor || 0), 0);
      const saidas = financeiro.filter((t) => t.tipo === "saida").reduce((s, t) => s + (t.valor || 0), 0);
      return { valor: fmt(entradas - saidas), cor: entradas - saidas >= 0 ? "text-success" : "text-danger" };
    }
    case "financeiro-comparativo": {
      const mes = new Date().toISOString().slice(0, 7);
      const doMes = financeiro.filter((t) => t.data?.startsWith(mes));
      const ent = doMes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + (t.valor || 0), 0);
      const sai = doMes.filter((t) => t.tipo === "saida").reduce((s, t) => s + (t.valor || 0), 0);
      return { labels: ["Entradas", "Saídas"], data: [ent, sai], colors: ["#198754", "#dc3545"] };
    }
    case "financeiro-evolucao": {
      const meses = {};
      financeiro.forEach((t) => {
        if (!t.data) return;
        const m = t.data.slice(0, 7);
        if (!meses[m]) meses[m] = { ent: 0, sai: 0 };
        if (t.tipo === "entrada") meses[m].ent += t.valor || 0;
        else meses[m].sai += t.valor || 0;
      });
      const sorted = Object.entries(meses).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
      return { labels: sorted.map(([m]) => m), datasets: [
        { label: "Entradas", data: sorted.map(([, v]) => v.ent), borderColor: "#198754", fill: false },
        { label: "Saídas", data: sorted.map(([, v]) => v.sai), borderColor: "#dc3545", fill: false },
      ] };
    }
    case "tarefas-vencidas": {
      const agora = new Date(); agora.setHours(0, 0, 0, 0);
      let total = 0;
      empresas.forEach((emp) => {
        (emp.tarefas || []).forEach((t) => {
          if (t.status !== "Concluida") { const d = new Date(t.dataVencimento); d.setHours(0, 0, 0, 0); if (d < agora) total++; }
        });
      });
      return { valor: total, cor: total > 0 ? "text-danger" : "text-success" };
    }
    case "tarefas-prioridade": {
      const pri = { Alta: 0, Media: 0, Baixa: 0 };
      empresas.forEach((emp) => { (emp.tarefas || []).filter((t) => t.status !== "Concluida").forEach((t) => { if (pri[t.prioridade] !== undefined) pri[t.prioridade]++; }); });
      return { labels: Object.keys(pri), data: Object.values(pri), colors: ["#dc3545", "#ffc107", "#198754"] };
    }
    default:
      return { valor: "—", cor: "" };
    }
  },

  _renderizarGrafico(widget, canvas, dados) {
    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#e0e0e0" : "#333";

    let config;
    if (widget.tipo === "chart-doughnut") {
      config = {
        type: "doughnut",
        data: { labels: dados.labels, datasets: [{ data: dados.data, backgroundColor: dados.colors }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: "bottom", labels: { color: textColor } } } },
      };
    } else if (widget.tipo === "chart-bar") {
      config = {
        type: "bar",
        data: { labels: dados.labels, datasets: [{ label: "Qtd", data: dados.data, backgroundColor: dados.colors.length > 1 ? dados.colors : dados.colors[0] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } },
      };
    } else if (widget.tipo === "chart-line") {
      config = {
        type: "line",
        data: { labels: dados.labels, datasets: dados.datasets },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } },
      };
    }

    if (config) {
      this.charts[widget.id] = new Chart(canvas, config);
    }
  },

  _renderizarModalConfig() {
    const container = document.getElementById("config-widgets-lista");
    if (!container) return;

    const disponiveis = DashboardConfigController.obterWidgetsDisponiveis();
    const ativos = DashboardConfigController.obterWidgetsAtivos();
    const idsAtivos = new Set(ativos.map((w) => w.id));

    const modulos = {};
    disponiveis.forEach((w) => { if (!modulos[w.modulo]) modulos[w.modulo] = []; modulos[w.modulo].push(w); });

    const labels = { cadastros: "📋 Cadastros", crm: "🎯 CRM / Funil", propostas: "📄 Propostas", agenda: "📅 Agenda", financeiro: "💰 Financeiro" };

    let html = "";
    Object.entries(modulos).forEach(([modulo, widgets]) => {
      html += `<h6 class="fw-bold mt-3 mb-2">${labels[modulo] || modulo}</h6>`;
      widgets.forEach((w) => {
        const checked = idsAtivos.has(w.id) ? "checked" : "";
        html += `<div class="form-check mb-2">
          <input class="form-check-input dash-widget-check" type="checkbox" id="wdg-${w.id}" value="${w.id}" ${checked} />
          <label class="form-check-label" for="wdg-${w.id}">${w.icon} ${w.label} <span class="text-muted small">(${w.tipo.replace("chart-", "")})</span></label>
        </div>`;
      });
    });
    container.innerHTML = html;
  },

  _salvarConfig() {
    const checks = document.querySelectorAll(".dash-widget-check");
    const widgets = Array.from(checks).map((cb, idx) => ({ id: cb.value, ativo: cb.checked, ordem: idx }));
    DashboardConfigController.salvarSelecao(widgets);
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DashboardController.init());
} else {
  DashboardController.init();
}
