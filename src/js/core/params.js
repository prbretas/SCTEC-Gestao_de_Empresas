/**
 * params.js — Parâmetros configuráveis por rotina (#100)
 * Admin pode alterar parâmetros de cada rotina via modal no navbar.
 * Storage: SCTEC_PARAMS_{orgId}
 */

const PARAMS_KEY_PREFIX = "SCTEC_PARAMS_";

const PARAMS_PADRAO = {
  cadastros: {
    camposObrigatorios: ["nome", "registro", "municipio"],
    mascaraTelefone: true,
    consultaCnpj: true,
  },
  crm: {
    etapas: ["prospeccao", "contato", "proposta", "negociacao", "fechado", "perdido"],
    diasArquivamento: 7,
    propostaObrigatoriaEm: "negociacao",
  },
  propostas: {
    numeracaoAuto: true,
    formatoNumero: "{ANO}-{SEQ}",
    validadePadrao: 30,
  },
  financeiro: {
    valorMinParcela: 50,
    diasVencimento: 15,
    categorias: ["servicos", "produtos", "salarios", "impostos", "aluguel", "marketing", "outros"],
    formasPagamento: ["boleto", "pix", "cartao_credito", "cartao_debito", "transferencia", "dinheiro", "cheque"],
  },
  agenda: {
    tipos: ["reuniao", "visita", "ligacao", "prazo", "outro"],
    criarProspeccaoCrm: true,
  },
  relatorios: {
    periodoPadrao: "30d",
    separadorCsv: ";",
  },
};

const ParamsController = {

  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao && sessao.orgId) return `${PARAMS_KEY_PREFIX}${sessao.orgId}`;
    }
    return `${PARAMS_KEY_PREFIX}global`;
  },

  /**
   * Retorna todos os parâmetros salvos (merge com defaults).
   * @returns {Object}
   */
  obterTodos() {
    try {
      const salvo = JSON.parse(localStorage.getItem(this._obterChave()) || "{}");
      // Merge com defaults
      const resultado = {};
      Object.keys(PARAMS_PADRAO).forEach((rotina) => {
        resultado[rotina] = { ...PARAMS_PADRAO[rotina], ...(salvo[rotina] || {}) };
      });
      return resultado;
    } catch {
      return JSON.parse(JSON.stringify(PARAMS_PADRAO));
    }
  },

  /**
   * Retorna parâmetros de uma rotina específica.
   * @param {string} rotina - ex: "financeiro", "crm"
   * @returns {Object}
   */
  obter(rotina) {
    const todos = this.obterTodos();
    return todos[rotina] || PARAMS_PADRAO[rotina] || {};
  },

  /**
   * Salva parâmetros de uma rotina.
   * @param {string} rotina
   * @param {Object} params
   */
  salvar(rotina, params) {
    const todos = this.obterTodos();
    todos[rotina] = { ...todos[rotina], ...params };
    localStorage.setItem(this._obterChave(), JSON.stringify(todos));
  },

  /**
   * Retorna os defaults de uma rotina (para reset).
   * @param {string} rotina
   * @returns {Object}
   */
  obterPadrao(rotina) {
    return PARAMS_PADRAO[rotina] || {};
  },
};

window.ParamsController = ParamsController;
window.PARAMS_PADRAO = PARAMS_PADRAO;
