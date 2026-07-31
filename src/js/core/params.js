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
    tiposFiscais: ["nfs", "nfe"],
    categorias: ["servicos", "produtos", "salarios", "impostos", "aluguel", "marketing", "outros"],
    formasPagamento: ["boleto", "pix", "cartao_credito", "cartao_debito", "transferencia", "dinheiro", "cheque"],
    numeracao: "sequencial",
    prefixoCodigo: "FIN",
  },
  agenda: {
    tipos: ["reuniao", "visita", "ligacao", "prazo", "outro"],
    criarProspeccaoCrm: true,
  },
  relatorios: {
    periodoPadrao: "30d",
    separadorCsv: ";",
  },
  produtos: {
    permitirEstoqueNegativo: false,
    codigoObrigatorio: false,
    descricaoObrigatoria: false,
    categorias: ["materiais", "equipamentos", "servicos", "insumos", "outros"],
    unidadesPadrao: ["un", "kg", "m", "m2", "l", "cx", "pc", "hr"],
    numeracao: "sequencial",
    prefixoCodigo: "PRD",
  },
  estoque: {
    estoqueMinimoPadrao: 5,
    exigirMotivo: true,
    permitirTransferencia: true,
    gerarFinanceiro: true,
    alertarEstoqueBaixo: true,
    limiteAlertasNavbar: 10,
  },
  entrada: {
    diasVencimento: 30,
    confirmarRecebimentoAutomatico: false,
    numeracao: "sequencial",
    prefixoCodigo: "ENT",
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

/**
 * Gerador de numeração sequencial/aleatória para registros.
 * Usado em Produtos, Financeiro, Propostas, etc.
 * Garante unicidade verificando registros existentes.
 */
const NumeracaoService = {
  /**
   * Gera próximo código baseado no parâmetro de numeração da rotina.
   * @param {string} rotina - ex: "produtos", "financeiro", "propostas"
   * @param {Array} registrosExistentes - lista de registros para verificar unicidade
   * @param {string} [campoCodigoKey] - nome do campo que guarda o código (default: "codigo")
   * @returns {string} código gerado
   */
  gerarCodigo(rotina, registrosExistentes = [], campoCodigoKey = "codigo") {
    const params = window.ParamsController ? ParamsController.obter(rotina) : {};
    const tipo = params.numeracao || "sequencial";
    const prefixo = params.prefixoCodigo || rotina.substring(0, 3).toUpperCase();

    const codigosExistentes = new Set(
      registrosExistentes.map((r) => r[campoCodigoKey] || "").filter(Boolean)
    );

    if (tipo === "sequencial") {
      return this._gerarSequencial(prefixo, codigosExistentes);
    } else if (tipo === "aleatoria") {
      return this._gerarAleatoria(prefixo, codigosExistentes);
    }
    // tipo === "manual" — retorna vazio, usuário preenche
    return "";
  },

  _gerarSequencial(prefixo, existentes) {
    let seq = 1;
    let codigo;
    do {
      codigo = `${prefixo}-${String(seq).padStart(3, "0")}`;
      seq++;
    } while (existentes.has(codigo));
    return codigo;
  },

  _gerarAleatoria(prefixo, existentes) {
    let codigo;
    do {
      const rand = Math.floor(10000 + Math.random() * 90000);
      codigo = `${prefixo}-${rand}`;
    } while (existentes.has(codigo));
    return codigo;
  },
};

window.NumeracaoService = NumeracaoService;
