/**
 * productPicker.js — Modal de seleção de produtos com busca (#118)
 * Componente reutilizável para selecionar produtos em Pedido de Venda e Doc. Entrada.
 * Substitui o dropdown por um modal com busca em tempo real e paginação.
 */

const ProductPickerModal = {
  PAGE_SIZE: 20,
  _currentPage: 1,
  _filteredData: [],
  _onSelectCallback: null,
  _modalInstance: null,
  _debounceTimer: null,

  /**
   * Inicializa o modal (injeta HTML no DOM se ainda não existir).
   */
  init() {
    if (document.getElementById("modal-product-picker")) return;

    const modalHTML = `
    <div class="modal fade" id="modal-product-picker" tabindex="-1" aria-labelledby="titulo-modal-picker" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title" id="titulo-modal-picker">📦 Selecionar Produto</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body p-3">
            <!-- Barra de busca -->
            <div class="input-group mb-3">
              <span class="input-group-text">🔍</span>
              <input type="text" id="picker-busca" class="form-control" 
                placeholder="Buscar por nome, código ou descrição..." 
                autocomplete="off" />
              <button type="button" class="btn btn-outline-secondary" id="picker-limpar-busca" title="Limpar">✕</button>
            </div>

            <!-- Info de resultados -->
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span id="picker-resultado-info" class="small text-muted">0 produtos encontrados</span>
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="picker-btn-anterior" disabled>←</button>
                <span id="picker-pagina-info" class="small text-muted">1/1</span>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="picker-btn-proxima" disabled>→</button>
              </div>
            </div>

            <!-- Tabela de produtos -->
            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
              <table class="table table-hover table-sm align-middle mb-0">
                <thead class="table-light sticky-top">
                  <tr>
                    <th style="width: 80px;">Código</th>
                    <th>Nome</th>
                    <th style="width: 80px;">Unidade</th>
                    <th style="width: 100px;" class="text-end">Preço</th>
                    <th style="width: 80px;" class="text-center">Estoque</th>
                    <th style="width: 60px;"></th>
                  </tr>
                </thead>
                <tbody id="picker-produtos-lista"></tbody>
              </table>
            </div>

            <!-- Vazio -->
            <div id="picker-vazio" class="text-center py-4 d-none">
              <span style="font-size: 2rem;">📭</span>
              <p class="text-muted mt-2 mb-0">Nenhum produto encontrado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this._bindEvents();
  },

  /**
   * Bindagem de eventos internos do modal.
   */
  _bindEvents() {
    const buscaInput = document.getElementById("picker-busca");
    const btnLimpar = document.getElementById("picker-limpar-busca");
    const btnAnterior = document.getElementById("picker-btn-anterior");
    const btnProxima = document.getElementById("picker-btn-proxima");

    buscaInput.addEventListener("input", () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._currentPage = 1;
        this._filtrar();
        this._renderizar();
      }, 250);
    });

    btnLimpar.addEventListener("click", () => {
      buscaInput.value = "";
      this._currentPage = 1;
      this._filtrar();
      this._renderizar();
      buscaInput.focus();
    });

    btnAnterior.addEventListener("click", () => {
      if (this._currentPage > 1) {
        this._currentPage--;
        this._renderizar();
      }
    });

    btnProxima.addEventListener("click", () => {
      const totalPages = Math.ceil(this._filteredData.length / this.PAGE_SIZE);
      if (this._currentPage < totalPages) {
        this._currentPage++;
        this._renderizar();
      }
    });

    // Focus no campo de busca ao abrir
    document.getElementById("modal-product-picker").addEventListener("shown.bs.modal", () => {
      buscaInput.focus();
    });
  },

  /**
   * Abre o modal de seleção de produto.
   * @param {Function} onSelect - Callback chamado com o produto selecionado: onSelect(produto)
   */
  abrir(onSelect) {
    this.init();
    this._onSelectCallback = onSelect;
    this._currentPage = 1;

    // Limpa busca anterior
    document.getElementById("picker-busca").value = "";
    this._filtrar();
    this._renderizar();

    // Abre modal
    const modalEl = document.getElementById("modal-product-picker");
    this._modalInstance = new bootstrap.Modal(modalEl);
    this._modalInstance.show();
  },

  /**
   * Filtra produtos baseado no termo de busca.
   */
  _filtrar() {
    const termo = (document.getElementById("picker-busca")?.value || "").toLowerCase().trim();
    let produtos = window.ProdutosStorage ? ProdutosStorage.buscarTodos() : [];

    if (termo) {
      produtos = produtos.filter((p) =>
        (p.nome || "").toLowerCase().includes(termo) ||
        (p.codigo || "").toLowerCase().includes(termo) ||
        (p.descricao || "").toLowerCase().includes(termo) ||
        (p.categoria || "").toLowerCase().includes(termo)
      );
    }

    // Ordena por nome
    produtos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    this._filteredData = produtos;
  },

  /**
   * Renderiza a lista paginada de produtos.
   */
  _renderizar() {
    const tbody = document.getElementById("picker-produtos-lista");
    const vazioEl = document.getElementById("picker-vazio");
    const infoEl = document.getElementById("picker-resultado-info");
    const paginaEl = document.getElementById("picker-pagina-info");
    const btnAnterior = document.getElementById("picker-btn-anterior");
    const btnProxima = document.getElementById("picker-btn-proxima");

    const total = this._filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / this.PAGE_SIZE));

    if (this._currentPage > totalPages) this._currentPage = totalPages;

    const inicio = (this._currentPage - 1) * this.PAGE_SIZE;
    const fim = Math.min(inicio + this.PAGE_SIZE, total);
    const pagina = this._filteredData.slice(inicio, fim);

    // Info
    infoEl.textContent = `${total} produto${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`;
    paginaEl.textContent = `${this._currentPage}/${totalPages}`;
    btnAnterior.disabled = this._currentPage <= 1;
    btnProxima.disabled = this._currentPage >= totalPages;

    if (total === 0) {
      tbody.innerHTML = "";
      vazioEl.classList.remove("d-none");
      return;
    }
    vazioEl.classList.add("d-none");

    const _fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    tbody.innerHTML = pagina.map((p) => {
      const estoque = window.EstoqueStorage ? EstoqueStorage.obterQuantidadeTotal(p.id) : (p.estoque || 0);
      const estoqueBadge = estoque === 0
        ? '<span class="badge bg-danger">0</span>'
        : estoque <= 5
          ? `<span class="badge bg-warning text-dark">${estoque}</span>`
          : `<span class="badge bg-success">${estoque}</span>`;

      return `
        <tr class="picker-row" data-produto-id="${p.id}" style="cursor:pointer;" 
            onclick="ProductPickerModal._selecionar('${p.id}')">
          <td class="small text-muted fw-bold">${p.codigo || "—"}</td>
          <td>
            <div class="fw-semibold">${p.nome}</div>
            ${p.descricao ? `<div class="small text-muted text-truncate" style="max-width:250px;">${p.descricao}</div>` : ""}
          </td>
          <td class="text-center small">${p.unidade || "un"}</td>
          <td class="text-end fw-bold text-success">${_fmt(p.preco)}</td>
          <td class="text-center">${estoqueBadge}</td>
          <td class="text-center">
            <button type="button" class="btn btn-xs btn-primary" title="Selecionar">✓</button>
          </td>
        </tr>`;
    }).join("");
  },

  /**
   * Callback interno: produto foi selecionado.
   * @param {string} produtoId
   */
  _selecionar(produtoId) {
    const produto = this._filteredData.find((p) => p.id === produtoId);
    if (!produto) return;

    // Fecha o modal
    if (this._modalInstance) {
      this._modalInstance.hide();
    }

    // Chama callback
    if (this._onSelectCallback) {
      this._onSelectCallback(produto);
    }
  },
};

window.ProductPickerModal = ProductPickerModal;
