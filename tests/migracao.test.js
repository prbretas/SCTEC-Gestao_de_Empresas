/**
 * migracao.test.js — Testes do serviço de backup/migração de dados (#144, Fase 4)
 */
const { loadFull } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("storage-provider.js");
  loadFull("migracao.js");
});

beforeEach(() => {
  localStorage.clear();
});

const ORG = "ORG_MIG";

/** Semeia algumas coleções via StorageProvider para o org de teste. */
function semear(org = ORG) {
  StorageProvider.replaceAllSync("crm", org, [{ id: "1", titulo: "Lead" }]);
  StorageProvider.replaceAllSync("financeiro", org, [
    { id: "a", valor: 100 },
    { id: "b", valor: 200 },
  ]);
  StorageProvider.replaceAllSync("produtos", org, [{ id: "p1", nome: "Item" }]);
}

describe("MigracaoService.exportarTudo", () => {
  test("gera pacote com formato, versão e coleções", () => {
    semear();
    const pacote = JSON.parse(MigracaoService.exportarTudo(ORG));
    expect(pacote.formato).toBe("sctec-export");
    expect(pacote.versao).toBe(1);
    expect(pacote.orgId).toBe(ORG);
    expect(pacote.exportadoEm).toBeTruthy();
    expect(pacote.colecoes.crm).toHaveLength(1);
    expect(pacote.colecoes.financeiro).toHaveLength(2);
    expect(pacote.colecoes.produtos).toHaveLength(1);
  });

  test("coleções vazias saem como arrays vazios", () => {
    const pacote = JSON.parse(MigracaoService.exportarTudo(ORG));
    expect(pacote.colecoes.agenda).toEqual([]);
    expect(pacote.colecoes.entrada).toEqual([]);
  });
});

describe("MigracaoService.importarTudo", () => {
  test("restaura coleções a partir de um pacote exportado", () => {
    semear();
    const json = MigracaoService.exportarTudo(ORG);
    localStorage.clear();

    const resultado = MigracaoService.importarTudo(json, { orgId: ORG });
    expect(resultado.totalRegistros).toBe(4);
    expect(resultado.importadas).toEqual(
      expect.arrayContaining(["crm", "financeiro", "produtos"])
    );
    expect(StorageProvider.listSync("crm", ORG)).toHaveLength(1);
    expect(StorageProvider.listSync("financeiro", ORG)).toHaveLength(2);
  });

  test("substitui integralmente a coleção existente", () => {
    StorageProvider.replaceAllSync("crm", ORG, [{ id: "antigo" }]);
    const pacote = {
      formato: "sctec-export",
      versao: 1,
      colecoes: { crm: [{ id: "novo", titulo: "N" }] },
    };
    MigracaoService.importarTudo(pacote, { orgId: ORG });
    const lista = StorageProvider.listSync("crm", ORG);
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe("novo");
  });

  test("aceita objeto além de string JSON", () => {
    const pacote = {
      formato: "sctec-export",
      versao: 1,
      colecoes: { produtos: [{ id: "x" }] },
    };
    const r = MigracaoService.importarTudo(pacote, { orgId: ORG });
    expect(r.totalRegistros).toBe(1);
  });

  test("rejeita pacote com formato desconhecido", () => {
    expect(() => MigracaoService.importarTudo({ foo: "bar" }, { orgId: ORG })).toThrow();
  });

  test("rejeita entrada inválida", () => {
    expect(() => MigracaoService.importarTudo(null)).toThrow();
  });

  test("ignora valores de coleção que não são arrays", () => {
    const pacote = {
      formato: "sctec-export",
      versao: 1,
      colecoes: { crm: [{ id: "1" }], lixo: "nao-array" },
    };
    const r = MigracaoService.importarTudo(pacote, { orgId: ORG });
    expect(r.importadas).toContain("crm");
    expect(r.importadas).not.toContain("lixo");
  });
});

describe("MigracaoService — roundtrip export/import preserva dados", () => {
  test("exportar e reimportar mantém os registros idênticos", () => {
    semear();
    const antes = StorageProvider.listSync("financeiro", ORG);
    const json = MigracaoService.exportarTudo(ORG);
    localStorage.clear();
    MigracaoService.importarTudo(json, { orgId: ORG });
    const depois = StorageProvider.listSync("financeiro", ORG);
    expect(depois).toEqual(antes);
  });
});
