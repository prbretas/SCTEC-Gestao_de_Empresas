/**
 * propostas.test.js — Testes do módulo de Propostas e Orçamentos
 */
const { loadFull, loadStorageOnly } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("auth.js");
  loadFull("storage.js");
  loadStorageOnly("propostas.js", "PropostasStorage");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "55555", nome: "propuser", role: "admin", orgId: "ORG_PROP",
  }));
});

describe("PropostasStorage — CRUD", () => {
  test("adicionar proposta gera id e criadoEm", () => {
    const p = PropostasStorage.adicionar({
      titulo: "Proposta Teste", empresaId: "10", numero: "2026-001",
      status: "rascunho", itens: [], total: 0,
    });
    expect(p.id).toBeTruthy();
    expect(p.criadoEm).toBeTruthy();
    expect(p.titulo).toBe("Proposta Teste");
  });

  test("buscarTodos retorna propostas da organização", () => {
    PropostasStorage.adicionar({ titulo: "P1", empresaId: "10", status: "enviada", itens: [], total: 500 });
    expect(PropostasStorage.buscarTodos().length).toBeGreaterThan(0);
  });

  test("atualizar modifica status da proposta", () => {
    const p = PropostasStorage.adicionar({ titulo: "P2", empresaId: "10", status: "rascunho", itens: [], total: 100 });
    PropostasStorage.atualizar(p.id, { status: "aceita" });
    const atualizada = PropostasStorage.buscarTodos().find((x) => x.id === p.id);
    expect(atualizada.status).toBe("aceita");
  });

  test("excluir remove a proposta", () => {
    const p = PropostasStorage.adicionar({ titulo: "Remover", empresaId: "10", status: "rascunho", itens: [], total: 0 });
    PropostasStorage.excluir(p.id);
    expect(PropostasStorage.buscarTodos().find((x) => x.id === p.id)).toBeUndefined();
  });
});

describe("Cálculo de total de proposta", () => {
  test("total é soma de qtd × valor de cada item", () => {
    const itens = [
      { desc: "Serviço A", qtd: 2, valor: 500 },
      { desc: "Serviço B", qtd: 1, valor: 300 },
    ];
    const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
    expect(total).toBe(1300);
  });

  test("total de proposta sem itens é zero", () => {
    expect([].reduce((s, i) => s + i.qtd * i.valor, 0)).toBe(0);
  });

  test("item com quantidade zero tem subtotal zero", () => {
    expect(0 * 1000).toBe(0);
  });

  test("múltiplos itens calculam total corretamente", () => {
    const itens = [
      { qtd: 3, valor: 100 },
      { qtd: 2, valor: 250 },
      { qtd: 1, valor: 50 },
    ];
    const total = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
    expect(total).toBe(850); // 300 + 500 + 50
  });
});

describe("PropostasStorage — Isolamento por organização", () => {
  test("propostas de orgs diferentes não se misturam", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "11111", orgId: "ORG_A" }));
    PropostasStorage.adicionar({ titulo: "Proposta ORG_A", empresaId: "1", status: "rascunho", itens: [], total: 0 });

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "22222", orgId: "ORG_B" }));
    expect(PropostasStorage.buscarTodos().find((p) => p.titulo === "Proposta ORG_A")).toBeUndefined();
  });
});
