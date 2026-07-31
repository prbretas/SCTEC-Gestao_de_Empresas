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

if (!window.ProdutosStorage) {
  window.ProdutosStorage = {
    _obterChave() {
      if (window.AuthService) {
        const s = AuthService.obterSessao();
        if (s) return `SCTEC_PRODUTOS_${s.orgId || s.id}`;
      }
      return "SCTEC_PRODUTOS_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}

if (!window.EstoqueStorage) {
  window.EstoqueStorage = {
    _obterChave() {
      if (window.AuthService) {
        const s = AuthService.obterSessao();
        if (s) return `SCTEC_ESTOQUE_${s.orgId || s.id}`;
      }
      return "SCTEC_ESTOQUE_local";
    },
    _obterChaveMov() { return this._obterChave() + "_MOV"; },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
    buscarMovimentacoes() {
      try { return JSON.parse(localStorage.getItem(this._obterChaveMov()) || "[]"); }
      catch { return []; }
    },
    obterQuantidadeTotal(produtoId) {
      return this.buscarTodos().filter((e) => e.produtoId === produtoId).reduce((s, e) => s + (e.quantidade || 0), 0);
    },
  };
}

if (!window.EntradaStorage) {
  window.EntradaStorage = {
    _obterChave() {
      if (window.AuthService) {
        const s = AuthService.obterSessao();
        if (s) return `SCTEC_ENTRADA_${s.orgId || s.id}`;
      }
      return "SCTEC_ENTRADA_local";
    },
    buscarTodos() {
      try { return JSON.parse(localStorage.getItem(this._obterChave()) || "[]"); }
      catch { return []; }
    },
  };
}
