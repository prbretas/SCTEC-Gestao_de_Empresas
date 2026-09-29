/**
 * error.js — Handler central de erros. Converte exceções em resposta
 * padronizada { ok:false, error } sem vazar detalhes internos ao cliente.
 */
const { erro } = require("../lib/respostas");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || "ERRO_INTERNO";
  const message = status === 500 ? "Erro interno do servidor." : (err.message || "Erro.");
  if (status === 500) {
    // Log interno (não expõe ao cliente)
    console.error("[erro]", err);
  }
  return erro(res, status, code, message, err.fields);
}

function notFound(req, res) {
  return erro(res, 404, "NAO_ENCONTRADO", "Rota não encontrada.");
}

module.exports = { errorHandler, notFound };
