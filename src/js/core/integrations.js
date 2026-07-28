/**
 * integrations.js — Sincronização automática entre módulos (#55)
 * Gerencia o fluxo: Proposta↔CRM, Agenda→CRM, CRM/Proposta→Financeiro.
 * Ações financeiras requerem aprovação para usuários sem podeVerTodos.
 */

const IntegrationsController = {

  // ─── Proposta → CRM ───────────────────────────────────────────────────────

  /**
   * Ao salvar proposta com status "enviada", sincroniza com CRM.
   * - Se já existe oportunidade para a empresa: move para etapa "proposta"
   * - Se não existe: cria nova oportunidade na etapa "proposta"
   * @param {Object} proposta - dados da proposta salva
   */
  onPropostaEnviada(proposta) {
    if (!proposta || !proposta.empresaId || !window.CrmStorage) return;

    const todas = CrmStorage.buscarTodos();
    // Busca oportunidade existente vinculada a esta proposta
    let opExistente = todas.find((o) => o.propostaId === proposta.id);

    // Ou oportunidade da mesma empresa que esteja em etapa anterior a "proposta"
    if (!opExistente) {
      opExistente = todas.find(
        (o) => o.empresaId === proposta.empresaId &&
          ["prospeccao", "contato"].includes(o.etapa) &&
          !o.propostaId
      );
    }

    if (opExistente) {
      // Move para etapa proposta e vincula
      CrmStorage.atualizar(opExistente.id, {
        etapa: "proposta",
        propostaId: proposta.id,
        valor: proposta.total || opExistente.valor,
      });
    } else {
      // Cria nova oportunidade na etapa proposta
      CrmStorage.adicionar({
        titulo: proposta.titulo || "Proposta",
        empresaId: proposta.empresaId,
        valor: proposta.total || 0,
        etapa: "proposta",
        propostaId: proposta.id,
        previsao: proposta.validade || "",
        responsavel: "",
        observacoes: `Gerado automaticamente a partir da proposta #${proposta.numero || proposta.id}`,
      });
    }
  },

  // ─── Proposta Aceita → Financeiro (com aprovação) ─────────────────────────

  /**
   * Ao marcar proposta como "aceita", gera entrada financeira.
   * Se o usuário não tem permissão de aprovação automática, cria pendência.
   * @param {Object} proposta
   * @returns {{aprovado: boolean}} - true se gerou direto, false se precisa aprovação
   */
  onPropostaAceita(proposta) {
    if (!proposta || !proposta.total || proposta.total <= 0) return { aprovado: true };
    if (!window.FinanceiroStorage || !window.ApprovalsController) return { aprovado: true };

    // Evita duplicar: verifica se já existe entrada vinculada
    const entradas = FinanceiroStorage.buscarTodos();
    if (entradas.some((e) => e.propostaId === proposta.id)) return { aprovado: true };

    // Aprovação automática para admin/gerente
    if (window.RolesController && RolesController.usuarioPodeVerTodos()) {
      this._gerarEntradaFinanceira(proposta);
      return { aprovado: true };
    }

    // Cria pendência de aprovação
    ApprovalsController.criar({
      tipo: "proposta_aceita",
      referenciaId: proposta.id,
      referenciaModulo: "propostas",
      empresaId: proposta.empresaId,
      valor: proposta.total,
      descricao: `Proposta "${proposta.titulo}" aceita — gerar entrada financeira de ${proposta.total}`,
    });
    return { aprovado: false };
  },

  /**
   * Gera a entrada financeira a partir de uma proposta aceita.
   * @param {Object} proposta
   */
  _gerarEntradaFinanceira(proposta) {
    if (!window.FinanceiroStorage) return;
    FinanceiroStorage.adicionar({
      tipo: "entrada",
      descricao: `Proposta aceita: ${proposta.titulo || ""}${proposta.numero ? " #" + proposta.numero : ""}`,
      valor: proposta.total,
      data: new Date().toISOString().split("T")[0],
      categoria: "servicos",
      empresaId: proposta.empresaId,
      propostaId: proposta.id,
      obs: "Gerado automaticamente pela integração Proposta→Financeiro",
    });
  },

  // ─── CRM Fechado → Financeiro (com aprovação) ─────────────────────────────

  /**
   * Ao mover oportunidade para "fechado", gera entrada financeira.
   * @param {Object} oportunidade
   * @returns {{aprovado: boolean}}
   */
  onCrmFechado(oportunidade) {
    if (!oportunidade || !oportunidade.valor || oportunidade.valor <= 0) return { aprovado: true };
    if (!window.FinanceiroStorage || !window.ApprovalsController) return { aprovado: true };

    // Evita duplicar: se a proposta vinculada já gerou entrada
    const entradas = FinanceiroStorage.buscarTodos();
    if (entradas.some((e) => e.oportunidadeId === oportunidade.id)) return { aprovado: true };
    if (oportunidade.propostaId && entradas.some((e) => e.propostaId === oportunidade.propostaId)) {
      return { aprovado: true };
    }

    // Aprovação automática para admin/gerente
    if (window.RolesController && RolesController.usuarioPodeVerTodos()) {
      this._gerarEntradaCrm(oportunidade);
      return { aprovado: true };
    }

    // Cria pendência
    ApprovalsController.criar({
      tipo: "crm_fechado",
      referenciaId: oportunidade.id,
      referenciaModulo: "crm",
      empresaId: oportunidade.empresaId,
      valor: oportunidade.valor,
      descricao: `Oportunidade "${oportunidade.titulo}" fechada — gerar entrada financeira de ${oportunidade.valor}`,
    });
    return { aprovado: false };
  },

  _gerarEntradaCrm(oportunidade) {
    if (!window.FinanceiroStorage) return;
    FinanceiroStorage.adicionar({
      tipo: "entrada",
      descricao: `CRM fechado: ${oportunidade.titulo || "Oportunidade"}`,
      valor: oportunidade.valor,
      data: new Date().toISOString().split("T")[0],
      categoria: "servicos",
      empresaId: oportunidade.empresaId,
      oportunidadeId: oportunidade.id,
      obs: "Gerado automaticamente pela integração CRM→Financeiro",
    });
  },

  // ─── Agenda → CRM (Prospecção) ────────────────────────────────────────────

  /**
   * Ao criar compromisso vinculado a uma empresa, cria prospecção no CRM.
   * @param {Object} compromisso
   */
  onCompromissoCriado(compromisso) {
    if (!compromisso || !compromisso.empresaId || !window.CrmStorage) return;

    // Se já existe oportunidade para esta empresa no CRM, não duplica
    const todas = CrmStorage.buscarTodos();
    const existente = todas.find((o) => o.empresaId === compromisso.empresaId);
    if (existente) return;

    CrmStorage.adicionar({
      titulo: `Prospecção — ${compromisso.titulo || "Novo contato"}`,
      empresaId: compromisso.empresaId,
      valor: 0,
      etapa: "prospeccao",
      previsao: compromisso.data || "",
      responsavel: "",
      observacoes: `Gerado automaticamente a partir do compromisso "${compromisso.titulo}"`,
    });
  },

  // ─── Executar aprovação pendente ──────────────────────────────────────────

  /**
   * Executa a ação financeira de uma aprovação pendente.
   * Chamado pelo admin/gerente ao aprovar.
   * @param {Object} pendencia
   */
  executarAprovacao(pendencia) {
    if (pendencia.tipo === "proposta_aceita" && window.PropostasStorage) {
      const proposta = PropostasStorage.buscarTodos().find((p) => p.id === pendencia.referenciaId);
      if (proposta) this._gerarEntradaFinanceira(proposta);
    } else if (pendencia.tipo === "crm_fechado" && window.CrmStorage) {
      const op = CrmStorage.buscarTodos().find((o) => o.id === pendencia.referenciaId);
      if (op) this._gerarEntradaCrm(op);
    }
  },
};

window.IntegrationsController = IntegrationsController;
