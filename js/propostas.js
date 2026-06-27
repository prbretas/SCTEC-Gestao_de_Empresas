/**
 * propostas.js — Módulo de Propostas e Orçamentos.
 * Gera proposta com itens, totais, status e impressão via window.print().
 * Storage: SCTEC_PROPOSTAS_{orgId|userId}
 */

const PropostasStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_PROPOSTAS_${s.orgId || s.id}`;
    }
    return "SCTEC_PROPOSTAS_local";
  },
  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); } catch { return []; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },
  adicionar(p) {
    const lista = this.buscarTodos();
    p.id = Date.now().toString();
    p.criadoEm = new Date().toISOString();
    lista.push(p);
    this.salvarTodos(lista);
    return p;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((p) => p.id === id);
    if (idx !== -1) { lista[idx] = { ...lista[idx], ...dados, id }; this.salvarTodos(lista); }
  },
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((p) => p.id !== id)); },
};

const _fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
let _itensAtuais = [];

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  const modal = new bootstrap.Modal(document.getElementById("modal-proposta"));
  _preencherEmpresas();
  renderizarLista();

  document.getElementById("btn-nova-proposta").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-proposta").textContent = "📄 Nova Proposta";
    // Número automático
    const total = PropostasStorage.buscarTodos().length + 1;
    document.getElementById("prop-numero").value = `${new Date().getFullYear()}-${String(total).padStart(3, "0")}`;
    modal.show();
  });

  document.getElementById("btn-add-item").addEventListener("click", () => {
    _adicionarLinhaItem();
    _recalcularTotal();
  });

  document.getElementById("form-proposta").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-proposta").dataset.editId;
    const dados = _coletar();
    if (!dados) return;
    id ? PropostasStorage.atualizar(id, dados) : PropostasStorage.adicionar(dados);
    modal.hide();
    renderizarLista();
  });

  document.getElementById("btn-imprimir-proposta").addEventListener("click", () => {
    _imprimirProposta();
  });
});

function _preencherEmpresas() {
  const sel = document.getElementById("prop-empresa");
  if (!sel || !window.EmpreendimentoStorage) return;
  EmpreendimentoStorage.buscarTodos().forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id; o.textContent = e.nome; sel.appendChild(o);
  });
}

function _resetarForm() {
  const f = document.getElementById("form-proposta");
  f.reset(); delete f.dataset.editId;
  _itensAtuais = [];
  document.getElementById("prop-itens-lista").innerHTML = "";
  _recalcularTotal();
  // Adiciona uma linha de item em branco
  _adicionarLinhaItem();
}

function _adicionarLinhaItem(item = {}) {
  const lista = document.getElementById("prop-itens-lista");
  const idx = lista.children.length;
  const div = document.createElement("div");
  div.className = "row g-2 mb-2 item-linha";
  div.innerHTML = `
    <div class="col-md-5">
      <input type="text" class="form-control form-control-sm item-desc" placeholder="Descrição" value="${item.desc || ""}" />
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control form-control-sm item-qtd" placeholder="Qtd" min="1" value="${item.qtd || 1}" />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control form-control-sm item-valor" placeholder="Valor unit." min="0" step="0.01" value="${item.valor || ""}" />
    </div>
    <div class="col-md-2 d-flex align-items-center gap-1">
      <span class="item-subtotal text-success small fw-bold">R$ 0,00</span>
      <button type="button" class="btn btn-xs btn-outline-danger ms-auto" onclick="this.closest('.item-linha').remove(); _recalcularTotal();">✕</button>
    </div>`;
  lista.appendChild(div);
  // Eventos para recalcular ao digitar
  div.querySelectorAll(".item-qtd, .item-valor").forEach((el) =>
    el.addEventListener("input", _recalcularTotal)
  );
  _recalcularTotal();
}

function _recalcularTotal() {
  let total = 0;
  document.querySelectorAll(".item-linha").forEach((linha) => {
    const qtd = parseFloat(linha.querySelector(".item-qtd").value) || 0;
    const valor = parseFloat(linha.querySelector(".item-valor").value) || 0;
    const sub = qtd * valor;
    linha.querySelector(".item-subtotal").textContent = _fmt(sub);
    total += sub;
  });
  document.getElementById("prop-total-display").textContent = _fmt(total);
}

function _coletarItens() {
  const itens = [];
  document.querySelectorAll(".item-linha").forEach((linha) => {
    const desc = linha.querySelector(".item-desc").value.trim();
    const qtd = parseFloat(linha.querySelector(".item-qtd").value) || 1;
    const valor = parseFloat(linha.querySelector(".item-valor").value) || 0;
    if (desc || valor > 0) itens.push({ desc, qtd, valor });
  });
  return itens;
}

function _coletar() {
  const titulo = document.getElementById("prop-titulo").value.trim();
  const empresaId = document.getElementById("prop-empresa").value;
  if (!titulo || !empresaId) { alert("Título e Empresa são obrigatórios."); return null; }
  const itens = _coletarItens();
  const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  return {
    titulo,
    numero: document.getElementById("prop-numero").value.trim(),
    empresaId,
    validade: document.getElementById("prop-validade").value,
    status: document.getElementById("prop-status").value,
    itens,
    total,
    obs: document.getElementById("prop-obs").value.trim(),
  };
}

function renderizarLista() {
  const container = document.getElementById("propostas-lista");
  const vazio = document.getElementById("propostas-vazio");
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
  const todas = PropostasStorage.buscarTodos().sort((a, b) => b.criadoEm?.localeCompare(a.criadoEm));

  if (todas.length === 0) { container.innerHTML = ""; vazio?.classList.remove("d-none"); return; }
  vazio?.classList.add("d-none");

  const statusConfig = {
    rascunho: { badge: "bg-secondary", icon: "📝" },
    enviada:  { badge: "bg-primary",   icon: "📤" },
    aceita:   { badge: "bg-success",   icon: "✅" },
    recusada: { badge: "bg-danger",    icon: "❌" },
  };

  container.innerHTML = todas.map((p) => {
    const emp = empresas.find((e) => String(e.id) === String(p.empresaId));
    const sc = statusConfig[p.status] || statusConfig.rascunho;
    const dataCriacao = p.criadoEm ? new Date(p.criadoEm).toLocaleDateString("pt-BR") : "—";
    const valFmt = p.validade ? new Date(p.validade + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="fw-bold mb-0">${p.titulo}</h6>
              <span class="badge ${sc.badge}">${sc.icon} ${p.status}</span>
            </div>
            ${p.numero ? `<div class="small text-muted mb-1">#${p.numero}</div>` : ""}
            <div class="small text-muted">${emp ? emp.nome : "—"}</div>
            <div class="small text-muted">📅 Criada: ${dataCriacao}</div>
            ${p.validade ? `<div class="small text-muted">⏰ Válida até: ${valFmt}</div>` : ""}
            <div class="fw-bold text-success mt-2">${_fmt(p.total || 0)}</div>
          </div>
          <div class="card-footer bg-transparent d-flex justify-content-between gap-2">
            <button class="btn btn-xs btn-outline-primary flex-fill" onclick="editarProposta('${p.id}')">✏️ Editar</button>
            <button class="btn btn-xs btn-outline-secondary flex-fill" onclick="visualizarProposta('${p.id}')">🖨️ Imprimir</button>
            <button class="btn btn-xs btn-outline-danger" onclick="excluirProposta('${p.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function editarProposta(id) {
  const p = PropostasStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  document.getElementById("titulo-modal-proposta").textContent = "✏️ Editar Proposta";
  document.getElementById("prop-titulo").value = p.titulo || "";
  document.getElementById("prop-numero").value = p.numero || "";
  document.getElementById("prop-empresa").value = p.empresaId || "";
  document.getElementById("prop-validade").value = p.validade || "";
  document.getElementById("prop-status").value = p.status || "rascunho";
  document.getElementById("prop-obs").value = p.obs || "";
  document.getElementById("form-proposta").dataset.editId = id;

  // Carrega itens
  document.getElementById("prop-itens-lista").innerHTML = "";
  (p.itens || []).forEach((item) => _adicionarLinhaItem(item));
  if (!p.itens || p.itens.length === 0) _adicionarLinhaItem();
  _recalcularTotal();

  new bootstrap.Modal(document.getElementById("modal-proposta")).show();
}

function excluirProposta(id) {
  if (!confirm("Remover esta proposta?")) return;
  PropostasStorage.excluir(id);
  renderizarLista();
}

function visualizarProposta(id) {
  editarProposta(id);
  setTimeout(() => _imprimirProposta(), 600);
}

function _imprimirProposta() {
  const titulo = document.getElementById("prop-titulo").value.trim() || "Proposta";
  const numero = document.getElementById("prop-numero").value.trim();
  const empId = document.getElementById("prop-empresa").value;
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
  const emp = empresas.find((e) => String(e.id) === String(empId));
  const obs = document.getElementById("prop-obs").value.trim();
  const validade = document.getElementById("prop-validade").value;
  const config = window.ConfigController ? ConfigController.obter() : { nomeSistema: "SCTEC" };

  const itens = _coletarItens();
  const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);

  const itensHTML = itens.map((i) => `
    <tr>
      <td>${i.desc}</td>
      <td style="text-align:center;">${i.qtd}</td>
      <td style="text-align:right;">${_fmt(i.valor)}</td>
      <td style="text-align:right;">${_fmt(i.qtd * i.valor)}</td>
    </tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="UTF-8"/>
    <title>Proposta ${numero || ""}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#333;}
      h1{color:#333a60;} table{width:100%;border-collapse:collapse;margin-top:16px;}
      th{background:#333a60;color:#fff;padding:8px;text-align:left;}
      td{padding:7px;border-bottom:1px solid #eee;}
      .total{font-size:1.2rem;font-weight:bold;color:#198754;text-align:right;margin-top:12px;}
      .footer{margin-top:32px;font-size:.85rem;color:#666;border-top:1px solid #eee;padding-top:12px;}
    </style></head><body>
    <h1>${config.nomeSistema || "SCTEC"}</h1>
    <h2>Proposta ${numero ? "#" + numero : ""}: ${titulo}</h2>
    ${emp ? `<p><strong>Cliente:</strong> ${emp.nome}</p>` : ""}
    ${validade ? `<p><strong>Válida até:</strong> ${new Date(validade + "T12:00:00").toLocaleDateString("pt-BR")}</p>` : ""}
    <table><thead><tr><th>Descrição</th><th style="text-align:center;">Qtd</th><th style="text-align:right;">Valor Unit.</th><th style="text-align:right;">Subtotal</th></tr></thead>
    <tbody>${itensHTML}</tbody></table>
    <div class="total">Total: ${_fmt(total)}</div>
    ${obs ? `<div class="footer"><strong>Observações:</strong><br>${obs.replace(/\n/g, "<br>")}</div>` : ""}
    <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")} — ${config.nomeSistema || "SCTEC"}</div>
    </body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
