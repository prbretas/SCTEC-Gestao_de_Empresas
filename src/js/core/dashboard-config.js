/**
 * dashboard-config.js — Configuração personalizada do Dashboard por usuário (#63)
 * Cada usuário escolhe quais widgets exibir. Widgets filtrados pelo acesso do papel.
 * Storage: SCTEC_DASHBOARD_CONFIG_{userId}
 */

const DASH_CONFIG_PREFIX = "SCTEC_DASHBOARD_CONFIG_";

/**
 * Catálogo completo de widgets disponíveis no sistema.
 */
const WIDGETS_CATALOGO = [
  // Cadastros
  { id: "cadastros-total", modulo: "cadastros", label: "Total de Empresas", icon: "📋", tipo: "card", defaultAtivo: true },
  { id: "cadastros-status", modulo: "cadastros", label: "Ativos vs Inativos", icon: "🟢", tipo: "chart-doughnut", defaultAtivo: true },
  { id: "cadastros-segmento", modulo: "cadastros", label: "Distribuição por Segmento", icon: "🏷️", tipo: "chart-doughnut", defaultAtivo: true },
  { id: "cadastros-municipios", modulo: "cadastros", label: "Top 10 Municípios", icon: "📍", tipo: "chart-bar", defaultAtivo: false },
  // CRM
  { id: "crm-pipeline", modulo: "crm", label: "Pipeline Total", icon: "💰", tipo: "card", defaultAtivo: true },
  { id: "crm-etapas", modulo: "crm", label: "Oportunidades por Etapa", icon: "🎯", tipo: "chart-bar", defaultAtivo: true },
  { id: "crm-conversao", modulo: "crm", label: "Taxa de Conversão", icon: "📈", tipo: "card", defaultAtivo: false },
  // Propostas
  { id: "propostas-status", modulo: "propostas", label: "Propostas por Status", icon: "📄", tipo: "chart-bar", defaultAtivo: true },
  { id: "propostas-valor", modulo: "propostas", label: "Valor Total Aceitas", icon: "✅", tipo: "card", defaultAtivo: true },
  // Agenda
  { id: "agenda-pendentes", modulo: "agenda", label: "Compromissos Pendentes", icon: "⏳", tipo: "card", defaultAtivo: true },
  { id: "agenda-status", modulo: "agenda", label: "Status dos Compromissos", icon: "📅", tipo: "chart-doughnut", defaultAtivo: false },
  // Financeiro
  { id: "financeiro-saldo", modulo: "financeiro", label: "Saldo Atual", icon: "💼", tipo: "card", defaultAtivo: true },
  { id: "financeiro-comparativo", modulo: "financeiro", label: "Entradas vs Saídas do Mês", icon: "📊", tipo: "chart-bar", defaultAtivo: true },
  { id: "financeiro-evolucao", modulo: "financeiro", label: "Evolução Mensal (6 meses)", icon: "📈", tipo: "chart-line", defaultAtivo: false },
  // Tarefas
  { id: "tarefas-vencidas", modulo: "cadastros", label: "Tarefas Vencidas", icon: "⚠️", tipo: "card", defaultAtivo: true },
  { id: "tarefas-prioridade", modulo: "cadastros", label: "Tarefas por Prioridade", icon: "🔴", tipo: "chart-doughnut", defaultAtivo: false },
];

const DashboardConfigController = {

  /**
   * Retorna a chave de storage para o usuário logado.
   */
  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao) return `${DASH_CONFIG_PREFIX}${sessao.id}`;
    }
    return `${DASH_CONFIG_PREFIX}default`;
  },

  /**
   * Retorna a configuração salva do usuário, ou null (usa defaults).
   * @returns {Object|null}
   */
  obterConfig() {
    try {
      const salvo = localStorage.getItem(this._obterChave());
      if (salvo) return JSON.parse(salvo);
    } catch {}
    return null;
  },

  /**
   * Salva a configuração do usuário.
   * @param {Object} config - { widgets: [{id, ativo, ordem}] }
   */
  salvarConfig(config) {
    localStorage.setItem(this._obterChave(), JSON.stringify(config));
  },

  /**
   * Retorna os widgets disponíveis para o usuário logado.
   * Filtra pelo acesso do papel (modulosPermitidos).
   * @returns {Array}
   */
  obterWidgetsDisponiveis() {
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    const isAdmin = sessao?.role === "admin";

    // Admin vê tudo
    if (isAdmin) return WIDGETS_CATALOGO;

    // Obter módulos que o usuário pode acessar
    let modulosPermitidos = null;
    if (sessao && sessao.orgId && sessao.papelId && window.RolesController) {
      modulosPermitidos = RolesController.obterModulosPermitidos(sessao.orgId, sessao.papelId);
    }

    // Se não tem restrição (null), mostra todos
    if (modulosPermitidos === null) return WIDGETS_CATALOGO;

    // Filtra pelo acesso
    return WIDGETS_CATALOGO.filter((w) => modulosPermitidos.includes(w.modulo));
  },

  /**
   * Retorna os widgets ativos (que devem ser renderizados) para o usuário.
   * Cruza configuração salva com widgets disponíveis.
   * @returns {Array} widgets ordenados por ordem
   */
  obterWidgetsAtivos() {
    const disponiveis = this.obterWidgetsDisponiveis();
    const config = this.obterConfig();

    if (!config || !config.widgets) {
      // Sem configuração: usa defaults
      return disponiveis.filter((w) => w.defaultAtivo);
    }

    // Filtra: apenas widgets que o papel permite E que estão ativos na config
    return disponiveis
      .map((w) => {
        const cfgWidget = config.widgets.find((c) => c.id === w.id);
        return {
          ...w,
          ativo: cfgWidget ? cfgWidget.ativo : w.defaultAtivo,
          ordem: cfgWidget ? cfgWidget.ordem : 999,
        };
      })
      .filter((w) => w.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  },

  /**
   * Salva a seleção de widgets com ordem.
   * Se um modelo está ativo, atualiza esse modelo também.
   * @param {Array} widgetStates - [{id, ativo, ordem}]
   */
  salvarSelecao(widgetStates) {
    const config = this.obterConfig() || {};
    config.widgets = widgetStates;

    // Se há modelo ativo, atualiza os widgets desse modelo
    if (config.modeloAtivo && config.modeloAtivo !== "__default__" && config.modelos) {
      const idx = config.modelos.findIndex((m) => m.id === config.modeloAtivo);
      if (idx !== -1) {
        config.modelos[idx].widgets = JSON.parse(JSON.stringify(widgetStates));
      }
    }

    this.salvarConfig(config);
  },

  // ─── Modelos (Presets) ────────────────────────────────────────────────────

  /**
   * Retorna a lista de modelos salvos pelo usuário.
   * @returns {Array} [{id, nome, widgets}]
   */
  obterModelos() {
    const config = this.obterConfig() || {};
    return config.modelos || [];
  },

  /**
   * Retorna o ID do modelo ativo, ou "__default__".
   */
  getModeloAtivo() {
    const config = this.obterConfig() || {};
    return config.modeloAtivo || "__default__";
  },

  /**
   * Define o modelo ativo. Se "__default__", restaura widgets padrão.
   * @param {string} modeloId
   */
  setModeloAtivo(modeloId) {
    const config = this.obterConfig() || {};
    config.modeloAtivo = modeloId;

    if (modeloId === "__default__") {
      // Restaura widgets padrão (remove seleção customizada)
      delete config.widgets;
    } else {
      // Aplica widgets do modelo selecionado
      const modelo = (config.modelos || []).find((m) => m.id === modeloId);
      if (modelo && modelo.widgets) {
        config.widgets = JSON.parse(JSON.stringify(modelo.widgets));
      }
    }

    this.salvarConfig(config);
  },

  /**
   * Salva o estado atual de widgets como um novo modelo com nome.
   * @param {string} nome
   */
  salvarModelo(nome) {
    const config = this.obterConfig() || {};
    if (!config.modelos) config.modelos = [];
    const novoModelo = {
      id: `modelo_${Date.now()}`,
      nome,
      widgets: config.widgets || WIDGETS_CATALOGO.filter((w) => w.defaultAtivo).map((w, i) => ({ id: w.id, ativo: true, ordem: i })),
    };
    config.modelos.push(novoModelo);
    config.modeloAtivo = novoModelo.id;
    this.salvarConfig(config);
  },

  /**
   * Exclui um modelo pelo ID.
   * @param {string} modeloId
   */
  excluirModelo(modeloId) {
    const config = this.obterConfig() || {};
    config.modelos = (config.modelos || []).filter((m) => m.id !== modeloId);
    if (config.modeloAtivo === modeloId) config.modeloAtivo = "__default__";
    this.salvarConfig(config);
  },
};

window.DashboardConfigController = DashboardConfigController;
window.WIDGETS_CATALOGO = WIDGETS_CATALOGO;
