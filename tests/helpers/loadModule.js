/**
 * loadModule.js — Helper para carregar módulos JS no contexto de testes Jest/jsdom.
 * Resolve automaticamente o caminho correto dentro de src/js/{core,pages,modules,shared}.
 */
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");

/** Mapeia nome de arquivo → subpasta dentro de src/js/ */
const JS_PATH_MAP = {
  // core
  "auth.js":       "core",
  "config.js":     "core",
  "storage.js":    "core",
  "theme.js":      "core",
  "navbar.js":     "core",
  "inactivity.js": "core",
  "modules.js":    "core",
  // pages
  "login.js":      "pages",
  "register.js":   "pages",
  "home.js":       "pages",
  "admin.js":      "pages",
  "dashboard.js":  "pages",
  "settings.js":   "pages",
  // modules
  "agenda.js":     "modules",
  "crm.js":        "modules",
  "financeiro.js": "modules",
  "propostas.js":  "modules",
  // shared
  "api.js":        "shared",
  "utils.js":      "shared",
  "ui.js":         "shared",
  "forms.js":      "shared",
  "contatos.js":   "shared",
  "tarefas.js":    "shared",
  "main.js":       "shared",
};

function resolveJsPath(file) {
  const subfolder = JS_PATH_MAP[file];
  if (!subfolder) throw new Error(`loadModule: arquivo desconhecido "${file}". Adicione em JS_PATH_MAP.`);
  return path.join(__dirname, "../../src/js", subfolder, file);
}

/**
 * Carrega um arquivo JS completo no contexto global.
 */
function loadFull(file) {
  const code = fs.readFileSync(resolveJsPath(file), "utf8");
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
  let code = fs.readFileSync(resolveJsPath(file), "utf8");

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
