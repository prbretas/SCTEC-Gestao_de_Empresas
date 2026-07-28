/**
 * approvals.js — Gerenciamento de Pendências de Aprovação (#55)
 * Ações com impacto financeiro (proposta aceita, CRM fechado) requerem
 * aprovação do gerente/admin quando o solicitante não tem podeVerTodos.
 * Storage: SCTEC_APPROVALS_{orgId}
 */

const APPROVALS_KEY_PREFIX = "SCTEC_APPROVALS_";

const ApprovalsController = {

  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao && sessao.orgId) return `${APPROVALS_KEY_PREFIX}${sessao.orgId}`;
    }
    return `${APPROVALS_KEY_PREFIX}global`;
  },

  /**
   * Retorna todas as pendências da organização.
   * @returns {Array}
   */
  buscarTodas() {
    try {
      return JSON.parse(localStorage.getItem(this._obterChave()) || "[]");
    } catch {
      return [];
    }
  },

  /**
   * Persiste as pendências.
   * @param {Array} lista
   */
  salvarTodas(lista) {
    localStorage.setItem(this._obterChave(), JSON.stringify(lista));
  },

  /**
   * Retorna pendências com status "pendente".
   * @returns {Array}
   */
  buscarPendentes() {
    return this.buscarTodas().filter((p) => p.status === "pendente");
  },

  /**
   * Conta pendências aguardando aprovação.
   * @returns {number}
   */
  contarPendentes() {
    return this.buscarPendentes().length;
  },

  /**
   * Cria uma nova pendência de aprovação.
   * @param {Object} dados - { tipo, referenciaId, referenciaModulo, empresaId, valor, descricao }
   * @returns {Object} pendência criada
   */
  criar(dados) {
    const lista = this.buscarTodas();
    const sessao = window.AuthService ? AuthService.obterSessao() : null;

    const pendencia = {
      id: Date.now().toString(),
      tipo: dados.tipo,
      referenciaId: dados.referenciaId,
      referenciaModulo: dados.referenciaModulo,
      empresaId: dados.empresaId || null,
      valor: dados.valor || 0,
      descricao: dados.descricao || "",
      solicitanteId: sessao?.id || null,
      solicitanteNome: sessao?.identidade || "sistema",
      status: "pendente",
      aprovadorId: null,
      aprovadorNome: null,
      dataSolicitacao: new Date().toISOString(),
      dataResolucao: null,
      motivo: null,
    };

    lista.push(pendencia);
    this.salvarTodas(lista);
    return pendencia;
  },

  /**
   * Aprova uma pendência. Executa a ação financeira via IntegrationsController.
   * @param {string} pendenciaId
   * @returns {{ok: boolean, erro?: string}}
   */
  aprovar(pendenciaId) {
    const lista = this.buscarTodas();
    const idx = lista.findIndex((p) => p.id === pendenciaId);
    if (idx === -1) return { ok: false, erro: "Pendência não encontrada." };
    if (lista[idx].status !== "pendente") return { ok: false, erro: "Pendência já foi resolvida." };

    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    lista[idx].status = "aprovado";
    lista[idx].aprovadorId = sessao?.id || null;
    lista[idx].aprovadorNome = sessao?.identidade || "sistema";
    lista[idx].dataResolucao = new Date().toISOString();
    this.salvarTodas(lista);

    // Executa ação financeira
    if (window.IntegrationsController) {
      IntegrationsController.executarAprovacao(lista[idx]);
    }

    return { ok: true };
  },

  /**
   * Rejeita uma pendência.
   * @param {string} pendenciaId
   * @param {string} motivo
   * @returns {{ok: boolean, erro?: string}}
   */
  rejeitar(pendenciaId, motivo = "") {
    const lista = this.buscarTodas();
    const idx = lista.findIndex((p) => p.id === pendenciaId);
    if (idx === -1) return { ok: false, erro: "Pendência não encontrada." };
    if (lista[idx].status !== "pendente") return { ok: false, erro: "Pendência já foi resolvida." };

    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    lista[idx].status = "rejeitado";
    lista[idx].aprovadorId = sessao?.id || null;
    lista[idx].aprovadorNome = sessao?.identidade || "sistema";
    lista[idx].dataResolucao = new Date().toISOString();
    lista[idx].motivo = motivo || "Sem motivo informado";
    this.salvarTodas(lista);

    return { ok: true };
  },
};

window.ApprovalsController = ApprovalsController;
