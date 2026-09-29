/**
 * pedidos.routes.js — Rotas REST do Pedido de Venda (coleção piloto #144).
 * Todas exigem autenticação; o orgId vem do token (multi-tenant).
 */
const express = require("express");
const { authRequired } = require("../../middlewares/auth");
const { ok } = require("../../lib/respostas");
const { criarPedidosService } = require("./pedidos.service");

/**
 * @param {object} repo repositório (pg em produção, memory em teste)
 */
function criarPedidosRouter(repo) {
  const router = express.Router();
  const service = criarPedidosService(repo);

  router.use(authRequired);

  router.get("/", async (req, res, next) => {
    try {
      const data = await service.listar(req.user.orgId);
      return ok(res, data, { total: data.length });
    } catch (e) { return next(e); }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const data = await service.obter(req.user.orgId, req.params.id);
      if (!data) return ok(res, null, undefined, 404);
      return ok(res, data);
    } catch (e) { return next(e); }
  });

  router.post("/", async (req, res, next) => {
    try {
      const data = await service.criar(req.user.orgId, req.body, req.user.id);
      return ok(res, data, undefined, 201);
    } catch (e) { return next(e); }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const data = await service.atualizar(req.user.orgId, req.params.id, req.body);
      return ok(res, data);
    } catch (e) { return next(e); }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      await service.remover(req.user.orgId, req.params.id);
      return res.status(204).send();
    } catch (e) { return next(e); }
  });

  return router;
}

module.exports = { criarPedidosRouter };
