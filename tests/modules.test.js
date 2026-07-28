/**
 * modules.test.js — Testes do sistema de módulos (modules.js)
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

beforeAll(() => {
  // Carrega auth.js (necessário para obterSessao)
  const authCode = fs.readFileSync(path.join(__dirname, "../src/js/core/auth.js"), "utf8");
  const authWithCrypto = `const crypto = globalThis.crypto;\n${authCode}`;
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", authWithCrypto)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage
  );

  // Carrega roles.js (necessário para obterModulosPermitidos)
  const rolesCode = fs.readFileSync(path.join(__dirname, "../src/js/core/roles.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", rolesCode)(
    globalThis, globalThis, globalThis.localStorage
  );

  // Carrega modules.js
  const modulesCode = fs.readFileSync(path.join(__dirname, "../src/js/core/modules.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", modulesCode)(
    globalThis, globalThis, globalThis.localStorage
  );
});

beforeEach(() => {
  mockLS.clear();
  mockSS.clear();
});

describe("ModulesController — Estado dos módulos", () => {
  test("todos os módulos são ativos por padrão", () => {
    const estado = ModulesController.obterEstado();
    MODULOS_CATALOGO.forEach((m) => {
      expect(estado[m.id]).not.toBe(false);
    });
  });

  test("definir módulo como inativo persiste", () => {
    ModulesController.definir("crm", false);
    expect(ModulesController.isAtivo("crm")).toBe(false);
  });

  test("reativar módulo funciona", () => {
    ModulesController.definir("crm", false);
    ModulesController.definir("crm", true);
    expect(ModulesController.isAtivo("crm")).toBe(true);
  });
});

describe("ModulesController — Visibilidade por role", () => {
  test("módulos adminOnly não aparecem para usuário padrão", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "12345", nome: "user", role: "user", orgId: "99999",
    }));
    const visiveis = ModulesController.obterModulosVisiveis();
    const idsVisiveis = visiveis.map((m) => m.id);
    expect(idsVisiveis).not.toContain("settings");
    expect(idsVisiveis).not.toContain("admin");
  });

  test("módulos adminOnly aparecem para admin", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "12345", nome: "admin", role: "admin", orgId: "99999",
    }));
    const visiveis = ModulesController.obterModulosVisiveis();
    const idsVisiveis = visiveis.map((m) => m.id);
    expect(idsVisiveis).toContain("settings");
    expect(idsVisiveis).toContain("admin");
  });

  test("módulo inativo não aparece em obterModulosVisiveis", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "12345", nome: "admin", role: "admin", orgId: "99999",
    }));
    ModulesController.definir("crm", false);
    const visiveis = ModulesController.obterModulosVisiveis();
    expect(visiveis.map((m) => m.id)).not.toContain("crm");
  });
});

describe("ModulesController — Filtragem por papel (modulosPermitidos)", () => {
  const ORG_ID = "77001";
  const COD_BASE = "SCTEC-ORG-77001";

  test("usuário sem papel vê todos os módulos ativos não-adminOnly (fallback)", () => {
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "u1", nome: "user1", role: "user", orgId: ORG_ID, papelId: null,
    }));
    const visiveis = ModulesController.obterModulosVisiveis();
    const ids = visiveis.map((m) => m.id);
    expect(ids).toContain("crm");
    expect(ids).toContain("financeiro");
    expect(ids).toContain("cadastros");
    expect(ids).not.toContain("settings");
    expect(ids).not.toContain("admin");
  });

  test("papel com modulosPermitidos restritos filtra corretamente", () => {
    // Cria papel com apenas cadastros e crm
    const papel = RolesController.criar(ORG_ID, "Vendedor", COD_BASE);
    RolesController.definirModulos(ORG_ID, papel.papel.id, ["cadastros", "crm"]);

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "u2", nome: "user2", role: "user", orgId: ORG_ID, papelId: papel.papel.id,
    }));

    const visiveis = ModulesController.obterModulosVisiveis();
    const ids = visiveis.map((m) => m.id);
    expect(ids).toContain("cadastros");
    expect(ids).toContain("crm");
    expect(ids).not.toContain("financeiro");
    expect(ids).not.toContain("propostas");
    expect(ids).not.toContain("agenda");
  });

  test("papel com modulosPermitidos null (sem restrição) vê todos os módulos ativos não-adminOnly", () => {
    const papel = RolesController.criar(ORG_ID, "Gerente", COD_BASE);
    RolesController.definirModulos(ORG_ID, papel.papel.id, null);

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "u3", nome: "user3", role: "user", orgId: ORG_ID, papelId: papel.papel.id,
    }));

    const visiveis = ModulesController.obterModulosVisiveis();
    const ids = visiveis.map((m) => m.id);
    expect(ids).toContain("crm");
    expect(ids).toContain("financeiro");
    expect(ids).not.toContain("settings");
  });

  test("admin vê todos os módulos ativos independente do papel", () => {
    const papel = RolesController.criar(ORG_ID, "Suporte", COD_BASE);
    RolesController.definirModulos(ORG_ID, papel.papel.id, ["cadastros"]);

    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "a1", nome: "admin1", role: "admin", orgId: ORG_ID, papelId: papel.papel.id,
    }));

    const visiveis = ModulesController.obterModulosVisiveis();
    const ids = visiveis.map((m) => m.id);
    // Admin ignora restrição de papel
    expect(ids).toContain("crm");
    expect(ids).toContain("financeiro");
    expect(ids).toContain("settings");
    expect(ids).toContain("admin");
  });

  test("módulo desativado na org não aparece mesmo se papel permite", () => {
    const papel = RolesController.criar(ORG_ID, "Analista", COD_BASE);
    RolesController.definirModulos(ORG_ID, papel.papel.id, ["crm", "financeiro"]);

    // Seta sessão ANTES de chamar definir, para que a chave da org seja usada
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: "u4", nome: "user4", role: "user", orgId: ORG_ID, papelId: papel.papel.id,
    }));
    ModulesController.definir("crm", false); // agora salva em SCTEC_MODULES_77001

    const visiveis = ModulesController.obterModulosVisiveis();
    expect(visiveis.map((m) => m.id)).not.toContain("crm");
    expect(visiveis.map((m) => m.id)).toContain("financeiro");
  });
});

describe("MODULOS_CATALOGO — Integridade", () => {
  test("todos os módulos têm id, label, icon e url", () => {
    MODULOS_CATALOGO.forEach((m) => {
      expect(m.id).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.icon).toBeTruthy();
      expect(m.url).toBeTruthy();
    });
  });

  test("não há ids duplicados no catálogo", () => {
    const ids = MODULOS_CATALOGO.map((m) => m.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });
});
