/**
 * auth.test.js — Testes do módulo de autenticação (auth.js)
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("util");
const nodeCrypto = require("crypto");

// Garante polyfills disponíveis no ambiente node
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.crypto = nodeCrypto.webcrypto;

// Simula localStorage/sessionStorage (não existe no ambiente node puro)
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

// Carrega auth.js no contexto global — usa globalThis.crypto diretamente
beforeAll(() => {
  const code = fs.readFileSync(path.join(__dirname, "../js/auth.js"), "utf8");
  // Injeta crypto do Node.js no topo do código para que auth.js o encontre no escopo
  const withCryptoPolyfill = `const crypto = globalThis.crypto;\n${code}`;
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", withCryptoPolyfill)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage
  );
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("AuthService — Validação de Nickname", () => {
  test("aceita nickname válido (letras, números, underline)", async () => {
    const r = await AuthService.cadastrar("philippe_83", "senha1234", "Qual sua cidade?", "joinville");
    expect(r.ok).toBe(true);
  });

  test("rejeita nickname com menos de 3 caracteres", async () => {
    const r = await AuthService.cadastrar("ab", "senha1234", "Pergunta?", "resposta");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/3 caracteres/);
  });

  test("rejeita nickname com espaço", async () => {
    const r = await AuthService.cadastrar("phi lippe", "senha1234", "Pergunta?", "resposta");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/underline/i);
  });

  test("rejeita nickname com mais de 20 caracteres", async () => {
    const r = await AuthService.cadastrar("a".repeat(21), "senha1234", "Pergunta?", "resposta");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/20/);
  });

  test("rejeita nickname duplicado", async () => {
    await AuthService.cadastrar("joao", "senha1234", "Pergunta?", "resposta");
    const r = await AuthService.cadastrar("joao", "outrasenha", "Pergunta2?", "resposta2");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/uso/);
  });
});

describe("AuthService — Cadastro e Login", () => {
  test("cadastro sem convite cria Admin com orgId", async () => {
    const r = await AuthService.cadastrar("admin_user", "pass1234", "P?", "r");
    expect(r.ok).toBe(true);
    expect(r.usuario.role).toBe("admin");
    expect(r.usuario.orgId).toBeTruthy();
    expect(r.org).toBeTruthy();
  });

  test("cadastro com código de convite cria Usuário Padrão", async () => {
    const adminR = await AuthService.cadastrar("admin2", "pass1234", "P?", "r");
    const codigo = adminR.org.codigoConvite;
    const userR = await AuthService.cadastrar("user_conv", "pass5678", "P2?", "r2", codigo);
    expect(userR.ok).toBe(true);
    expect(userR.usuario.role).toBe("user");
    expect(userR.usuario.orgId).toBe(adminR.org.id);
  });

  test("login correto cria sessão com identidade nickname#ID", async () => {
    await AuthService.cadastrar("logintest", "senha9876", "P?", "r");
    const r = await AuthService.login("logintest", "senha9876");
    expect(r.ok).toBe(true);
    const sessao = AuthService.obterSessao();
    expect(sessao).not.toBeNull();
    expect(sessao.nome).toBe("logintest");
    expect(sessao.identidade).toMatch(/logintest#/);
  });

  test("login com senha errada falha", async () => {
    await AuthService.cadastrar("usuarioteste", "correta", "P?", "r");
    const r = await AuthService.login("usuarioteste", "errada");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/incorreta/i);
  });

  test("login com usuário inexistente falha", async () => {
    const r = await AuthService.login("naoexiste", "qualquer");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/não encontrado/i);
  });
});

describe("AuthService — Recuperação de Senha", () => {
  test("redefinir senha com resposta correta funciona", async () => {
    await AuthService.cadastrar("rectest", "senha123", "Qual cidade?", "florianopolis");
    const r = await AuthService.redefinirSenha("rectest", "florianopolis", "novasenha456");
    expect(r.ok).toBe(true);
    const login = await AuthService.login("rectest", "novasenha456");
    expect(login.ok).toBe(true);
  });

  test("redefinir senha com resposta errada falha", async () => {
    await AuthService.cadastrar("rectest2", "senha123", "Qual cidade?", "blumenau");
    const r = await AuthService.redefinirSenha("rectest2", "resposta_errada", "novasenha");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/incorreta/i);
  });
});

describe("AuthService — Organização", () => {
  test("código de convite inválido rejeita cadastro", async () => {
    const r = await AuthService.cadastrar("inv_user", "pass", "P?", "r", "SCTEC-ORG-00000");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/convite/i);
  });

  test("chave de dados usa orgId quando disponível", async () => {
    const adminR = await AuthService.cadastrar("orgadmin", "pass1234", "P?", "r");
    sessionStorage.setItem("SCTEC_SESSION", JSON.stringify({
      id: adminR.usuario.id,
      nome: adminR.usuario.nome,
      role: "admin",
      orgId: adminR.usuario.orgId,
      identidade: `orgadmin#${adminR.usuario.id}`,
    }));
    const chave = AuthService.obterChaveDados();
    expect(chave).toBe(`SCTEC_DATA_ORG_${adminR.usuario.orgId}`);
  });
});
