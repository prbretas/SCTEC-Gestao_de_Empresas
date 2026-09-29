/**
 * apiProvider.test.js — Testes do ApiProvider (#144 Fase 2) com fetch mockado.
 */
const { loadFull } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("storage-provider.js");
  loadFull("api-provider.js");
});

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

function mockJson(body, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

describe("ApiProvider — contrato assíncrono", () => {
  test("list mapeia coleção 'propostas' para /pedidos e envia o token", async () => {
    ApiProvider.definirToken("tok123");
    fetch.mockReturnValueOnce(mockJson({ ok: true, data: [{ id: "1", titulo: "P" }], meta: { total: 1 } }));

    const { data, meta } = await ApiProvider.list("propostas", "ORG");
    expect(data).toHaveLength(1);
    expect(meta.total).toBe(1);

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/pedidos");
    expect(opts.headers.Authorization).toBe("Bearer tok123");
  });

  test("insert faz POST e retorna data", async () => {
    fetch.mockReturnValueOnce(mockJson({ ok: true, data: { id: "9", titulo: "Novo" } }, true, 201));
    const r = await ApiProvider.insert("propostas", "ORG", { titulo: "Novo" });
    expect(r.id).toBe("9");
    const [, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
  });

  test("update faz PUT no id", async () => {
    fetch.mockReturnValueOnce(mockJson({ ok: true, data: { id: "5", titulo: "Editado" } }));
    const r = await ApiProvider.update("propostas", "ORG", "5", { titulo: "Editado" });
    expect(r.titulo).toBe("Editado");
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/pedidos/5");
    expect(opts.method).toBe("PUT");
  });

  test("remove faz DELETE e retorna ok", async () => {
    fetch.mockReturnValueOnce(Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error("no body")) }));
    const r = await ApiProvider.remove("propostas", "ORG", "5");
    expect(r.ok).toBe(true);
    const [, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe("DELETE");
  });

  test("erro da API vira exceção com mensagem", async () => {
    fetch.mockReturnValueOnce(mockJson({ ok: false, error: { code: "VALIDACAO", message: "Título obrigatório" } }, false, 400));
    await expect(ApiProvider.insert("propostas", "ORG", {})).rejects.toThrow("Título obrigatório");
  });

  test("fast-path síncrono lança erro explícito", () => {
    expect(() => ApiProvider.listSync("propostas", "ORG")).toThrow(/síncrono/);
  });

  test("definirBase altera a URL usada", async () => {
    ApiProvider.definirBase("http://exemplo:9000/api/v1");
    fetch.mockReturnValueOnce(mockJson({ ok: true, data: [] }));
    await ApiProvider.list("propostas", "ORG");
    expect(fetch.mock.calls[0][0]).toContain("http://exemplo:9000/api/v1/pedidos");
  });
});

describe("StorageConfig — seleção de provider no modo 'api'", () => {
  test("provider() retorna ApiProvider quando modo é 'api'", () => {
    StorageConfig.definirModo("api");
    expect(StorageConfig.provider().nome).toBe("api");
  });

  test("provider() volta ao local quando modo é 'local'", () => {
    StorageConfig.definirModo("local");
    expect(StorageConfig.provider().nome).toBe("local");
  });
});
