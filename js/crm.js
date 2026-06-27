/**
 * crm.js — Módulo Funil de Vendas (CRM Básico).
 * Board Kanban com 6 etapas: Prospecção, Contato, Proposta, Negociação, Fechado, Perdido.
 * Dados armazenados em: SCTEC_CRM_{orgId|userId}
 */

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
    op.criadoEm = new Date().toISOString();
    lista.push(op);
    this.salvarTodos(lista);
    return op;
  },

  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((o) => o.id === id);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], ...dados, id };
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

// ─── Inicialização ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;

  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  const modal = new bootstrap.Modal(document.getElementById("modal-oportunidade"));

  _preencherEmpresas();
  renderizarKanban();

  document.getElementById("btn-nova-oportunidade").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-oportunidade").textContent = "🎯 Nova Oportunidade";
    document.getElementById("op-previsao").value = new Date().toISOString().split("T")[0];
    modal.show();
  });

  document.getElementById("form-oportunidade").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-oportunidade").dataset.editId;
    const dados = _coletarForm();
    if (!dados) return;

    if (id) {
      CrmStorage.atualizar(id, dados);
    } else {
      CrmStorage.adicionar(dados);
    }
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
  const todas = CrmStorage.buscarTodos();
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];

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
        <div class="kanban-card" style="border-left-color:${etapa.cor};"
             onclick="abrirEdicao('${o.id}')">
          <div class="fw-bold small mb-1">${o.titulo}</div>
          <div class="text-muted" style="font-size:.75rem;">${nomeEmp}</div>
          ${valorFmt ? `<div class="text-success fw-bold" style="font-size:.78rem;">${valorFmt}</div>` : ""}
          ${previsaoFmt ? `<div class="text-muted" style="font-size:.72rem;">📅 ${previsaoFmt}</div>` : ""}
          ${o.responsavel ? `<div class="text-muted" style="font-size:.72rem;">👤 ${o.responsavel}</div>` : ""}
          <div class="mt-2 d-flex justify-content-between">
            <select class="form-select form-select-sm" style="font-size:.7rem;padding:2px 4px;"
              onclick="event.stopPropagation()"
              onchange="moverEtapa('${o.id}', this.value)">
              ${ETAPAS.map((et) =>
                `<option value="${et.id}" ${et.id === o.etapa ? "selected" : ""}>${et.label}</option>`
              ).join("")}
            </select>
            <button class="btn btn-xs btn-outline-danger ms-1"
              onclick="event.stopPropagation(); excluirOportunidade('${o.id}')">🗑️</button>
          </div>
        </div>`;
    }).join("");
  });
}

function abrirEdicao(id) {
  const op = CrmStorage.buscarTodos().find((o) => o.id === id);
  if (!op) return;

  document.getElementById("titulo-modal-oportunidade").textContent = "✏️ Editar Oportunidade";
  document.getElementById("op-titulo").value = op.titulo || "";
  document.getElementById("op-empresa").value = op.empresaId || "";
  document.getElementById("op-valor").value = op.valor || "";
  document.getElementById("op-previsao").value = op.previsao || "";
  document.getElementById("op-etapa").value = op.etapa || "prospeccao";
  document.getElementById("op-responsavel").value = op.responsavel || "";
  document.getElementById("op-observacoes").value = op.observacoes || "";
  document.getElementById("form-oportunidade").dataset.editId = id;

  new bootstrap.Modal(document.getElementById("modal-oportunidade")).show();
}

function moverEtapa(id, novaEtapa) {
  CrmStorage.atualizar(id, { etapa: novaEtapa });
  renderizarKanban();
}

function excluirOportunidade(id) {
  if (!confirm("Remover esta oportunidade?")) return;
  CrmStorage.excluir(id);
  renderizarKanban();
}
