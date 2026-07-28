/**
 * integrations.test.js — Testes de integração entre módulos (#55)
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("util");
const nodeCrypto = require("crypto");

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.crypto = nodeCrypto.webcrypto;

function makeMockStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}
const mockLS = makeMockStorage();
const mockSS = makeMockStorage();
globalThis.localStorage = mockLS;
globalThis.sessionStorage = mockSS;
globalThis.window = globalThis; // Necessário pois ambiente node não tem window

beforeAll(() => {
  const load = (filePath) => {
    const code = fs.readFileSync(path.join(__dirname, filePath), "utf8");
    // eslint-disable-next-line no-new-func
    new Function("globalThis", "window", "localStorage", "sessionStorage", code)(
      globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage
    );
  };

  // Injeta crypto antes de auth
  const authCode = fs.readFileSync(path.join(__dirname, "../src/js/core/auth.js"), "utf8");
  const authWithCrypto = `const crypto = globalThis.crypto;\n${authCode}`;
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", authWithCrypto)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage
  );

  load("../src/js/core/roles.js");
  load("../src/js/core/approvals.js");

  // Mock simplificados dos storages de módulos
  globalThis.CrmStorage = {
    _data: [],
    buscarTodos() { return this._data; },
    salvarTodos(l) { this._data = l; },
    adicionar(op) {
      op.id = Date.now().toString() + Math.random();
      op.criadoEm = new Date().toISOString();
      this._data.push(op);
      return op;
    },
    atualizar(id, dados) {
      const idx = this._data.findIndex((o) => o.id === id);
      if (idx !== -1) this._data[idx] = { ...this._data[idx], ...dados, id };
    },
  };
  globalThis.window.CrmStorage = globalThis.CrmStorage;

  globalThis.FinanceiroStorage = {
    _data: [],
    buscarTodos() { return this._data; },
    salvarTodos(l) { this._data = l; },
    adicionar(t) {
      t.id = Date.now().toString() + Math.random();
      t.criadoEm = new Date().toISOString();
      this._data.push(t);
      return t;
    },
  };
  globalThis.window.FinanceiroStorage = globalThis.FinanceiroStorage;

  globalThis.PropostasStorage = {
    _data: [],
    buscarTodos() { return this._data; },
  };
  globalThis.window.PropostasStorage = globalThis.PropostasStorage;

  load("../src/js/core/integrations.js");
});

beforeEach(() => {
  mockLS.clear();
  mockSS.clear();
  CrmStorage._data = [];
  FinanceiroStorage._data = [];
  PropostasStorage._data = [];
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "u1", nome: "vendedor", role: "user", orgId: "org1", papelId: null,
  }));
});

describe("IntegrationsController — Proposta → CRM", () => {
  test("proposta enviada cria oportunidade no CRM", () => {
    IntegrationsController.onPropostaEnviada({
      id: "p1", titulo: "Proposta Web", empresaId: "emp1", total: 5000, numero: "2026-001",
    });
    expect(CrmStorage._data).toHaveLength(1);
    expect(CrmStorage._data[0].etapa).toBe("proposta");
    expect(CrmStorage._data[0].propostaId).toBe("p1");
    expect(CrmStorage._data[0].valor).toBe(5000);
  });

  test("proposta enviada move oportunidade existente para etapa proposta", () => {
    CrmStorage._data = [{ id: "op1", empresaId: "emp1", etapa: "contato", valor: 0 }];
    IntegrationsController.onPropostaEnviada({
      id: "p2", titulo: "Nova Proposta", empresaId: "emp1", total: 8000,
    });
    expect(CrmStorage._data).toHaveLength(1);
    expect(CrmStorage._data[0].etapa).toBe("proposta");
    expect(CrmStorage._data[0].propostaId).toBe("p2");
  });

  test("não duplica se já existe oportunidade vinculada à proposta", () => {
    CrmStorage._data = [{ id: "op2", empresaId: "emp1", etapa: "proposta", propostaId: "p3" }];
    IntegrationsController.onPropostaEnviada({
      id: "p3", titulo: "Mesma", empresaId: "emp1", total: 3000,
    });
    expect(CrmStorage._data).toHaveLength(1);
  });
});

describe("IntegrationsController — Proposta aceita → Financeiro", () => {
  test("admin gera entrada financeira diretamente", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "a1", nome: "admin", role: "admin", orgId: "org1", papelId: null,
    }));
    const resultado = IntegrationsController.onPropostaAceita({
      id: "p10", titulo: "Prop OK", empresaId: "emp1", total: 10000, numero: "001",
    });
    expect(resultado.aprovado).toBe(true);
    expect(FinanceiroStorage._data).toHaveLength(1);
    expect(FinanceiroStorage._data[0].valor).toBe(10000);
    expect(FinanceiroStorage._data[0].propostaId).toBe("p10");
  });

  test("usuário comum cria pendência de aprovação", () => {
    const resultado = IntegrationsController.onPropostaAceita({
      id: "p11", titulo: "Prop Pend", empresaId: "emp2", total: 7000,
    });
    expect(resultado.aprovado).toBe(false);
    expect(FinanceiroStorage._data).toHaveLength(0);
    const pendentes = ApprovalsController.buscarPendentes();
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].tipo).toBe("proposta_aceita");
    expect(pendentes[0].valor).toBe(7000);
  });

  test("não duplica se já existe entrada vinculada", () => {
    FinanceiroStorage._data = [{ id: "f1", propostaId: "p12" }];
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "a1", nome: "admin", role: "admin", orgId: "org1", papelId: null,
    }));
    IntegrationsController.onPropostaAceita({
      id: "p12", titulo: "Dup", empresaId: "emp1", total: 5000,
    });
    expect(FinanceiroStorage._data).toHaveLength(1); // não adicionou nova
  });
});

describe("IntegrationsController — Agenda → CRM", () => {
  test("compromisso com empresa cria prospecção no CRM", () => {
    IntegrationsController.onCompromissoCriado({
      id: "c1", titulo: "Visita comercial", empresaId: "emp5", data: "2026-08-01",
    });
    expect(CrmStorage._data).toHaveLength(1);
    expect(CrmStorage._data[0].etapa).toBe("prospeccao");
    expect(CrmStorage._data[0].empresaId).toBe("emp5");
  });

  test("não cria prospecção se já existe oportunidade para a empresa", () => {
    CrmStorage._data = [{ id: "op10", empresaId: "emp6", etapa: "contato" }];
    IntegrationsController.onCompromissoCriado({
      id: "c2", titulo: "Ligação", empresaId: "emp6",
    });
    expect(CrmStorage._data).toHaveLength(1); // não adicionou
  });

  test("não faz nada se compromisso sem empresa", () => {
    IntegrationsController.onCompromissoCriado({
      id: "c3", titulo: "Almoço", empresaId: "",
    });
    expect(CrmStorage._data).toHaveLength(0);
  });
});

describe("IntegrationsController — CRM Fechado → Financeiro", () => {
  test("admin gera entrada ao fechar oportunidade", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "a1", nome: "admin", role: "admin", orgId: "org1", papelId: null,
    }));
    const resultado = IntegrationsController.onCrmFechado({
      id: "op20", titulo: "Deal ganho", empresaId: "emp1", valor: 25000,
    });
    expect(resultado.aprovado).toBe(true);
    expect(FinanceiroStorage._data).toHaveLength(1);
    expect(FinanceiroStorage._data[0].oportunidadeId).toBe("op20");
  });

  test("usuário comum cria pendência ao fechar", () => {
    const resultado = IntegrationsController.onCrmFechado({
      id: "op21", titulo: "Deal pendente", empresaId: "emp2", valor: 12000,
    });
    expect(resultado.aprovado).toBe(false);
    const pendentes = ApprovalsController.buscarPendentes();
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].tipo).toBe("crm_fechado");
  });
});

describe("ApprovalsController — Aprovar e Rejeitar", () => {
  test("aprovar executa a ação financeira", () => {
    PropostasStorage._data = [{ id: "p20", titulo: "Test", empresaId: "emp1", total: 9000, numero: "X" }];
    const pend = ApprovalsController.criar({
      tipo: "proposta_aceita", referenciaId: "p20", referenciaModulo: "propostas",
      empresaId: "emp1", valor: 9000, descricao: "teste",
    });
    const r = ApprovalsController.aprovar(pend.id);
    expect(r.ok).toBe(true);
    expect(FinanceiroStorage._data).toHaveLength(1);
    expect(ApprovalsController.buscarPendentes()).toHaveLength(0);
  });

  test("rejeitar não gera entrada financeira", () => {
    const pend = ApprovalsController.criar({
      tipo: "crm_fechado", referenciaId: "op30", referenciaModulo: "crm",
      empresaId: "emp1", valor: 5000, descricao: "teste",
    });
    const r = ApprovalsController.rejeitar(pend.id, "Motivo de teste");
    expect(r.ok).toBe(true);
    expect(FinanceiroStorage._data).toHaveLength(0);
    const todas = ApprovalsController.buscarTodas();
    expect(todas[0].status).toBe("rejeitado");
    expect(todas[0].motivo).toBe("Motivo de teste");
  });

  test("não pode aprovar pendência já resolvida", () => {
    const pend = ApprovalsController.criar({
      tipo: "proposta_aceita", referenciaId: "pX", referenciaModulo: "propostas",
      empresaId: "emp1", valor: 1000, descricao: "x",
    });
    ApprovalsController.rejeitar(pend.id);
    const r = ApprovalsController.aprovar(pend.id);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/já foi resolvida/i);
  });
});
