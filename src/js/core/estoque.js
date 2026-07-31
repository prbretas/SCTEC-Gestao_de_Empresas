/**
 * estoque.js — Storage e lógica de Estoque separado de Produtos (#114)
 *
 * Modelo:
 * - Produto = cadastro (nome, código, preço, categoria, unidade)
 * - Estoque = posição de estoque (produtoId + endereço + quantidade)
 * - Movimentação = registro histórico de entrada/saída/transferência
 *
 * Storage: SCTEC_ESTOQUE_{orgId}, SCTEC_ESTOQUE_MOV_{orgId}, SCTEC_ENDERECOS_{orgId}
 */

function _obterIdentidadeEstoque() {
  if (window.AuthService) {
    const sessao = AuthService.obterSessao();
    if (sessao) return sessao.identidade || `${sessao.nome}#${sessao.id}`;
  }
  return "sistema";
}

// ─── Endereços de Armazenamento ─────────────────────────────────────────────

const EnderecosStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_ENDERECOS_${s.orgId || s.id}`;
    }
    return "SCTEC_ENDERECOS_local";
  },
  buscarTodos() {
    try {
      const dados = JSON.parse(localStorage.getItem(this._obterChave()) || "[]");
      // Garante que endereço padrão sempre exista
      if (dados.length === 0) {
        const padrao = {
          id: "end_geral",
          nome: "Geral",
          descricao: "Endereço padrão",
          instalacao: "",
          galpao: "",
          corredor: "",
          estante: "",
          coluna: "",
          posicao: "",
          andar: "",
        };
        dados.push(padrao);
        this.salvarTodos(dados);
      }
      return dados;
    } catch { return [{ id: "end_geral", nome: "Geral", descricao: "Endereço padrão" }]; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },
  adicionar(endereco) {
    const lista = this.buscarTodos();
    endereco.id = "end_" + Date.now().toString();
    // Gera nome automático a partir da hierarquia se não informado
    if (!endereco.nome) {
      const partes = [endereco.instalacao, endereco.galpao, endereco.corredor, endereco.estante, endereco.coluna, endereco.posicao].filter(Boolean);
      endereco.nome = partes.join(" › ") || "Endereço " + lista.length;
    }
    endereco.criadoEm = new Date().toISOString();
    lista.push(endereco);
    this.salvarTodos(lista);
    return endereco;
  },
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((e) => e.id === id);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], ...dados, id };
      if (!dados.nome) {
        const partes = [lista[idx].instalacao, lista[idx].galpao, lista[idx].corredor, lista[idx].estante, lista[idx].coluna, lista[idx].posicao].filter(Boolean);
        lista[idx].nome = partes.join(" › ") || lista[idx].nome;
      }
      this.salvarTodos(lista);
    }
  },
  excluir(id) {
    if (id === "end_geral") return; // Não pode remover o padrão
    this.salvarTodos(this.buscarTodos().filter((e) => e.id !== id));
  },
  /**
   * Busca endereços por instalação.
   * @param {string} instalacao
   * @returns {Array}
   */
  buscarPorInstalacao(instalacao) {
    return this.buscarTodos().filter((e) => e.instalacao === instalacao);
  },
  /**
   * Retorna lista de instalações únicas.
   * @returns {Array<string>}
   */
  listarInstalacoes() {
    const enderecos = this.buscarTodos();
    return [...new Set(enderecos.map((e) => e.instalacao).filter(Boolean))];
  },
  /**
   * Formata o endereço completo como string legível.
   * @param {Object} endereco
   * @returns {string}
   */
  formatarEndereco(endereco) {
    if (!endereco) return "—";
    const partes = [];
    if (endereco.instalacao) partes.push(`🏭 ${endereco.instalacao}`);
    if (endereco.galpao) partes.push(`🏗️ ${endereco.galpao}`);
    if (endereco.andar) partes.push(`🔢 Andar ${endereco.andar}`);
    if (endereco.corredor) partes.push(`↔️ Corredor ${endereco.corredor}`);
    if (endereco.estante) partes.push(`📚 Estante ${endereco.estante}`);
    if (endereco.coluna) partes.push(`▪️ Col. ${endereco.coluna}`);
    if (endereco.posicao) partes.push(`📍 Pos. ${endereco.posicao}`);
    return partes.length > 0 ? partes.join(" • ") : endereco.nome || "—";
  },
};

// ─── Posições de Estoque ────────────────────────────────────────────────────

const EstoqueStorage = {
  _obterChave() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return `SCTEC_ESTOQUE_${s.orgId || s.id}`;
    }
    return "SCTEC_ESTOQUE_local";
  },
  _obterChaveMov() {
    return this._obterChave() + "_MOV";
  },
  buscarTodos() {
    try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); } catch { return []; }
  },
  salvarTodos(lista) { localStorage.setItem(this._obterChave(), JSON.stringify(lista)); },

  /**
   * Busca posições de estoque de um produto (em todos os endereços).
   * @param {string} produtoId
   * @returns {Array}
   */
  buscarPorProduto(produtoId) {
    return this.buscarTodos().filter((e) => e.produtoId === produtoId);
  },

  /**
   * Busca posições de estoque de um endereço.
   * @param {string} enderecoId
   * @returns {Array}
   */
  buscarPorEndereco(enderecoId) {
    return this.buscarTodos().filter((e) => e.enderecoId === enderecoId);
  },

  /**
   * Retorna a quantidade total consolidada de um produto (soma todos os endereços).
   * @param {string} produtoId
   * @returns {number}
   */
  obterQuantidadeTotal(produtoId) {
    return this.buscarPorProduto(produtoId).reduce((s, e) => s + (e.quantidade || 0), 0);
  },

  /**
   * Retorna ou cria uma posição de estoque para produto+endereço.
   * @param {string} produtoId
   * @param {string} enderecoId
   * @returns {Object}
   */
  obterOuCriarPosicao(produtoId, enderecoId) {
    const lista = this.buscarTodos();
    let posicao = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoId);
    if (!posicao) {
      posicao = {
        id: "est_" + Date.now().toString(),
        produtoId,
        enderecoId,
        quantidade: 0,
        estoqueMin: 5,
      };
      lista.push(posicao);
      this.salvarTodos(lista);
    }
    return posicao;
  },

  /**
   * Atualiza a quantidade de uma posição de estoque.
   * @param {string} posicaoId
   * @param {number} novaQuantidade
   */
  atualizarQuantidade(posicaoId, novaQuantidade) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((e) => e.id === posicaoId);
    if (idx !== -1) {
      lista[idx].quantidade = novaQuantidade;
      lista[idx].ultimaMovimentacao = new Date().toISOString();
      this.salvarTodos(lista);
    }
  },

  /**
   * Atualiza estoque mínimo de uma posição.
   */
  atualizarEstoqueMin(posicaoId, estoqueMin) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((e) => e.id === posicaoId);
    if (idx !== -1) {
      lista[idx].estoqueMin = estoqueMin;
      this.salvarTodos(lista);
    }
  },

  /**
   * Realiza movimentação de estoque (entrada ou saída).
   * @param {Object} params - { produtoId, enderecoId, tipo, quantidade, motivo }
   * @returns {{ sucesso: boolean, mensagem: string }}
   */
  movimentar({ produtoId, enderecoId, tipo, quantidade, motivo }) {
    const posicao = this.obterOuCriarPosicao(produtoId, enderecoId || "end_geral");
    const qtdAtual = posicao.quantidade || 0;
    let novaQtd;

    if (tipo === "entrada") {
      novaQtd = qtdAtual + quantidade;
    } else if (tipo === "saida") {
      if (quantidade > qtdAtual) {
        return { sucesso: false, mensagem: `Estoque insuficiente. Atual: ${qtdAtual}, Solicitado: ${quantidade}` };
      }
      novaQtd = qtdAtual - quantidade;
    } else {
      return { sucesso: false, mensagem: "Tipo de movimentação inválido." };
    }

    this.atualizarQuantidade(posicao.id, novaQtd);

    // Registra movimentação no histórico
    this.registrarMovimentacao({
      produtoId,
      estoqueId: posicao.id,
      enderecoId: enderecoId || "end_geral",
      tipo,
      quantidade,
      estoqueAnterior: qtdAtual,
      estoqueNovo: novaQtd,
      motivo: motivo || "",
    });

    return { sucesso: true, mensagem: `Movimentação realizada. Novo estoque: ${novaQtd}` };
  },

  /**
   * Realiza transferência entre endereços.
   * Faz toda a operação numa única leitura/escrita para evitar race conditions.
   * @param {Object} params - { produtoId, enderecoOrigem, enderecoDestino, quantidade, motivo }
   * @returns {{ sucesso: boolean, mensagem: string }}
   */
  transferir({ produtoId, enderecoOrigem, enderecoDestino, quantidade, motivo }) {
    if (enderecoOrigem === enderecoDestino) {
      return { sucesso: false, mensagem: "Endereço de origem e destino são iguais." };
    }

    // Lê a lista UMA vez
    const lista = this.buscarTodos();

    // Encontra ou cria posição de origem
    let posOrigem = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoOrigem);
    if (!posOrigem) {
      posOrigem = { id: "est_" + Date.now().toString(), produtoId, enderecoId: enderecoOrigem, quantidade: 0, estoqueMin: 5 };
      lista.push(posOrigem);
    }

    if ((posOrigem.quantidade || 0) < quantidade) {
      return { sucesso: false, mensagem: `Estoque insuficiente na origem. Atual: ${posOrigem.quantidade}` };
    }

    // Encontra ou cria posição de destino
    let posDestino = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoDestino);
    if (!posDestino) {
      posDestino = { id: "est_" + (Date.now() + 1).toString(), produtoId, enderecoId: enderecoDestino, quantidade: 0, estoqueMin: 5 };
      lista.push(posDestino);
    }

    const qtdOrigem = posOrigem.quantidade;
    const qtdDestino = posDestino.quantidade || 0;

    // Atualiza ambos na mesma lista em memória
    posOrigem.quantidade = qtdOrigem - quantidade;
    posOrigem.ultimaMovimentacao = new Date().toISOString();
    posDestino.quantidade = qtdDestino + quantidade;
    posDestino.ultimaMovimentacao = new Date().toISOString();

    // Salva UMA vez
    this.salvarTodos(lista);

    this.registrarMovimentacao({
      produtoId,
      estoqueId: posOrigem.id,
      enderecoId: enderecoOrigem,
      enderecoDestino,
      tipo: "transferencia",
      quantidade,
      estoqueAnterior: qtdOrigem,
      estoqueNovo: qtdOrigem - quantidade,
      motivo: motivo || `Transferência para ${enderecoDestino}`,
    });

    return { sucesso: true, mensagem: `Transferência realizada. Origem: ${qtdOrigem - quantidade}, Destino: ${qtdDestino + quantidade}` };
  },

  // ─── Histórico de Movimentações ─────────────────────────────────────────

  buscarMovimentacoes(produtoId) {
    try {
      const todas = JSON.parse(localStorage.getItem(this._obterChaveMov()) || "[]");
      return produtoId ? todas.filter((m) => m.produtoId === produtoId) : todas;
    } catch { return []; }
  },

  registrarMovimentacao(mov) {
    try {
      const todas = JSON.parse(localStorage.getItem(this._obterChaveMov()) || "[]");
      mov.id = "mov_" + Date.now().toString();
      mov.data = new Date().toISOString();
      mov.usuario = _obterIdentidadeEstoque();
      todas.push(mov);
      localStorage.setItem(this._obterChaveMov(), JSON.stringify(todas));
    } catch {}
  },

  // ─── Migração de dados antigos ──────────────────────────────────────────

  /**
   * Migra dados de produtos que tinham campo 'estoque' para o novo modelo.
   * Chamado uma vez no init da página.
   */
  migrarDadosAntigos() {
    if (!window.ProdutosStorage) return;
    const produtos = ProdutosStorage.buscarTodos();
    const posicoes = this.buscarTodos();
    let migrou = false;

    produtos.forEach((p) => {
      if (typeof p.estoque === "number" && p.estoque > 0) {
        // Verifica se já existe posição para este produto
        const jaExiste = posicoes.some((pos) => pos.produtoId === p.id);
        if (!jaExiste) {
          const posicao = {
            id: "est_mig_" + p.id,
            produtoId: p.id,
            enderecoId: "end_geral",
            quantidade: p.estoque,
            estoqueMin: p.estoqueMin || 5,
            ultimaMovimentacao: new Date().toISOString(),
          };
          posicoes.push(posicao);
          migrou = true;
        }
      }
    });

    if (migrou) {
      this.salvarTodos(posicoes);
    }
  },
};

window.EstoqueStorage = EstoqueStorage;
window.EnderecosStorage = EnderecosStorage;
