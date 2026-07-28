/**
 * dashboard-storages.js — Expõe os Storages dos módulos para uso no Dashboard.
 * Necessário porque o dashboard.html não carrega os JS completos dos módulos
 * (que tentam acessar elementos DOM que não existem nesta página).
 * Cada Storage é definido apenas se ainda não existir no window.
 */

if (!window.CrmStorage) {
  window.CrmStorage = {
    _obterChave() {
      if (window.AuthService) {
        const sessao = AuthService.obterSessao();
        if (sessao) return `SCTEC_CRM_${sessao.orgId || sessao.id}`;
      }
      return "SCTEC_CRM_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}

if (!window.PropostasStorage) {
  window.PropostasStorage = {
    _obterChave() {
      if (window.AuthService) {
        const s = AuthService.obterSessao();
        if (s) return `SCTEC_PROPOSTAS_${s.orgId || s.id}`;
      }
      return "SCTEC_PROPOSTAS_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}

if (!window.AgendaStorage) {
  window.AgendaStorage = {
    _obterChave() {
      if (window.AuthService) {
        const sessao = AuthService.obterSessao();
        if (sessao) return `SCTEC_AGENDA_${sessao.orgId || sessao.id}`;
      }
      return "SCTEC_AGENDA_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}

if (!window.FinanceiroStorage) {
  window.FinanceiroStorage = {
    _obterChave() {
      if (window.AuthService) {
        const s = AuthService.obterSessao();
        if (s) return `SCTEC_FINANCEIRO_${s.orgId || s.id}`;
      }
      return "SCTEC_FINANCEIRO_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}
