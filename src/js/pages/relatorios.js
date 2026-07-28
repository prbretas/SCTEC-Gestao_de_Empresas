/**
 * relatorios.js — Relatórios Avançados consolidados (#39)
 * Gera relatório com seções de Financeiro, CRM, Propostas e Agenda.
 * Filtro por período + exportação via window.print().
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("cadastros")) return;

  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("relatorios", "📑 Relatórios");
  if (window.ThemeController) ThemeController.init();

  // Default: últimos 30 dias
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 30);
  document.getElementById("rel-data-inicio").value = inicio.toISOString().split("T")[0];
  document.getElementById("rel-data-fim").value = hoje.toISOString().split("T")[0];

  document.getElementById("btn-gerar-relatorio")?.addEventListener("click", gerarRelatorio);

  document.querySelectorAll(".rel-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dias = parseInt(btn.getAttribute("data-dias"));
      const fim = new Date();
      const ini = new Date();
      ini.setDate(ini.getDate() - dias);
      document.getElementById("rel-data-inicio").value = ini.toISOString().split("T")[0];
      document.getElementById("rel-data-fim").value = fim.toISOString().split("T")[0];
      gerarRelatorio();
    });
  });

  gerarRelatorio();
});

function _filtrarPorData(registros, dataInicio, dataFim) {
  return registros.filter((r) => {
    const d = (r.data || r.criadoEm || r.dataCadastro || "").slice(0, 10);
    if (!d) return true;
    if (dataInicio && d < dataInicio) return false;
    if (dataFim && d > dataFim) return false;
    return true;
  });
}

function gerarRelatorio() {
  const dataInicio = document.getElementById("rel-data-inicio").value;
  const dataFim = document.getElementById("rel-data-fim").value;
  const container = document.getElementById("relatorio-conteudo");
  if (!container) return;

  const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const periodoLabel = `${dataInicio ? new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR") : "início"} a ${dataFim ? new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR") : "hoje"}`;

  // Dados
  const financeiro = _filtrarPorData(window.FinanceiroStorage ? FinanceiroStorage.buscarTodos() : [], dataInicio, dataFim);
  const crm = _filtrarPorData(window.CrmStorage ? CrmStorage.buscarTodos() : [], dataInicio, dataFim);
  const propostas = _filtrarPorData(window.PropostasStorage ? PropostasStorage.buscarTodos() : [], dataInicio, dataFim);
  const agenda = _filtrarPorData(window.AgendaStorage ? AgendaStorage.buscarTodos() : [], dataInicio, dataFim);
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];

  // Financeiro
  const entradas = financeiro.filter((t) => t.tipo === "entrada").reduce((s, t) => s + (t.valor || 0), 0);
  const saidas = financeiro.filter((t) => t.tipo === "saida").reduce((s, t) => s + (t.valor || 0), 0);
  const saldo = entradas - saidas;

  // CRM
  const crmFechado = crm.filter((o) => o.etapa === "fechado").length;
  const crmPerdido = crm.filter((o) => o.etapa === "perdido").length;
  const crmAberto = crm.filter((o) => !["fechado", "perdido"].includes(o.etapa)).length;
  const pipelineValor = crm.filter((o) => !["fechado", "perdido"].includes(o.etapa)).reduce((s, o) => s + (Number(o.valor) || 0), 0);

  // Propostas
  const propAceitas = propostas.filter((p) => p.status === "aceita");
  const propEnviadas = propostas.filter((p) => p.status === "enviada");
  const propRecusadas = propostas.filter((p) => p.status === "recusada");
  const valorAceitas = propAceitas.reduce((s, p) => s + (p.total || 0), 0);

  // Agenda
  const agPendentes = agenda.filter((c) => c.status === "pendente").length;
  const agConcluidos = agenda.filter((c) => c.status === "concluido").length;
  const agCancelados = agenda.filter((c) => c.status === "cancelado").length;

  container.innerHTML = `
    <div class="text-center mb-4">
      <h4 class="fw-bold">Relatório Consolidado</h4>
      <p class="text-muted">Período: ${periodoLabel}</p>
    </div>

    <!-- FINANCEIRO -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-light"><h5 class="mb-0">💰 Resumo Financeiro</h5></div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Transações</div>
            <h4>${financeiro.length}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Entradas</div>
            <h4 class="text-success">${fmt(entradas)}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Saídas</div>
            <h4 class="text-danger">${fmt(saidas)}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Saldo</div>
            <h4 class="${saldo >= 0 ? "text-primary" : "text-danger"}">${fmt(saldo)}</h4>
          </div>
        </div>
      </div>
    </div>

    <!-- CRM -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-light"><h5 class="mb-0">🎯 Pipeline CRM</h5></div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Em Aberto</div>
            <h4>${crmAberto}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Fechados</div>
            <h4 class="text-success">${crmFechado}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Perdidos</div>
            <h4 class="text-danger">${crmPerdido}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Valor Pipeline</div>
            <h4 class="text-primary">${fmt(pipelineValor)}</h4>
          </div>
        </div>
        ${crm.length > 0 ? `<div class="small text-muted mt-2">Taxa de conversão: ${crm.length > 0 ? Math.round((crmFechado / crm.length) * 100) : 0}%</div>` : ""}
      </div>
    </div>

    <!-- PROPOSTAS -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-light"><h5 class="mb-0">📄 Propostas e Orçamentos</h5></div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Total</div>
            <h4>${propostas.length}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Enviadas</div>
            <h4 class="text-primary">${propEnviadas.length}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Aceitas</div>
            <h4 class="text-success">${propAceitas.length}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Valor Aceitas</div>
            <h4 class="text-success">${fmt(valorAceitas)}</h4>
          </div>
        </div>
        ${propRecusadas.length > 0 ? `<div class="small text-muted mt-2">Recusadas: ${propRecusadas.length}</div>` : ""}
      </div>
    </div>

    <!-- AGENDA -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-light"><h5 class="mb-0">📅 Compromissos</h5></div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Total</div>
            <h4>${agenda.length}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Pendentes</div>
            <h4 class="text-warning">${agPendentes}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Concluídos</div>
            <h4 class="text-success">${agConcluidos}</h4>
          </div>
          <div class="col-md-3">
            <div class="fw-bold text-muted small">Cancelados</div>
            <h4 class="text-danger">${agCancelados}</h4>
          </div>
        </div>
        ${agenda.length > 0 ? `<div class="small text-muted mt-2">Taxa de conclusão: ${Math.round((agConcluidos / agenda.length) * 100)}%</div>` : ""}
      </div>
    </div>

    <!-- CADASTROS -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-light"><h5 class="mb-0">📋 Base de Cadastros</h5></div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <div class="col-md-4">
            <div class="fw-bold text-muted small">Total Empresas</div>
            <h4>${empresas.length}</h4>
          </div>
          <div class="col-md-4">
            <div class="fw-bold text-muted small">Ativos</div>
            <h4 class="text-success">${empresas.filter((e) => e.status === "Ativo").length}</h4>
          </div>
          <div class="col-md-4">
            <div class="fw-bold text-muted small">Inativos</div>
            <h4 class="text-danger">${empresas.filter((e) => e.status !== "Ativo").length}</h4>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center text-muted small mt-4">
      Gerado em ${new Date().toLocaleString("pt-BR")} — SCTEC Gestão Empresarial
    </div>
  `;
}
