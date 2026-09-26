/**
 * roles.js — Gerenciamento de Papéis de Trabalho por Organização (#41, #51)
 * Permite ao Admin criar, editar e excluir papéis de trabalho.
 * Cada usuário tem exatamente um papel. Papel com usuários vinculados não pode ser excluído.
 * Cada papel define quais módulos seus membros podem acessar (modulosPermitidos).
 * Chave de storage: SCTEC_ROLES_{orgId}
 */

const ROLES_KEY_PREFIX = "SCTEC_ROLES_";

/**
 * Níveis hierárquicos dos papéis de trabalho (#142).
 * Menor número = maior hierarquia. Um usuário vê registros do seu nível e abaixo.
 */
const NIVEIS_HIERARQUICOS = [
  { nivel: 1, label: "Diretor" },
  { nivel: 2, label: "Gerente" },
  { nivel: 3, label: "Coordenador" },
  { nivel: 4, label: "Funcionário" },
  { nivel: 5, label: "Externo" },
];
const NIVEL_PADRAO = 4; // Funcionário (menor visibilidade por padrão)

const RolesController = {

  // ─── Storage ──────────────────────────────────────────────────────────────

  /**
   * Retorna a chave de storage para os papéis da organização.
   * @param {string} orgId
   * @returns {string}
   */
  _chave(orgId) {
    return `${ROLES_KEY_PREFIX}${orgId}`;
  },

  /**
   * Retorna todos os papéis de uma organização.
   * @param {string} orgId
   * @returns {Array}
   */
  obterPorOrg(orgId) {
    try {
      return JSON.parse(localStorage.getItem(this._chave(orgId)) || "[]");
    } catch {
      return [];
    }
  },

  /**
   * Persiste os papéis de uma organização.
   * @param {string} orgId
   * @param {Array} papeis
   */
  salvar(orgId, papeis) {
    localStorage.setItem(this._chave(orgId), JSON.stringify(papeis));
  },

  /**
   * Retorna os papéis da organização do usuário logado.
   * @returns {Array}
   */
  obterDaOrgAtual() {
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    if (!sessao || !sessao.orgId) return [];
    return this.obterPorOrg(sessao.orgId);
  },

  /**
   * Busca um papel pelo ID dentro de uma organização.
   * @param {string} orgId
   * @param {string} papelId
   * @returns {Object|null}
   */
  buscarPorId(orgId, papelId) {
    return this.obterPorOrg(orgId).find((p) => p.id === papelId) || null;
  },

  // ─── Geração de ID e Código de Convite ───────────────────────────────────

  /**
   * Gera um ID único para o papel dentro da organização.
   * @param {string} orgId
   * @returns {string}
   */
  _gerarId(orgId) {
    const papeis = this.obterPorOrg(orgId);
    const existentes = new Set(papeis.map((p) => p.id));
    let id;
    do {
      id = String(Math.floor(10000 + Math.random() * 90000));
    } while (existentes.has(id));
    return id;
  },

  /**
   * Gera um código de convite específico para um papel.
   * Formato: {codigoBase}-{sufixoNumerico}
   * Ex: SCTEC-ORG-12345-01
   * @param {string} codigoBaseOrg - código de convite da organização
   * @param {string} orgId
   * @returns {string}
   */
  _gerarCodigoConvitePapel(codigoBaseOrg, orgId) {
    const papeis = this.obterPorOrg(orgId);
    const existentes = new Set(papeis.map((p) => p.codigoConvite));
    let codigo;
    let sufixo = papeis.length + 1;
    do {
      codigo = `${codigoBaseOrg}-${String(sufixo).padStart(2, "0")}`;
      sufixo++;
    } while (existentes.has(codigo));
    return codigo;
  },

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Cria um novo papel de trabalho.
   * @param {string} orgId
   * @param {string} nome - nome do papel (ex: "Vendedor", "Analista")
   * @param {string} codigoBaseOrg - código de convite base da organização
   * @returns {{ok: boolean, papel?: Object, erro?: string}}
   */
  criar(orgId, nome, codigoBaseOrg) {
    nome = (nome || "").trim();
    if (!nome || nome.length < 2) {
      return { ok: false, erro: "O nome do papel deve ter pelo menos 2 caracteres." };
    }
    if (nome.length > 40) {
      return { ok: false, erro: "O nome do papel pode ter no máximo 40 caracteres." };
    }

    const papeis = this.obterPorOrg(orgId);
    const nomeNorm = nome.toLowerCase();
    if (papeis.some((p) => p.nome.toLowerCase() === nomeNorm)) {
      return { ok: false, erro: `O papel "${nome}" já existe nesta organização.` };
    }

    const novoPapel = {
      id: this._gerarId(orgId),
      nome,
      codigoConvite: this._gerarCodigoConvitePapel(codigoBaseOrg, orgId),
      modulosPermitidos: null, // null = todos os módulos ativos não-adminOnly (fallback)
      podeVerTodos: false,     // false = usuário vê apenas seus próprios registros
      nivel: NIVEL_PADRAO,     // #142 — nível hierárquico (1 = mais alto)
      dataCriacao: new Date().toISOString(),
    };

    papeis.push(novoPapel);
    this.salvar(orgId, papeis);
    return { ok: true, papel: novoPapel };
  },

  /**
   * Edita o nome de um papel existente.
   * @param {string} orgId
   * @param {string} papelId
   * @param {string} novoNome
   * @returns {{ok: boolean, erro?: string}}
   */
  editar(orgId, papelId, novoNome) {
    novoNome = (novoNome || "").trim();
    if (!novoNome || novoNome.length < 2) {
      return { ok: false, erro: "O nome do papel deve ter pelo menos 2 caracteres." };
    }
    if (novoNome.length > 40) {
      return { ok: false, erro: "O nome do papel pode ter no máximo 40 caracteres." };
    }

    const papeis = this.obterPorOrg(orgId);
    const idx = papeis.findIndex((p) => p.id === papelId);
    if (idx === -1) return { ok: false, erro: "Papel não encontrado." };

    const nomeNorm = novoNome.toLowerCase();
    if (papeis.some((p) => p.id !== papelId && p.nome.toLowerCase() === nomeNorm)) {
      return { ok: false, erro: `O papel "${novoNome}" já existe nesta organização.` };
    }

    papeis[idx].nome = novoNome;
    this.salvar(orgId, papeis);
    return { ok: true };
  },

  /**
   * Remove um papel. Falha se houver usuários vinculados.
   * @param {string} orgId
   * @param {string} papelId
   * @returns {{ok: boolean, erro?: string}}
   */
  remover(orgId, papelId) {
    // Verifica se há usuários vinculados ao papel
    if (window.AuthService) {
      const usuarios = AuthService.obterUsuarios();
      const vinculados = usuarios.filter(
        (u) => u.orgId === orgId && u.papelId === papelId
      );
      if (vinculados.length > 0) {
        return {
          ok: false,
          erro: `Não é possível excluir: ${vinculados.length} usuário(s) está(ão) vinculado(s) a este papel.`,
        };
      }
    }

    const papeis = this.obterPorOrg(orgId);
    const novos = papeis.filter((p) => p.id !== papelId);
    if (novos.length === papeis.length) return { ok: false, erro: "Papel não encontrado." };

    this.salvar(orgId, novos);
    return { ok: true };
  },

  // ─── Consultas ────────────────────────────────────────────────────────────

  /**
   * Retorna os usuários da organização agrupados por papel.
   * @param {string} orgId
   * @returns {Object} { papelId: [usuários], "__sem_papel__": [usuários] }
   */
  obterUsuariosPorPapel(orgId) {
    const resultado = { __sem_papel__: [] };
    const papeis = this.obterPorOrg(orgId);
    papeis.forEach((p) => { resultado[p.id] = []; });

    if (window.AuthService) {
      const usuarios = AuthService.obterUsuarios().filter((u) => u.orgId === orgId);
      usuarios.forEach((u) => {
        if (u.papelId && resultado[u.papelId] !== undefined) {
          resultado[u.papelId].push(u);
        } else {
          resultado.__sem_papel__.push(u);
        }
      });
    }

    return resultado;
  },

  /**
   * Conta quantos usuários da organização estão vinculados a um papel.
   * @param {string} orgId
   * @param {string} papelId
   * @returns {number}
   */
  contarUsuariosPorPapel(orgId, papelId) {
    if (!window.AuthService) return 0;
    return AuthService.obterUsuarios().filter(
      (u) => u.orgId === orgId && u.papelId === papelId
    ).length;
  },

  /**
   * Atribui um papel a um usuário.
   * @param {string} userId
   * @param {string|null} papelId - null para remover papel
   * @returns {{ok: boolean, erro?: string}}
   */
  atribuirPapel(userId, papelId) {
    if (!window.AuthService) return { ok: false, erro: "AuthService não disponível." };

    const usuarios = AuthService.obterUsuarios();
    const idx = usuarios.findIndex((u) => u.id === userId);
    if (idx === -1) return { ok: false, erro: "Usuário não encontrado." };

    // Valida que o papel pertence à organização do usuário
    if (papelId !== null) {
      const papel = this.buscarPorId(usuarios[idx].orgId, papelId);
      if (!papel) return { ok: false, erro: "Papel não encontrado na organização." };
    }

    usuarios[idx].papelId = papelId || null;
    AuthService.salvarUsuarios(usuarios);
    return { ok: true };
  },

  /**
   * Retorna o papel de trabalho de um usuário pelo ID.
   * @param {string} userId
   * @returns {Object|null}
   */
  obterPapelDoUsuario(userId) {
    if (!window.AuthService) return null;
    const usuario = AuthService.buscarPorId(userId);
    if (!usuario || !usuario.papelId) return null;
    return this.buscarPorId(usuario.orgId, usuario.papelId);
  },

  // ─── Permissões de Módulos ────────────────────────────────────────────────

  /**
   * Retorna os IDs dos módulos permitidos para um papel.
   * Se `modulosPermitidos` for null, retorna null (significando "todos").
   * @param {string} orgId
   * @param {string} papelId
   * @returns {Array<string>|null} array de IDs ou null (todos)
   */
  obterModulosPermitidos(orgId, papelId) {
    const papel = this.buscarPorId(orgId, papelId);
    if (!papel) return null;
    return papel.modulosPermitidos || null; // null = todos (fallback)
  },

  /**
   * Define os módulos permitidos para um papel.
   * @param {string} orgId
   * @param {string} papelId
   * @param {Array<string>} moduloIds - array de IDs de módulos permitidos
   * @returns {{ok: boolean, erro?: string}}
   */
  definirModulos(orgId, papelId, moduloIds) {
    const papeis = this.obterPorOrg(orgId);
    const idx = papeis.findIndex((p) => p.id === papelId);
    if (idx === -1) return { ok: false, erro: "Papel não encontrado." };

    papeis[idx].modulosPermitidos = Array.isArray(moduloIds) ? moduloIds : null;
    this.salvar(orgId, papeis);
    return { ok: true };
  },

  /**
   * Verifica se um papel tem acesso a um módulo específico.
   * Admin sempre tem acesso. Papel sem modulosPermitidos (null) tem acesso a todos.
   * @param {string} orgId
   * @param {string} papelId
   * @param {string} moduleId
   * @returns {boolean}
   */
  podeAcessarModulo(orgId, papelId, moduleId) {
    const permitidos = this.obterModulosPermitidos(orgId, papelId);
    if (permitidos === null) return true; // fallback: acesso total
    return permitidos.includes(moduleId);
  },

  // ─── Visibilidade de Registros ────────────────────────────────────────────

  /**
   * Define a flag podeVerTodos de um papel.
   * @param {string} orgId
   * @param {string} papelId
   * @param {boolean} valor
   * @returns {{ok: boolean, erro?: string}}
   */
  setPodeVerTodos(orgId, papelId, valor) {
    const papeis = this.obterPorOrg(orgId);
    const idx = papeis.findIndex((p) => p.id === papelId);
    if (idx === -1) return { ok: false, erro: "Papel não encontrado." };
    papeis[idx].podeVerTodos = Boolean(valor);
    this.salvar(orgId, papeis);
    return { ok: true };
  },

  // ─── Níveis Hierárquicos (#142) ─────────────────────────────────────────────

  /**
   * Define o nível hierárquico de um papel (1 = mais alto).
   * @param {string} orgId
   * @param {string} papelId
   * @param {number} nivel
   * @returns {{ok: boolean, erro?: string}}
   */
  definirNivel(orgId, papelId, nivel) {
    const n = parseInt(nivel, 10);
    const niveisValidos = NIVEIS_HIERARQUICOS.map((x) => x.nivel);
    if (!niveisValidos.includes(n)) {
      return { ok: false, erro: "Nível inválido." };
    }
    const papeis = this.obterPorOrg(orgId);
    const idx = papeis.findIndex((p) => p.id === papelId);
    if (idx === -1) return { ok: false, erro: "Papel não encontrado." };
    papeis[idx].nivel = n;
    this.salvar(orgId, papeis);
    return { ok: true };
  },

  /**
   * Retorna o nível hierárquico de um usuário pelo ID.
   * Admin = nível 1 (topo). Usuário sem papel/nível = NIVEL_PADRAO.
   * @param {string} userId
   * @returns {number}
   */
  obterNivelDoUsuario(userId) {
    if (!window.AuthService) return NIVEL_PADRAO;
    const usuario = AuthService.buscarPorId(userId);
    if (!usuario) return NIVEL_PADRAO;
    if (usuario.role === "admin") return 1;
    if (!usuario.papelId) return NIVEL_PADRAO;
    const papel = this.buscarPorId(usuario.orgId, usuario.papelId);
    return (papel && Number.isInteger(papel.nivel)) ? papel.nivel : NIVEL_PADRAO;
  },

  /**
   * Verifica se o usuário logado pode ver os registros de outros usuários.
   * Admin sempre pode. Papel com podeVerTodos: true pode.
   * @returns {boolean}
   */
  usuarioPodeVerTodos() {
    if (!window.AuthService) return false;
    const sessao = AuthService.obterSessao();
    if (!sessao) return false;
    if (sessao.role === "admin") return true;
    if (!sessao.papelId || !sessao.orgId) return false;
    const papel = this.buscarPorId(sessao.orgId, sessao.papelId);
    return papel?.podeVerTodos === true;
  },

  /**
   * Filtra uma lista de registros pela visibilidade do usuário logado (#142).
   *
   * Regras (em ordem):
   * - Admin e papéis com podeVerTodos: true veem tudo.
   * - Registros sem criadoPorId (legados) são visíveis para todos (compatibilidade).
   * - Sempre vê os próprios registros.
   * - Hierarquia: vê registros criados por usuários de nível estritamente
   *   abaixo do seu (nível do criador > nível do usuário logado; menor número
   *   = mais alto). Pares do mesmo nível não veem os registros um do outro.
   * - Filial: se o usuário logado tem filialId, só vê registros de criadores da
   *   mesma filial (criadores sem filial permanecem visíveis por compatibilidade).
   * @param {Array} registros
   * @returns {Array}
   */
  filtrarPorVisibilidade(registros) {
    if (this.usuarioPodeVerTodos()) return registros;
    if (!window.AuthService) return registros;
    const sessao = AuthService.obterSessao();
    if (!sessao) return [];

    const meuNivel = this.obterNivelDoUsuario(sessao.id);
    const usuario = AuthService.buscarPorId(sessao.id);
    const minhaFilial = usuario ? (usuario.filialId || null) : null;

    return registros.filter((r) => {
      if (!r.criadoPorId) return true;        // legado
      if (r.criadoPorId === sessao.id) return true; // sempre vê os próprios

      // Hierarquia: só vê registros de quem está estritamente abaixo do seu nível
      const nivelCriador = this.obterNivelDoUsuario(r.criadoPorId);
      if (nivelCriador <= meuNivel) return false;

      // Filial: se tenho filial, o criador deve ser da mesma (ou sem filial)
      if (minhaFilial) {
        const criador = AuthService.buscarPorId(r.criadoPorId);
        const filialCriador = criador ? (criador.filialId || null) : null;
        if (filialCriador && filialCriador !== minhaFilial) return false;
      }

      return true;
    });
  },
};

window.RolesController = RolesController;
window.NIVEIS_HIERARQUICOS = NIVEIS_HIERARQUICOS;
