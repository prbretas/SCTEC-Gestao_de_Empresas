/**
 * modules.test.js — Testes do sistema de módulos (modules.js)
 */

const fs = require("fs");
const path = require("path");

beforeAll(() => {
  // Carrega auth.js (necessário para obterSessao)
  const authCode = fs.readFileSync(path.join(__dirname, "../src/js/core/auth.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", "crypto", authCode)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage, globalThis.crypto
  );

  // Carrega modules.js
  const code = fs.readFileSync(path.join(__dirname, "../src/js/core/modules.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", code)(
    globalThis, globalThis, globalThis.localStorage
  );
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
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
