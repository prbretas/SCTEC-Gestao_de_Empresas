/**
 * auth.routes.js — Registro e login com bcrypt + JWT.
 * No registro, cria a organização e o usuário admin. No login, emite o JWT
 * com { sub, orgId, role, nome }.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ok, erro } = require("../../lib/respostas");

function _emitirToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, orgId: usuario.orgId, role: usuario.role, nome: usuario.nome },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES || "15m" }
  );
}

function criarAuthRouter(repo) {
  const router = express.Router();

  router.post("/register", async (req, res, next) => {
    try {
      const { nome, email, senha, nomeOrg } = req.body || {};
      if (!nome || !email || !senha) {
        return erro(res, 400, "VALIDACAO", "Nome, e-mail e senha são obrigatórios.");
      }
      if (String(senha).length < 6) {
        return erro(res, 400, "VALIDACAO", "A senha deve ter pelo menos 6 caracteres.");
      }
      if (await repo.buscarPorEmail(email)) {
        return erro(res, 409, "EMAIL_DUPLICADO", "E-mail já cadastrado.");
      }
      const senhaHash = await bcrypt.hash(String(senha), 10);
      const org = await repo.criarOrg(nomeOrg || "Minha Organização");
      const usuario = await repo.criarUsuario({ nome, email, senhaHash, orgId: org.id, role: "admin" });
      const token = _emitirToken(usuario);
      return ok(res, { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, orgId: usuario.orgId, role: usuario.role } }, undefined, 201);
    } catch (e) { return next(e); }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { email, senha } = req.body || {};
      if (!email || !senha) return erro(res, 400, "VALIDACAO", "E-mail e senha são obrigatórios.");
      const usuario = await repo.buscarPorEmail(email);
      if (!usuario) return erro(res, 401, "CREDENCIAIS", "E-mail ou senha inválidos.");
      const confere = await bcrypt.compare(String(senha), usuario.senhaHash);
      if (!confere) return erro(res, 401, "CREDENCIAIS", "E-mail ou senha inválidos.");
      const token = _emitirToken(usuario);
      return ok(res, { token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, orgId: usuario.orgId, role: usuario.role } });
    } catch (e) { return next(e); }
  });

  return router;
}

module.exports = { criarAuthRouter };
