/**
 * propostas.js — Módulo de Propostas e Orçamentos.
 * Gera proposta com itens, totais, status e impressão via window.print().
 * Storage: SCTEC_PROPOSTAS_{orgId|userId}
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
    p.criadoPor = _obterIdentidadeSessao();
    p.criadoEm = new Date().toISOString();
    p.criadoPorId = window.AuthService ? (AuthService.obterSessao()?.id || null) : null;
    lista.push(p);
    this.salvarTodos(lista);
    return p;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((p) => p.id === id);
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
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((p) => p.id !== id)); },
};

const _fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
let _itensAtuais = [];

// ─── Helpers de modo visualização/edição ───────────────────────────────────

function _propSetModo(modo) {
  const form = document.getElementById("form-proposta");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-proposta");
  const btnEditar = document.getElementById("btn-editar-proposta");
  const btnAddItem = document.getElementById("btn-add-item");

  if (modo === "visualizacao") {
    campos.forEach((c) => c.setAttribute("disabled", "disabled"));
    form.querySelectorAll(".btn-outline-danger").forEach((b) => b.setAttribute("disabled", "disabled"));
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    btnAddItem?.classList.add("d-none");
    form.dataset.modoVisualizacao = "true";
    document.getElementById("titulo-modal-proposta").textContent = "👁️ Visualizar Pedido";
  } else {
    campos.forEach((c) => c.removeAttribute("disabled"));
    form.querySelectorAll(".btn-outline-danger").forEach((b) => b.removeAttribute("disabled"));
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    btnAddItem?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "";
    document.getElementById("titulo-modal-proposta").textContent = "✏️ Editar Pedido";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("propostas")) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("propostas");
  if (window.ThemeController) ThemeController.init();

  const modalEl = document.getElementById("modal-proposta");
  const modal = new bootstrap.Modal(modalEl);
  _preencherEmpresas();
  renderizarLista();

  // Filtros e toggle de visualização (#89)
  document.getElementById("btn-filtrar-prop")?.addEventListener("click", renderizarLista);
  document.getElementById("btn-limpar-filtro-prop")?.addEventListener("click", () => {
    document.getElementById("prop-filtro-inicio").value = "";
    document.getElementById("prop-filtro-fim").value = "";
    document.getElementById("prop-filtro-status").value = "";
    renderizarLista();
  });
  document.getElementById("btn-view-cards")?.addEventListener("click", () => {
    document.getElementById("btn-view-cards").classList.add("active");
    document.getElementById("btn-view-linhas").classList.remove("active");
    window._propViewMode = "cards";
    renderizarLista();
  });
  document.getElementById("btn-view-linhas")?.addEventListener("click", () => {
    document.getElementById("btn-view-linhas").classList.add("active");
    document.getElementById("btn-view-cards").classList.remove("active");
    window._propViewMode = "linhas";
    renderizarLista();
  });

  document.getElementById("btn-nova-proposta").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-proposta").textContent = "📄 Novo Pedido";
    const total = PropostasStorage.buscarTodos().length + 1;
    document.getElementById("prop-numero").value = `${new Date().getFullYear()}-${String(total).padStart(3, "0")}`;
    _propSetModo("edicao");
    modal.show();
  });

  document.getElementById("btn-editar-proposta")?.addEventListener("click", () => {
    _propSetModo("edicao");
  });

  modalEl.addEventListener("hide.bs.modal", (e) => {
    const form = document.getElementById("form-proposta");
    if (form.dataset.modoVisualizacao !== "true" && form.dataset.editId) {
      if (!confirm("Deseja descartar as alterações?")) {
        e.preventDefault();
      }
    }
  });

  document.getElementById("btn-add-item").addEventListener("click", () => {
    _adicionarLinhaItem();
    _recalcularTotal();
  });

  document.getElementById("form-proposta").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = document.getElementById("form-proposta");
    const id = form.dataset.editId;
    const dados = _coletar();
    if (!dados) return;
    if (id) {
      PropostasStorage.atualizar(id, dados);
    } else {
      PropostasStorage.adicionar(dados);
    }

    // Integração: Proposta → CRM e Proposta → Financeiro
    if (window.IntegrationsController) {
      const propostaSalva = PropostasStorage.buscarTodos().find((p) => id ? p.id === id : p.titulo === dados.titulo);
      if (propostaSalva) {
        if (dados.status === "enviada") {
          IntegrationsController.onPropostaEnviada(propostaSalva);
        } else if (dados.status === "aceita") {
          const resultado = IntegrationsController.onPropostaAceita(propostaSalva);
          if (!resultado.aprovado) {
            alert("📋 Proposta aceita! Uma pendência de aprovação foi criada para geração da entrada financeira.");
          }
        }
      }
    }

    // Marca como visualização para que o hide.bs.modal não pergunte sobre descartar
    form.dataset.modoVisualizacao = "true";
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
  f.reset(); delete f.dataset.editId; delete f.dataset.modoVisualizacao;
  _itensAtuais = [];
  document.getElementById("prop-itens-lista").innerHTML = "";
  _recalcularTotal();
  _adicionarLinhaItem();
  // Limpa anexos
  if (window.AttachmentsController) AttachmentsController.carregar("prop-anexos-container", [], false);
}

function _adicionarLinhaItem(item = {}) {
  const lista = document.getElementById("prop-itens-lista");
  const div = document.createElement("div");
  div.className = "row g-2 mb-2 item-linha";

  const isManual = !item.produtoId;
  const produtoNome = item.produtoId && window.ProdutosStorage
    ? (ProdutosStorage.buscarTodos().find((p) => p.id === item.produtoId)?.nome || item.desc || "")
    : (item.desc || "");

  div.innerHTML = `
    <div class="col-md-5">
      <div class="input-group input-group-sm">
        <input type="text" class="form-control form-control-sm item-desc" placeholder="${isManual ? "Descrição manual" : "Clique em 📦 para selecionar"}" value="${produtoNome}" ${!isManual ? "readonly" : ""} />
        <button type="button" class="btn btn-outline-primary btn-sm item-btn-picker" title="Selecionar produto do cadastro">📦</button>
        <button type="button" class="btn btn-outline-secondary btn-sm item-toggle-modo" title="${isManual ? "Selecionar do cadastro" : "Digitar manualmente"}">${isManual ? "✏️" : "🔓"}</button>
      </div>
      <input type="hidden" class="item-produto-id" value="${item.produtoId || ""}" />
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control form-control-sm item-qtd" placeholder="Qtd" min="1" value="${item.qtd || 1}" />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control form-control-sm item-valor" placeholder="Valor unit." min="0" step="0.01" value="${item.valor || ""}" ${!isManual ? "readonly" : ""} />
    </div>
    <div class="col-md-2 d-flex align-items-center gap-1">
      <span class="item-subtotal text-success small fw-bold">R$ 0,00</span>
      <button type="button" class="btn btn-xs btn-outline-danger ms-auto" onclick="this.closest('.item-linha').remove(); _recalcularTotal();">✕</button>
    </div>`;
  lista.appendChild(div);

  const btnPicker = div.querySelector(".item-btn-picker");
  const toggleBtn = div.querySelector(".item-toggle-modo");
  const inputDesc = div.querySelector(".item-desc");
  const inputValor = div.querySelector(".item-valor");
  const hiddenProdId = div.querySelector(".item-produto-id");

  // Abrir modal de seleção de produto
  btnPicker.addEventListener("click", () => {
    if (window.ProductPickerModal) {
      ProductPickerModal.abrir((produto) => {
        hiddenProdId.value = produto.id;
        inputDesc.value = produto.nome;
        inputDesc.setAttribute("readonly", "readonly");
        inputValor.value = produto.preco || 0;
        inputValor.setAttribute("readonly", "readonly");
        toggleBtn.textContent = "🔓";
        toggleBtn.title = "Digitar manualmente";
        _recalcularTotal();
      });
    }
  });

  // Toggle modo manual/produto
  toggleBtn.addEventListener("click", () => {
    const isCurrentlyLinked = !!hiddenProdId.value;
    if (isCurrentlyLinked) {
      // Libera para manual
      hiddenProdId.value = "";
      inputDesc.removeAttribute("readonly");
      inputValor.removeAttribute("readonly");
      toggleBtn.textContent = "✏️";
      toggleBtn.title = "Selecionar do cadastro";
    } else {
      // Abre picker
      if (window.ProductPickerModal) {
        ProductPickerModal.abrir((produto) => {
          hiddenProdId.value = produto.id;
          inputDesc.value = produto.nome;
          inputDesc.setAttribute("readonly", "readonly");
          inputValor.value = produto.preco || 0;
          inputValor.setAttribute("readonly", "readonly");
          toggleBtn.textContent = "🔓";
          toggleBtn.title = "Digitar manualmente";
          _recalcularTotal();
        });
      }
    }
  });

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
    const produtoId = linha.querySelector(".item-produto-id")?.value || null;
    if (desc || valor > 0 || produtoId) itens.push({ desc, qtd, valor, produtoId });
  });
  return itens;
}

function _coletar() {
  const titulo = document.getElementById("prop-titulo").value.trim();
  const empresaId = document.getElementById("prop-empresa").value;
  if (!titulo || !empresaId) { alert("Título e Empresa são obrigatórios."); return null; }
  const itens = _coletarItens();
  const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const anexos = window.AttachmentsController
    ? AttachmentsController.obterAnexos("prop-anexos-container")
    : [];
  return {
    titulo,
    numero: document.getElementById("prop-numero").value.trim(),
    empresaId,
    validade: document.getElementById("prop-validade").value,
    status: document.getElementById("prop-status").value,
    itens,
    total,
    obs: document.getElementById("prop-obs").value.trim(),
    anexos,
  };
}

function _atualizarKpisPropostas(todas) {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  el("prop-kpi-total", todas.length);
  el("prop-kpi-enviadas", todas.filter((p) => p.status === "enviada").length);
  const aceitas = todas.filter((p) => p.status === "aceita");
  el("prop-kpi-aceitas", aceitas.length);
  el("prop-kpi-valor", fmt(aceitas.reduce((s, p) => s + (p.total || 0), 0)));
}

function renderizarLista() {
  const container = document.getElementById("propostas-lista");
  const vazio = document.getElementById("propostas-vazio");
  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
  const todasBruto = PropostasStorage.buscarTodos();
  const todasVisiveis = window.RolesController
    ? RolesController.filtrarPorVisibilidade(todasBruto)
    : todasBruto;

  // Aplica filtros
  const dataIni = document.getElementById("prop-filtro-inicio")?.value || "";
  const dataFim = document.getElementById("prop-filtro-fim")?.value || "";
  const statusFiltro = document.getElementById("prop-filtro-status")?.value || "";

  let todas = todasVisiveis;
  if (dataIni || dataFim) {
    todas = todas.filter((p) => {
      const d = (p.criadoEm || "").slice(0, 10);
      if (!d) return true;
      if (dataIni && d < dataIni) return false;
      if (dataFim && d > dataFim) return false;
      return true;
    });
  }
  if (statusFiltro) todas = todas.filter((p) => p.status === statusFiltro);

  // Atualiza KPIs
  _atualizarKpisPropostas(todas);

  const sorted = todas.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  if (sorted.length === 0) { container.innerHTML = ""; vazio?.classList.remove("d-none"); return; }
  vazio?.classList.add("d-none");

  // Modo linhas
  if (window._propViewMode === "linhas") {
    container.innerHTML = `<div class="col-12"><div class="table-responsive"><table class="table table-hover table-sm align-middle">
      <thead class="table-light"><tr><th>#</th><th>Título</th><th>Empresa</th><th>Status</th><th>Valor</th><th>Criada</th></tr></thead>
      <tbody>${sorted.map((p) => {
        const emp = empresas.find((e) => String(e.id) === String(p.empresaId));
        const dataCriacao = p.criadoEm ? new Date(p.criadoEm).toLocaleDateString("pt-BR") : "—";
        return `<tr style="cursor:pointer;" onclick="visualizarProposta('${p.id}')">
          <td class="small text-muted">${p.numero || "—"}</td>
          <td class="fw-semibold">${p.titulo}</td>
          <td class="small">${emp ? emp.nome : "—"}</td>
          <td><span class="badge ${p.status === "aceita" ? "bg-success" : p.status === "enviada" ? "bg-primary" : p.status === "recusada" ? "bg-danger" : "bg-secondary"}">${p.status}</span></td>
          <td class="fw-bold text-success">${_fmt(p.total || 0)}</td>
          <td class="small">${dataCriacao}</td>
        </tr>`;
      }).join("")}</tbody></table></div></div>`;
    return;
  }

  const statusConfig = {
    rascunho: { badge: "bg-secondary", icon: "📝" },
    enviada:  { badge: "bg-primary",   icon: "📤" },
    aceita:   { badge: "bg-success",   icon: "✅" },
    recusada: { badge: "bg-danger",    icon: "❌" },
  };

  container.innerHTML = sorted.map((p) => {
    const emp = empresas.find((e) => String(e.id) === String(p.empresaId));
    const sc = statusConfig[p.status] || statusConfig.rascunho;
    const dataCriacao = p.criadoEm ? new Date(p.criadoEm).toLocaleDateString("pt-BR") : "—";
    const valFmt = p.validade ? new Date(p.validade + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card border-0 shadow-sm h-100" style="cursor:pointer;" onclick="visualizarProposta('${p.id}')">
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
          <div class="card-footer bg-transparent d-flex justify-content-between gap-2" onclick="event.stopPropagation()">
            <button class="btn btn-xs btn-outline-secondary flex-fill" onclick="imprimirProposta('${p.id}')">🖨️ Imprimir</button>
            <button class="btn btn-xs btn-outline-danger" onclick="excluirProposta('${p.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function _carregarProposta(p) {
  document.getElementById("prop-titulo").value = p.titulo || "";
  document.getElementById("prop-numero").value = p.numero || "";
  document.getElementById("prop-empresa").value = p.empresaId || "";
  document.getElementById("prop-validade").value = p.validade || "";
  document.getElementById("prop-status").value = p.status || "rascunho";
  document.getElementById("prop-obs").value = p.obs || "";
  document.getElementById("form-proposta").dataset.editId = p.id;
  document.getElementById("prop-itens-lista").innerHTML = "";
  (p.itens || []).forEach((item) => _adicionarLinhaItem(item));
  if (!p.itens || p.itens.length === 0) _adicionarLinhaItem();
  _recalcularTotal();

  // Carrega anexos
  if (window.AttachmentsController) {
    AttachmentsController.carregar("prop-anexos-container", p.anexos || [], false);
  }
}

function visualizarProposta(id) {
  const p = PropostasStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  _carregarProposta(p);

  // Renderiza links de vínculos
  const vinculosEl = document.getElementById("prop-vinculos");
  if (vinculosEl) {
    let links = "";
    if (window.CrmStorage) {
      const opVinculada = CrmStorage.buscarTodos().find((o) => o.propostaId === p.id);
      if (opVinculada) links += `<a href="crm.html" class="badge bg-light text-primary border text-decoration-none me-1 text-truncate" style="max-width:250px;" title="Ver no CRM: ${opVinculada.titulo}">🎯 CRM: ${opVinculada.titulo || "Negócio"}</a>`;
    }
    if (window.FinanceiroStorage) {
      const finVinculado = FinanceiroStorage.buscarTodos().find((t) => t.propostaId === p.id);
      if (finVinculado) links += `<a href="financeiro.html" class="badge bg-light text-success border text-decoration-none me-1 text-truncate" style="max-width:250px;" title="Ver no Financeiro: ${finVinculado.descricao}">💰 Financeiro</a>`;
    }
    vinculosEl.innerHTML = links || "";
  }

  // Exibe auditoria no footer
  const auditoriaEl = document.getElementById("auditoria-prop");
  if (auditoriaEl) auditoriaEl.textContent = _formatarAuditoria(p);

  _propSetModo("visualizacao");
  new bootstrap.Modal(document.getElementById("modal-proposta")).show();
}

function editarProposta(id) {
  const p = PropostasStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  _carregarProposta(p);
  _propSetModo("edicao");
  new bootstrap.Modal(document.getElementById("modal-proposta")).show();
}

function imprimirProposta(id) {
  const p = PropostasStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  _carregarProposta(p);
  setTimeout(() => _imprimirProposta(), 300);
}

function excluirProposta(id) {
  if (!confirm("Remover este pedido?")) return;
  PropostasStorage.excluir(id);
  renderizarLista();
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
