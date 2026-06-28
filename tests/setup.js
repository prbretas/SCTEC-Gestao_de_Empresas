/**
 * setup.js — Carrega os modulos JS do projeto no contexto global do Jest/jsdom.
 */

const fs = require('fs');
const path = require('path');

// Polyfills para Web Crypto API (necessário para auth.js que usa crypto.subtle)
const { TextEncoder, TextDecoder } = require('util');
const { webcrypto } = require('crypto');
if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder;
if (!globalThis.crypto || !globalThis.crypto.subtle) globalThis.crypto = webcrypto;

function carregarScript(arquivo) {
  const codigo = fs.readFileSync(path.join(__dirname, '..', 'js', arquivo), 'utf8');
  // Cria funcao com acesso ao window/global do jsdom
  // eslint-disable-next-line no-new-func
  const scriptFn = new Function('window', 'document', 'localStorage', 'fetch', codigo);
  scriptFn(
    globalThis,
    globalThis.document,
    globalThis.localStorage,
    globalThis.fetch
  );
}

// Registra ConfigController
const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
const configCodeGlobal = configCode
  .replace(/^const\s+CONFIG_KEY\s*=/m, 'globalThis.CONFIG_KEY =')
  .replace(/^const\s+CONFIG_PADRAO\s*=/m, 'globalThis.CONFIG_PADRAO =')
  .replace(/^const\s+ConfigController\s*=/m, 'globalThis.ConfigController =')
  .replace(/window\.ConfigController\s*=\s*ConfigController;?/, '');
// eslint-disable-next-line no-new-func
new Function('globalThis', 'localStorage', configCodeGlobal)(globalThis, globalThis.localStorage);

// Registra Utils no global para que os testes possam usar diretamente
const utilsCode = fs.readFileSync(path.join(__dirname, '../js/utils.js'), 'utf8');
// Substitui "const Utils" por "globalThis.Utils" para forcar escopo global
const utilsCodeGlobal = utilsCode.replace(/^const\s+Utils\s*=/m, 'globalThis.Utils =');
// eslint-disable-next-line no-new-func
new Function('globalThis', utilsCodeGlobal)(globalThis);

// Registra EmpreendimentoStorage
const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
const storageCodeGlobal = storageCode
  .replace(/^const\s+STORAGE_KEY\s*=/m, 'globalThis.STORAGE_KEY =')
  .replace(/^const\s+EmpreendimentoStorage\s*=/m, 'globalThis.EmpreendimentoStorage =');
// eslint-disable-next-line no-new-func
new Function('globalThis', 'localStorage', storageCodeGlobal)(globalThis, globalThis.localStorage);

// Registra ApiService
const apiCode = fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8');
const apiCodeGlobal = apiCode
  .replace(/^const\s+ApiService\s*=/m, 'globalThis.ApiService =')
  .replace(/window\.ApiService\s*=\s*ApiService;?/, '');
// eslint-disable-next-line no-new-func
new Function('globalThis', 'fetch', apiCodeGlobal)(globalThis, globalThis.fetch);
