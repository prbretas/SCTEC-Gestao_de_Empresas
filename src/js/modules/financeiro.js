/**
 * financeiro.js — Controle Financeiro básico (entradas/saídas).
 * Storage: SCTEC_FINANCEIRO_{orgId|userId}
 */

const FinanceiroStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_FINANCEIRO_${s.orgId || s.id}`;
    }
    return "SCTEC_FINANCEIRO_local";
  },
  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); } catch { return []; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },
  adicionar(t) {
    const lista = this.buscarTodos();
    t.id = Date.now().toString();
    t.criadoEm = new Date().toISOString();
    lista.push(t);
    this.salvarTodos(lista);
    return t;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((t) => t.id === id);
    if (idx !== -1) { lista[idx] = { ...lista[idx], ...dados, id }; this.salvarTodos(lista); }
  },
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((t) => t.id !== id)); },
};

const _fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("financeiro");
  if (window.ThemeController) ThemeController.init();

  const modal = new bootstrap.Modal(document.getElementById("modal-transacao"));
  _preencherEmpresas();

  const hoje = new Date();
  document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("trans-data").value = hoje.toISOString().split("T")[0];

  renderizar();

  document.getElementById("btn-nova-transacao").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-transacao").textContent = "💰 Nova Transação";
    document.getElementById("trans-data").value = new Date().toISOString().split("T")[0];
    modal.show();
  });

  document.getElementById("form-transacao").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-transacao").dataset.editId;
    const dados = _coletar();
    if (!dados) return;
    id ? FinanceiroStorage.atualizar(id, dados) : FinanceiroStorage.adicionar(dados);
    modal.hide();
    renderizar();
  });

  ["filtro-mes","filtro-tipo","filtro-busca"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderizar);
    document.getElementById(id)?.addEventListener("change", renderizar);
  });

  document.getElementById("btn-limpar").addEventListener("click", () => {
    document.getElementById("filtro-tipo").value = "";
    document.getElementById("filtro-busca").value = "";
    const hoje = new Date();
    document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    renderizar();
  });
});

function _preencherEmpresas() {
  const sel = document.getElementById("trans-empresa");
  if (!sel || !window.EmpreendimentoStorage) return;
  EmpreendimentoStorage.buscarTodos().forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id; o.textContent = e.nome; sel.appendChild(o);
  });
}

function _resetarForm() {
  const f = document.getElementById("form-transacao");
  f.reset(); delete f.dataset.editId;
  document.getElementById("tipo-entrada").checked = true;
}

function _coletar() {
  const desc = document.getElementById("trans-descricao").value.trim();
  const valor = parseFloat(document.getElementById("trans-valor").value);
  const data = document.getElementById("trans-data").value;
  if (!desc || !valor || !data) { alert("Descrição, Valor e Data são obrigatórios."); return null; }
  return {
    tipo: document.querySelector('input[name="trans-tipo"]:checked').value,
    descricao: desc,
    valor,
    data,
    categoria: document.getElementById("trans-categoria").value,
    empresaId: document.getElementById("trans-empresa").value,
    obs: document.getElementById("trans-obs").value.trim(),
  };
}

function renderizar() {
  const tbody = document.getElementById("financeiro-lista");
  const vazio = document.getElementById("financeiro-vazio");
  const mesFiltro = document.getElementById("filtro-mes").value;
  const tipoFiltro = document.getElementById("filtro-tipo").value;
  const busca = document.getElementById("filtro-busca").value.toLowerCase().trim();

  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];

  let dados = FinanceiroStorage.buscarTodos()
    .sort((a, b) => b.data.localeCompare(a.data));

  if (mesFiltro) dados = dados.filter((t) => t.data?.startsWith(mesFiltro));
  if (tipoFiltro) dados = dados.filter((t) => t.tipo === tipoFiltro);
  if (busca) dados = dados.filter((t) => t.descricao?.toLowerCase().includes(busca) || t.categoria?.toLowerCase().includes(busca));

  // Resumo (sempre com todos os do mês, sem filtro de tipo)
  const todosMes = FinanceiroStorage.buscarTodos().filter((t) => !mesFiltro || t.data?.startsWith(mesFiltro));
  const totalEntradas = todosMes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const totalSaidas = todosMes.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  document.getElementById("resumo-entradas").textContent = _fmt(totalEntradas);
  document.getElementById("resumo-saidas").textContent = _fmt(totalSaidas);
  document.getElementById("resumo-saldo").textContent = _fmt(saldo);
  const cardSaldo = document.getElementById("card-saldo");
  cardSaldo.className = `card border-0 shadow-sm text-white ${saldo >= 0 ? "bg-primary" : "bg-danger"}`;

  if (dados.length === 0) {
    tbody.innerHTML = ""; vazio?.classList.remove("d-none"); return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = dados.map((t) => {
    const emp = empresas.find((e) => String(e.id) === String(t.empresaId));
    const dataFmt = t.data ? new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    const isEntrada = t.tipo === "entrada";
    return `
      <tr>
        <td class="small">${dataFmt}</td>
        <td>
          <div class="fw-bold">${t.descricao}</div>
          ${t.obs ? `<div class="small text-muted">${t.obs}</div>` : ""}
        </td>
        <td><span class="badge bg-secondary">${t.categoria || "outros"}</span></td>
        <td class="small">${emp ? emp.nome : "—"}</td>
        <td class="text-end fw-bold ${isEntrada ? "text-success" : "text-danger"}">
          ${isEntrada ? "+" : "-"}${_fmt(t.valor)}
        </td>
        <td class="text-center">
          <button class="btn btn-xs btn-outline-warning me-1" onclick="editarTransacao('${t.id}')">✏️</button>
          <button class="btn btn-xs btn-outline-danger" onclick="excluirTransacao('${t.id}')">🗑️</button>
        </td>
      </tr>`;
  }).join("");
}

function editarTransacao(id) {
  const t = FinanceiroStorage.buscarTodos().find((x) => x.id === id);
  if (!t) return;
  document.getElementById("titulo-modal-transacao").textContent = "✏️ Editar Transação";
  document.querySelector(`input[name="trans-tipo"][value="${t.tipo}"]`).checked = true;
  document.getElementById("trans-descricao").value = t.descricao || "";
  document.getElementById("trans-valor").value = t.valor || "";
  document.getElementById("trans-data").value = t.data || "";
  document.getElementById("trans-categoria").value = t.categoria || "outros";
  document.getElementById("trans-empresa").value = t.empresaId || "";
  document.getElementById("trans-obs").value = t.obs || "";
  document.getElementById("form-transacao").dataset.editId = id;
  new bootstrap.Modal(document.getElementById("modal-transacao")).show();
}

function excluirTransacao(id) {
  if (!confirm("Remover esta transação?")) return;
  FinanceiroStorage.excluir(id);
  renderizar();
}
