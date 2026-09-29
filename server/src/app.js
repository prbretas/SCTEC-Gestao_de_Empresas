/**
 * app.js — Monta o Express. Recebe os repositórios por injeção para que os
 * testes usem repositórios in-memory e a produção use os do PostgreSQL.
 */
const express = require("express");
const cors = require("cors");
const { criarAuthRouter } = require("./modules/auth/auth.routes");
const { criarPedidosRouter } = require("./modules/pedidos/pedidos.routes");
const { errorHandler, notFound } = require("./middlewares/error");

/**
 * @param {object} deps { authRepo, pedidosRepo }
 */
function criarApp(deps) {
  const app = express();

  const origins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(cors(origins.length ? { origin: origins } : undefined));
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/v1/health", (req, res) => res.json({ ok: true, data: { status: "up" } }));

  app.use("/api/v1/auth", criarAuthRouter(deps.authRepo));
  app.use("/api/v1/pedidos", criarPedidosRouter(deps.pedidosRepo));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { criarApp };
