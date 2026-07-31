/**
 * produtos.js — Módulo de Produtos (#87, #114)
 * Cadastro de produtos (sem estoque — estoque fica em estoque.js separado).
 * Integra com Propostas (selecionar produtos ao criar itens) e Financeiro.
 * Storage: SCTEC_PRODUTOS_{orgId|userId}
 */

function _obterIdentidadeSessaoProd() {
  if (window.AuthService) {
    const sessao = AuthService.obterSessao();
    if (sessao) return sessao.identidade || `${sessao.nome}#${sessao.id}`;
  }
  return "sistema";
}

function _formatarAuditoriaProd(registro) {
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

// ─── Storage de Produtos (apenas cadastro) ──────────────────────────────────

const ProdutosStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_PRODUTOS_${s.orgId || s.id}`;
    }
    return "SCTEC_PRODUTOS_local";
  },
  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); } catch { return []; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },
  adicionar(p) {
    const lista = this.buscarTodos();
    p.id = Date.now().toString();
    p.criadoPor = _obterIdentidadeSessaoProd();
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
        atualizadoPor: _obterIdentidadeSessaoProd(),
        atualizadoEm: new Date().toISOString(),
        criadoPor: lista[idx].criadoPor,
        criadoEm: lista[idx].criadoEm,
      };
      this.salvarTodos(lista);
    }
  },
  excluir(id) { this.salvarTodos(this.buscarTodos().filter((p) => p.id !== id)); },
};

window.ProdutosStorage = ProdutosStorage;

// ─── Formatação ─────────────────────────────────────────────────────────────

const _fmtProd = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Inicialização ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Guard: só inicializa a página de produtos se os elementos existirem
  if (!document.getElementById("modal-produto")) return;

  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("produtos")) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("produtos");
  if (window.ThemeController) ThemeController.init();

  // Migrar dados antigos (estoque dentro do produto → EstoqueStorage)
  if (window.EstoqueStorage) EstoqueStorage.migrarDadosAntigos();

  const modalEl = document.getElementById("modal-produto");
  const modal = new bootstrap.Modal(modalEl);
  const modalMovEl = document.getElementById("modal-movimentacao");
  const modalMov = new bootstrap.Modal(modalMovEl);

  _preencherEmpresasProduto();
  _preencherCategoriasFiltro();
  _preencherEnderecos();
  renderizarProdutos();

  // Novo produto
  document.getElementById("btn-novo-produto").addEventListener("click", () => {
    _resetarFormProduto();
    document.getElementById("titulo-modal-produto").textContent = "📦 Novo Produto";
    // Gera código automaticamente conforme parâmetro de numeração
    const codigo = Utils.gerarProximoCodigo("produtos", ProdutosStorage.buscarTodos(), "codigo");
    if (codigo) document.getElementById("prod-codigo").value = codigo;
    _prodSetModo("edicao");
    modal.show();
  });

  // Editar (do modo visualização)
  document.getElementById("btn-editar-produto")?.addEventListener("click", () => {
    _prodSetModo("edicao");
    document.getElementById("titulo-modal-produto").textContent = "✏️ Editar Produto";
  });

  // Salvar
  document.getElementById("form-produto").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = document.getElementById("form-produto");
    const id = form.dataset.editId;
    const dados = _coletarProduto();
    if (!dados) return;

    const acao = id ? "salvar as alterações" : "cadastrar este produto";
    if (!confirm(`Deseja ${acao}?`)) return;

    if (id) {
      ProdutosStorage.atualizar(id, dados);
    } else {
      const novoProduto = ProdutosStorage.adicionar(dados);
      if (window.EstoqueStorage && dados.estoqueInicial > 0) {
        EstoqueStorage.movimentar({
          produtoId: novoProduto.id,
          enderecoId: dados.enderecoId || "end_geral",
          tipo: "entrada",
          quantidade: dados.estoqueInicial,
          motivo: "Estoque inicial ao cadastrar produto",
        });
      }
    }
    form.dataset.modoVisualizacao = "true";
    modal.hide();
    renderizarProdutos();
  });

  // Movimentação submit
  document.getElementById("form-movimentacao").addEventListener("submit", (e) => {
    e.preventDefault();
    const prodId = document.getElementById("mov-produto-id").value;
    const tipo = document.querySelector('input[name="mov-tipo"]:checked').value;
    const qtd = parseInt(document.getElementById("mov-quantidade").value) || 0;
    const motivo = document.getElementById("mov-motivo").value.trim();
    const enderecoId = document.getElementById("mov-endereco")?.value || "end_geral";

    if (qtd <= 0) { alert("Quantidade deve ser maior que zero."); return; }

    const produto = ProdutosStorage.buscarTodos().find((p) => p.id === prodId);
    if (!produto) return;

    if (tipo === "transferencia") {
      const enderecoDestino = document.getElementById("mov-endereco-destino")?.value || "";
      if (!enderecoDestino) { alert("Selecione o endereço de destino."); return; }
      const resultado = EstoqueStorage.transferir({
        produtoId: prodId,
        enderecoOrigem: enderecoId,
        enderecoDestino,
        quantidade: qtd,
        motivo,
      });
      if (!resultado.sucesso) { alert(resultado.mensagem); return; }
    } else {
      // Entrada ou Saída
      const resultado = EstoqueStorage.movimentar({
        produtoId: prodId,
        enderecoId,
        tipo,
        quantidade: qtd,
        motivo,
      });
      if (!resultado.sucesso) { alert(resultado.mensagem); return; }

      // Integração Financeiro: movimentação gera entrada/saída
      if (window.FinanceiroStorage && produto.preco) {
        const valorTotal = qtd * parseFloat(produto.preco);
        if (valorTotal > 0) {
          FinanceiroStorage.adicionar({
            tipo: tipo === "entrada" ? "saida" : "entrada",
            tipoFiscal: tipo === "entrada" ? "nfe" : "nfs",
            descricao: `${tipo === "entrada" ? "NFe — Compra" : "NFs — Venda"}: ${produto.nome} (${qtd}x)`,
            valor: valorTotal,
            data: new Date().toISOString().split("T")[0],
            statusPagamento: "pendente",
            categoria: "produtos",
            empresaId: produto.empresaId || "",
            obs: `Gerado automaticamente pela movimentação de estoque — ${motivo || tipo}`,
          });
        }
      }
    }

    modalMov.hide();
    renderizarProdutos();
  });

  // Toggle transferência
  document.querySelectorAll('input[name="mov-tipo"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isTransf = document.getElementById("mov-transferencia")?.checked;
      const destContainer = document.getElementById("mov-destino-container");
      if (destContainer) destContainer.classList.toggle("d-none", !isTransf);
    });
  });

  // Filtros
  ["filtro-busca-produto", "filtro-categoria-produto", "filtro-status-estoque"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderizarProdutos);
    document.getElementById(id)?.addEventListener("change", renderizarProdutos);
  });

  document.getElementById("btn-limpar-filtro-produto").addEventListener("click", () => {
    document.getElementById("filtro-busca-produto").value = "";
    document.getElementById("filtro-categoria-produto").value = "";
    document.getElementById("filtro-status-estoque").value = "";
    renderizarProdutos();
  });

  // ─── Gerenciar Endereços de Estoque ───────────────────────────────────────
  document.getElementById("btn-gerenciar-enderecos")?.addEventListener("click", () => {
    _renderizarEnderecos();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-enderecos")).show();
  });

  // ─── Navegação e Duplicar (#119) ────────────────────────────────────────
  document.getElementById("btn-prev-produto")?.addEventListener("click", () => _navProduto("prev"));
  document.getElementById("btn-next-produto")?.addEventListener("click", () => _navProduto("next"));
  document.getElementById("btn-duplicar-produto")?.addEventListener("click", _duplicarProduto);

  document.getElementById("form-endereco")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const endereco = {
      instalacao: document.getElementById("end-instalacao").value.trim(),
      galpao: document.getElementById("end-galpao").value.trim(),
      andar: document.getElementById("end-andar").value.trim(),
      corredor: document.getElementById("end-corredor").value.trim(),
      estante: document.getElementById("end-estante").value.trim(),
      coluna: document.getElementById("end-coluna").value.trim(),
      posicao: document.getElementById("end-posicao").value.trim(),
      descricao: document.getElementById("end-descricao").value.trim(),
    };
    if (!endereco.instalacao || !endereco.estante || !endereco.coluna || !endereco.posicao) {
      alert("Instalação, Estante, Coluna e Posição são obrigatórios.");
      return;
    }
    EnderecosStorage.adicionar(endereco);
    document.getElementById("form-endereco").reset();
    _renderizarEnderecos();
    _preencherEnderecos();
  });
});

// ─── Modo visualização/edição ───────────────────────────────────────────────

function _prodSetModo(modo) {
  const form = document.getElementById("form-produto");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-produto");
  const btnEditar = document.getElementById("btn-editar-produto");

  if (modo === "visualizacao") {
    campos.forEach((c) => c.setAttribute("disabled", "disabled"));
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "true";
    document.getElementById("titulo-modal-produto").textContent = "👁️ Visualizar Produto";
  } else {
    campos.forEach((c) => c.removeAttribute("disabled"));
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    form.dataset.modoVisualizacao = "";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _preencherEmpresasProduto() {
  const sel = document.getElementById("prod-empresa");
  if (!sel || !window.EmpreendimentoStorage) return;
  EmpreendimentoStorage.buscarTodos().forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id; o.textContent = e.nome; sel.appendChild(o);
  });
}

function _preencherCategoriasFiltro() {
  const sel = document.getElementById("filtro-categoria-produto");
  if (!sel) return;
  const categorias = ["materiais", "equipamentos", "servicos", "insumos", "outros"];
  sel.innerHTML = `<option value="">Todas as Categorias</option>`;
  categorias.forEach((c) => {
    const label = c.charAt(0).toUpperCase() + c.slice(1);
    sel.innerHTML += `<option value="${c}">${label}</option>`;
  });
}

function _preencherEnderecos() {
  const selMov = document.getElementById("mov-endereco");
  const selDest = document.getElementById("mov-endereco-destino");
  if (!window.EnderecosStorage) return;
  const enderecos = EnderecosStorage.buscarTodos();
  [selMov, selDest].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = enderecos.map((e) => {
      let label;
      if (e.id === "end_geral") {
        label = "Geral (padrão)";
      } else {
        const partes = [e.instalacao, e.galpao, e.corredor, e.estante, e.coluna, e.posicao].filter(Boolean);
        label = partes.join(" › ") || e.nome || e.id;
      }
      return `<option value="${e.id}">${label}</option>`;
    }).join("");
  });
}

function _resetarFormProduto() {
  const f = document.getElementById("form-produto");
  f.reset();
  delete f.dataset.editId;
  delete f.dataset.modoVisualizacao;
  if (window.AttachmentsController) AttachmentsController.carregar("prod-anexos-container", [], false);
  const secDisp = document.getElementById("prod-disponibilidade-section");
  if (secDisp) secDisp.classList.add("d-none");
}

function _coletarProduto() {
  const nome = document.getElementById("prod-nome").value.trim();
  const preco = parseFloat(document.getElementById("prod-preco").value);
  if (!nome || isNaN(preco)) { alert("Nome e Preço são obrigatórios."); return null; }
  return {
    codigo: document.getElementById("prod-codigo").value.trim(),
    nome,
    descricao: document.getElementById("prod-descricao").value.trim(),
    categoria: document.getElementById("prod-categoria").value,
    unidade: document.getElementById("prod-unidade").value,
    preco,
    valorCompra: parseFloat(document.getElementById("prod-valor-compra")?.value) || 0,
    valorVenda: parseFloat(document.getElementById("prod-valor-venda")?.value) || 0,
    lote: document.getElementById("prod-lote")?.value.trim() || "",
    fabricacao: document.getElementById("prod-fabricacao")?.value || "",
    validade: document.getElementById("prod-validade")?.value || "",
    estoqueInicial: parseInt(document.getElementById("prod-estoque")?.value) || 0,
    empresaId: document.getElementById("prod-empresa").value,
    obs: document.getElementById("prod-obs").value.trim(),
    anexos: window.AttachmentsController ? AttachmentsController.obterAnexos("prod-anexos-container") : [],
  };
}

// ─── Renderização ───────────────────────────────────────────────────────────

function renderizarProdutos() {
  const tbody = document.getElementById("produtos-lista");
  const vazio = document.getElementById("produtos-vazio");
  const busca = (document.getElementById("filtro-busca-produto")?.value || "").toLowerCase().trim();
  const catFiltro = document.getElementById("filtro-categoria-produto")?.value || "";
  const statusFiltro = document.getElementById("filtro-status-estoque")?.value || "";

  let dados = ProdutosStorage.buscarTodos();
  if (window.RolesController) dados = RolesController.filtrarPorVisibilidade(dados);

  // Filtros
  if (busca) dados = dados.filter((p) =>
    p.nome?.toLowerCase().includes(busca) ||
    p.codigo?.toLowerCase().includes(busca) ||
    p.descricao?.toLowerCase().includes(busca)
  );
  if (catFiltro) dados = dados.filter((p) => p.categoria === catFiltro);

  // Enriquece com dados de estoque
  dados = dados.map((p) => {
    const est = window.EstoqueStorage ? EstoqueStorage.obterQuantidadeTotal(p.id) : (p.estoque || 0);
    const min = window.EstoqueStorage
      ? (EstoqueStorage.buscarPorProduto(p.id)[0]?.estoqueMin || 5)
      : (p.estoqueMin || 5);
    return { ...p, _estoque: est, _estoqueMin: min };
  });

  if (statusFiltro) {
    dados = dados.filter((p) => {
      if (statusFiltro === "zerado") return p._estoque === 0;
      if (statusFiltro === "baixo") return p._estoque > 0 && p._estoque <= p._estoqueMin;
      if (statusFiltro === "normal") return p._estoque > p._estoqueMin;
      return true;
    });
  }

  dados.sort((a, b) => {
    const col = _prodOrdenacao.coluna;
    const dir = _prodOrdenacao.direcao === "asc" ? 1 : -1;
    let va = a[col] || a["_" + col] || "";
    let vb = b[col] || b["_" + col] || "";
    if (col === "preco" || col === "_estoque") {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb)) * dir;
  });

  // Resumo
  const todosRaw = ProdutosStorage.buscarTodos();
  const todos = (window.RolesController ? RolesController.filtrarPorVisibilidade(todosRaw) : todosRaw).map((p) => {
    const est = window.EstoqueStorage ? EstoqueStorage.obterQuantidadeTotal(p.id) : (p.estoque || 0);
    const min = window.EstoqueStorage ? (EstoqueStorage.buscarPorProduto(p.id)[0]?.estoqueMin || 5) : (p.estoqueMin || 5);
    return { ...p, _estoque: est, _estoqueMin: min };
  });
  document.getElementById("resumo-total-produtos").textContent = todos.length;
  const estoqueTotal = todos.reduce((s, p) => s + p._estoque, 0);
  document.getElementById("resumo-estoque-total").textContent = estoqueTotal;
  const estoqueBaixo = todos.filter((p) => p._estoque <= p._estoqueMin).length;
  document.getElementById("resumo-estoque-baixo").textContent = estoqueBaixo;
  const valorEstoque = todos.reduce((s, p) => s + (p._estoque * (parseFloat(p.preco) || 0)), 0);
  document.getElementById("resumo-valor-estoque").textContent = _fmtProd(valorEstoque);

  if (dados.length === 0) {
    tbody.innerHTML = "";
    vazio?.classList.remove("d-none");
    return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = dados.map((p) => {
    const est = p._estoque;
    const min = p._estoqueMin;
    let statusBadge, statusLabel;
    if (est === 0) { statusBadge = "bg-danger"; statusLabel = "❌ Sem Estoque"; }
    else if (est <= min) { statusBadge = "bg-warning text-dark"; statusLabel = "⚠️ Baixo"; }
    else { statusBadge = "bg-success"; statusLabel = "✅ Normal"; }

    return `
      <tr style="cursor:pointer;" onclick="visualizarProduto('${p.id}')">
        <td class="small text-muted">${p.codigo || "—"}</td>
        <td>
          <div class="fw-bold">${p.nome}</div>
          ${p.descricao ? `<div class="small text-muted">${p.descricao.substring(0, 50)}${p.descricao.length > 50 ? "..." : ""}</div>` : ""}
        </td>
        <td><span class="badge bg-secondary">${p.categoria || "outros"}</span></td>
        <td class="text-end">${_fmtProd(p.preco || 0)}<br><span class="small text-muted">/${p.unidade || "un"}</span></td>
        <td class="text-center fw-bold">${est}</td>
        <td class="text-center text-muted">${min}</td>
        <td class="text-center"><span class="badge ${statusBadge}" style="font-size:.7rem;">${statusLabel}</span></td>
        <td class="text-center" onclick="event.stopPropagation()">
          <button class="btn btn-xs btn-outline-primary me-1" onclick="abrirMovimentacao('${p.id}')" title="Movimentar estoque">📊</button>
          <button class="btn btn-xs btn-outline-danger" onclick="excluirProduto('${p.id}')" title="Excluir">🗑️</button>
        </td>
      </tr>`;
  }).join("");
}

// ─── Ações globais ──────────────────────────────────────────────────────────

function visualizarProduto(id) {
  const p = ProdutosStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  document.getElementById("prod-codigo").value = p.codigo || "";
  document.getElementById("prod-nome").value = p.nome || "";
  document.getElementById("prod-descricao").value = p.descricao || "";
  document.getElementById("prod-categoria").value = p.categoria || "outros";
  document.getElementById("prod-unidade").value = p.unidade || "un";
  document.getElementById("prod-preco").value = p.preco || "";
  // Novos campos
  const elValorCompra = document.getElementById("prod-valor-compra");
  if (elValorCompra) elValorCompra.value = p.valorCompra || "";
  const elValorVenda = document.getElementById("prod-valor-venda");
  if (elValorVenda) elValorVenda.value = p.valorVenda || "";
  const elLote = document.getElementById("prod-lote");
  if (elLote) elLote.value = p.lote || "";
  const elFabricacao = document.getElementById("prod-fabricacao");
  if (elFabricacao) elFabricacao.value = p.fabricacao || "";
  const elValidade = document.getElementById("prod-validade");
  if (elValidade) elValidade.value = p.validade || "";

  const estoque = window.EstoqueStorage ? EstoqueStorage.obterQuantidadeTotal(p.id) : (p.estoque || 0);
  const elEstoque = document.getElementById("prod-estoque");
  if (elEstoque) elEstoque.value = estoque;
  document.getElementById("prod-empresa").value = p.empresaId || "";

  // Mostra disponibilidade em estoque (em quais endereços o produto está)
  const secDisp = document.getElementById("prod-disponibilidade-section");
  const listaDisp = document.getElementById("prod-disponibilidade-lista");
  if (secDisp && listaDisp && window.EstoqueStorage && window.EnderecosStorage) {
    const posicoes = EstoqueStorage.buscarPorProduto(p.id);
    if (posicoes.length > 0) {
      const enderecos = EnderecosStorage.buscarTodos();
      listaDisp.innerHTML = posicoes.map((pos) => {
        const end = enderecos.find((e) => e.id === pos.enderecoId) || {};
        const endLabel = end.id === "end_geral" ? "Geral (padrão)" : [end.instalacao, end.galpao, end.estante, end.coluna, end.posicao].filter(Boolean).join(" › ");
        const tipoLabel = end.tipoLocal ? `<span class="badge bg-light text-dark border me-1">${end.tipoLocal}</span>` : "";
        return `<div class="d-flex justify-content-between align-items-center py-1 border-bottom">
          <span class="small">${tipoLabel}${endLabel}</span>
          <span class="badge bg-primary">${pos.quantidade} un</span>
        </div>`;
      }).join("");
      secDisp.classList.remove("d-none");
    } else {
      secDisp.classList.add("d-none");
    }
  }

  document.getElementById("prod-obs").value = p.obs || "";
  document.getElementById("form-produto").dataset.editId = id;

  // Carrega anexos
  if (window.AttachmentsController) {
    AttachmentsController.carregar("prod-anexos-container", p.anexos || [], false);
  }

  const auditoriaEl = document.getElementById("auditoria-prod");
  if (auditoriaEl) auditoriaEl.textContent = _formatarAuditoriaProd(p);

  _prodSetModo("visualizacao");
  const modalEl = document.getElementById("modal-produto");
  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  if (!modalEl.classList.contains("show")) {
    modalInstance.show();
  }
}

function abrirMovimentacao(id) {
  const p = ProdutosStorage.buscarTodos().find((x) => x.id === id);
  if (!p) return;
  const estoque = window.EstoqueStorage ? EstoqueStorage.obterQuantidadeTotal(p.id) : (p.estoque || 0);
  document.getElementById("mov-produto-id").value = id;
  document.getElementById("mov-produto-nome").value = `${p.nome} (Estoque total: ${estoque})`;
  document.getElementById("mov-entrada").checked = true;
  document.getElementById("mov-quantidade").value = 1;
  document.getElementById("mov-motivo").value = "";
  _preencherEnderecos();
  const destContainer = document.getElementById("mov-destino-container");
  if (destContainer) destContainer.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-movimentacao")).show();
}

function excluirProduto(id) {
  if (!confirm("Remover este produto?")) return;
  ProdutosStorage.excluir(id);
  renderizarProdutos();
}

// ─── Renderização de Endereços ──────────────────────────────────────────────

// ─── Ordenação de Produtos (#119) ───────────────────────────────────────────
const _prodOrdenacao = { coluna: "nome", direcao: "asc" };

function _ordenarProdutos(coluna) {
  if (_prodOrdenacao.coluna === coluna) {
    _prodOrdenacao.direcao = _prodOrdenacao.direcao === "asc" ? "desc" : "asc";
  } else {
    _prodOrdenacao.coluna = coluna;
    _prodOrdenacao.direcao = "asc";
  }
  renderizarProdutos();
}

// ─── Navegação entre Produtos (#119) ────────────────────────────────────────

function _navProduto(direcao) {
  const form = document.getElementById("form-produto");
  const idAtual = form?.dataset.editId;
  if (!idAtual) return;

  const dados = ProdutosStorage.buscarTodos();
  const idx = dados.findIndex((p) => p.id === idAtual);
  if (idx === -1) return;

  const novoIdx = direcao === "next" ? idx + 1 : idx - 1;
  if (novoIdx < 0 || novoIdx >= dados.length) return;

  visualizarProduto(dados[novoIdx].id);
}

function _duplicarProduto() {
  const form = document.getElementById("form-produto");
  const idAtual = form?.dataset.editId;
  if (!idAtual) return;

  const original = ProdutosStorage.buscarTodos().find((p) => p.id === idAtual);
  if (!original) return;

  const copia = { ...original };
  delete copia.id;
  delete copia.criadoEm;
  delete copia.criadoPor;
  delete copia.criadoPorId;
  delete copia.atualizadoEm;
  delete copia.atualizadoPor;
  copia.nome = `${original.nome} (cópia)`;
  copia.codigo = original.codigo ? `${original.codigo}-COPIA` : "";

  const novo = ProdutosStorage.adicionar(copia);
  alert(`✅ Produto duplicado: ${novo.nome}`);
  renderizarProdutos();
  visualizarProduto(novo.id);
}

// ─── Renderização de Endereços ──────────────────────────────────────────────

function _renderizarEnderecos() {
  const tbody = document.getElementById("enderecos-lista");
  const vazio = document.getElementById("enderecos-vazio");
  if (!tbody || !window.EnderecosStorage) return;

  const enderecos = EnderecosStorage.buscarTodos().filter((e) => e.id !== "end_geral");

  if (enderecos.length === 0) {
    tbody.innerHTML = "";
    vazio?.classList.remove("d-none");
    return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = enderecos.map((e) => `
    <tr>
      <td class="small fw-bold">${e.instalacao || "—"}</td>
      <td class="small">${e.galpao || "—"}</td>
      <td class="small">${e.corredor || "—"}</td>
      <td class="small">${e.estante || "—"}</td>
      <td class="small">${e.coluna || "—"}</td>
      <td class="small">${e.posicao || "—"}</td>
      <td class="text-center">
        <button class="btn btn-xs btn-outline-danger" onclick="excluirEndereco('${e.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`).join("");
}

function excluirEndereco(id) {
  if (!confirm("Remover este endereço? Posições de estoque vinculadas ficarão sem endereço.")) return;
  EnderecosStorage.excluir(id);
  _renderizarEnderecos();
  _preencherEnderecos();
}
