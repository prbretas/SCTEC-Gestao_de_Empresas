/**
 * crm.js — Módulo Funil de Vendas (CRM Básico).
 * Board Kanban com 6 etapas: Prospecção, Contato, Proposta, Negociação, Fechado, Perdido.
 * Dados armazenados em: SCTEC_CRM_{orgId|userId}
 */

function _obterIdentidadeSessao() {
  if (window.AuthService) {
    const sessao = AuthService.obterSessao();
    if (sessao) return sessao.identidade || `${sessao.nome}#${sessao.id}`;
  }
  return "sistema";
}

function _formatarAuditoria(registro) {
  if (!registro || !registro.criadoEm) return "";
  const criacao = new Date(registro.criadoEm).toLocaleString("pt-BR");
  const criador = registro.criadoPor || "N/D";
  let texto = `Criado por: ${criador} em ${criacao}`;
  if (registro.atualizadoEm) {
    const atualizacao = new Date(registro.atualizadoEm).toLocaleString("pt-BR");
    const atualizador = registro.atualizadoPor || "N/D";
    texto += ` | Última alteração: ${atualizador} em ${atualizacao}`;
  }
  return texto;
}

const CrmStorage = {
  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao) return `SCTEC_CRM_${sessao.orgId || sessao.id}`;
    }
    return "SCTEC_CRM_local";
  },

  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
    catch { return []; }
  },

  salvarTodos(lista) {
    localStorage.setItem(this._obterChave(), JSON.stringify(lista));
  },

  adicionar(op) {
    const lista = this.buscarTodos();
    op.id = Date.now().toString();
    op.criadoPor = _obterIdentidadeSessao();
    op.criadoEm = new Date().toISOString();
    op.criadoPorId = window.AuthService ? (AuthService.obterSessao()?.id || null) : null;
    lista.push(op);
    this.salvarTodos(lista);
    return op;
  },

  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((o) => o.id === id);
    if (idx !== -1) {
      lista[idx] = {
        ...lista[idx],
        ...dados,
        id,
        atualizadoPor: _obterIdentidadeSessao(),
        atualizadoEm: new Date().toISOString(),
        criadoPor: lista[idx].criadoPor,
        criadoEm: lista[idx].criadoEm,
      };
      this.salvarTodos(lista);
    }
  },

  excluir(id) {
    this.salvarTodos(this.buscarTodos().filter((o) => o.id !== id));
  },
};

// Configuração das colunas do Kanban
const ETAPAS = [
  { id: "prospeccao", label: "Prospecção",   col: "col-prospeccao",  cor: "#6c757d" },
  { id: "contato",    label: "Contato Feito", col: "col-contato",    cor: "#0d6efd" },
  { id: "proposta",   label: "Proposta",      col: "col-proposta",   cor: "#6f42c1" },
  { id: "negociacao", label: "Negociação",    col: "col-negociacao", cor: "#fd7e14" },
  { id: "fechado",    label: "Fechado",       col: "col-fechado",    cor: "#198754" },
  { id: "perdido",    label: "Perdido",       col: "col-perdido",    cor: "#dc3545" },
];

// ─── Helpers de modo visualização/edição ───────────────────────────────────

function _crmSetModo(modo) {
  const form = document.getElementById("form-oportunidade");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-oportunidade");
  const btnEditar = document.getElementById("btn-editar-oportunidade");

  if (modo === "visualizacao") {
    campos.forEach((c) => c.setAttribute("disabled", "disabled"));
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "true";
    document.getElementById("titulo-modal-oportunidade").textContent = "👁️ Visualizar Oportunidade";
  } else {
    campos.forEach((c) => c.removeAttribute("disabled"));
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    form.dataset.modoVisualizacao = "";
    document.getElementById("titulo-modal-oportunidade").textContent = "✏️ Editar Oportunidade";
  }
}

// ─── Inicialização ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("crm")) return;

  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("crm");
  if (window.ThemeController) ThemeController.init();

  const modalEl = document.getElementById("modal-oportunidade");
  const modal = new bootstrap.Modal(modalEl);

  _preencherEmpresas();
  renderizarKanban();

  document.getElementById("btn-nova-oportunidade").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-oportunidade").textContent = "🎯 Nova Oportunidade";
    document.getElementById("op-previsao").value = new Date().toISOString().split("T")[0];
    _crmSetModo("edicao");
    modal.show();
  });

  document.getElementById("btn-editar-oportunidade")?.addEventListener("click", () => {
    _crmSetModo("edicao");
  });

  modalEl.addEventListener("hide.bs.modal", (e) => {
    const form = document.getElementById("form-oportunidade");
    if (form.dataset.modoVisualizacao !== "true" && form.dataset.editId) {
      if (!confirm("Deseja descartar as alterações?")) {
        e.preventDefault();
      }
    }
  });

  document.getElementById("form-oportunidade").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = document.getElementById("form-oportunidade");
    const id = form.dataset.editId;
    const dados = _coletarForm();
    if (!dados) return;

    if (id) {
      CrmStorage.atualizar(id, dados);
    } else {
      CrmStorage.adicionar(dados);
    }
    // Marca como visualização para que o hide.bs.modal não pergunte sobre descartar
    form.dataset.modoVisualizacao = "true";
    modal.hide();
    renderizarKanban();
  });
});

function _preencherEmpresas() {
  const select = document.getElementById("op-empresa");
  if (!select || !window.EmpreendimentoStorage) return;
  const empresas = EmpreendimentoStorage.buscarTodos();
  empresas.forEach((emp) => {
    const opt = document.createElement("option");
    opt.value = emp.id;
    opt.textContent = emp.nome;
    select.appendChild(opt);
  });
}

function _resetarForm() {
  const form = document.getElementById("form-oportunidade");
  form.reset();
  delete form.dataset.editId;
  delete form.dataset.modoVisualizacao;
}

function _coletarForm() {
  const titulo = document.getElementById("op-titulo").value.trim();
  const empresaId = document.getElementById("op-empresa").value;
  if (!titulo || !empresaId) { alert("Título e Empresa são obrigatórios."); return null; }

  const valorRaw = parseFloat(document.getElementById("op-valor").value) || 0;

  return {
    titulo,
    empresaId,
    valor: valorRaw,
    previsao: document.getElementById("op-previsao").value,
    etapa: document.getElementById("op-etapa").value,
    responsavel: document.getElementById("op-responsavel").value.trim(),
    observacoes: document.getElementById("op-observacoes").value.trim(),
  };
}

function renderizarKanban() {
  const todasBruto = CrmStorage.buscarTodos();
  const todas = window.RolesController
    ? RolesController.filtrarPorVisibilidade(todasBruto)
    : todasBruto;
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];

  _atualizarKpisCrm(todas);

  ETAPAS.forEach((etapa) => {
    const col = document.getElementById(etapa.col);
    if (!col) return;

    const oportunidades = todas.filter((o) => o.etapa === etapa.id);

    if (oportunidades.length === 0) {
      col.innerHTML = `<div class="text-muted small text-center py-3">Nenhuma oportunidade</div>`;
      return;
    }

    col.innerHTML = oportunidades.map((o) => {
      const emp = empresas.find((e) => String(e.id) === String(o.empresaId));
      const nomeEmp = emp ? emp.nome : "—";
      const valorFmt = o.valor > 0
        ? `R$ ${Number(o.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "";
      const previsaoFmt = o.previsao
        ? new Date(o.previsao + "T12:00:00").toLocaleDateString("pt-BR")
        : "";

      return `
        <div class="kanban-card" style="border-left-color:${etapa.cor};cursor:pointer;"
             onclick="visualizarOportunidade('${o.id}')">
          <div class="fw-bold small mb-1">${o.titulo}</div>
          <div class="text-muted" style="font-size:.75rem;">${nomeEmp}</div>
          ${valorFmt ? `<div class="text-success fw-bold" style="font-size:.78rem;">${valorFmt}</div>` : ""}
          ${previsaoFmt ? `<div class="text-muted" style="font-size:.72rem;">📅 ${previsaoFmt}</div>` : ""}
          ${o.responsavel ? `<div class="text-muted" style="font-size:.72rem;">👤 ${o.responsavel}</div>` : ""}
          <div class="mt-2 d-flex justify-content-between" onclick="event.stopPropagation()">
            <select class="form-select form-select-sm" style="font-size:.7rem;padding:2px 4px;"
              onchange="moverEtapa('${o.id}', this.value)">
              ${ETAPAS.map((et) =>
                `<option value="${et.id}" ${et.id === o.etapa ? "selected" : ""}>${et.label}</option>`
              ).join("")}
            </select>
            <button class="btn btn-xs btn-outline-danger ms-1"
              onclick="excluirOportunidade('${o.id}')">🗑️</button>
          </div>
        </div>`;
    }).join("");
  });
}

function _atualizarKpisCrm(todas) {
  const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const pipeline = todas.filter((o) => !["fechado", "perdido"].includes(o.etapa))
    .reduce((s, o) => s + (Number(o.valor) || 0), 0);

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el("crm-kpi-pipeline", fmt(pipeline));
  el("crm-kpi-prospeccao", todas.filter((o) => o.etapa === "prospeccao").length);
  el("crm-kpi-contato", todas.filter((o) => o.etapa === "contato").length);
  el("crm-kpi-proposta", todas.filter((o) => o.etapa === "proposta").length);
  el("crm-kpi-negociacao", todas.filter((o) => o.etapa === "negociacao").length);
  el("crm-kpi-fechado", todas.filter((o) => o.etapa === "fechado").length);
}

function visualizarOportunidade(id) {
  const op = CrmStorage.buscarTodos().find((o) => o.id === id);
  if (!op) return;

  document.getElementById("op-titulo").value = op.titulo || "";
  document.getElementById("op-empresa").value = op.empresaId || "";
  document.getElementById("op-valor").value = op.valor || "";
  document.getElementById("op-previsao").value = op.previsao || "";
  document.getElementById("op-etapa").value = op.etapa || "prospeccao";
  document.getElementById("op-responsavel").value = op.responsavel || "";
  document.getElementById("op-observacoes").value = op.observacoes || "";
  document.getElementById("form-oportunidade").dataset.editId = id;

  // Exibe auditoria no footer
  const auditoriaEl = document.getElementById("auditoria-crm");
  if (auditoriaEl) auditoriaEl.textContent = _formatarAuditoria(op);

  _crmSetModo("visualizacao");
  new bootstrap.Modal(document.getElementById("modal-oportunidade")).show();
}

function abrirEdicao(id) {
  visualizarOportunidade(id);
}

function moverEtapa(id, novaEtapa) {
  CrmStorage.atualizar(id, { etapa: novaEtapa });

  // Integração: CRM Fechado → Financeiro
  if (novaEtapa === "fechado" && window.IntegrationsController) {
    const op = CrmStorage.buscarTodos().find((o) => o.id === id);
    if (op) {
      const resultado = IntegrationsController.onCrmFechado(op);
      if (!resultado.aprovado) {
        alert("📋 Oportunidade fechada! Uma pendência de aprovação foi criada para geração da entrada financeira.");
      }
    }
  }

  renderizarKanban();
}

function excluirOportunidade(id) {
  if (!confirm("Remover esta oportunidade?")) return;
  CrmStorage.excluir(id);
  renderizarKanban();
}
