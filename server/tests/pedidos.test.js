/**
 * pedidos.test.js — Testes do CRUD de Pedido de Venda (repos in-memory).
 * Cobre autenticação exigida, isolamento por org e cálculo de total.
 */
const request = require("supertest");
const { criarApp } = require("../src/app");
const { criarAuthRepoMemoria } = require("../src/modules/auth/auth.repository.memory");
const { criarRepoMemoria } = require("../src/modules/pedidos/pedidos.repository.memory");

process.env.JWT_SECRET = "test-secret";

async function setup() {
  const app = criarApp({ authRepo: criarAuthRepoMemoria(), pedidosRepo: criarRepoMemoria() });
  const reg = await request(app).post("/api/v1/auth/register")
    .send({ nome: "Dono", email: "dono@b.com", senha: "secreta" });
  return { app, token: reg.body.data.token };
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe("Pedidos API", () => {
  test("exige autenticação", async () => {
    const { app } = await setup();
    const res = await request(app).get("/api/v1/pedidos");
    expect(res.status).toBe(401);
  });

  test("cria pedido calculando total dos itens", async () => {
    const { app, token } = await setup();
    const res = await request(app).post("/api/v1/pedidos").set(auth(token)).send({
      titulo: "Proposta A", empresaId: "10",
      itens: [{ produtoId: "1", qtd: 2, valor: 150 }, { descricao: "Serviço", qtd: 1, valor: 300 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(600);
    expect(res.body.data.itens).toHaveLength(2);
    expect(res.body.data.id).toBeTruthy();
  });

  test("rejeita pedido sem título/empresa (400 + fields)", async () => {
    const { app, token } = await setup();
    const res = await request(app).post("/api/v1/pedidos").set(auth(token)).send({ itens: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.titulo).toBeTruthy();
    expect(res.body.error.fields.empresaId).toBeTruthy();
  });

  test("lista, obtém, atualiza e remove", async () => {
    const { app, token } = await setup();
    const criado = await request(app).post("/api/v1/pedidos").set(auth(token))
      .send({ titulo: "P", empresaId: "10", itens: [{ descricao: "x", qtd: 1, valor: 100 }] });
    const id = criado.body.data.id;

    const lista = await request(app).get("/api/v1/pedidos").set(auth(token));
    expect(lista.body.data).toHaveLength(1);

    const get = await request(app).get(`/api/v1/pedidos/${id}`).set(auth(token));
    expect(get.body.data.titulo).toBe("P");

    const upd = await request(app).put(`/api/v1/pedidos/${id}`).set(auth(token))
      .send({ titulo: "P editado", empresaId: "10", itens: [{ descricao: "x", qtd: 3, valor: 100 }] });
    expect(upd.body.data.titulo).toBe("P editado");
    expect(upd.body.data.total).toBe(300);

    const del = await request(app).delete(`/api/v1/pedidos/${id}`).set(auth(token));
    expect(del.status).toBe(204);

    const listaFinal = await request(app).get("/api/v1/pedidos").set(auth(token));
    expect(listaFinal.body.data).toHaveLength(0);
  });

  test("isolamento: pedido de uma org não aparece para outra", async () => {
    const { app, token } = await setup();
    await request(app).post("/api/v1/pedidos").set(auth(token))
      .send({ titulo: "da org 1", empresaId: "10", itens: [] });

    // segunda org/usuário
    const reg2 = await request(app).post("/api/v1/auth/register")
      .send({ nome: "Outro", email: "outro@b.com", senha: "secreta" });
    const lista2 = await request(app).get("/api/v1/pedidos").set(auth(reg2.body.data.token));
    expect(lista2.body.data).toHaveLength(0);
  });

  test("atualizar pedido inexistente retorna 404", async () => {
    const { app, token } = await setup();
    const res = await request(app).put("/api/v1/pedidos/nao-existe").set(auth(token))
      .send({ titulo: "x", empresaId: "1", itens: [] });
    expect(res.status).toBe(404);
  });
});
