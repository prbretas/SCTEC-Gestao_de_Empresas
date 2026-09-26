/**
 * filiais.js — Gestão de Empresas/Filiais vinculadas ao grupo (#143)
 * Admin cadastra filiais na tela de configurações. Cada filial pode ser
 * vinculada a endereços de estoque existentes e a usuários específicos.
 * Storage: SCTEC_FILIAIS_{orgId}
 */

const FILIAIS_KEY_PREFIX = "SCTEC_FILIAIS_";

const FiliaisStorage = {
  /**
   * Retorna a chave de storage para as filiais da organização atual.
   * @returns {string}
   */
  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao) return `${FILIAIS_KEY_PREFIX}${sessao.orgId || sessao.id}`;
    }
    return `${FILIAIS_KEY_PREFIX}local`;
  },

  /**
   * Retorna todas as filiais da organização.
   * @returns {Array}
   */
  buscarTodos() {
    try {
      return JSON.parse(localStorage.getItem(this._obterChave()) || "[]");
    } catch {
      return [];
    }
  },

  /**
   * Busca uma filial pelo ID.
   * @param {string} id
   * @returns {Object|null}
   */
  buscarPorId(id) {
    return this.buscarTodos().find((f) => f.id === id) || null;
  },

  /**
   * Persiste a lista completa de filiais.
   * @param {Array} lista
   */
  salvarTodos(lista) {
    localStorage.setItem(this._obterChave(), JSON.stringify(lista));
  },

  /**
   * Adiciona uma nova filial.
   * @param {Object} filial - { nome, cnpj?, enderecosEstoque?: string[] }
   * @returns {{ok: boolean, filial?: Object, erro?: string}}
   */
  adicionar(filial) {
    const nome = (filial.nome || "").trim();
    if (!nome || nome.length < 2) {
      return { ok: false, erro: "O nome da filial deve ter pelo menos 2 caracteres." };
    }
    const lista = this.buscarTodos();
    if (lista.some((f) => f.nome.trim().toLowerCase() === nome.toLowerCase())) {
      return { ok: false, erro: `A filial "${nome}" já existe.` };
    }
    const nova = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      nome,
      cnpj: (filial.cnpj || "").trim(),
      enderecosEstoque: Array.isArray(filial.enderecosEstoque) ? filial.enderecosEstoque : [],
      criadoEm: new Date().toISOString(),
    };
    lista.push(nova);
    this.salvarTodos(lista);
    return { ok: true, filial: nova };
  },

  /**
   * Atualiza uma filial existente.
   * @param {string} id
   * @param {Object} dados - campos a atualizar
   * @returns {{ok: boolean, erro?: string}}
   */
  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((f) => f.id === id);
    if (idx === -1) return { ok: false, erro: "Filial não encontrada." };

    if (dados.nome !== undefined) {
      const nome = (dados.nome || "").trim();
      if (!nome || nome.length < 2) {
        return { ok: false, erro: "O nome da filial deve ter pelo menos 2 caracteres." };
      }
      if (lista.some((f) => f.id !== id && f.nome.trim().toLowerCase() === nome.toLowerCase())) {
        return { ok: false, erro: `A filial "${nome}" já existe.` };
      }
    }

    lista[idx] = {
      ...lista[idx],
      ...dados,
      id,
      enderecosEstoque: Array.isArray(dados.enderecosEstoque)
        ? dados.enderecosEstoque
        : lista[idx].enderecosEstoque || [],
      atualizadoEm: new Date().toISOString(),
    };
    this.salvarTodos(lista);
    return { ok: true };
  },

  /**
   * Remove uma filial. Falha se houver usuários vinculados a ela.
   * @param {string} id
   * @returns {{ok: boolean, erro?: string}}
   */
  excluir(id) {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      const vinculados = AuthService.obterUsuarios().filter(
        (u) => (!sessao || u.orgId === sessao.orgId) && u.filialId === id
      );
      if (vinculados.length > 0) {
        return {
          ok: false,
          erro: `Não é possível excluir: ${vinculados.length} usuário(s) vinculado(s) a esta filial.`,
        };
      }
    }
    const lista = this.buscarTodos();
    const novos = lista.filter((f) => f.id !== id);
    if (novos.length === lista.length) return { ok: false, erro: "Filial não encontrada." };
    this.salvarTodos(novos);
    return { ok: true };
  },

  /**
   * Vincula (ou desvincula) um usuário a uma filial.
   * @param {string} userId
   * @param {string|null} filialId - null para desvincular
   * @returns {{ok: boolean, erro?: string}}
   */
  vincularUsuario(userId, filialId) {
    if (!window.AuthService) return { ok: false, erro: "AuthService não disponível." };
    const usuarios = AuthService.obterUsuarios();
    const idx = usuarios.findIndex((u) => u.id === userId);
    if (idx === -1) return { ok: false, erro: "Usuário não encontrado." };

    if (filialId) {
      const filial = this.buscarPorId(filialId);
      if (!filial) return { ok: false, erro: "Filial não encontrada." };
    }

    usuarios[idx].filialId = filialId || null;
    AuthService.salvarUsuarios(usuarios);
    return { ok: true };
  },
};

window.FiliaisStorage = FiliaisStorage;
