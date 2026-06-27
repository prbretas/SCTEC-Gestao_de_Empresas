/**
 * auth.js — Módulo de Autenticação SCTEC
 * Gerencia usuários, sessão, hash de senha, roles e organizações.
 * Todas as senhas são armazenadas como SHA-256 (Web Crypto API nativa).
 */

const USERS_KEY = "SCTEC_USERS";
const SESSION_KEY = "SCTEC_SESSION";
const ORGS_KEY = "SCTEC_ORGS";

const AuthService = {

  // ─── Utilitários de Hash ────────────────────────────────────────────────

  /**
   * Gera hash SHA-256 de uma string usando Web Crypto API nativa.
   * @param {string} texto
   * @returns {Promise<string>} hex string do hash
   */
  async hashSenha(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  // ─── Gerenciamento de Organizações ─────────────────────────────────────

  /**
   * Retorna todas as organizações cadastradas.
   * @returns {Array}
   */
  obterOrgs() {
    try {
      return JSON.parse(localStorage.getItem(ORGS_KEY) || "[]");
    } catch {
      return [];
    }
  },

  salvarOrgs(orgs) {
    localStorage.setItem(ORGS_KEY, JSON.stringify(orgs));
  },

  /**
   * Busca uma organização pelo ID.
   * @param {string} orgId
   * @returns {Object|null}
   */
  buscarOrgPorId(orgId) {
    return this.obterOrgs().find((o) => o.id === orgId) || null;
  },

  /**
   * Busca uma organização pelo código de convite.
   * @param {string} codigo
   * @returns {Object|null}
   */
  buscarOrgPorCodigo(codigo) {
    return this.obterOrgs().find(
      (o) => o.codigoConvite === codigo.toUpperCase().trim()
    ) || null;
  },

  /**
   * Gera código de convite único no formato SCTEC-ORG-XXXXX.
   * @returns {string}
   */
  _gerarCodigoConvite() {
    const orgs = this.obterOrgs();
    const existentes = new Set(orgs.map((o) => o.codigoConvite));
    let codigo;
    do {
      codigo = `SCTEC-ORG-${String(Math.floor(10000 + Math.random() * 90000))}`;
    } while (existentes.has(codigo));
    return codigo;
  },

  /**
   * Cria uma nova organização com o usuário como Admin.
   * @param {string} adminId - ID do usuário criador
   * @param {string} nomeOrg - nome da organização (opcional)
   * @returns {Object} organização criada
   */
  criarOrganizacao(adminId, nomeOrg = "Minha Organização") {
    const orgs = this.obterOrgs();
    const novaOrg = {
      id: String(Math.floor(10000 + Math.random() * 90000)),
      nome: nomeOrg,
      adminId,
      codigoConvite: this._gerarCodigoConvite(),
      dataCriacao: new Date().toISOString(),
    };
    orgs.push(novaOrg);
    this.salvarOrgs(orgs);
    return novaOrg;
  },

  /**
   * Retorna o código de convite da organização do usuário logado.
   * @returns {string|null}
   */
  obterCodigoConvite() {
    const sessao = this.obterSessao();
    if (!sessao || !sessao.orgId) return null;
    const org = this.buscarOrgPorId(sessao.orgId);
    return org ? org.codigoConvite : null;
  },

  /**
   * Verifica se o usuário logado é Admin da sua organização.
   * @returns {boolean}
   */
  isAdmin() {
    const sessao = this.obterSessao();
    return sessao?.role === "admin";
  },

  /**
   * Guard de rota: redireciona para login se não há sessão.
   * Opcionalmente restringe a Admins.
   * @param {boolean} apenasAdmin
   */
  requireAuth(apenasAdmin = false) {
    const sessao = this.obterSessao();
    if (!sessao) {
      window.location.href = "login.html";
      return null;
    }
    if (apenasAdmin && sessao.role !== "admin") {
      alert("⛔ Acesso restrito. Apenas administradores podem acessar esta área.");
      window.location.href = "home.html";
      return null;
    }
    return sessao;
  },

  // ─── Gerenciamento de Usuários ──────────────────────────────────────────

  /**
   * Retorna todos os usuários cadastrados.
   * @returns {Array}
   */
  obterUsuarios() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  },

  /**
   * Persiste a lista de usuários.
   * @param {Array} usuarios
   */
  salvarUsuarios(usuarios) {
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
  },

  /**
   * Busca um usuário pelo nome (case-insensitive).
   * @param {string} nome
   * @returns {Object|null}
   */
  buscarPorNome(nome) {
    return this.obterUsuarios().find(
      (u) => u.nome.toLowerCase() === nome.toLowerCase().trim()
    ) || null;
  },

  /**
   * Busca um usuário pelo ID.
   * @param {string} id
   * @returns {Object|null}
   */
  buscarPorId(id) {
    return this.obterUsuarios().find((u) => u.id === id) || null;
  },

  /**
   * Gera um ID numérico aleatório de 5 dígitos único entre os usuários.
   * @returns {string}
   */
  gerarId() {
    const usuarios = this.obterUsuarios();
    const idsExistentes = new Set(usuarios.map((u) => u.id));
    let id;
    do {
      id = String(Math.floor(10000 + Math.random() * 90000));
    } while (idsExistentes.has(id));
    return id;
  },

  /**
   * Cadastra um novo usuário.
   * @param {string} nome - nickname do usuário
   * @param {string} senha
   * @param {string} perguntaSecreta
   * @param {string} respostaSecreta
   * @param {string} [codigoConvite] - se informado, vincula à organização existente
   * @returns {Promise<{ok: boolean, erro?: string, usuario?: Object, org?: Object}>}
   */
  async cadastrar(nome, senha, perguntaSecreta, respostaSecreta, codigoConvite = "") {
    nome = nome.trim();

    // Valida nickname: 3-20 chars, apenas letras, números e underline
    if (!nome || nome.length < 3) {
      return { ok: false, erro: "O nickname deve ter pelo menos 3 caracteres." };
    }
    if (nome.length > 20) {
      return { ok: false, erro: "O nickname pode ter no máximo 20 caracteres." };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(nome)) {
      return { ok: false, erro: "O nickname aceita apenas letras, números e underline (_). Sem espaços." };
    }
    if (!senha || senha.length < 4) {
      return { ok: false, erro: "A senha deve ter pelo menos 4 caracteres." };
    }
    if (!perguntaSecreta || !respostaSecreta) {
      return { ok: false, erro: "A pergunta e a resposta secreta são obrigatórias." };
    }
    if (this.buscarPorNome(nome)) {
      return { ok: false, erro: `Nickname "${nome}" já está em uso. Escolha outro.` };
    }

    // Resolve organização
    let orgId = null;
    let role = "user";
    let org = null;

    if (codigoConvite && codigoConvite.trim() !== "") {
      // Usuário sendo convidado — vincula à organização existente
      org = this.buscarOrgPorCodigo(codigoConvite);
      if (!org) {
        return { ok: false, erro: "Código de convite inválido. Verifique e tente novamente." };
      }
      orgId = org.id;
      role = "user";
    } else {
      // Primeiro usuário sem código — cria nova organização e torna-se Admin
      role = "admin";
      // orgId será definido após criar a org abaixo
    }

    const senhaHash = await this.hashSenha(senha);
    const respostaHash = await this.hashSenha(respostaSecreta.toLowerCase().trim());
    const id = this.gerarId();

    // Se for Admin sem org, cria a organização agora
    if (role === "admin") {
      org = this.criarOrganizacao(id);
      orgId = org.id;
    }

    const novoUsuario = {
      id,
      nome,
      senhaHash,
      perguntaSecreta,
      respostaHash,
      role,
      orgId,
      dataCadastro: new Date().toISOString(),
    };

    const usuarios = this.obterUsuarios();
    usuarios.push(novoUsuario);
    this.salvarUsuarios(usuarios);

    return { ok: true, usuario: novoUsuario, org };
  },

  /**
   * Realiza o login e cria a sessão.
   * @param {string} nome
   * @param {string} senha
   * @returns {Promise<{ok: boolean, erro?: string, usuario?: Object}>}
   */
  async login(nome, senha) {
    const usuario = this.buscarPorNome(nome);
    if (!usuario) {
      return { ok: false, erro: "Usuário não encontrado." };
    }

    const senhaHash = await this.hashSenha(senha);
    if (senhaHash !== usuario.senhaHash) {
      return { ok: false, erro: "Senha incorreta." };
    }

    // Cria sessão em sessionStorage (expira ao fechar o navegador)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      id: usuario.id,
      nome: usuario.nome,
      role: usuario.role || "user",
      orgId: usuario.orgId || null,
      identidade: `${usuario.nome}#${usuario.id}`,
      loginEm: new Date().toISOString(),
    }));

    return { ok: true, usuario };
  },

  /**
   * Encerra a sessão do usuário atual.
   */
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  },

  /**
   * Retorna o usuário da sessão atual, ou null.
   * @returns {Object|null}
   */
  obterSessao() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  },

  // ─── Recuperação de Senha ───────────────────────────────────────────────

  /**
   * Retorna a pergunta secreta de um usuário pelo nome.
   * @param {string} nome
   * @returns {string|null}
   */
  obterPerguntaSecreta(nome) {
    const usuario = this.buscarPorNome(nome);
    return usuario ? usuario.perguntaSecreta : null;
  },

  /**
   * Verifica a resposta secreta e redefine a senha se correta.
   * @param {string} nome
   * @param {string} resposta
   * @param {string} novaSenha
   * @returns {Promise<{ok: boolean, erro?: string}>}
   */
  async redefinirSenha(nome, resposta, novaSenha) {
    const usuarios = this.obterUsuarios();
    const idx = usuarios.findIndex(
      (u) => u.nome.toLowerCase() === nome.toLowerCase().trim()
    );

    if (idx === -1) {
      return { ok: false, erro: "Usuário não encontrado." };
    }

    const respostaHash = await this.hashSenha(resposta.toLowerCase().trim());
    if (respostaHash !== usuarios[idx].respostaHash) {
      return { ok: false, erro: "Resposta incorreta." };
    }

    if (!novaSenha || novaSenha.length < 4) {
      return { ok: false, erro: "A nova senha deve ter pelo menos 4 caracteres." };
    }

    usuarios[idx].senhaHash = await this.hashSenha(novaSenha);
    this.salvarUsuarios(usuarios);
    return { ok: true };
  },

  // ─── Storage Isolado por Organização ───────────────────────────────────

  /**
   * Retorna a chave de storage dos dados.
   * Se o usuário pertence a uma organização, usa a chave da org (dados compartilhados).
   * Caso contrário, usa a chave individual do usuário.
   * @returns {string|null}
   */
  obterChaveDados() {
    const sessao = this.obterSessao();
    if (!sessao) return null;
    // Dados compartilhados pela organização
    if (sessao.orgId) return `SCTEC_DATA_ORG_${sessao.orgId}`;
    // Fallback: dados individuais
    return `SCTEC_DATA_${sessao.id}`;
  },

  /**
   * Retorna a chave de storage dos dados para um ID de usuário específico.
   * @param {string} userId
   * @returns {string}
   */
  chaveDadosPorId(userId) {
    return `SCTEC_DATA_${userId}`;
  },

  // ─── Backup com Assinatura ──────────────────────────────────────────────

  /**
   * Gera o objeto de metadados de assinatura para incluir no backup.
   * @returns {Promise<Object>}
   */
  async gerarAssinaturaBackup() {
    const sessao = this.obterSessao();
    if (!sessao) return {};

    const usuario = this.buscarPorId(sessao.id);
    if (!usuario) return {};

    return {
      exportadoPorId: usuario.id,
      exportadoPorNome: usuario.nome,
      senhaHashExportador: usuario.senhaHash, // já é SHA-256
    };
  },

  /**
   * Valida se a senha fornecida corresponde ao hash do exportador no backup.
   * @param {Object} payload - objeto do backup
   * @param {string} senhaDigitada
   * @returns {Promise<{ok: boolean, erro?: string}>}
   */
  async validarSenhaBackup(payload, senhaDigitada) {
    if (!payload.senhaHashExportador) {
      // Backup antigo sem assinatura — permite importar
      return { ok: true };
    }

    const sessao = this.obterSessao();
    const mesmoUsuario = sessao && sessao.id === payload.exportadoPorId;

    if (mesmoUsuario) {
      // Usuário importando seu próprio backup — não precisa de senha extra
      return { ok: true };
    }

    if (!senhaDigitada) {
      return { ok: false, erro: "Digite a senha do usuário exportador." };
    }

    const hashDigitado = await this.hashSenha(senhaDigitada);
    if (hashDigitado !== payload.senhaHashExportador) {
      return { ok: false, erro: "Senha incorreta. Importação bloqueada." };
    }

    return { ok: true };
  },
};

window.AuthService = AuthService;
