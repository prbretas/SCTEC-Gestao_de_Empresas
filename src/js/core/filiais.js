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
      // #164 — Endereço principal (postal) da empresa/filial (distinto dos endereços de estoque)
      endereco: {
        logradouro: (filial.endereco?.logradouro || "").trim(),
        numero: (filial.endereco?.numero || "").trim(),
        municipio: (filial.endereco?.municipio || "").trim(),
        uf: (filial.endereco?.uf || "").trim(),
        cep: (filial.endereco?.cep || "").trim(),
      },
      // Locais de estoque vinculados a esta filial (IDs em EnderecosStorage)
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
      // #164 — mescla o endereço postal preservando o existente quando não informado
      endereco: dados.endereco
        ? { ...(lista[idx].endereco || {}), ...dados.endereco }
        : (lista[idx].endereco || {}),
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

  // ─── Filial padrão e filial ativa (#172, #173) ─────────────────────────────

  /**
   * #172 — Garante que exista ao menos uma filial na organização.
   * Se não houver nenhuma, cria a "Filial 01" (idempotente). Requer sessão ativa.
   * @returns {Object|null} a filial padrão criada, ou null se já havia filiais
   */
  garantirFilialPadrao() {
    if (this.buscarTodos().length > 0) return null;
    const r = this.adicionar({ nome: "Filial 01" });
    return r.ok ? r.filial : null;
  },

  /**
   * #173 — Filiais que o usuário logado pode acessar.
   * Baseado nas filiais do papel (RolesController). Se o papel não tem restrição
   * (ou é admin/sem papel), retorna todas as filiais da organização.
   * @returns {Array<Object>}
   */
  filiaisDisponiveisParaUsuario() {
    const todas = this.buscarTodos();
    if (!window.AuthService) return todas;
    const sessao = AuthService.obterSessao();
    if (!sessao) return [];
    if (window.RolesController) {
      const ids = RolesController.obterFiliaisDoUsuario(sessao.id);
      if (Array.isArray(ids) && ids.length) {
        return todas.filter((f) => ids.includes(f.id));
      }
    }
    return todas; // sem restrição = todas
  },

  /** Chave de sessão da filial ativa, isolada por org. */
  _chaveFilialAtiva() {
    const orgId = this._obterOrgId();
    return `SCTEC_FILIAL_ATIVA_${orgId}`;
  },

  _obterOrgId() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return s.orgId || s.id;
    }
    return "local";
  },

  /**
   * #173 — Retorna o ID da filial ativa da sessão (ou null).
   * @returns {string|null}
   */
  obterFilialAtivaId() {
    try { return sessionStorage.getItem(this._chaveFilialAtiva()) || null; } catch { return null; }
  },

  /**
   * #173/#174 — Retorna a filial ativa (objeto) ou null.
   * @returns {Object|null}
   */
  obterFilialAtiva() {
    const id = this.obterFilialAtivaId();
    return id ? this.buscarPorId(id) : null;
  },

  /**
   * #173 — Define a filial ativa da sessão.
   * @param {string|null} filialId
   */
  definirFilialAtiva(filialId) {
    try {
      if (filialId) sessionStorage.setItem(this._chaveFilialAtiva(), filialId);
      else sessionStorage.removeItem(this._chaveFilialAtiva());
    } catch { /* sem sessionStorage */ }
  },

  /**
   * #173 — Garante que haja uma filial ativa coerente com as disponíveis.
   * Se a ativa atual for inválida/ausente e houver exatamente uma disponível,
   * seleciona-a automaticamente. Retorna a filial ativa resultante (ou null).
   * @returns {Object|null}
   */
  garantirFilialAtiva() {
    const disponiveis = this.filiaisDisponiveisParaUsuario();
    const atualId = this.obterFilialAtivaId();
    const aindaValida = atualId && disponiveis.some((f) => f.id === atualId);
    if (aindaValida) return this.buscarPorId(atualId);
    if (disponiveis.length === 1) {
      this.definirFilialAtiva(disponiveis[0].id);
      return disponiveis[0];
    }
    if (!disponiveis.length) this.definirFilialAtiva(null);
    return this.obterFilialAtiva();
  },
};

window.FiliaisStorage = FiliaisStorage;
