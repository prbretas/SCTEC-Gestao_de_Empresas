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
  { id: "cadastros",   label: "Cadastros",          icon: "📋", url: "cadastros.html",  defaultActive: true },
  { id: "dashboard",   label: "Dashboard",          icon: "📊", url: "dashboard.html",  defaultActive: true },
  { id: "agenda",      label: "Agenda",             icon: "📅", url: "agenda.html",     defaultActive: true },
  { id: "crm",         label: "CRM / Funil",        icon: "🎯", url: "crm.html",        defaultActive: true },
  { id: "settings",    label: "Configurações",      icon: "⚙️", url: "settings.html",   defaultActive: true, adminOnly: true },
  { id: "admin",       label: "Gerenciar Usuários", icon: "👑", url: "admin.html",      defaultActive: true, adminOnly: true },
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
   * Filtra por: módulo ativo + adminOnly (se aplicável)
   * @returns {Array}
   */
  obterModulosVisiveis() {
    const estado = this.obterEstado();
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    const isAdmin = sessao?.role === "admin";

    return MODULOS_CATALOGO.filter((m) => {
      if (m.adminOnly && !isAdmin) return false;
      return estado[m.id] !== false;
    });
  },
};

window.ModulesController = ModulesController;
window.MODULOS_CATALOGO = MODULOS_CATALOGO;
