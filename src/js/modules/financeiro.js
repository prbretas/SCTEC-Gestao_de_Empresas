/**
 * financeiro.js — Controle Financeiro básico (entradas/saídas).
 * Storage: SCTEC_FINANCEIRO_{orgId|userId}
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
    t.criadoPor = _obterIdentidadeSessao();
    t.criadoEm = new Date().toISOString();
    t.criadoPorId = window.AuthService ? (AuthService.obterSessao()?.id || null) : null;
    lista.push(t);
    this.salvarTodos(lista);
    return t;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((t) => t.id === id);
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
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((t) => t.id !== id)); },
};

const _fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Helpers de modo visualização/edição ───────────────────────────────────

function _finSetModo(modo) {
  const form = document.getElementById("form-transacao");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-transacao");
  const btnEditar = document.getElementById("btn-editar-transacao");

  if (modo === "visualizacao") {
    campos.forEach((c) => c.setAttribute("disabled", "disabled"));
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "true";
    document.getElementById("titulo-modal-transacao").textContent = "👁️ Visualizar Transação";
  } else {
    campos.forEach((c) => c.removeAttribute("disabled"));
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    form.dataset.modoVisualizacao = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("financeiro")) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("financeiro");
  if (window.ThemeController) ThemeController.init();

  const modalEl = document.getElementById("modal-transacao");
  const modal = new bootstrap.Modal(modalEl);
  _preencherEmpresas();
  _preencherParamsFinanceiro();

  const hoje = new Date();
  document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("trans-data").value = hoje.toISOString().split("T")[0];

  renderizar();

  document.getElementById("btn-nova-transacao").addEventListener("click", () => {
    _resetarForm();
    _preencherParamsFinanceiro(); // Recarrega tipos fiscais, categorias e formas de pagamento dos params
    document.getElementById("titulo-modal-transacao").textContent = "💰 Novo Lançamento";
    document.getElementById("trans-data").value = new Date().toISOString().split("T")[0];
    // Gera número sequencial
    // Gera número sequencial do lançamento
    const numero = Utils.gerarProximoCodigo("financeiro", FinanceiroStorage.buscarTodos(), "numero");
    const elNumero = document.getElementById("trans-numero");
    if (elNumero && numero) elNumero.value = numero;
    // Reset anexos e itens
    if (window.AttachmentsController) AttachmentsController.carregar("trans-anexos-container", [], false);
    const itensSection = document.getElementById("trans-itens-section");
    if (itensSection) itensSection.classList.add("d-none");
    _atualizarHintNatureza(); // Aplica seções de vínculo conforme natureza padrão
    _finSetModo("edicao");
    modal.show();
  });

  document.getElementById("btn-editar-transacao")?.addEventListener("click", () => {
    _finSetModo("edicao");
    document.getElementById("titulo-modal-transacao").textContent = "✏️ Editar Transação";
    // Libera anexos para edição
    if (window.AttachmentsController) {
      const anexos = AttachmentsController.obterAnexos("trans-anexos-container");
      AttachmentsController.carregar("trans-anexos-container", anexos, false);
    }
  });

  modalEl.addEventListener("hide.bs.modal", (e) => {
    const form = document.getElementById("form-transacao");
    if (form.dataset.modoVisualizacao !== "true" && form.dataset.editId) {
      if (!confirm("Deseja descartar as alterações?")) {
        e.preventDefault();
      }
    }
  });

  document.getElementById("form-transacao").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = document.getElementById("form-transacao");
    const id = form.dataset.editId;
    const dados = _coletar();
    if (!dados) return;

    const acao = id ? "salvar as alterações" : "registrar este lançamento";
    if (!confirm(`Deseja ${acao}?`)) return;

    // Coleta anexos
    if (window.AttachmentsController) {
      dados.anexos = AttachmentsController.obterAnexos("trans-anexos-container");
    }

    id ? FinanceiroStorage.atualizar(id, dados) : FinanceiroStorage.adicionar(dados);
    form.dataset.modoVisualizacao = "true";
    modal.hide();
    renderizar();
  });

  ["filtro-mes","filtro-tipo","filtro-busca"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderizar);
    document.getElementById(id)?.addEventListener("change", renderizar);
  });

  // Atualiza selects de proposta/oportunidade ao mudar empresa
  document.getElementById("trans-empresa")?.addEventListener("change", (e) => {
    _preencherPropostasFinanceiro(e.target.value, null);
    _preencherEntradasFinanceiro(e.target.value, null);
    _preencherOportunidadesFinanceiro(e.target.value, null);
  });

  // Atualiza valor ao vincular proposta + calcula vencimento
  document.getElementById("trans-proposta-vinculada")?.addEventListener("change", (e) => {
    const propostaId = e.target.value;
    if (propostaId && window.PropostasStorage) {
      const proposta = PropostasStorage.buscarTodos().find((p) => p.id === propostaId);
      if (proposta && proposta.total) {
        document.getElementById("trans-valor").value = proposta.total;
        if (!document.getElementById("trans-descricao").value) {
          document.getElementById("trans-descricao").value = `Pedido${proposta.numero ? " #" + proposta.numero : ""}: ${proposta.titulo || ""}`;
        }
        // Tipo fiscal = NFs (venda)
        const elFiscal = document.getElementById("trans-tipo-fiscal");
        if (elFiscal) elFiscal.value = "nfs";
        // Vencimento = dias úteis dos parâmetros
        const diasVenc = window.ParamsController ? ParamsController.obter("financeiro").diasVencimento || 15 : 15;
        _calcularVencimento(diasVenc);
        _calcularParcelas();
      }
    }
  });

  // Atualiza valor ao vincular oportunidade
  document.getElementById("trans-oportunidade-vinculada")?.addEventListener("change", (e) => {
    const opId = e.target.value;
    if (opId && window.CrmStorage) {
      const op = CrmStorage.buscarTodos().find((o) => o.id === opId);
      if (op && op.valor) {
        document.getElementById("trans-valor").value = op.valor;
        if (!document.getElementById("trans-descricao").value) {
          document.getElementById("trans-descricao").value = `CRM: ${op.titulo || "Negócio"}`;
        }
        _calcularParcelas();
      }
    }
  });

  // Recalcula parcelas ao mudar valor ou forma de pagamento
  document.getElementById("trans-valor")?.addEventListener("input", _calcularParcelas);
  document.getElementById("trans-forma-pagamento")?.addEventListener("change", _calcularParcelas);

  document.getElementById("btn-limpar").addEventListener("click", () => {
    document.getElementById("filtro-tipo").value = "";
    document.getElementById("filtro-busca").value = "";
    const hoje = new Date();
    document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    renderizar();
  });
});

function _preencherParamsFinanceiro() {
  if (!window.ParamsController) return;
  const params = ParamsController.obter("financeiro");

  // Tipos Fiscais — suporta tipos personalizados dos parâmetros
  const selFiscal = document.getElementById("trans-tipo-fiscal");
  if (selFiscal && params.tiposFiscais) {
    const labelsBase = {
      nfs: "NFs — Nota Fiscal de Saída (Venda = Entrada $)",
      nfe: "NFe — Nota Fiscal de Entrada (Compra = Saída $)",
      nfce: "NFCe — Nota Fiscal Consumidor Eletrônica",
      recibo: "Recibo",
      cupom: "Cupom Fiscal",
    };
    const valorAtual = selFiscal.value; // Preserva seleção atual
    selFiscal.innerHTML = `<option value="">— Sem nota fiscal —</option>`;
    params.tiposFiscais.forEach((t) => {
      const label = labelsBase[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      selFiscal.innerHTML += `<option value="${t}">${label}</option>`;
    });
    // Restaura valor selecionado (se existia)
    if (valorAtual) selFiscal.value = valorAtual;
  }

  // Categorias
  const selCat = document.getElementById("trans-categoria");
  if (selCat && params.categorias) {
    selCat.innerHTML = params.categorias.map((c) => {
      const label = c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " ");
      return `<option value="${c}">${label}</option>`;
    }).join("");
  }

  // Formas de pagamento
  const selForma = document.getElementById("trans-forma-pagamento");
  if (selForma && params.formasPagamento) {
    const icones = { boleto: "📋", pix: "⚡", cartao_credito: "💳", cartao_debito: "💳", transferencia: "🏦", dinheiro: "💵", cheque: "📄" };
    selForma.innerHTML = `<option value="">— Selecione —</option>`;
    params.formasPagamento.forEach((f) => {
      const icon = icones[f] || "";
      const label = f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      selForma.innerHTML += `<option value="${f}">${icon} ${label}</option>`;
    });
  }

  // Auto-calcular vencimento ao clicar no campo (se vazio)
  const elVenc = document.getElementById("trans-vencimento");
  if (elVenc) {
    elVenc.addEventListener("focus", () => {
      if (!elVenc.value) {
        const diasVenc = params.diasVencimento || 15;
        _calcularVencimento(diasVenc);
      }
    });
  }

  // Auto-derivar tipo (entrada/saída) a partir do Tipo Fiscal selecionado
  if (selFiscal) {
    selFiscal.addEventListener("change", () => {
      const fiscal = selFiscal.value;
      const hiddenTipo = document.getElementById("trans-tipo-hidden");
      const selNatureza = document.getElementById("trans-natureza");
      if (!hiddenTipo) return;
      // NFs (venda) = entrada de dinheiro; NFe (compra) = saída de dinheiro
      if (fiscal.includes("nfe") || fiscal.includes("compra") || fiscal.includes("despesa")) {
        hiddenTipo.value = "saida";
        if (selNatureza) selNatureza.value = "saida";
      } else if (fiscal) {
        hiddenTipo.value = "entrada";
        if (selNatureza) selNatureza.value = "entrada";
      }
      _atualizarHintNatureza();
    });
  }

  // Natureza: atualiza hidden tipo e hint ao mudar
  const selNatureza = document.getElementById("trans-natureza");
  if (selNatureza) {
    selNatureza.addEventListener("change", () => {
      const hiddenTipo = document.getElementById("trans-tipo-hidden");
      if (hiddenTipo && selNatureza.value !== "ambos") hiddenTipo.value = selNatureza.value;
      _atualizarHintNatureza();
    });
  }
}

function _atualizarHintNatureza() {
  const selNatureza = document.getElementById("trans-natureza");
  const hint = document.getElementById("trans-natureza-hint");
  const sectionPedido = document.getElementById("vinculo-pedido-section");
  const sectionEntrada = document.getElementById("vinculo-entrada-section");
  if (!selNatureza) return;
  const val = selNatureza.value;

  if (hint) {
    if (val === "entrada") hint.textContent = "Vincula a: Documento de Entrada";
    else if (val === "saida") hint.textContent = "Vincula a: Pedido de Venda";
    else hint.textContent = "Vincula a: Pedido de Venda ou Doc. Entrada";
  }

  // Mostra/oculta seções de vínculo conforme natureza
  if (sectionPedido && sectionEntrada) {
    if (val === "entrada") {
      sectionPedido.style.display = "none";
      sectionEntrada.style.display = "";
    } else if (val === "saida") {
      sectionPedido.style.display = "";
      sectionEntrada.style.display = "none";
    } else {
      sectionPedido.style.display = "";
      sectionEntrada.style.display = "";
    }
  }

  // Repopula selects
  const empresaId = document.getElementById("trans-empresa")?.value || "";
  if (val !== "entrada") _preencherPropostasFinanceiro(empresaId, null);
  if (val !== "saida") _preencherEntradasFinanceiro(empresaId, null);
}

function _preencherEntradasFinanceiro(empresaId, entradaIdAtual) {
  const sel = document.getElementById("trans-entrada-vinculada");
  if (!sel || !window.EntradaStorage) return;
  sel.innerHTML = `<option value="">— Nenhum —</option>`;
  if (!empresaId) return;
  EntradaStorage.buscarTodos()
    .filter((d) => d.fornecedorId === empresaId)
    .forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.numero || "—"} | ${d.data || ""} (${_fmt(d.total || 0)})`;
      if (d.id === entradaIdAtual) opt.selected = true;
      sel.appendChild(opt);
    });
}

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
  f.reset(); delete f.dataset.editId; delete f.dataset.modoVisualizacao;
  const hiddenTipo = document.getElementById("trans-tipo-hidden");
  if (hiddenTipo) hiddenTipo.value = "entrada";
}

function _coletar() {
  const desc = document.getElementById("trans-descricao").value.trim();
  const valor = parseFloat(document.getElementById("trans-valor").value);
  const data = document.getElementById("trans-data").value;
  if (!desc || !valor || !data) { alert("Descrição, Valor e Data são obrigatórios."); return null; }
  return {
    numero: document.getElementById("trans-numero")?.value || "",
    tipo: document.getElementById("trans-tipo-hidden")?.value || "entrada",
    natureza: document.getElementById("trans-natureza")?.value || "entrada",
    tipoFiscal: document.getElementById("trans-tipo-fiscal")?.value || "",
    descricao: desc,
    valor,
    data,
    dataVencimento: document.getElementById("trans-vencimento")?.value || null,
    statusPagamento: document.getElementById("trans-status-pagamento")?.value || "pendente",
    formaPagamento: document.getElementById("trans-forma-pagamento")?.value || "",
    parcelas: parseInt(document.getElementById("trans-parcelas")?.value) || 1,
    categoria: document.getElementById("trans-categoria").value,
    empresaId: document.getElementById("trans-empresa").value,
    propostaId: document.getElementById("trans-proposta-vinculada")?.value || null,
    entradaId: document.getElementById("trans-entrada-vinculada")?.value || null,
    oportunidadeId: document.getElementById("trans-oportunidade-vinculada")?.value || null,
    obs: document.getElementById("trans-obs").value.trim(),
  };
}

function _calcularVencimento(diasUteis) {
  const dataBase = document.getElementById("trans-data")?.value;
  if (!dataBase) return;
  const d = new Date(dataBase + "T12:00:00");
  let contados = 0;
  while (contados < diasUteis) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) contados++;
  }
  const vencEl = document.getElementById("trans-vencimento");
  if (vencEl) vencEl.value = d.toISOString().split("T")[0];
}

function _calcularParcelas() {
  const valor = parseFloat(document.getElementById("trans-valor")?.value) || 0;
  const forma = document.getElementById("trans-forma-pagamento")?.value || "";
  const selectParcelas = document.getElementById("trans-parcelas");
  const displayParcela = document.getElementById("trans-valor-parcela-display");
  if (!selectParcelas) return;

  const VALOR_MIN_PARCELA = window.ParamsController ? ParamsController.obter("financeiro").valorMinParcela || 50 : 50;
  const formasParcelaveis = ["boleto", "cartao_credito", "cheque"];

  let maxParcelas = 1;
  if (formasParcelaveis.includes(forma) && valor > 0) {
    maxParcelas = Math.max(1, Math.floor(valor / VALOR_MIN_PARCELA));
    maxParcelas = Math.min(maxParcelas, 24); // Limite: 24x
  }

  selectParcelas.innerHTML = "";
  for (let i = 1; i <= maxParcelas; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    const vlParcela = (valor / i).toFixed(2);
    opt.textContent = `${i}x de R$ ${Number(vlParcela).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    selectParcelas.appendChild(opt);
  }

  // Exibe valor da parcela selecionada
  const parcSelecionada = parseInt(selectParcelas.value) || 1;
  if (displayParcela) {
    displayParcela.value = valor > 0 ? `R$ ${(valor / parcSelecionada).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
  }

  selectParcelas.addEventListener("change", () => {
    const p = parseInt(selectParcelas.value) || 1;
    if (displayParcela) displayParcela.value = `R$ ${(valor / p).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  });
}

function _preencherPropostasFinanceiro(empresaId, propostaIdAtual) {
  const sel = document.getElementById("trans-proposta-vinculada");
  if (!sel || !window.PropostasStorage) return;
  sel.innerHTML = `<option value="">— Nenhuma —</option>`;
  if (!empresaId) return;
  PropostasStorage.buscarTodos()
    .filter((p) => p.empresaId === empresaId && p.status === "aceita")
    .forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.numero || ""} ${p.titulo} (${_fmt(p.total || 0)})`;
      if (p.id === propostaIdAtual) opt.selected = true;
      sel.appendChild(opt);
    });
}

function _preencherOportunidadesFinanceiro(empresaId, opIdAtual) {
  const sel = document.getElementById("trans-oportunidade-vinculada");
  if (!sel || !window.CrmStorage) return;
  sel.innerHTML = `<option value="">— Nenhuma —</option>`;
  if (!empresaId) return;
  CrmStorage.buscarTodos()
    .filter((o) => o.empresaId === empresaId && o.etapa === "fechado")
    .forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = `${o.titulo} (${_fmt(o.valor || 0)})`;
      if (o.id === opIdAtual) opt.selected = true;
      sel.appendChild(opt);
    });
}

function renderizar() {
  const tbody = document.getElementById("financeiro-lista");
  const vazio = document.getElementById("financeiro-vazio");
  const mesFiltro = document.getElementById("filtro-mes").value;
  const tipoFiltro = document.getElementById("filtro-tipo").value;
  const busca = document.getElementById("filtro-busca").value.toLowerCase().trim();

  const empresas = window.EmpreendimentoStorage ? EmpreendimentoStorage.buscarTodos() : [];

  let dados = FinanceiroStorage.buscarTodos();
  if (window.RolesController) dados = RolesController.filtrarPorVisibilidade(dados);
  dados = dados.sort((a, b) => b.data.localeCompare(a.data));

  if (mesFiltro) dados = dados.filter((t) => t.data?.startsWith(mesFiltro));
  if (tipoFiltro) dados = dados.filter((t) => t.tipo === tipoFiltro);
  if (busca) dados = dados.filter((t) => t.descricao?.toLowerCase().includes(busca) || t.categoria?.toLowerCase().includes(busca));

  // Resumo (sempre com todos os do mês, sem filtro de tipo, mas com visibilidade)
  const todosBruto = FinanceiroStorage.buscarTodos().filter((t) => !mesFiltro || t.data?.startsWith(mesFiltro));
  const todosMes = window.RolesController ? RolesController.filtrarPorVisibilidade(todosBruto) : todosBruto;
  const totalEntradas = todosMes.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
  const totalSaidas = todosMes.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  document.getElementById("resumo-entradas").textContent = _fmt(totalEntradas);
  document.getElementById("resumo-saidas").textContent = _fmt(totalSaidas);
  document.getElementById("resumo-saldo").textContent = _fmt(saldo);
  const cardSaldo = document.getElementById("card-saldo");
  cardSaldo.className = `card-resumo card border-0 shadow-sm ${saldo >= 0 ? "bg-primary" : "bg-danger"}`;

  if (dados.length === 0) {
    tbody.innerHTML = ""; vazio?.classList.remove("d-none"); return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = dados.map((t) => {
    const emp = empresas.find((e) => String(e.id) === String(t.empresaId));
    const dataFmt = t.data ? new Date(t.data + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    const isEntrada = t.tipo === "entrada";
    const vencFmt = t.dataVencimento ? new Date(t.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR") : "";
    const hoje = new Date().toISOString().split("T")[0];
    const estaVencido = t.statusPagamento !== "pago" && t.dataVencimento && t.dataVencimento < hoje;
    const statusPag = t.statusPagamento || (estaVencido ? "vencido" : "pendente");
    const badgePag = statusPag === "pago" ? "bg-success" : statusPag === "vencido" || estaVencido ? "bg-danger" : "bg-warning text-dark";
    const labelPag = statusPag === "pago" ? "✅ Pago" : estaVencido ? "⚠️ Vencido" : "⏳ Pendente";

    return `
      <tr style="cursor:pointer;" onclick="visualizarTransacao('${t.id}')">
        <td class="small">${dataFmt}</td>
        <td>
          <div class="fw-bold">${t.descricao}</div>
          ${t.obs ? `<div class="small text-muted">${t.obs}</div>` : ""}
          ${t.propostaId ? `<div class="small text-info">🔗 Proposta vinculada</div>` : ""}
          ${t.oportunidadeId ? `<div class="small text-info">🔗 Oportunidade vinculada</div>` : ""}
        </td>
        <td><span class="badge bg-secondary">${t.categoria || "outros"}</span></td>
        <td class="small">${emp ? emp.nome : "—"}</td>
        <td class="text-end fw-bold ${isEntrada ? "text-success" : "text-danger"}">
          ${isEntrada ? "+" : "-"}${_fmt(t.valor)}
        </td>
        <td class="text-center">
          ${vencFmt ? `<div class="small ${estaVencido ? "text-danger fw-bold" : "text-muted"}">${vencFmt}</div>` : ""}
          <span class="badge ${badgePag}" style="font-size:.7rem;">${labelPag}</span>
        </td>
        <td class="text-center" onclick="event.stopPropagation()">
          <button class="btn btn-xs btn-outline-danger" onclick="excluirTransacao('${t.id}')">🗑️</button>
        </td>
      </tr>`;
  }).join("");
}

function visualizarTransacao(id) {
  const t = FinanceiroStorage.buscarTodos().find((x) => x.id === id);
  if (!t) return;
  const elNumero = document.getElementById("trans-numero");
  if (elNumero) elNumero.value = t.numero || "";
  const hiddenTipo = document.getElementById("trans-tipo-hidden");
  if (hiddenTipo) hiddenTipo.value = t.tipo || "entrada";
  const elNatureza = document.getElementById("trans-natureza");
  if (elNatureza) { elNatureza.value = t.natureza || t.tipo || "entrada"; _atualizarHintNatureza(); }
  document.getElementById("trans-descricao").value = t.descricao || "";
  document.getElementById("trans-valor").value = t.valor || "";
  document.getElementById("trans-data").value = t.data || "";
  document.getElementById("trans-categoria").value = t.categoria || "outros";
  document.getElementById("trans-empresa").value = t.empresaId || "";
  document.getElementById("trans-obs").value = t.obs || "";
  document.getElementById("form-transacao").dataset.editId = id;

  // Novos campos (#78)
  const elVenc = document.getElementById("trans-vencimento");
  if (elVenc) elVenc.value = t.dataVencimento || "";
  const elStatus = document.getElementById("trans-status-pagamento");
  if (elStatus) elStatus.value = t.statusPagamento || "pendente";
  const elFiscal = document.getElementById("trans-tipo-fiscal");
  if (elFiscal) {
    _preencherParamsFinanceiro(); // Garante que o select tem todas as opções atualizadas
    elFiscal.value = t.tipoFiscal || "";
  }
  const elForma = document.getElementById("trans-forma-pagamento");
  if (elForma) elForma.value = t.formaPagamento || "";
  const elParcelas = document.getElementById("trans-parcelas");
  if (elParcelas) {
    _calcularParcelas();
    setTimeout(() => { if (elParcelas) elParcelas.value = t.parcelas || "1"; }, 0);
  }

  // Vínculos
  _preencherPropostasFinanceiro(t.empresaId, t.propostaId);
  _preencherEntradasFinanceiro(t.empresaId, t.entradaId);
  _preencherOportunidadesFinanceiro(t.empresaId, t.oportunidadeId);

  // Exibe itens detalhados se existirem (NFe)
  const itensSection = document.getElementById("trans-itens-section");
  const itensLista = document.getElementById("trans-itens-lista");
  if (itensSection && itensLista) {
    if (t.itens && t.itens.length > 0) {
      itensSection.classList.remove("d-none");
      const _fmtV = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      itensLista.innerHTML = t.itens.map((i) =>
        `<div class="d-flex justify-content-between border-bottom py-1">
          <span>${i.desc || "—"}</span>
          <span>${i.qtd || 1}x ${_fmtV(i.valor)} = <strong>${_fmtV((i.qtd || 1) * (i.valor || 0))}</strong></span>
        </div>`
      ).join("");
    } else {
      itensSection.classList.add("d-none");
      itensLista.innerHTML = "";
    }
  }

  // Carrega anexos
  if (window.AttachmentsController) {
    AttachmentsController.carregar("trans-anexos-container", t.anexos || [], true);
  }

  // Exibe auditoria no footer
  const auditoriaEl = document.getElementById("auditoria-fin");
  if (auditoriaEl) auditoriaEl.textContent = _formatarAuditoria(t);

  _finSetModo("visualizacao");
  new bootstrap.Modal(document.getElementById("modal-transacao")).show();
}

function editarTransacao(id) {
  visualizarTransacao(id);
}

function excluirTransacao(id) {
  if (!confirm("Remover esta transação?")) return;
  FinanceiroStorage.excluir(id);
  renderizar();
}
