/**
 * storageProvider.test.js — Testes da camada de abstração de persistência (#144)
 */
const { loadFull } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("storage-provider.js");
});

beforeEach(() => {
  localStorage.clear();
});

const ORG = "ORG_SP";
const COL = "propostas";

describe("StorageProvider — fast-path síncrono", () => {
  test("insertSync gera id e listSync retorna o registro", () => {
    const r = StorageProvider.insertSync(COL, ORG, { titulo: "P1" });
    expect(r.id).toBeTruthy();
    const lista = StorageProvider.listSync(COL, ORG);
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe("P1");
  });

  test("dois inserts consecutivos geram ids distintos", () => {
    const a = StorageProvider.insertSync(COL, ORG, { titulo: "A" });
    const b = StorageProvider.insertSync(COL, ORG, { titulo: "B" });
    expect(a.id).not.toBe(b.id);
  });

  test("getSync retorna o registro por id, ou null", () => {
    const r = StorageProvider.insertSync(COL, ORG, { titulo: "Busca" });
    expect(StorageProvider.getSync(COL, ORG, r.id).titulo).toBe("Busca");
    expect(StorageProvider.getSync(COL, ORG, "inexistente")).toBeNull();
  });

  test("updateSync mescla dados preservando id", () => {
    const r = StorageProvider.insertSync(COL, ORG, { titulo: "Antigo", valor: 10 });
    const atualizado = StorageProvider.updateSync(COL, ORG, r.id, { titulo: "Novo" });
    expect(atualizado.id).toBe(r.id);
    expect(atualizado.titulo).toBe("Novo");
    expect(atualizado.valor).toBe(10);
  });

  test("updateSync em id inexistente retorna null", () => {
    expect(StorageProvider.updateSync(COL, ORG, "x", { a: 1 })).toBeNull();
  });

  test("removeSync exclui o registro", () => {
    const r = StorageProvider.insertSync(COL, ORG, { titulo: "Excluir" });
    expect(StorageProvider.removeSync(COL, ORG, r.id).ok).toBe(true);
    expect(StorageProvider.listSync(COL, ORG)).toHaveLength(0);
  });

  test("replaceAllSync substitui a coleção inteira", () => {
    StorageProvider.insertSync(COL, ORG, { titulo: "old" });
    StorageProvider.replaceAllSync(COL, ORG, [{ id: "1", titulo: "novo" }]);
    const lista = StorageProvider.listSync(COL, ORG);
    expect(lista).toHaveLength(1);
    expect(lista[0].titulo).toBe("novo");
  });

  test("isolamento por org: coleções de orgs diferentes não se misturam", () => {
    StorageProvider.insertSync(COL, "ORG_A", { titulo: "de A" });
    expect(StorageProvider.listSync(COL, "ORG_B")).toHaveLength(0);
  });

  test("usa a chave SCTEC_{COLECAO}_{orgId} (compatível com o legado)", () => {
    StorageProvider.insertSync("propostas", ORG, { titulo: "X" });
    expect(localStorage.getItem(`SCTEC_PROPOSTAS_${ORG}`)).toBeTruthy();
  });
});

describe("StorageProvider — contrato assíncrono", () => {
  test("insert/list assíncronos retornam { data, meta }", async () => {
    await StorageProvider.insert(COL, ORG, { titulo: "Async" });
    const { data, meta } = await StorageProvider.list(COL, ORG);
    expect(data).toHaveLength(1);
    expect(meta.total).toBe(1);
  });

  test("list aceita opção de filtro", async () => {
    await StorageProvider.insert(COL, ORG, { titulo: "manter", status: "aceita" });
    await StorageProvider.insert(COL, ORG, { titulo: "ocultar", status: "rascunho" });
    const { data } = await StorageProvider.list(COL, ORG, { filtro: (r) => r.status === "aceita" });
    expect(data).toHaveLength(1);
    expect(data[0].titulo).toBe("manter");
  });

  test("get/update/remove assíncronos funcionam", async () => {
    const r = await StorageProvider.insert(COL, ORG, { titulo: "T" });
    expect((await StorageProvider.get(COL, ORG, r.id)).titulo).toBe("T");
    await StorageProvider.update(COL, ORG, r.id, { titulo: "T2" });
    expect((await StorageProvider.get(COL, ORG, r.id)).titulo).toBe("T2");
    await StorageProvider.remove(COL, ORG, r.id);
    expect(await StorageProvider.get(COL, ORG, r.id)).toBeNull();
  });
});

describe("StorageConfig — toggle de modo", () => {
  test("modo padrão é 'local'", () => {
    expect(StorageConfig.modo()).toBe("local");
  });

  test("definirModo persiste a escolha e sanitiza valores inválidos", () => {
    StorageConfig.definirModo("api");
    expect(StorageConfig.modo()).toBe("api");
    StorageConfig.definirModo("qualquer-coisa");
    expect(StorageConfig.modo()).toBe("local");
  });

  test("provider() retorna o LocalStorageProvider na Fase 1", () => {
    expect(StorageConfig.provider().nome).toBe("local");
  });
});
