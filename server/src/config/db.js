/**
 * db.js — Pool de conexão PostgreSQL (lazy).
 * O pool só é criado quando `getPool()` é chamado pela primeira vez, para que
 * a aplicação e os testes (que usam repositório in-memory) não exijam um banco
 * ativo apenas para carregar os módulos.
 */
const { Pool } = require("pg");

let _pool = null;

function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return _pool;
}

/**
 * Executa uma query parametrizada (proteção contra SQL Injection).
 * @param {string} text
 * @param {Array} params
 */
async function query(text, params) {
  return getPool().query(text, params);
}

async function close() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

module.exports = { getPool, query, close };
