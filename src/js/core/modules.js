/**
 * modules.js — Gerenciamento de módulos ativos por organização.
 * Permite ao Admin ativar/desativar rotinas que ficam visíveis na Home.
 * Configuração salva em: SCTEC_MODULES_{orgId}
 */

const MODULES_KEY_PREFIX = "SCTEC_MODULES_";

/**
 * Catálogo completo de módulos disponíveis no sistema.
 * Cada módulo tem: id, label, icon, url, defaultActive
 */
const MODULOS_CATALOGO = [
  { id: "cadastros",   label: "Cadastros",          icon: "📋", url: "cadastros.html",   defaultActive: true },
  { id: "dashboard",   label: "Dashboard",          icon: "📊", url: "dashboard.html",   defaultActive: true },
  { id: "agenda",      label: "Agenda",             icon: "📅", url: "agenda.html",      defaultActive: true },
  { id: "crm",         label: "CRM / Funil",        icon: "🎯", url: "crm.html",         defaultActive: true },
  { id: "propostas",   label: "Pedido de Venda",    icon: "📄", url: "propostas.html",   defaultActive: true },
  { id: "entrada",     label: "Documento de Entrada", icon: "📥", url: "entrada.html",   defaultActive: true },
  { id: "produtos",    label: "Produtos",           icon: "📦", url: "produtos.html",    defaultActive: true },
  { id: "estoque",     label: "Gestão de Estoque",  icon: "🏗️", url: "estoque.html",     defaultActive: true },
  { id: "financeiro",  label: "Financeiro",         icon: "💰", url: "financeiro.html",  defaultActive: true },
  { id: "relatorios",  label: "Relatórios",         icon: "📑", url: "relatorios.html",  defaultActive: true },
  { id: "settings",    label: "Configurações",      icon: "⚙️", url: "settings.html",    defaultActive: true, adminOnly: true },
  { id: "admin",       label: "Gerenciar Usuários", icon: "👑", url: "admin.html",       defaultActive: true, adminOnly: true },
];

const ModulesController = {

  /**
   * Retorna a chave de storage da org atual.
   */
  _obterChave() {
    try {
      if (window.AuthService) {
        const sessao = AuthService.obterSessao();
        if (sessao && sessao.orgId) return `${MODULES_KEY_PREFIX}${sessao.orgId}`;
      }
    } catch {}
    return `${MODULES_KEY_PREFIX}global`;
  },

  /**
   * Retorna o estado salvo dos módulos (quais estão ativos).
   * @returns {Object} { cadastros: true, dashboard: true, ... }
   */
  obterEstado() {
    try {
      const salvo = localStorage.getItem(this._obterChave());
      if (salvo) return JSON.parse(salvo);
    } catch {}
    // Padrão: todos ativos
    return MODULOS_CATALOGO.reduce((acc, m) => {
      acc[m.id] = m.defaultActive;
      return acc;
    }, {});
  },

  /**
   * Salva o estado dos módulos.
   * @param {Object} estado
   */
  salvarEstado(estado) {
    localStorage.setItem(this._obterChave(), JSON.stringify(estado));
  },

  /**
   * Verifica se um módulo está ativo.
   * @param {string} moduleId
   * @returns {boolean}
   */
  isAtivo(moduleId) {
    const estado = this.obterEstado();
    return estado[moduleId] !== false; // padrão ativo
  },

  /**
   * Ativa ou desativa um módulo.
   * @param {string} moduleId
   * @param {boolean} ativo
   */
  definir(moduleId, ativo) {
    const estado = this.obterEstado();
    estado[moduleId] = ativo;
    this.salvarEstado(estado);
  },

  /**
   * Retorna os módulos visíveis para o usuário atual.
   * Filtra por: módulo ativo + adminOnly (se aplicável) + modulosPermitidos do papel
   * Admin vê todos os módulos ativos independente do papel.
   * Usuário sem papel vê todos os módulos ativos não-adminOnly (fallback).
   * @returns {Array}
   */
  obterModulosVisiveis() {
    const estado = this.obterEstado();
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    const isAdmin = sessao?.role === "admin";

    return MODULOS_CATALOGO.filter((m) => {
      // adminOnly: só para admin
      if (m.adminOnly && !isAdmin) return false;
      // módulo desativado na org
      if (estado[m.id] === false) return false;
      // admin sempre vê tudo que está ativo
      if (isAdmin) return true;

      // usuário comum: checar modulosPermitidos do papel
      if (sessao && sessao.orgId && sessao.papelId && window.RolesController) {
        const permitidos = RolesController.obterModulosPermitidos(sessao.orgId, sessao.papelId);
        if (permitidos !== null) return permitidos.includes(m.id);
      }
      // fallback: sem papel definido ou papel sem restrição → mostra tudo ativo
      return true;
    });
  },

  /**
   * Verifica se o usuário atual pode acessar a página atual.
   * Deve ser chamado no DOMContentLoaded de cada página de módulo.
   * Redireciona para home.html com aviso se o acesso for negado.
   * @param {string} moduleId - ID do módulo da página atual
   * @returns {boolean} true se pode acessar, false se foi redirecionado
   */
  requireModuleAccess(moduleId) {
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    if (!sessao) return true; // requireAuth já cuida do redirect para login

    // Admin sempre pode
    if (sessao.role === "admin") return true;

    // Módulo desativado na org
    if (!this.isAtivo(moduleId)) {
      alert("⛔ Este módulo não está ativo na sua organização.");
      window.location.href = "home.html";
      return false;
    }

    // Usuário sem papel: acesso liberado (fallback)
    if (!sessao.papelId || !window.RolesController) return true;

    // Checa permissão do papel
    const pode = RolesController.podeAcessarModulo(sessao.orgId, sessao.papelId, moduleId);
    if (!pode) {
      alert(`⛔ Seu papel de trabalho não tem acesso a este módulo.`);
      window.location.href = "home.html";
      return false;
    }

    return true;
  },
};

window.ModulesController = ModulesController;
window.MODULOS_CATALOGO = MODULOS_CATALOGO;
