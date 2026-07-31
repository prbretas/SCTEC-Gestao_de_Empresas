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
    _adicionarItemMov(); // Adiciona primeira linha
    modalMov.show();
  });

  // Adicionar mais produtos à movimentação
  document.getElementById("btn-add-item-mov")?.addEventListener("click", () => {
    _adicionarItemMov();
  });

  // Toggle transferência
  document.querySelectorAll('input[name="mov-est-tipo"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const isTransf = document.getElementById("mov-est-transferencia")?.checked;
      const destContainer = document.getElementById("mov-est-destino-container");
      if (destContainer) destContainer.classList.toggle("d-none", !isTransf);
    });
  });

  // Submit movimentação (múltiplos produtos)
  document.getElementById("form-movimentacao-est").addEventListener("submit", (e) => {
    e.preventDefault();

    const tipo = document.querySelector('input[name="mov-est-tipo"]:checked').value;
    const motivo = document.getElementById("mov-est-motivo").value.trim();
    const enderecoId = document.getElementById("mov-est-endereco").value || "end_geral";

    // Verifica se motivo é obrigatório (parâmetro)
    const params = window.ParamsController ? ParamsController.obter("estoque") : {};
    if (params.exigirMotivo && !motivo) {
      alert("⚠️ O motivo da movimentação é obrigatório (configuração da organização).");
      return;
    }

    // Coleta itens da movimentação
    const itens = [];
    document.querySelectorAll(".mov-item-linha").forEach((linha) => {
      const prodId = linha.querySelector(".mov-item-produto-id")?.value;
      const qtd = parseInt(linha.querySelector(".mov-item-qtd")?.value) || 0;
      if (prodId && qtd > 0) itens.push({ produtoId: prodId, quantidade: qtd });
    });

    if (itens.length === 0) { alert("Adicione ao menos um produto com quantidade."); return; }
    if (!confirm(`Confirmar ${tipo} de ${itens.length} produto(s)?`)) return;

    const erros = [];
    itens.forEach((item) => {
      let resultado;
      if (tipo === "transferencia") {
        const enderecoDestino = document.getElementById("mov-est-endereco-destino")?.value || "";
        if (!enderecoDestino) { erros.push("Selecione o endereço de destino."); return; }
        resultado = EstoqueStorage.transferir({ produtoId: item.produtoId, enderecoOrigem: enderecoId, enderecoDestino, quantidade: item.quantidade, motivo });
      } else {
        resultado = EstoqueStorage.movimentar({ produtoId: item.produtoId, enderecoId, tipo, quantidade: item.quantidade, motivo });
      }
      if (!resultado.sucesso) erros.push(resultado.mensagem);
    });

    if (erros.length > 0) {
      alert(`⚠️ Alguns itens tiveram erro:\n${erros.join("\n")}`);
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
    const editId = document.getElementById("end-est-edit-id").value;
    const endereco = {
      instalacao: document.getElementById("end-est-instalacao").value.trim(),
      galpao: document.getElementById("end-est-galpao").value.trim(),
      andar: document.getElementById("end-est-andar").value.trim(),
      corredor: document.getElementById("end-est-corredor").value.trim(),
      estante: document.getElementById("end-est-estante").value.trim(),
      coluna: document.getElementById("end-est-coluna").value.trim(),
      posicao: document.getElementById("end-est-posicao").value.trim(),
      tipoLocal: document.getElementById("end-est-tipo-local").value,
      capacidade: parseInt(document.getElementById("end-est-capacidade").value) || 0,
      altura: parseFloat(document.getElementById("end-est-altura").value) || 0,
      largura: parseFloat(document.getElementById("end-est-largura").value) || 0,
      comprimento: parseFloat(document.getElementById("end-est-comprimento").value) || 0,
      descricao: document.getElementById("end-est-descricao").value.trim(),
    };
    if (!endereco.instalacao || !endereco.estante || !endereco.coluna || !endereco.posicao) {
      alert("Instalação, Estante, Coluna e Posição são obrigatórios.");
      return;
    }

    if (editId) {
      // Modo edição
      EnderecosStorage.atualizar(editId, endereco);
    } else {
      // Modo criação
      EnderecosStorage.adicionar(endereco);
    }

    _resetarFormEndereco();
    _renderizarEnderecosLista();
    _preencherFiltroEnderecos();
    _preencherSelectEnderecos();
    _renderizarEstoque();
  });

  document.getElementById("btn-cancelar-edicao-end")?.addEventListener("click", () => {
    _resetarFormEndereco();
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
  document.getElementById("mov-est-entrada").checked = true;
  document.getElementById("mov-est-destino-container")?.classList.add("d-none");
  document.getElementById("mov-est-itens-lista").innerHTML = "";
}

function _adicionarItemMov(produtoId, produtoNome) {
  const lista = document.getElementById("mov-est-itens-lista");
  const div = document.createElement("div");
  div.className = "row g-2 mb-2 mov-item-linha";
  div.innerHTML = `
    <div class="col-md-7">
      <div class="input-group input-group-sm">
        <input type="text" class="form-control mov-item-produto-nome" readonly placeholder="Clique 📦 para selecionar" value="${produtoNome || ""}" />
        <button type="button" class="btn btn-outline-primary btn-sm mov-item-btn-picker">📦</button>
      </div>
      <input type="hidden" class="mov-item-produto-id" value="${produtoId || ""}" />
    </div>
    <div class="col-md-3">
      <input type="number" class="form-control form-control-sm mov-item-qtd" min="1" value="1" placeholder="Qtd" />
    </div>
    <div class="col-md-2 d-flex align-items-center">
      <button type="button" class="btn btn-xs btn-outline-danger" onclick="this.closest('.mov-item-linha').remove()">✕</button>
    </div>`;
  lista.appendChild(div);

  // Bind picker
  div.querySelector(".mov-item-btn-picker").addEventListener("click", () => {
    if (window.ProductPickerModal) {
      ProductPickerModal.abrir((produto) => {
        div.querySelector(".mov-item-produto-id").value = produto.id;
        div.querySelector(".mov-item-produto-nome").value = produto.nome;
      });
    }
  });
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

// ─── Renderização de Estoque (agrupado por endereço) ────────────────────────

function _renderizarEstoque() {
  const container = document.getElementById("estoque-lista");
  const vazio = document.getElementById("estoque-vazio");
  if (!container || !window.EstoqueStorage || !window.ProdutosStorage) return;

  const busca = (document.getElementById("filtro-busca-estoque")?.value || "").toLowerCase().trim();
  const enderecoFiltro = document.getElementById("filtro-endereco-estoque")?.value || "";
  const statusFiltro = document.getElementById("filtro-status-estoque")?.value || "";

  const posicoes = EstoqueStorage.buscarTodos();
  const produtos = ProdutosStorage.buscarTodos();
  const enderecos = EnderecosStorage.buscarTodos();

  // Agrupa posições por endereço
  const porEndereco = {};
  enderecos.forEach((end) => { porEndereco[end.id] = { endereco: end, itens: [] }; });

  posicoes.forEach((pos) => {
    const produto = produtos.find((p) => p.id === pos.produtoId) || { nome: "Produto removido", codigo: "" };
    const item = { ...pos, _produto: produto };

    // Filtro de busca
    if (busca && !(produto.nome || "").toLowerCase().includes(busca) && !(produto.codigo || "").toLowerCase().includes(busca)) return;

    // Filtro de status
    const min = pos.estoqueMin || 5;
    if (statusFiltro === "zerado" && pos.quantidade !== 0) return;
    if (statusFiltro === "baixo" && !(pos.quantidade > 0 && pos.quantidade <= min)) return;
    if (statusFiltro === "normal" && pos.quantidade <= min) return;

    if (!porEndereco[pos.enderecoId]) {
      porEndereco[pos.enderecoId] = { endereco: { id: pos.enderecoId, nome: "Endereço desconhecido" }, itens: [] };
    }
    porEndereco[pos.enderecoId].itens.push(item);
  });

  // Filtro de endereço
  let enderecosVisiveis = Object.values(porEndereco);
  if (enderecoFiltro) enderecosVisiveis = enderecosVisiveis.filter((g) => g.endereco.id === enderecoFiltro);

  // Resumos
  const todasPosicoes = EstoqueStorage.buscarTodos();
  document.getElementById("resumo-total-posicoes").textContent = todasPosicoes.length;
  document.getElementById("resumo-enderecos-ativos").textContent = enderecos.length;
  const abaixoMin = todasPosicoes.filter((p) => p.quantidade <= (p.estoqueMin || 5)).length;
  document.getElementById("resumo-abaixo-minimo").textContent = abaixoMin;
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const movs30d = EstoqueStorage.buscarMovimentacoes().filter((m) => m.data >= trintaDiasAtras).length;
  document.getElementById("resumo-movimentacoes-30d").textContent = movs30d;

  // Remove endereços sem itens (exceto se não há filtro de busca)
  const comItens = enderecosVisiveis.filter((g) => g.itens.length > 0);
  const semItens = enderecosVisiveis.filter((g) => g.itens.length === 0);

  if (comItens.length === 0 && !busca && !statusFiltro) {
    // Mostra endereços vazios quando não há filtro
    if (enderecos.length <= 1) {
      container.innerHTML = "";
      vazio?.classList.remove("d-none");
      return;
    }
  }

  if (comItens.length === 0 && (busca || statusFiltro)) {
    container.innerHTML = `<div class="text-center py-4 text-muted"><p>Nenhum resultado para os filtros aplicados.</p></div>`;
    vazio?.classList.add("d-none");
    return;
  }

  vazio?.classList.add("d-none");

  // Renderiza cards de endereço com seus produtos
  let html = "";

  comItens.forEach((grupo) => {
    const end = grupo.endereco;
    const endLabel = end.id === "end_geral" ? "📍 Geral (Padrão)"
      : `📍 ${[end.instalacao, end.galpao, end.corredor, end.estante, end.coluna, end.posicao].filter(Boolean).join(" › ")}`;
    const totalItens = grupo.itens.reduce((s, i) => s + (i.quantidade || 0), 0);

    html += `
      <div class="card shadow-sm border-0 mb-3">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0 fw-bold">${endLabel}</h6>
            ${end.descricao ? `<small class="text-muted">${end.descricao}</small>` : ""}
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-light text-dark border">${grupo.itens.length} produto${grupo.itens.length !== 1 ? "s" : ""}</span>
            <span class="badge bg-primary">${totalItens} un. total</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:80px;">Código</th>
                <th>Produto</th>
                <th class="text-center" style="width:90px;">Qtd</th>
                <th class="text-center" style="width:70px;">Mín.</th>
                <th class="text-center" style="width:90px;">Status</th>
                <th class="text-center" style="width:100px;">Última Mov.</th>
                <th class="text-center" style="width:60px;">Ações</th>
              </tr>
            </thead>
            <tbody>`;

    grupo.itens.forEach((item) => {
      const min = item.estoqueMin || 5;
      let statusBadge, statusLabel;
      if (item.quantidade === 0) { statusBadge = "bg-danger"; statusLabel = "❌ Zerado"; }
      else if (item.quantidade <= min) { statusBadge = "bg-warning text-dark"; statusLabel = "⚠️ Baixo"; }
      else { statusBadge = "bg-success"; statusLabel = "✅ Ok"; }

      const ultimaMov = item.ultimaMovimentacao ? new Date(item.ultimaMovimentacao).toLocaleDateString("pt-BR") : "—";

      html += `
              <tr>
                <td class="small text-muted fw-bold">${item._produto.codigo || "—"}</td>
                <td class="fw-semibold">${item._produto.nome}</td>
                <td class="text-center fw-bold">${item.quantidade}</td>
                <td class="text-center text-muted">${min}</td>
                <td class="text-center"><span class="badge ${statusBadge}" style="font-size:.65rem;">${statusLabel}</span></td>
                <td class="text-center small">${ultimaMov}</td>
                <td class="text-center">
                  <button class="btn btn-xs btn-outline-primary" onclick="movimentarRapido('${item.produtoId}', '${item.enderecoId}')" title="Movimentar">📊</button>
                </td>
              </tr>`;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>`;
  });

  // Mostra endereços vazios (sem produtos) com visual mais sutil
  if (!busca && !statusFiltro) {
    semItens.forEach((grupo) => {
      const end = grupo.endereco;
      if (end.id === "end_geral" && comItens.some((g) => g.endereco.id === "end_geral")) return;
      const endLabel = end.id === "end_geral" ? "📍 Geral (Padrão)"
        : `📍 ${[end.instalacao, end.galpao, end.corredor, end.estante, end.coluna, end.posicao].filter(Boolean).join(" › ")}`;

      html += `
        <div class="card border-0 shadow-sm mb-3 opacity-50">
          <div class="card-body py-2 d-flex justify-content-between align-items-center">
            <h6 class="mb-0 small">${endLabel}</h6>
            <span class="badge bg-light text-muted border">Vazio</span>
          </div>
        </div>`;
    });
  }

  container.innerHTML = html;
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
      <tr style="cursor:pointer;" onclick="visualizarMovimentacao('${m.id}')">
        <td class="small">${dataFmt}</td>
        <td class="small fw-bold">${produto ? produto.nome : "—"}</td>
        <td><span class="badge ${tc.badge}" style="font-size:.65rem;">${tc.label}</span></td>
        <td class="text-center fw-bold">${m.quantidade}</td>
        <td class="small">${endLabel}</td>
        <td class="small text-muted text-truncate" style="max-width:150px;">${m.motivo || "—"}</td>
        <td class="small text-muted">${m.usuario || "—"}</td>
      </tr>`;
  }).join("");
}

// ─── Renderização de Endereços ──────────────────────────────────────────────

function _resetarFormEndereco() {
  document.getElementById("form-endereco-est").reset();
  document.getElementById("end-est-edit-id").value = "";
  document.getElementById("btn-salvar-endereco").textContent = "Cadastrar Endereço";
  document.getElementById("btn-cancelar-edicao-end")?.classList.add("d-none");
}

function _renderizarEnderecosLista() {
  const tbody = document.getElementById("enderecos-lista-est");
  if (!tbody || !window.EnderecosStorage) return;
  const enderecos = EnderecosStorage.buscarTodos();

  const TIPOS_LABEL = {
    prateleira: "📚 Prateleira",
    gaveta: "🗄️ Gaveta",
    estante: "🏗️ Estante",
    pallet: "📦 Pallet",
    container: "🚢 Container",
    rack: "🔩 Rack",
    chao: "⬛ Chão",
    outro: "📌 Outro",
  };

  if (enderecos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">Nenhum endereço cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = enderecos.map((e) => `
    <tr>
      <td class="small fw-bold">${e.instalacao || (e.id === "end_geral" ? "Geral" : "—")}</td>
      <td class="small">${e.galpao || "—"}</td>
      <td class="small">${e.corredor || "—"}</td>
      <td class="small">${e.estante || "—"}</td>
      <td class="small">${e.coluna || "—"}</td>
      <td class="small">${e.posicao || "—"}</td>
      <td class="small">${TIPOS_LABEL[e.tipoLocal] || (e.id === "end_geral" ? "📍 Padrão" : "—")}</td>
      <td class="small text-center">${e.capacidade || "—"}</td>
      <td class="text-center text-nowrap">
        ${e.id !== "end_geral" ? `<button class="btn btn-xs btn-outline-primary me-1" onclick="editarEnderecoEst('${e.id}')" title="Editar">✏️</button>` : ""}
        <button class="btn btn-xs btn-outline-danger" onclick="excluirEnderecoEst('${e.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`).join("");
}

// ─── Ações Globais ──────────────────────────────────────────────────────────

function movimentarRapido(produtoId, enderecoId) {
  const produto = window.ProdutosStorage ? ProdutosStorage.buscarTodos().find((p) => p.id === produtoId) : null;
  if (!produto) return;
  _resetarFormMov();
  _preencherSelectEnderecos();
  _adicionarItemMov(produtoId, produto.nome);
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
  _renderizarEstoque();
}

function editarEnderecoEst(id) {
  const enderecos = EnderecosStorage.buscarTodos();
  const end = enderecos.find((e) => e.id === id);
  if (!end) return;

  // Preenche o formulário com os dados do endereço
  document.getElementById("end-est-instalacao").value = end.instalacao || "";
  document.getElementById("end-est-galpao").value = end.galpao || "";
  document.getElementById("end-est-andar").value = end.andar || "";
  document.getElementById("end-est-corredor").value = end.corredor || "";
  document.getElementById("end-est-estante").value = end.estante || "";
  document.getElementById("end-est-coluna").value = end.coluna || "";
  document.getElementById("end-est-posicao").value = end.posicao || "";
  document.getElementById("end-est-tipo-local").value = end.tipoLocal || "prateleira";
  document.getElementById("end-est-capacidade").value = end.capacidade || "";
  document.getElementById("end-est-altura").value = end.altura || "";
  document.getElementById("end-est-largura").value = end.largura || "";
  document.getElementById("end-est-comprimento").value = end.comprimento || "";
  document.getElementById("end-est-descricao").value = end.descricao || "";
  document.getElementById("end-est-edit-id").value = id;

  // Muda visual para modo edição
  document.getElementById("btn-salvar-endereco").textContent = "Salvar Alterações";
  document.getElementById("btn-cancelar-edicao-end")?.classList.remove("d-none");

  // Scroll para o formulário
  document.getElementById("form-endereco-est").scrollIntoView({ behavior: "smooth" });
}


// ─── Visualizar Detalhe da Movimentação ─────────────────────────────────────

function visualizarMovimentacao(movId) {
  if (!window.EstoqueStorage) return;
  const movs = EstoqueStorage.buscarMovimentacoes();
  const mov = movs.find((m) => m.id === movId);
  if (!mov) return;

  const produtos = window.ProdutosStorage ? ProdutosStorage.buscarTodos() : [];
  const enderecos = window.EnderecosStorage ? EnderecosStorage.buscarTodos() : [];

  const produto = produtos.find((p) => p.id === mov.produtoId);
  const endOrigem = enderecos.find((e) => e.id === mov.enderecoId);
  const endDestino = mov.enderecoDestino ? enderecos.find((e) => e.id === mov.enderecoDestino) : null;

  const tipoLabels = {
    entrada: "⬆️ Entrada",
    saida: "⬇️ Saída",
    transferencia: "🔄 Transferência",
  };

  const formatarEnd = (end) => {
    if (!end) return "—";
    if (end.id === "end_geral") return "Geral (padrão)";
    return [end.instalacao, end.galpao, end.corredor, end.estante, end.coluna, end.posicao].filter(Boolean).join(" › ");
  };

  const dataFmt = mov.data
    ? new Date(mov.data).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "medium" })
    : "—";

  document.getElementById("det-mov-data").textContent = dataFmt;
  document.getElementById("det-mov-tipo").innerHTML = `<span class="badge ${mov.tipo === "entrada" ? "bg-success" : mov.tipo === "saida" ? "bg-danger" : "bg-primary"}">${tipoLabels[mov.tipo] || mov.tipo}</span>`;
  document.getElementById("det-mov-produto").textContent = produto ? `${produto.codigo ? produto.codigo + " — " : ""}${produto.nome}` : "Produto removido";
  document.getElementById("det-mov-quantidade").textContent = mov.quantidade;
  document.getElementById("det-mov-saldo").textContent = `${mov.estoqueAnterior || "?"} → ${mov.estoqueNovo || "?"}`;
  document.getElementById("det-mov-endereco").textContent = formatarEnd(endOrigem);
  document.getElementById("det-mov-endereco-dest").textContent = mov.tipo === "transferencia" ? formatarEnd(endDestino) : "N/A";
  document.getElementById("det-mov-motivo").textContent = mov.motivo || "Nenhum motivo informado";
  document.getElementById("det-mov-usuario").textContent = mov.usuario || "Sistema";
  document.getElementById("det-mov-id").textContent = mov.id;

  new bootstrap.Modal(document.getElementById("modal-detalhe-mov")).show();
}
