/**
 * roles.test.js — Testes do sistema de papéis de trabalho (roles.js)
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("util");
const nodeCrypto = require("crypto");

// Polyfills — mesmo padrão de auth.test.js
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.crypto = nodeCrypto.webcrypto;

// Simula localStorage/sessionStorage
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

beforeAll(() => {
  // Carrega auth.js com polyfill de crypto (mesmo padrão de auth.test.js)
  const authCode = fs.readFileSync(path.join(__dirname, "../src/js/core/auth.js"), "utf8");
  const authWithCrypto = `const crypto = globalThis.crypto;\n${authCode}`;
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", authWithCrypto)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage
  );

  // Carrega roles.js
  const rolesCode = fs.readFileSync(path.join(__dirname, "../src/js/core/roles.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", rolesCode)(
    globalThis, globalThis, globalThis.localStorage
  );
});

beforeEach(() => {
  mockLS.clear();
  mockSS.clear();
});

// ─── CRUD de Papéis ──────────────────────────────────────────────────────────

describe("RolesController — CRUD básico", () => {
  const ORG_ID = "99001";
  const COD_BASE = "SCTEC-ORG-99001";

  test("cria um papel com nome válido", () => {
    const r = RolesController.criar(ORG_ID, "Vendedor", COD_BASE);
    expect(r.ok).toBe(true);
    expect(r.papel.nome).toBe("Vendedor");
    expect(r.papel.id).toBeTruthy();
    expect(r.papel.codigoConvite).toMatch(/SCTEC-ORG-99001-\d+/);
  });

  test("rejeita nome com menos de 2 caracteres", () => {
    const r = RolesController.criar(ORG_ID, "A", COD_BASE);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/2 caracteres/);
  });

  test("rejeita nome com mais de 40 caracteres", () => {
    const r = RolesController.criar(ORG_ID, "A".repeat(41), COD_BASE);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/40/);
  });

  test("rejeita nome duplicado (case-insensitive)", () => {
    RolesController.criar(ORG_ID, "Analista", COD_BASE);
    const r = RolesController.criar(ORG_ID, "analista", COD_BASE);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/já existe/i);
  });

  test("múltiplos papéis têm códigos de convite distintos", () => {
    RolesController.criar(ORG_ID, "Gerente", COD_BASE);
    RolesController.criar(ORG_ID, "Suporte", COD_BASE);
    const papeis = RolesController.obterPorOrg(ORG_ID);
    const codigos = papeis.map((p) => p.codigoConvite);
    const unicos = new Set(codigos);
    expect(unicos.size).toBe(codigos.length);
  });

  test("edita o nome de um papel existente", () => {
    const criado = RolesController.criar(ORG_ID, "Dev", COD_BASE);
    const r = RolesController.editar(ORG_ID, criado.papel.id, "Desenvolvedor");
    expect(r.ok).toBe(true);
    const papeis = RolesController.obterPorOrg(ORG_ID);
    const atualizado = papeis.find((p) => p.id === criado.papel.id);
    expect(atualizado.nome).toBe("Desenvolvedor");
  });

  test("edição rejeita nome duplicado com outro papel", () => {
    RolesController.criar(ORG_ID, "Marketing", COD_BASE);
    const criado2 = RolesController.criar(ORG_ID, "Comercial", COD_BASE);
    const r = RolesController.editar(ORG_ID, criado2.papel.id, "Marketing");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/já existe/i);
  });

  test("remove papel sem usuários vinculados", () => {
    const criado = RolesController.criar(ORG_ID, "Temporario", COD_BASE);
    const r = RolesController.remover(ORG_ID, criado.papel.id);
    expect(r.ok).toBe(true);
    const papeis = RolesController.obterPorOrg(ORG_ID);
    expect(papeis.find((p) => p.id === criado.papel.id)).toBeUndefined();
  });

  test("retorna erro ao remover papel com ID inexistente", () => {
    const r = RolesController.remover(ORG_ID, "nao-existe");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/não encontrado/i);
  });
});

// ─── Atribuição de Papel ─────────────────────────────────────────────────────

describe("RolesController — Atribuição de papel a usuário", () => {
  const COD_BASE = "SCTEC-ORG-88001";
  let adminId, orgId, papelId;

  beforeEach(async () => {
    const r = await AuthService.cadastrar("adminteste", "senha1234", "P?", "r");
    adminId = r.usuario.id;
    orgId = r.usuario.orgId;
    // Garante sessão para obterDaOrgAtual funcionar
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: adminId, nome: "adminteste", role: "admin", orgId,
    }));
    const papel = RolesController.criar(orgId, "Vendas", orgId);
    papelId = papel.papel.id;
  });

  test("atribui papel a um usuário com sucesso", () => {
    const r = RolesController.atribuirPapel(adminId, papelId);
    expect(r.ok).toBe(true);
    const usuario = AuthService.buscarPorId(adminId);
    expect(usuario.papelId).toBe(papelId);
  });

  test("remove papel do usuário ao passar null", () => {
    RolesController.atribuirPapel(adminId, papelId);
    const r = RolesController.atribuirPapel(adminId, null);
    expect(r.ok).toBe(true);
    const usuario = AuthService.buscarPorId(adminId);
    expect(usuario.papelId).toBeNull();
  });

  test("falha ao atribuir papel de outra organização", () => {
    const r = RolesController.atribuirPapel(adminId, "papel-inexistente");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/não encontrado/i);
  });

  test("falha ao atribuir papel a usuário inexistente", () => {
    const r = RolesController.atribuirPapel("usuario-nao-existe", papelId);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/não encontrado/i);
  });
});

// ─── Restrição de exclusão ────────────────────────────────────────────────────

describe("RolesController — Não pode excluir papel com usuários", () => {
  let adminId, orgId, papelId;

  beforeEach(async () => {
    const r = await AuthService.cadastrar("adm_excl", "senha1234", "P?", "r");
    adminId = r.usuario.id;
    orgId = r.usuario.orgId;
    const papel = RolesController.criar(orgId, "Financeiro", orgId);
    papelId = papel.papel.id;
    RolesController.atribuirPapel(adminId, papelId);
  });

  test("não pode excluir papel com usuários vinculados", () => {
    const r = RolesController.remover(orgId, papelId);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/vinculado/i);
  });

  test("pode excluir após remover o último usuário vinculado", () => {
    RolesController.atribuirPapel(adminId, null);
    const r = RolesController.remover(orgId, papelId);
    expect(r.ok).toBe(true);
  });
});

// ─── Isolamento por organização ───────────────────────────────────────────────

describe("RolesController — Isolamento por organização", () => {
  test("papéis de orgs distintas são isolados", async () => {
    const r1 = await AuthService.cadastrar("adm_iso1", "senha1234", "P?", "r");
    const r2 = await AuthService.cadastrar("adm_iso2", "senha5678", "P?", "r");

    RolesController.criar(r1.usuario.orgId, "PapelA", r1.org.codigoConvite);
    RolesController.criar(r2.usuario.orgId, "PapelB", r2.org.codigoConvite);

    const papeis1 = RolesController.obterPorOrg(r1.usuario.orgId);
    const papeis2 = RolesController.obterPorOrg(r2.usuario.orgId);

    expect(papeis1.map((p) => p.nome)).toContain("PapelA");
    expect(papeis1.map((p) => p.nome)).not.toContain("PapelB");
    expect(papeis2.map((p) => p.nome)).toContain("PapelB");
    expect(papeis2.map((p) => p.nome)).not.toContain("PapelA");
  });
});

// ─── Cadastro via código de convite de papel ──────────────────────────────────

describe("AuthService — Cadastro via código de convite de papel", () => {
  test("usuário que se cadastra com código de papel recebe o papelId correto", async () => {
    const adminR = await AuthService.cadastrar("adm_conv", "senha1234", "P?", "r");
    const orgId = adminR.usuario.orgId;
    const codBase = adminR.org.codigoConvite;

    const papelR = RolesController.criar(orgId, "Operador", codBase);
    const codigoPapel = papelR.papel.codigoConvite;

    const userR = await AuthService.cadastrar("operador01", "senha5678", "P2?", "r2", codigoPapel);
    expect(userR.ok).toBe(true);
    expect(userR.usuario.orgId).toBe(orgId);
    expect(userR.usuario.papelId).toBe(papelR.papel.id);
    expect(userR.usuario.role).toBe("user");
  });
});
