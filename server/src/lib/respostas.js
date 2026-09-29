/**
 * respostas.js — Helpers de resposta padronizada { ok, data, error }.
 * Mesmo contrato descrito no ESTUDO_BACKEND_API_144.md.
 */
function ok(res, data, meta, status = 200) {
  const body = { ok: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function erro(res, status, code, message, fields) {
  const error = { code, message };
  if (fields) error.fields = fields;
  return res.status(status).json({ ok: false, error });
}

module.exports = { ok, erro };
