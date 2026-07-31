/**
 * estoque.js (page) — Tela dedicada de Gestão de Estoque (#114)
 * Separada da tela de Produtos. Foca em:
 * - Visualizar posições de estoque por produto/endereço
 * - Movimentações (entrada, saída, transferência)
 * - Gestão de endereços de armazenamento
 * - Alertas de estoque baixo
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;
  if (window.ModulesController && !ModulesController.requireModuleAccess("estoque")) return;
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());
  if (window.NavbarController) NavbarController.init("estoque");
  if (window.ThemeController) ThemeController.init();

  // Migra dados antigos
  if (window.EstoqueStorage) EstoqueStorage.migrarDadosAntigos();

  _preencherFiltroEnderecos();
  _renderizarEstoque();
  _renderizarMovimentacoes();

  // ─── Nova Movimentação ──────────────────────────────────────────────────
  const modalMovEl = document.getElementById("modal-movimentacao-est");
  const modalMov = new bootstrap.Modal(modalMovEl);

  document.getElementById("btn-nova-movimentacao").addEventListener("click", () => {
    _resetarFormMov();
    _preencherSelectEnderecos();
    modalMov.show();
  });

  // Selecionar produto via picker
  document.getElementById("btn-selecionar-produto-mov").addEventListener("click", () => {
    if (window.ProductPickerModal) {
      ProductPickerModal.abrir((produto) => {
        document.getElementById("mov-est-produto-id").value = produto.id;
        document.getElementById("mov-est-produto-nome").value = produto.nome;
      });
    }
  });

  // Toggle transferência
  document.querySelectorAll('input[name="mov-est-tipo"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isTransf = document.getElementById("mov-est-transferencia")?.checked;
      const destContainer = document.getElementById("mov-est-destino-container");
      if (destContainer) destContainer.classList.toggle("d-none", !isTransf);
    });
  });

  // Submit movimentação
  document.getElementById("form-movimentacao-est").addEventListener("submit", (e) => {
    e.preventDefault();
    const prodId = document.getElementById("mov-est-produto-id").value;
    if (!prodId) { alert("Selecione um produto."); return; }

    const tipo = document.querySelector('input[name="mov-est-tipo"]:checked').value;
    const qtd = parseInt(document.getElementById("mov-est-quantidade").value) || 0;
    const motivo = document.getElementById("mov-est-motivo").value.trim();
    const enderecoId = document.getElementById("mov-est-endereco").value || "end_geral";

    if (qtd <= 0) { alert("Quantidade deve ser maior que zero."); return; }

    // Verifica se motivo é obrigatório (parâmetro)
    const params = window.ParamsController ? ParamsController.obter("estoque") : {};
    if (params.exigirMotivo && !motivo) {
      alert("⚠️ O motivo da movimentação é obrigatório (configuração da organização).");
      return;
    }

    let resultado;
    if (tipo === "transferencia") {
      const enderecoDestino = document.getElementById("mov-est-endereco-destino")?.value || "";
      if (!enderecoDestino) { alert("Selecione o endereço de destino."); return; }
      resultado = EstoqueStorage.transferir({ produtoId: prodId, enderecoOrigem: enderecoId, enderecoDestino, quantidade: qtd, motivo });
    } else {
      resultado = EstoqueStorage.movimentar({ produtoId: prodId, enderecoId, tipo, quantidade: qtd, motivo });
    }

    if (!resultado.sucesso) { alert(resultado.mensagem); return; }

    // Integração Financeiro (se configurado)
    if (params.gerarFinanceiro && window.FinanceiroStorage && window.ProdutosStorage) {
      const produto = ProdutosStorage.buscarTodos().find((p) => p.id === prodId);
      if (produto && produto.preco) {
        const valorTotal = qtd * parseFloat(produto.preco);
        if (valorTotal > 0 && tipo !== "transferencia") {
          FinanceiroStorage.adicionar({
            tipo: tipo === "entrada" ? "saida" : "entrada",
            tipoFiscal: tipo === "entrada" ? "nfe" : "nfs",
            descricao: `${tipo === "entrada" ? "NFe — Compra" : "NFs — Venda"}: ${produto.nome} (${qtd}x)`,
            valor: valorTotal,
            data: new Date().toISOString().split("T")[0],
            statusPagamento: "pendente",
            categoria: "produtos",
            obs: `Gerado automaticamente — ${motivo || tipo}`,
          });
        }
      }
    }

    modalMov.hide();
    _renderizarEstoque();
    _renderizarMovimentacoes();
  });

  // ─── Gerenciar Endereços ────────────────────────────────────────────────
  const modalEndEl = document.getElementById("modal-enderecos-est");
  const modalEnd = new bootstrap.Modal(modalEndEl);

  document.getElementById("btn-gerenciar-enderecos").addEventListener("click", () => {
    _renderizarEnderecosLista();
    modalEnd.show();
  });

  document.getElementById("form-endereco-est").addEventListener("submit", (e) => {
    e.preventDefault();
    const endereco = {
      instalacao: document.getElementById("end-est-instalacao").value.trim(),
      galpao: document.getElementById("end-est-galpao").value.trim(),
      andar: document.getElementById("end-est-andar").value.trim(),
      corredor: document.getElementById("end-est-corredor").value.trim(),
      estante: document.getElementById("end-est-estante").value.trim(),
      coluna: document.getElementById("end-est-coluna").value.trim(),
      posicao: document.getElementById("end-est-posicao").value.trim(),
      descricao: document.getElementById("end-est-descricao").value.trim(),
    };
    if (!endereco.instalacao || !endereco.estante || !endereco.coluna || !endereco.posicao) {
      alert("Instalação, Estante, Coluna e Posição são obrigatórios.");
      return;
    }
    EnderecosStorage.adicionar(endereco);
    document.getElementById("form-endereco-est").reset();
    _renderizarEnderecosLista();
    _preencherFiltroEnderecos();
    _preencherSelectEnderecos();
  });

  // ─── Filtros ────────────────────────────────────────────────────────────
  ["filtro-busca-estoque", "filtro-endereco-estoque", "filtro-status-estoque"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", _renderizarEstoque);
    document.getElementById(id)?.addEventListener("change", _renderizarEstoque);
  });

  document.getElementById("btn-limpar-filtro-estoque")?.addEventListener("click", () => {
    document.getElementById("filtro-busca-estoque").value = "";
    document.getElementById("filtro-endereco-estoque").value = "";
    document.getElementById("filtro-status-estoque").value = "";
    _renderizarEstoque();
  });

  document.getElementById("btn-ver-todas-mov")?.addEventListener("click", () => {
    _renderizarMovimentacoes(true);
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function _resetarFormMov() {
  document.getElementById("form-movimentacao-est").reset();
  document.getElementById("mov-est-produto-id").value = "";
  document.getElementById("mov-est-produto-nome").value = "";
  document.getElementById("mov-est-entrada").checked = true;
  document.getElementById("mov-est-destino-container")?.classList.add("d-none");
}

function _preencherSelectEnderecos() {
  const selOrigem = document.getElementById("mov-est-endereco");
  const selDest = document.getElementById("mov-est-endereco-destino");
  if (!window.EnderecosStorage) return;
  const enderecos = EnderecosStorage.buscarTodos();
  [selOrigem, selDest].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = enderecos.map((e) => {
      let label;
      if (e.id === "end_geral") { label = "Geral (padrão)"; }
      else {
        const partes = [e.instalacao, e.galpao, e.corredor, e.estante, e.coluna, e.posicao].filter(Boolean);
        label = partes.join(" › ") || e.nome || e.id;
      }
      return `<option value="${e.id}">${label}</option>`;
    }).join("");
  });
}

function _preencherFiltroEnderecos() {
  const sel = document.getElementById("filtro-endereco-estoque");
  if (!sel || !window.EnderecosStorage) return;
  const enderecos = EnderecosStorage.buscarTodos();
  sel.innerHTML = `<option value="">Todos os Endereços</option>` + enderecos.map((e) => {
    const label = e.id === "end_geral" ? "Geral" : ([e.instalacao, e.estante, e.coluna, e.posicao].filter(Boolean).join(" › ") || e.nome);
    return `<option value="${e.id}">${label}</option>`;
  }).join("");
}

// ─── Renderização de Estoque ────────────────────────────────────────────────

function _renderizarEstoque() {
  const tbody = document.getElementById("estoque-lista");
  const vazio = document.getElementById("estoque-vazio");
  if (!tbody || !window.EstoqueStorage || !window.ProdutosStorage) return;

  const busca = (document.getElementById("filtro-busca-estoque")?.value || "").toLowerCase().trim();
  const enderecoFiltro = document.getElementById("filtro-endereco-estoque")?.value || "";
  const statusFiltro = document.getElementById("filtro-status-estoque")?.value || "";

  let posicoes = EstoqueStorage.buscarTodos();
  const produtos = ProdutosStorage.buscarTodos();
  const enderecos = EnderecosStorage.buscarTodos();

  // Enriquece com dados do produto e endereço
  posicoes = posicoes.map((pos) => {
    const produto = produtos.find((p) => p.id === pos.produtoId) || {};
    const endereco = enderecos.find((e) => e.id === pos.enderecoId) || {};
    return { ...pos, _produto: produto, _endereco: endereco };
  });

  // Filtros
  if (busca) {
    posicoes = posicoes.filter((p) =>
      (p._produto.nome || "").toLowerCase().includes(busca) ||
      (p._produto.codigo || "").toLowerCase().includes(busca)
    );
  }
  if (enderecoFiltro) posicoes = posicoes.filter((p) => p.enderecoId === enderecoFiltro);
  if (statusFiltro) {
    posicoes = posicoes.filter((p) => {
      const min = p.estoqueMin || 5;
      if (statusFiltro === "zerado") return p.quantidade === 0;
      if (statusFiltro === "baixo") return p.quantidade > 0 && p.quantidade <= min;
      if (statusFiltro === "normal") return p.quantidade > min;
      return true;
    });
  }

  // Resumos
  const todasPosicoes = EstoqueStorage.buscarTodos();
  document.getElementById("resumo-total-posicoes").textContent = todasPosicoes.length;
  document.getElementById("resumo-enderecos-ativos").textContent = enderecos.length;
  const abaixoMin = todasPosicoes.filter((p) => p.quantidade <= (p.estoqueMin || 5)).length;
  document.getElementById("resumo-abaixo-minimo").textContent = abaixoMin;
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const movs30d = EstoqueStorage.buscarMovimentacoes().filter((m) => m.data >= trintaDiasAtras).length;
  document.getElementById("resumo-movimentacoes-30d").textContent = movs30d;

  if (posicoes.length === 0) {
    tbody.innerHTML = "";
    vazio?.classList.remove("d-none");
    return;
  }
  vazio?.classList.add("d-none");

  tbody.innerHTML = posicoes.map((pos) => {
    const min = pos.estoqueMin || 5;
    let statusBadge, statusLabel;
    if (pos.quantidade === 0) { statusBadge = "bg-danger"; statusLabel = "❌ Zerado"; }
    else if (pos.quantidade <= min) { statusBadge = "bg-warning text-dark"; statusLabel = "⚠️ Baixo"; }
    else { statusBadge = "bg-success"; statusLabel = "✅ Normal"; }

    const endLabel = pos._endereco.id === "end_geral" ? "Geral"
      : [pos._endereco.instalacao, pos._endereco.estante, pos._endereco.coluna, pos._endereco.posicao].filter(Boolean).join(" › ");
    const ultimaMov = pos.ultimaMovimentacao ? new Date(pos.ultimaMovimentacao).toLocaleDateString("pt-BR") : "—";

    return `
      <tr>
        <td>
          <div class="fw-bold">${pos._produto.nome || "Produto removido"}</div>
          <div class="small text-muted">${pos._produto.codigo || ""}</div>
        </td>
        <td class="small">${endLabel}</td>
        <td class="text-center fw-bold">${pos.quantidade}</td>
        <td class="text-center text-muted">${min}</td>
        <td class="text-center"><span class="badge ${statusBadge}" style="font-size:.7rem;">${statusLabel}</span></td>
        <td class="text-center small">${ultimaMov}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-outline-primary" onclick="movimentarRapido('${pos.produtoId}', '${pos.enderecoId}')" title="Movimentar">📊</button>
        </td>
      </tr>`;
  }).join("");
}

// ─── Renderização de Movimentações ──────────────────────────────────────────

function _renderizarMovimentacoes(todas) {
  const tbody = document.getElementById("movimentacoes-lista");
  if (!tbody || !window.EstoqueStorage) return;

  const produtos = window.ProdutosStorage ? ProdutosStorage.buscarTodos() : [];
  let movs = EstoqueStorage.buscarMovimentacoes();
  movs.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  if (!todas) movs = movs.slice(0, 10);

  if (movs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Nenhuma movimentação registrada.</td></tr>`;
    return;
  }

  const tipoConfig = { entrada: { badge: "bg-success", label: "⬆️ Entrada" }, saida: { badge: "bg-danger", label: "⬇️ Saída" }, transferencia: { badge: "bg-primary", label: "🔄 Transf." } };

  tbody.innerHTML = movs.map((m) => {
    const produto = produtos.find((p) => p.id === m.produtoId);
    const tc = tipoConfig[m.tipo] || tipoConfig.entrada;
    const dataFmt = m.data ? new Date(m.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
    const enderecos = window.EnderecosStorage ? EnderecosStorage.buscarTodos() : [];
    const end = enderecos.find((e) => e.id === m.enderecoId);
    const endLabel = end ? (end.id === "end_geral" ? "Geral" : [end.instalacao, end.estante].filter(Boolean).join(" › ")) : "—";

    return `
      <tr>
        <td class="small">${dataFmt}</td>
        <td class="small fw-bold">${produto ? produto.nome : "—"}</td>
        <td><span class="badge ${tc.badge}" style="font-size:.65rem;">${tc.label}</span></td>
        <td class="text-center fw-bold">${m.quantidade}</td>
        <td class="small">${endLabel}</td>
        <td class="small text-muted">${m.motivo || "—"}</td>
        <td class="small text-muted">${m.usuario || "—"}</td>
      </tr>`;
  }).join("");
}

// ─── Renderização de Endereços ──────────────────────────────────────────────

function _renderizarEnderecosLista() {
  const tbody = document.getElementById("enderecos-lista-est");
  if (!tbody || !window.EnderecosStorage) return;
  const enderecos = EnderecosStorage.buscarTodos().filter((e) => e.id !== "end_geral");

  if (enderecos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Nenhum endereço cadastrado além do padrão.</td></tr>`;
    return;
  }

  tbody.innerHTML = enderecos.map((e) => `
    <tr>
      <td class="small fw-bold">${e.instalacao || "—"}</td>
      <td class="small">${e.galpao || "—"}</td>
      <td class="small">${e.corredor || "—"}</td>
      <td class="small">${e.estante || "—"}</td>
      <td class="small">${e.coluna || "—"}</td>
      <td class="small">${e.posicao || "—"}</td>
      <td class="text-center">
        <button class="btn btn-xs btn-outline-danger" onclick="excluirEnderecoEst('${e.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`).join("");
}

// ─── Ações Globais ──────────────────────────────────────────────────────────

function movimentarRapido(produtoId, enderecoId) {
  const produto = window.ProdutosStorage ? ProdutosStorage.buscarTodos().find((p) => p.id === produtoId) : null;
  if (!produto) return;
  document.getElementById("mov-est-produto-id").value = produtoId;
  document.getElementById("mov-est-produto-nome").value = produto.nome;
  _preencherSelectEnderecos();
  const selEnd = document.getElementById("mov-est-endereco");
  if (selEnd) selEnd.value = enderecoId;
  document.getElementById("mov-est-entrada").checked = true;
  document.getElementById("mov-est-destino-container")?.classList.add("d-none");
  new bootstrap.Modal(document.getElementById("modal-movimentacao-est")).show();
}

function excluirEnderecoEst(id) {
  if (!confirm("Remover este endereço?")) return;
  EnderecosStorage.excluir(id);
  _renderizarEnderecosLista();
  _preencherFiltroEnderecos();
  _preencherSelectEnderecos();
}
