/**
 * crm.test.js — Testes do módulo CRM / Funil de Vendas
 */
const { loadFull, loadStorageOnly } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("auth.js");
  loadFull("storage.js");
  loadStorageOnly("crm.js", "CrmStorage");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "77777", nome: "crmuser", role: "admin", orgId: "ORG_CRM",
  }));
});

describe("CrmStorage — CRUD de Oportunidades", () => {
  test("adicionar oportunidade gera id e criadoEm", () => {
    const op = CrmStorage.adicionar({
      titulo: "Negócio A", empresaId: "10", valor: 5000,
      etapa: "prospeccao", responsavel: "Philippe",
    });
    expect(op.id).toBeTruthy();
    expect(op.criadoEm).toBeTruthy();
    expect(op.titulo).toBe("Negócio A");
  });

  test("buscarTodos retorna oportunidades da organização", () => {
    CrmStorage.adicionar({ titulo: "Op1", empresaId: "10", valor: 1000, etapa: "contato" });
    expect(CrmStorage.buscarTodos().length).toBeGreaterThan(0);
  });

  test("atualizar muda etapa da oportunidade", () => {
    const op = CrmStorage.adicionar({ titulo: "Mover", empresaId: "10", valor: 500, etapa: "prospeccao" });
    CrmStorage.atualizar(op.id, { etapa: "proposta" });
    const atualizada = CrmStorage.buscarTodos().find((x) => x.id === op.id);
    expect(atualizada.etapa).toBe("proposta");
  });

  test("excluir remove a oportunidade", () => {
    const op = CrmStorage.adicionar({ titulo: "Excluir", empresaId: "10", valor: 0, etapa: "perdido" });
    CrmStorage.excluir(op.id);
    expect(CrmStorage.buscarTodos().find((x) => x.id === op.id)).toBeUndefined();
  });
});

describe("CRM — Etapas do Funil", () => {
  test("ETAPAS contém as 6 etapas esperadas", () => {
    const ids = ETAPAS.map((e) => e.id);
    expect(ids).toContain("prospeccao");
    expect(ids).toContain("contato");
    expect(ids).toContain("proposta");
    expect(ids).toContain("negociacao");
    expect(ids).toContain("fechado");
    expect(ids).toContain("perdido");
    expect(ids.length).toBe(6);
  });

  test("oportunidade percorre todas as etapas do funil", () => {
    const op = CrmStorage.adicionar({ titulo: "Jornada", empresaId: "10", valor: 10000, etapa: "prospeccao" });
    ["contato", "proposta", "negociacao", "fechado"].forEach((etapa) => {
      CrmStorage.atualizar(op.id, { etapa });
      const atual = CrmStorage.buscarTodos().find((x) => x.id === op.id);
      expect(atual.etapa).toBe(etapa);
    });
  });
});

describe("CrmStorage — Isolamento por organização", () => {
  test("oportunidades de orgs diferentes não se misturam", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "11111", orgId: "ORG_P" }));
    CrmStorage.adicionar({ titulo: "Op ORG_P", empresaId: "1", valor: 100, etapa: "prospeccao" });

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "22222", orgId: "ORG_Q" }));
    expect(CrmStorage.buscarTodos().find((o) => o.titulo === "Op ORG_P")).toBeUndefined();
  });
});
