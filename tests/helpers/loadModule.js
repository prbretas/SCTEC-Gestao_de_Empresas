/**
 * loadModule.js — Helper para carregar módulos JS no contexto de testes Jest/jsdom.
 */
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");

/**
 * Carrega um arquivo JS completo no contexto global.
 */
function loadFull(file) {
  const code = fs.readFileSync(path.join(__dirname, "../../js", file), "utf8");
  const cryptoCtx = (globalThis.crypto && globalThis.crypto.subtle) ? globalThis.crypto : webcrypto;
  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", "crypto", code)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage, cryptoCtx
  );
}

/**
 * Carrega apenas a porção de um arquivo JS até o primeiro document.addEventListener,
 * renomeando o primeiro "const NomeStorage" para "globalThis.NomeStorage".
 */
function loadStorageOnly(file, storageName) {
  let code = fs.readFileSync(path.join(__dirname, "../../js", file), "utf8");

  // Corta tudo a partir do document.addEventListener
  const cutIdx = code.indexOf("document.addEventListener");
  if (cutIdx > -1) {
    code = code.substring(0, cutIdx);
  }

  // Renomeia const para globalThis
  code = code.replace(
    new RegExp(`^const\\s+${storageName}\\s*=`, "m"),
    `globalThis.${storageName} =`
  );

  // Renomeia const _fmt se presente
  code = code.replace(/^const _fmt/m, "globalThis._fmt");

  // Renomeia ETAPAS se presente
  code = code.replace(/^const ETAPAS/m, "globalThis.ETAPAS");

  // eslint-disable-next-line no-new-func
  new Function("globalThis", "window", "localStorage", "sessionStorage", "crypto", code)(
    globalThis, globalThis, globalThis.localStorage, globalThis.sessionStorage, globalThis.crypto
  );
}

module.exports = { loadFull, loadStorageOnly };
