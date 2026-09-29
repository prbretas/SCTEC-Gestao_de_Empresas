/**
 * auth.test.js — Testes de registro/login (repos in-memory, sem banco).
 */
const request = require("supertest");
const { criarApp } = require("../src/app");
const { criarAuthRepoMemoria } = require("../src/modules/auth/auth.repository.memory");
const { criarRepoMemoria } = require("../src/modules/pedidos/pedidos.repository.memory");

process.env.JWT_SECRET = "test-secret";

function novaApp() {
  return criarApp({ authRepo: criarAuthRepoMemoria(), pedidosRepo: criarRepoMemoria() });
}

describe("Auth API", () => {
  test("registro cria org+admin e retorna token", async () => {
    const app = novaApp();
    const res = await request(app).post("/api/v1/auth/register")
      .send({ nome: "Piloto", email: "a@b.com", senha: "secreta" });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.usuario.role).toBe("admin");
  });

  test("registro rejeita e-mail duplicado", async () => {
    const app = novaApp();
    await request(app).post("/api/v1/auth/register").send({ nome: "A", email: "dup@b.com", senha: "secreta" });
    const res = await request(app).post("/api/v1/auth/register").send({ nome: "B", email: "dup@b.com", senha: "secreta" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_DUPLICADO");
  });

  test("registro rejeita senha curta", async () => {
    const app = novaApp();
    const res = await request(app).post("/api/v1/auth/register").send({ nome: "A", email: "c@b.com", senha: "123" });
    expect(res.status).toBe(400);
  });

  test("login com credenciais válidas retorna token", async () => {
    const app = novaApp();
    await request(app).post("/api/v1/auth/register").send({ nome: "A", email: "log@b.com", senha: "secreta" });
    const res = await request(app).post("/api/v1/auth/login").send({ email: "log@b.com", senha: "secreta" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  test("login com senha errada retorna 401", async () => {
    const app = novaApp();
    await request(app).post("/api/v1/auth/register").send({ nome: "A", email: "x@b.com", senha: "secreta" });
    const res = await request(app).post("/api/v1/auth/login").send({ email: "x@b.com", senha: "errada" });
    expect(res.status).toBe(401);
  });

  test("health responde up", async () => {
    const res = await request(novaApp()).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("up");
  });
});
