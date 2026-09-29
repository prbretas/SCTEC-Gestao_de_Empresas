/**
 * server.js — Ponto de entrada em produção/dev. Usa os repositórios do
 * PostgreSQL e sobe o HTTP na porta configurada.
 */
const { criarApp } = require("./app");
const authRepo = require("./modules/auth/auth.repository.pg");
const pedidosRepo = require("./modules/pedidos/pedidos.repository.pg");

const app = criarApp({ authRepo, pedidosRepo });
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`SCTEC backend ouvindo em http://localhost:${port} (API: /api/v1)`);
});
