/**
 * filiais.test.js — Testes do módulo de Gestão de Filiais (#143)
 */
const { loadFull } = require("./helpers/loadModule");

beforeAll(() => {
  loadFull("auth.js");
  loadFull("storage.js");
  loadFull("filiais.js");
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
    id: "11111", nome: "adminuser", role: "admin", orgId: "ORG_FIL",
    identidade: "adminuser#11111",
  }));
});

describe("FiliaisStorage — CRUD", () => {
  test("adicionar filial retorna ok e gera id/criadoEm", () => {
    const r = FiliaisStorage.adicionar({ nome: "Matriz", cnpj: "12.345.678/0001-90" });
    expect(r.ok).toBe(true);
    expect(r.filial.id).toBeTruthy();
    expect(r.filial.criadoEm).toBeTruthy();
    expect(r.filial.nome).toBe("Matriz");
    expect(FiliaisStorage.buscarTodos()).toHaveLength(1);
  });

  test("adicionar rejeita nome curto", () => {
    const r = FiliaisStorage.adicionar({ nome: "M" });
    expect(r.ok).toBe(false);
    expect(FiliaisStorage.buscarTodos()).toHaveLength(0);
  });

  test("adicionar rejeita nome duplicado (case-insensitive)", () => {
    FiliaisStorage.adicionar({ nome: "Filial SP" });
    const r = FiliaisStorage.adicionar({ nome: "filial sp" });
    expect(r.ok).toBe(false);
    expect(FiliaisStorage.buscarTodos()).toHaveLength(1);
  });

  test("adicionar preserva endereços de estoque vinculados", () => {
    const r = FiliaisStorage.adicionar({ nome: "Filial RJ", enderecosEstoque: ["end_geral", "end_2"] });
    expect(r.ok).toBe(true);
    expect(r.filial.enderecosEstoque).toEqual(["end_geral", "end_2"]);
  });

  test("dois adicionar consecutivos geram ids distintos", () => {
    const a = FiliaisStorage.adicionar({ nome: "Filial A" });
    const b = FiliaisStorage.adicionar({ nome: "Filial B" });
    expect(a.filial.id).not.toBe(b.filial.id);
  });

  test("atualizar altera nome e endereços", () => {
    const { filial } = FiliaisStorage.adicionar({ nome: "Antiga", enderecosEstoque: ["end_geral"] });
    const r = FiliaisStorage.atualizar(filial.id, { nome: "Nova", enderecosEstoque: ["end_geral", "end_x"] });
    expect(r.ok).toBe(true);
    const atualizada = FiliaisStorage.buscarPorId(filial.id);
    expect(atualizada.nome).toBe("Nova");
    expect(atualizada.enderecosEstoque).toEqual(["end_geral", "end_x"]);
  });

  test("atualizar rejeita nome duplicado de outra filial", () => {
    FiliaisStorage.adicionar({ nome: "Filial 1" });
    const { filial } = FiliaisStorage.adicionar({ nome: "Filial 2" });
    const r = FiliaisStorage.atualizar(filial.id, { nome: "Filial 1" });
    expect(r.ok).toBe(false);
  });

  test("excluir remove a filial", () => {
    const { filial } = FiliaisStorage.adicionar({ nome: "Para Excluir" });
    const r = FiliaisStorage.excluir(filial.id);
    expect(r.ok).toBe(true);
    expect(FiliaisStorage.buscarTodos()).toHaveLength(0);
  });
});

describe("FiliaisStorage — Vínculo com usuários", () => {
  test("vincularUsuario atribui filialId ao usuário", () => {
    const usuarios = AuthService.obterUsuarios();
    usuarios.push({ id: "u1", nome: "func", orgId: "ORG_FIL", role: "user" });
    AuthService.salvarUsuarios(usuarios);

    const { filial } = FiliaisStorage.adicionar({ nome: "Filial X" });
    const r = FiliaisStorage.vincularUsuario("u1", filial.id);
    expect(r.ok).toBe(true);
    expect(AuthService.buscarPorId("u1").filialId).toBe(filial.id);
  });

  test("vincularUsuario com filial inexistente falha", () => {
    const usuarios = AuthService.obterUsuarios();
    usuarios.push({ id: "u2", nome: "func2", orgId: "ORG_FIL", role: "user" });
    AuthService.salvarUsuarios(usuarios);

    const r = FiliaisStorage.vincularUsuario("u2", "filial_inexistente");
    expect(r.ok).toBe(false);
  });

  test("excluir bloqueia filial com usuários vinculados", () => {
    const usuarios = AuthService.obterUsuarios();
    const { filial } = FiliaisStorage.adicionar({ nome: "Com Users" });
    usuarios.push({ id: "u3", nome: "func3", orgId: "ORG_FIL", role: "user", filialId: filial.id });
    AuthService.salvarUsuarios(usuarios);

    const r = FiliaisStorage.excluir(filial.id);
    expect(r.ok).toBe(false);
    expect(FiliaisStorage.buscarPorId(filial.id)).not.toBeNull();
  });

  test("desvincular usuário (filialId null) permite exclusão", () => {
    const usuarios = AuthService.obterUsuarios();
    const { filial } = FiliaisStorage.adicionar({ nome: "Livre" });
    usuarios.push({ id: "u4", nome: "func4", orgId: "ORG_FIL", role: "user", filialId: filial.id });
    AuthService.salvarUsuarios(usuarios);

    FiliaisStorage.vincularUsuario("u4", null);
    const r = FiliaisStorage.excluir(filial.id);
    expect(r.ok).toBe(true);
  });
});

describe("FiliaisStorage — Isolamento por organização", () => {
  test("filiais de orgs diferentes não se misturam", () => {
    FiliaisStorage.adicionar({ nome: "Filial ORG_FIL" });

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({ id: "22222", orgId: "ORG_OUTRA", role: "admin" }));
    expect(FiliaisStorage.buscarTodos()).toHaveLength(0);
  });
});

describe("FiliaisStorage — Endereço principal da filial (#164)", () => {
  test("adicionar guarda o endereço postal informado", () => {
    const r = FiliaisStorage.adicionar({
      nome: "Matriz End",
      endereco: { logradouro: "Rua A", numero: "100", municipio: "Floripa", uf: "SC", cep: "88000-000" },
    });
    expect(r.ok).toBe(true);
    expect(r.filial.endereco.logradouro).toBe("Rua A");
    expect(r.filial.endereco.municipio).toBe("Floripa");
    expect(r.filial.endereco.uf).toBe("SC");
  });

  test("adicionar sem endereço cria objeto de endereço vazio (não quebra)", () => {
    const r = FiliaisStorage.adicionar({ nome: "Sem Endereco" });
    expect(r.ok).toBe(true);
    expect(r.filial.endereco).toBeDefined();
    expect(r.filial.endereco.logradouro).toBe("");
  });

  test("atualizar mescla o endereço preservando campos não enviados", () => {
    const { filial } = FiliaisStorage.adicionar({
      nome: "Merge End",
      endereco: { logradouro: "Rua B", municipio: "Blumenau", uf: "SC" },
    });
    FiliaisStorage.atualizar(filial.id, { endereco: { numero: "50" } });
    const atual = FiliaisStorage.buscarPorId(filial.id);
    expect(atual.endereco.numero).toBe("50");
    expect(atual.endereco.logradouro).toBe("Rua B"); // preservado
    expect(atual.endereco.municipio).toBe("Blumenau"); // preservado
  });

  test("endereço postal é independente dos endereços de estoque", () => {
    const { filial } = FiliaisStorage.adicionar({
      nome: "Independente",
      endereco: { logradouro: "Rua C" },
      enderecosEstoque: ["end_geral"],
    });
    expect(filial.endereco.logradouro).toBe("Rua C");
    expect(filial.enderecosEstoque).toEqual(["end_geral"]);
  });
});
