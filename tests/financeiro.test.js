/**
 * financeiro.test.js — Testes do módulo de Controle Financeiro
 */
const { loadFull, loadStorageOnly } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("auth.js");
  loadFull("storage.js");
  loadStorageOnly("financeiro.js", "FinanceiroStorage");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "11111", nome: "testuser", role: "admin", orgId: "ORG_FIN",
    identidade: "testuser#11111",
  }));
});

describe("FinanceiroStorage — CRUD", () => {
  test("adicionar transação retorna objeto com id e criadoEm", () => {
    const t = FinanceiroStorage.adicionar({
      tipo: "entrada", descricao: "Venda", valor: 1000, data: "2026-06-01", categoria: "servicos",
    });
    expect(t.id).toBeTruthy();
    expect(t.criadoEm).toBeTruthy();
    expect(t.descricao).toBe("Venda");
  });

  test("buscarTodos retorna lista com transação adicionada", () => {
    FinanceiroStorage.adicionar({ tipo: "saida", descricao: "Aluguel", valor: 500, data: "2026-06-01", categoria: "aluguel" });
    expect(FinanceiroStorage.buscarTodos().length).toBeGreaterThan(0);
  });

  test("atualizar modifica transação existente", () => {
    const t = FinanceiroStorage.adicionar({ tipo: "entrada", descricao: "Orig", valor: 200, data: "2026-06-01", categoria: "outros" });
    FinanceiroStorage.atualizar(t.id, { descricao: "Atualizado", valor: 300 });
    const atualizado = FinanceiroStorage.buscarTodos().find((x) => x.id === t.id);
    expect(atualizado.descricao).toBe("Atualizado");
    expect(atualizado.valor).toBe(300);
  });

  test("excluir remove transação da lista", () => {
    const t = FinanceiroStorage.adicionar({ tipo: "saida", descricao: "Excluir", valor: 100, data: "2026-06-01", categoria: "outros" });
    FinanceiroStorage.excluir(t.id);
    expect(FinanceiroStorage.buscarTodos().find((x) => x.id === t.id)).toBeUndefined();
  });
});

describe("FinanceiroStorage — Cálculo de saldo", () => {
  test("saldo = entradas - saídas", () => {
    FinanceiroStorage.adicionar({ tipo: "entrada", descricao: "E1", valor: 1000, data: "2026-06-01", categoria: "servicos" });
    FinanceiroStorage.adicionar({ tipo: "entrada", descricao: "E2", valor: 500, data: "2026-06-01", categoria: "servicos" });
    FinanceiroStorage.adicionar({ tipo: "saida", descricao: "S1", valor: 300, data: "2026-06-01", categoria: "outros" });

    const lista = FinanceiroStorage.buscarTodos();
    const entradas = lista.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
    const saidas = lista.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
    expect(entradas - saidas).toBe(1200);
  });

  test("saldo negativo é detectado corretamente", () => {
    FinanceiroStorage.adicionar({ tipo: "saida", descricao: "Grande", valor: 5000, data: "2026-06-01", categoria: "outros" });
    FinanceiroStorage.adicionar({ tipo: "entrada", descricao: "Pequena", valor: 100, data: "2026-06-01", categoria: "servicos" });

    const lista = FinanceiroStorage.buscarTodos();
    const entradas = lista.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
    const saidas = lista.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
    expect(entradas - saidas).toBeLessThan(0);
  });
});

describe("FinanceiroStorage — Isolamento por organização", () => {
  test("dados de orgs diferentes não se misturam", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "11111", nome: "u1", role: "admin", orgId: "ORG_A" }));
    FinanceiroStorage.adicionar({ tipo: "entrada", descricao: "Org A", valor: 999, data: "2026-06-01", categoria: "servicos" });

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "22222", nome: "u2", role: "admin", orgId: "ORG_B" }));
    const listaB = FinanceiroStorage.buscarTodos();
    expect(listaB.find((t) => t.descricao === "Org A")).toBeUndefined();
  });
});
