/**
 * entrada.js — Módulo de Documento de Entrada (#112)
 * Registra compras, recebimentos de mercadoria e NFe.
 * Integra com Estoque (entrada ao receber) e Financeiro (saída de dinheiro).
 * Storage: SCTEC_ENTRADA_{orgId}
 */

function _obterIdentidadeEntrada() {
  if (window.AuthService) {
    const sessao = AuthService.obterSessao();
    if (sessao) return sessao.identidade || `${sessao.nome}#${sessao.id}`;
  }
  return "sistema";
}

function _formatarAuditoriaEntrada(registro) {
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

// ─── Storage ────────────────────────────────────────────────────────────────

const EntradaStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_ENTRADA_${s.orgId || s.id}`;
    }
    return "SCTEC_ENTRADA_local";
  },
  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); } catch { return []; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },
  adicionar(doc) {
    const lista = this.buscarTodos();
    doc.id = Date.now().toString();
    doc.criadoPor = _obterIdentidadeEntrada();
    doc.criadoEm = new Date().toISOString();
    doc.criadoPorId = window.AuthService ? (AuthService.obterSessao()?.id || null) : null;
    lista.push(doc);
    this.salvarTodos(lista);
    return doc;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((d) => d.id === id);
    if (idx !== -1) {
      lista[idx] = {
        ...lista[idx],
        ...dados,
        id,
        atualizadoPor: _obterIdentidadeEntrada(),
        atualizadoEm: new Date().toISOString(),
        criadoPor: lista[idx].criadoPor,
        criadoEm: lista[idx].criadoEm,
      };
      this.salvarTodos(lista);
    }
  },
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((d) => d.id !== id)); },
};

window.EntradaStorage = EntradaStorage;

// ─── Formatação ─────────────────────────────────────────────────────────────

const _fmtEnt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Inicialização ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("entrada")) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("entrada");
  if (window.ThemeController) ThemeController.init();

  const modalEl = document.getElementById("modal-entrada");
  const modal = new bootstrap.Modal(modalEl);

  _preencherFornecedores();
  _preencherFiltroFornecedor();
  renderizarEntradas();

  // Novo doc
  document.getElementById("btn-novo-doc-entrada").addEventListener("click", () => {
    _resetarFormEntrada();
    document.getElementById("titulo-modal-entrada").textContent = "📥 Novo Documento de Entrada";
    document.getElementById("ent-data").value = new Date().toISOString().split("T")[0];
    _entSetModo("edicao");
    _adicionarLinhaItemEntrada();
    modal.show();
  });

  // Editar
  document.getElementById("btn-editar-entrada")?.addEventListener("click", () => {
    _entSetModo("edicao");
    document.getElementById("titulo-modal-entrada").textContent = "✏️ Editar Documento";
  });

  // Confirmar recebimento
  document.getElementById("btn-receber-entrada")?.addEventListener("click", () => {
    const form = document.getElementById("form-entrada");
    const id = form.dataset.editId;
    if (!id) return;
    if (!confirm("Confirmar recebimento? Isso dará entrada no estoque e gerará saída financeira.")) return;
    _confirmarRecebimento(id);
    form.dataset.modoVisualizacao = "true";
    modal.hide();
    renderizarEntradas();
  });

  // Add item
  document.getElementById("btn-add-item-entrada").addEventListener("click", () => {
    _adicionarLinhaItemEntrada();
    _recalcularTotalEntrada();
  });

  // Salvar
  document.getElementById("form-entrada").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = document.getElementById("form-entrada");
    const id = form.dataset.editId;
    const dados = _coletarEntrada();
    if (!dados) return;

    id ? EntradaStorage.atualizar(id, dados) : EntradaStorage.adicionar(dados);
    form.dataset.modoVisualizacao = "true";
    modal.hide();
    renderizarEntradas();
  });

  // Filtros
  ["filtro-entrada-inicio", "filtro-entrada-fim", "filtro-entrada-status", "filtro-entrada-fornecedor"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderizarEntradas);
  });
  document.getElementById("btn-limpar-filtro-entrada").addEventListener("click", () => {
    document.getElementById("filtro-entrada-inicio").value = "";
    document.getElementById("filtro-entrada-fim").value = "";
    document.getElementById("filtro-entrada-status").value = "";
    document.getElementById("filtro-entrada-fornecedor").value = "";
    renderizarEntradas();
  });
});

// ─── Confirmar Recebimento (integração Estoque + Financeiro) ────────────────

function _confirmarRecebimento(docId) {
  const doc = EntradaStorage.buscarTodos().find((d) => d.id === docId);
  if (!doc || doc.status === "recebido") return;

  // 1. Dar entrada no estoque para cada item com produtoId
  if (window.EstoqueStorage && doc.itens) {
    doc.itens.forEach((item) => {
      if (item.produtoId && item.qtd > 0) {
        EstoqueStorage.movimentar({
          produtoId: item.produtoId,
          enderecoId: "end_geral",
          tipo: "entrada",
          quantidade: item.qtd,
          motivo: `Recebimento Doc. Entrada ${doc.numero || doc.id}`,
        });
      }
    });
  }

  // 2. Gerar saída financeira (compra = dinheiro sai)
  if (window.FinanceiroStorage && doc.total > 0) {
    const diasVenc = window.ParamsController ? ParamsController.obter("entrada").diasVencimento || 30 : 30;
    const dataBase = new Date();
    let contados = 0;
    while (contados < diasVenc) {
      dataBase.setDate(dataBase.getDate() + 1);
      if (dataBase.getDay() !== 0 && dataBase.getDay() !== 6) contados++;
    }

    FinanceiroStorage.adicionar({
      tipo: "saida",
      tipoFiscal: "nfe",
      descricao: `NFe — Compra: Doc. ${doc.numero || ""} (${doc.itens?.length || 0} itens)`,
      valor: doc.total,
      data: new Date().toISOString().split("T")[0],
      dataVencimento: dataBase.toISOString().split("T")[0],
      statusPagamento: "pendente",
      categoria: "produtos",
      empresaId: doc.fornecedorId || "",
      entradaId: doc.id,
      obs: `Gerado automaticamente ao confirmar recebimento — Doc. Entrada ${doc.numero || doc.id}`,
    });
  }

  // 3. Atualizar status do documento
  EntradaStorage.atualizar(docId, { status: "recebido", dataRecebimento: new Date().toISOString() });
}

// ─── Modo visualização/edição ───────────────────────────────────────────────

function _entSetModo(modo) {
  const form = document.getElementById("form-entrada");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-entrada");
  const btnEditar = document.getElementById("btn-editar-entrada");
  const btnReceber = document.getElementById("btn-receber-entrada");
  const btnAddItem = document.getElementById("btn-add-item-entrada");

  if (modo === "visualizacao") {
    campos.forEach((c) => c.setAttribute("disabled", "disabled"));
    form.querySelectorAll(".btn-outline-danger").forEach((b) => b.setAttribute("disabled", "disabled"));
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    btnAddItem?.classList.add("d-none");
    form.dataset.modoVisualizacao = "true";
    document.getElementById("titulo-modal-entrada").textContent = "👁️ Visualizar Documento";
    // Mostra botão receber se pendente
    const id = form.dataset.editId;
    const doc = id ? EntradaStorage.buscarTodos().find((d) => d.id === id) : null;
    if (doc && doc.status === "pendente") {
      btnReceber?.classList.remove("d-none");
    } else {
      btnReceber?.classList.add("d-none");
    }
  } else {
    campos.forEach((c) => c.removeAttribute("disabled"));
    form.querySelectorAll(".btn-outline-danger").forEach((b) => b.removeAttribute("disabled"));
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    btnReceber?.classList.add("d-none");
    btnAddItem?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _preencherFornecedores() {
  const sel = document.getElementById("ent-fornecedor");
  if (!sel || !window.EmpreendimentoStorage) return;
  EmpreendimentoStorage.buscarTodos().forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id; o.textContent = e.nome; sel.appendChild(o);
  });
}

function _preencherFiltroFornecedor() {
  const sel = document.getElementById("filtro-entrada-fornecedor");
  if (!sel || !window.EmpreendimentoStorage) return;
  EmpreendimentoStorage.buscarTodos().forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id; o.textContent = e.nome; sel.appendChild(o);
  });
}

function _resetarFormEntrada() {
  const f = document.getElementById("form-entrada");
  f.reset();
  delete f.dataset.editId;
  delete f.dataset.modoVisualizacao;
  document.getElementById("ent-itens-lista").innerHTML = "";
  document.getElementById("ent-total-display").textContent = "R$ 0,00";
  document.getElementById("btn-receber-entrada")?.classList.add("d-none");
}

function _adicionarLinhaItemEntrada(item = {}) {
  const lista = document.getElementById("ent-itens-lista");
  const div = document.createElement("div");
  div.className = "row g-2 mb-2 ent-item-linha";

  const isManual = !item.produtoId;
  const produtoNome = item.produtoId && window.ProdutosStorage
    ? (ProdutosStorage.buscarTodos().find((p) => p.id === item.produtoId)?.nome || item.desc || "")
    : (item.desc || "");

  div.innerHTML = `
    <div class="col-md-5">
      <div class="input-group input-group-sm">
        <input type="text" class="form-control form-control-sm ent-item-desc" placeholder="${isManual ? "Descrição manual" : "Clique em 📦 para selecionar"}" value="${produtoNome}" ${!isManual ? "readonly" : ""} />
        <button type="button" class="btn btn-outline-primary btn-sm ent-item-btn-picker" title="Selecionar produto do cadastro">📦</button>
        <button type="button" class="btn btn-outline-secondary btn-sm ent-item-toggle" title="${isManual ? "Selecionar do cadastro" : "Digitar manualmente"}">${isManual ? "✏️" : "🔓"}</button>
      </div>
      <input type="hidden" class="ent-item-produto-id" value="${item.produtoId || ""}" />
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control form-control-sm ent-item-qtd" placeholder="Qtd" min="1" value="${item.qtd || 1}" />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control form-control-sm ent-item-valor" placeholder="Custo unit." min="0" step="0.01" value="${item.valor || ""}" />
    </div>
    <div class="col-md-2 d-flex align-items-center gap-1">
      <span class="ent-item-subtotal text-primary small fw-bold">R$ 0,00</span>
      <button type="button" class="btn btn-xs btn-outline-danger ms-auto" onclick="this.closest('.ent-item-linha').remove(); _recalcularTotalEntrada();">✕</button>
    </div>`;
  lista.appendChild(div);

  const btnPicker = div.querySelector(".ent-item-btn-picker");
  const toggleBtn = div.querySelector(".ent-item-toggle");
  const inputDesc = div.querySelector(".ent-item-desc");
  const inputValor = div.querySelector(".ent-item-valor");
  const hiddenProdId = div.querySelector(".ent-item-produto-id");

  // Abrir modal de seleção de produto
  btnPicker.addEventListener("click", () => {
    if (window.ProductPickerModal) {
      ProductPickerModal.abrir((produto) => {
        hiddenProdId.value = produto.id;
        inputDesc.value = produto.nome;
        inputDesc.setAttribute("readonly", "readonly");
        inputValor.value = produto.preco || 0;
        toggleBtn.textContent = "🔓";
        toggleBtn.title = "Digitar manualmente";
        _recalcularTotalEntrada();
      });
    }
  });

  // Toggle modo manual/produto
  toggleBtn.addEventListener("click", () => {
    const isCurrentlyLinked = !!hiddenProdId.value;
    if (isCurrentlyLinked) {
      hiddenProdId.value = "";
      inputDesc.removeAttribute("readonly");
      inputDesc.value = "";
      toggleBtn.textContent = "✏️";
      toggleBtn.title = "Selecionar do cadastro";
    } else {
      if (window.ProductPickerModal) {
        ProductPickerModal.abrir((produto) => {
          hiddenProdId.value = produto.id;
          inputDesc.value = produto.nome;
          inputDesc.setAttribute("readonly", "readonly");
          inputValor.value = produto.preco || 0;
          toggleBtn.textContent = "🔓";
          toggleBtn.title = "Digitar manualmente";
          _recalcularTotalEntrada();
        });
      }
    }
  });

  div.querySelectorAll(".ent-item-qtd, .ent-item-valor").forEach((el) =>
    el.addEventListener("input", _recalcularTotalEntrada)
  );
  _recalcularTotalEntrada();
}

function _recalcularTotalEntrada() {
  let total = 0;
  document.querySelectorAll(".ent-item-linha").forEach((linha) => {
    const qtd = parseFloat(linha.querySelector(".ent-item-qtd").value) || 0;
    const valor = parseFloat(linha.querySelector(".ent-item-valor").value) || 0;
    const sub = qtd * valor;
    linha.querySelector(".ent-item-subtotal").textContent = _fmtEnt(sub);
    total += sub;
  });
  document.getElementById("ent-total-display").textContent = _fmtEnt(total);
}

function _coletarEntrada() {
  const fornecedorId = document.getElementById("ent-fornecedor").value;
  const data = document.getElementById("ent-data").value;
  if (!fornecedorId || !data) { alert("Fornecedor e Data são obrigatórios."); return null; }

  const itens = [];
  document.querySelectorAll(".ent-item-linha").forEach((linha) => {
    const desc = linha.querySelector(".ent-item-desc").value.trim();
    const qtd = parseFloat(linha.querySelector(".ent-item-qtd").value) || 1;
    const valor = parseFloat(linha.querySelector(".ent-item-valor").value) || 0;
    const produtoId = linha.querySelector(".ent-item-produto-id")?.value || null;
    if (desc || valor > 0 || produtoId) itens.push({ desc, qtd, valor, produtoId });
  });

  const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);

  return {
    numero: document.getElementById("ent-numero").value.trim(),
    fornecedorId,
    data,
    status: document.getElementById("ent-status").value,
    itens,
    total,
    obs: document.getElementById("ent-obs").value.trim(),
  };
}

// ─── Renderização ───────────────────────────────────────────────────────────

function renderizarEntradas() {
  const tbody = document.getElementById("entrada-lista");
  const vazio = document.getElementById("entrada-vazio");
  const dataIni = document.getElementById("filtro-entrada-inicio")?.value || "";
  const dataFim = document.getElementById("filtro-entrada-fim")?.value || "";
  const statusFiltro = document.getElementById("filtro-entrada-status")?.value || "";
  const fornecedorFiltro = document.getElementById("filtro-entrada-fornecedor")?.value || "";

  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];
  let dados = EntradaStorage.buscarTodos();
  if (window.RolesController) dados = RolesController.filtrarPorVisibilidade(dados);

  // Filtros
  if (dataIni) dados = dados.filter((d) => d.data >= dataIni);
  if (dataFim) dados = dados.filter((d) => d.data <= dataFim);
  if (statusFiltro) dados = dados.filter((d) => d.status === statusFiltro);
  if (fornecedorFiltro) dados = dados.filter((d) => d.fornecedorId === fornecedorFiltro);

  dados.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  // Resumo
  const todosRaw = EntradaStorage.buscarTodos();
  const todosVis = window.RolesController ? RolesController.filtrarPorVisibilidade(todosRaw) : todosRaw;
  document.getElementById("resumo-total-docs").textContent = todosVis.length;
  document.getElementById("resumo-pendentes").textContent = todosVis.filter((d) => d.status === "pendente").length;
  document.getElementById("resumo-recebidos").textContent = todosVis.filter((d) => d.status === "recebido").length;
  const valorTotal = todosVis.reduce((s, d) => s + (d.total || 0), 0);
  document.getElementById("resumo-valor-entradas").textContent = _fmtEnt(valorTotal);

  if (dados.length === 0) {
    tbody.innerHTML = "";
    vazio?.classList.remove("d-none");
    return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = dados.map((d) => {
    const emp = empresas.find((e) => String(e.id) === String(d.fornecedorId));
    const dataFmt = d.data ? new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    const statusBadge = d.status === "recebido" ? "bg-success" : d.status === "cancelado" ? "bg-danger" : "bg-warning text-dark";
    const statusLabel = d.status === "recebido" ? "✅ Recebido" : d.status === "cancelado" ? "❌ Cancelado" : "⏳ Pendente";
    const qtdItens = d.itens?.length || 0;

    return `
      <tr style="cursor:pointer;" onclick="visualizarEntrada('${d.id}')">
        <td class="small fw-bold">${d.numero || "—"}</td>
        <td>${emp ? emp.nome : "—"}</td>
        <td class="small">${dataFmt}</td>
        <td class="text-center"><span class="badge bg-light text-dark border">${qtdItens} itens</span></td>
        <td class="text-end fw-bold text-primary">${_fmtEnt(d.total || 0)}</td>
        <td class="text-center"><span class="badge ${statusBadge}" style="font-size:.7rem;">${statusLabel}</span></td>
        <td class="text-center" onclick="event.stopPropagation()">
          ${d.status === "pendente" ? `<button class="btn btn-xs btn-outline-success me-1" onclick="confirmarRecebimentoRapido('${d.id}')" title="Confirmar recebimento">✅</button>` : ""}
          <button class="btn btn-xs btn-outline-danger" onclick="excluirEntrada('${d.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
  }).join("");
}

// ─── Ações globais ──────────────────────────────────────────────────────────

function visualizarEntrada(id) {
  const d = EntradaStorage.buscarTodos().find((x) => x.id === id);
  if (!d) return;
  document.getElementById("ent-numero").value = d.numero || "";
  document.getElementById("ent-fornecedor").value = d.fornecedorId || "";
  document.getElementById("ent-data").value = d.data || "";
  document.getElementById("ent-status").value = d.status || "pendente";
  document.getElementById("ent-obs").value = d.obs || "";
  document.getElementById("form-entrada").dataset.editId = id;

  // Itens
  document.getElementById("ent-itens-lista").innerHTML = "";
  (d.itens || []).forEach((item) => _adicionarLinhaItemEntrada(item));
  if (!d.itens || d.itens.length === 0) _adicionarLinhaItemEntrada();
  _recalcularTotalEntrada();

  const auditoriaEl = document.getElementById("auditoria-ent");
  if (auditoriaEl) auditoriaEl.textContent = _formatarAuditoriaEntrada(d);

  _entSetModo("visualizacao");
  new bootstrap.Modal(document.getElementById("modal-entrada")).show();
}

function confirmarRecebimentoRapido(id) {
  if (!confirm("Confirmar recebimento? Dará entrada no estoque e gerará saída financeira.")) return;
  _confirmarRecebimento(id);
  renderizarEntradas();
}

function excluirEntrada(id) {
  if (!confirm("Remover este documento de entrada?")) return;
  EntradaStorage.excluir(id);
  renderizarEntradas();
}
