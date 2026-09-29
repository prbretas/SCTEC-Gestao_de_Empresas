/**
 * auth.js — Middleware de autenticação JWT.
 * Valida o header Authorization: Bearer <token> e popula req.user com
 * { id, orgId, role, nome }. O orgId é SEMPRE derivado do token (nunca do
 * corpo/query), garantindo o isolamento multi-tenant.
 */
const jwt = require("jsonwebtoken");
const { erro } = require("../lib/respostas");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");
  if (tipo !== "Bearer" || !token) {
    return erro(res, 401, "NAO_AUTENTICADO", "Token ausente ou malformado.");
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = {
      id: payload.sub,
      orgId: payload.orgId || null,
      role: payload.role || "user",
      nome: payload.nome || null,
    };
    return next();
  } catch {
    return erro(res, 401, "TOKEN_INVALIDO", "Token inválido ou expirado.");
  }
}

module.exports = { authRequired };
