/**
 * agenda.test.js — Testes do módulo de Agenda de Compromissos
 */
const { loadFull, loadStorageOnly } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("auth.js");
  loadFull("storage.js");
  loadStorageOnly("agenda.js", "AgendaStorage");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "33333", nome: "agendauser", role: "admin", orgId: "ORG_AGENDA",
  }));
});

describe("AgendaStorage — CRUD", () => {
  test("adicionar compromisso gera id e criadoEm", () => {
    const c = AgendaStorage.adicionar({
      titulo: "Reunião inicial", data: "2026-07-01", hora: "10:00", tipo: "reuniao", status: "pendente",
    });
    expect(c.id).toBeTruthy();
    expect(c.criadoEm).toBeTruthy();
    expect(c.titulo).toBe("Reunião inicial");
  });

  test("buscarTodos retorna compromissos da sessão atual", () => {
    AgendaStorage.adicionar({ titulo: "Visita", data: "2026-07-02", tipo: "visita", status: "pendente" });
    expect(AgendaStorage.buscarTodos().length).toBeGreaterThan(0);
  });

  test("atualizar modifica campos do compromisso", () => {
    const c = AgendaStorage.adicionar({ titulo: "Original", data: "2026-07-01", tipo: "outro", status: "pendente" });
    AgendaStorage.atualizar(c.id, { status: "concluido", titulo: "Atualizado" });
    const atualizado = AgendaStorage.buscarTodos().find((x) => x.id === c.id);
    expect(atualizado.status).toBe("concluido");
    expect(atualizado.titulo).toBe("Atualizado");
  });

  test("excluir remove o compromisso", () => {
    const c = AgendaStorage.adicionar({ titulo: "Remover", data: "2026-07-01", tipo: "prazo", status: "pendente" });
    AgendaStorage.excluir(c.id);
    expect(AgendaStorage.buscarTodos().find((x) => x.id === c.id)).toBeUndefined();
  });
});

describe("AgendaStorage — Isolamento", () => {
  test("dados de orgs diferentes não se misturam", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "11111", nome: "u1", orgId: "ORG_X" }));
    AgendaStorage.adicionar({ titulo: "Reunião ORG_X", data: "2026-07-01", tipo: "reuniao", status: "pendente" });

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "22222", nome: "u2", orgId: "ORG_Y" }));
    expect(AgendaStorage.buscarTodos().find((c) => c.titulo === "Reunião ORG_X")).toBeUndefined();
  });

  test("múltiplos compromissos são armazenados corretamente", () => {
    for (let i = 0; i < 5; i++) {
      AgendaStorage.adicionar({ titulo: `C${i}`, data: "2026-07-01", tipo: "outro", status: "pendente" });
    }
    expect(AgendaStorage.buscarTodos().length).toBe(5);
  });
});
