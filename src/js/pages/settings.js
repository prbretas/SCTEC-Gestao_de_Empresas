/**
 * settings.js — Lógica da tela de Configurações do Sistema.
 */

// Guard de rota — todos os usuários logados podem acessar Configurações
// (Admin pode ver todas as seções; usuários comuns veem apenas a seção Segurança)
if (window.AuthService) AuthService.requireAuth();

let configAtual = ConfigController.obter();

document.addEventListener("DOMContentLoaded", () => {
  ConfigController.aplicar(configAtual);
  if (window.NavbarController) NavbarController.init("settings");
  if (window.ThemeController) ThemeController.init();

  // Oculta seções de admin para usuários sem permissão
  const sessao = window.AuthService ? AuthService.obterSessao() : null;
  if (sessao && sessao.role !== "admin") {
    document.querySelectorAll("[data-admin-only]").forEach((el) => {
      el.style.display = "none";
    });
  }

  carregarFormulario(configAtual);
  initEventos();
  renderizarModulos();
  renderizarParametrosCentral(); // #175 — tela central de parâmetros
  document.querySelector("#btn-salvar-params-central")?.addEventListener("click", salvarParametrosCentral);
});

function carregarFormulario(config) {
  document.querySelector("#cfg-nome").value = config.nomeSistema;
  document.querySelector("#cfg-cor-header").value = config.cores.header;
  document.querySelector("#cfg-cor-header-hex").value = config.cores.header;
  document.querySelector("#cfg-cor-btn").value = config.cores.btn;
  document.querySelector("#cfg-cor-btn-hex").value = config.cores.btn;
  document.querySelector("#cfg-cor-destaque").value = config.cores.destaque;
  document.querySelector("#cfg-cor-destaque-hex").value = config.cores.destaque;
  atualizarPreview(config);
  renderizarSegmentos(config.segmentos);

  if (config.logoBase64) {
    document.querySelector("#logo-preview").innerHTML =
      `<img src="${config.logoBase64}" style="max-width:60px;max-height:60px;border-radius:6px;object-fit:contain;" />`;
  }
}

function atualizarPreview(config) {
  const preview = document.querySelector("#navbar-preview");
  const brand = document.querySelector("#preview-brand");
  if (preview) {
    preview.style.backgroundColor = config.cores.header;
    preview.style.borderBottomColor = config.cores.destaque;
  }
  if (brand) {
    brand.textContent = config.logoBase64
      ? `[Logo] ${config.nomeSistema || "SCTEC"}`
      : `🏭 ${config.nomeSistema || "SCTEC"}`;
  }
}

function renderizarSegmentos(segmentos) {
  const lista = document.querySelector("#segmentos-lista");
  if (!lista) return;
  lista.innerHTML = segmentos
    .map(
      (s) => `
    <span class="badge bg-secondary d-flex align-items-center gap-1 p-2" style="font-size:.85rem;">
      ${s}
      <button class="btn-close btn-close-white ms-1" style="font-size:.5rem;" aria-label="Remover" onclick="removerSegmento('${s}')"></button>
    </span>`
    )
    .join("");
}

function removerSegmento(nome) {
  configAtual.segmentos = configAtual.segmentos.filter((s) => s !== nome);
  renderizarSegmentos(configAtual.segmentos);
}

function initEventos() {
  const sincronizarCor = (pickerId, hexId, propriedade) => {
    const picker = document.querySelector(`#${pickerId}`);
    const hexInput = document.querySelector(`#${hexId}`);
    picker.addEventListener("input", () => {
      hexInput.value = picker.value;
      configAtual.cores[propriedade] = picker.value;
      atualizarPreview(configAtual);
      ConfigController.aplicar(configAtual);
    });
    hexInput.addEventListener("blur", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
        picker.value = hexInput.value;
        configAtual.cores[propriedade] = hexInput.value;
        atualizarPreview(configAtual);
        ConfigController.aplicar(configAtual);
      }
    });
  };
  sincronizarCor("cfg-cor-header", "cfg-cor-header-hex", "header");
  sincronizarCor("cfg-cor-btn", "cfg-cor-btn-hex", "btn");
  sincronizarCor("cfg-cor-destaque", "cfg-cor-destaque-hex", "destaque");

  document.querySelector("#cfg-nome").addEventListener("input", (e) => {
    configAtual.nomeSistema = e.target.value;
    atualizarPreview(configAtual);
  });

  document.querySelector("#cfg-logo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("❌ Arquivo muito grande. O limite é 20MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      configAtual.logoBase64 = ev.target.result;
      document.querySelector("#logo-preview").innerHTML =
        `<img src="${ev.target.result}" style="max-width:60px;max-height:60px;border-radius:6px;object-fit:contain;" />`;
      atualizarPreview(configAtual);
    };
    reader.readAsDataURL(file);
  });

  document.querySelector("#btn-remover-logo").addEventListener("click", () => {
    configAtual.logoBase64 = null;
    document.querySelector("#logo-preview").innerHTML = "🏭";
    atualizarPreview(configAtual);
  });

  document.querySelector("#btn-add-segmento").addEventListener("click", () => {
    const input = document.querySelector("#novo-segmento");
    const nome = input.value.trim();
    if (!nome) return;
    if (configAtual.segmentos.includes(nome)) {
      alert("Este segmento já existe.");
      return;
    }
    configAtual.segmentos.push(nome);
    renderizarSegmentos(configAtual.segmentos);
    input.value = "";
  });

  document.querySelector("#novo-segmento").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.querySelector("#btn-add-segmento").click();
  });

  document.querySelector("#btn-salvar-config").addEventListener("click", () => {
    configAtual.nomeSistema =
      document.querySelector("#cfg-nome").value.trim() ||
      "SCTEC - Gestão Empresarial";
    ConfigController.salvar(configAtual);
    alert("✅ Configurações salvas com sucesso!");
  });

  document.querySelector("#btn-restaurar-padrao").addEventListener("click", () => {
    if (!confirm("Deseja restaurar todas as configurações para o padrão original?")) return;
    ConfigController.restaurarPadrao();
    configAtual = ConfigController.obter();
    carregarFormulario(configAtual);
    alert("✅ Configurações restauradas.");
  });

  // Exportar configurações
  document.querySelector("#btn-exportar-config")?.addEventListener("click", () => {
    ConfigController.exportarConfiguracoes();
  });

  // Importar configurações
  document.querySelector("#input-importar-config")?.addEventListener("change", (e) => {
    ConfigController.importarConfiguracoes(e.target.files[0], (cfg) => {
      configAtual = cfg;
      carregarFormulario(configAtual);
      e.target.value = "";
    });
  });

  // ─── Alterar Senha ───────────────────────────────────────────────────────
  document.querySelector("#btn-alterar-senha")?.addEventListener("click", async () => {
    const senhaAtual = document.querySelector("#senha-atual").value;
    const senhaNova = document.querySelector("#senha-nova").value;
    const senhaConfirmar = document.querySelector("#senha-nova-confirmar").value;
    const msgEl = document.querySelector("#msg-alterar-senha");

    msgEl.textContent = "";
    msgEl.className = "mt-2 small";

    if (!senhaAtual) {
      msgEl.textContent = "⚠️ Informe a senha atual.";
      msgEl.classList.add("text-warning");
      return;
    }
    if (!senhaNova || senhaNova.length < 4) {
      msgEl.textContent = "⚠️ A nova senha deve ter pelo menos 4 caracteres.";
      msgEl.classList.add("text-warning");
      return;
    }
    if (senhaNova !== senhaConfirmar) {
      msgEl.textContent = "⚠️ As senhas não coincidem.";
      msgEl.classList.add("text-warning");
      return;
    }

    const resultado = await AuthService.alterarSenha(senhaAtual, senhaNova);
    if (resultado.ok) {
      msgEl.textContent = "✅ Senha alterada com sucesso!";
      msgEl.classList.add("text-success");
      document.querySelector("#senha-atual").value = "";
      document.querySelector("#senha-nova").value = "";
      document.querySelector("#senha-nova-confirmar").value = "";
    } else {
      msgEl.textContent = `❌ ${resultado.erro}`;
      msgEl.classList.add("text-danger");
    }
  });
}

/**
 * Renderiza os toggles de módulos na seção de Configurações.
 */
function renderizarModulos() {
  const container = document.querySelector("#modulos-lista");
  if (!container || !window.MODULOS_CATALOGO) return;

  const estado = window.ModulesController ? ModulesController.obterEstado() : {};

  container.innerHTML = MODULOS_CATALOGO.map((m) => {
    const isAtivo = estado[m.id] !== false;
    const adminLabel = m.adminOnly ? ' <span class="badge bg-warning text-dark ms-1" style="font-size:.65rem;">Admin</span>' : "";
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card border-0 bg-light p-3 d-flex flex-row align-items-center gap-3">
          <span style="font-size:1.8rem;">${m.icon}</span>
          <div class="flex-grow-1">
            <div class="fw-bold">${m.label}${adminLabel}</div>
            <div class="small text-muted">${m.url}</div>
          </div>
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch"
              id="mod-${m.id}"
              ${isAtivo ? "checked" : ""}
              onchange="toggleModulo('${m.id}', this.checked)"
            />
          </div>
        </div>
      </div>`;
  }).join("");
}

/**
 * Ativa ou desativa um módulo e re-renderiza a lista.
 */
function toggleModulo(moduleId, ativo) {
  if (window.ModulesController) {
    ModulesController.definir(moduleId, ativo);
  }
}

// ─── Tela central de Parâmetros do sistema (#175) ─────────────────────────────

/** Rótulo legível de uma rotina (usa o catálogo de módulos quando possível). */
function _rotuloRotina(rotina) {
  if (window.MODULOS_CATALOGO) {
    const mod = MODULOS_CATALOGO.find((m) => m.id === rotina);
    if (mod) return `${mod.icon} ${mod.label}`;
  }
  return rotina.charAt(0).toUpperCase() + rotina.slice(1);
}

/** Transforma uma chave camelCase em rótulo legível. */
function _rotuloCampo(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/**
 * #175 — Renderiza todos os parâmetros de todas as rotinas, agrupados por rotina.
 * Lê de ParamsController.obterTodos() (fonte única, sincronizada com cada rotina).
 */
function renderizarParametrosCentral() {
  const container = document.querySelector("#params-central-lista");
  if (!container || !window.ParamsController) return;

  const todos = ParamsController.obterTodos();
  const rotinas = Object.keys(todos);

  container.innerHTML = rotinas.map((rotina) => {
    const params = todos[rotina] || {};
    const campos = Object.entries(params).map(([key, value]) => {
      const label = _rotuloCampo(key);
      const idAttr = `pc-${rotina}-${key}`;
      const dataAttrs = `data-rotina="${rotina}" data-key="${key}"`;
      if (typeof value === "boolean") {
        return `<div class="col-md-6"><div class="form-check form-switch">
          <input class="form-check-input pc-field" type="checkbox" id="${idAttr}" ${dataAttrs} data-type="boolean" ${value ? "checked" : ""} />
          <label class="form-check-label small" for="${idAttr}">${label}</label>
        </div></div>`;
      }
      if (typeof value === "number") {
        return `<div class="col-md-6"><label class="form-label small mb-1" for="${idAttr}">${label}</label>
          <input type="number" class="form-control form-control-sm pc-field" id="${idAttr}" ${dataAttrs} data-type="number" value="${value}" /></div>`;
      }
      if (Array.isArray(value)) {
        return `<div class="col-12"><label class="form-label small mb-1" for="${idAttr}">${label}</label>
          <input type="text" class="form-control form-control-sm pc-field" id="${idAttr}" ${dataAttrs} data-type="array" value="${value.join(", ")}" />
          <div class="form-text small">Separe por vírgula</div></div>`;
      }
      return `<div class="col-md-6"><label class="form-label small mb-1" for="${idAttr}">${label}</label>
        <input type="text" class="form-control form-control-sm pc-field" id="${idAttr}" ${dataAttrs} data-type="string" value="${value}" /></div>`;
    }).join("");

    return `<div class="border rounded p-3 mb-3">
      <div class="fw-semibold mb-2">${_rotuloRotina(rotina)} <span class="text-muted small">(${rotina})</span></div>
      <div class="row g-2">${campos || '<div class="text-muted small">Sem parâmetros.</div>'}</div>
    </div>`;
  }).join("");
}

/**
 * #175 — Salva os parâmetros editados na tela central.
 * Agrupa por rotina e grava via ParamsController.salvar (sincroniza com a rotina).
 */
function salvarParametrosCentral() {
  if (!window.ParamsController) return;
  const porRotina = {};
  document.querySelectorAll(".pc-field").forEach((el) => {
    const rotina = el.dataset.rotina;
    const key = el.dataset.key;
    const tipo = el.dataset.type;
    if (!porRotina[rotina]) porRotina[rotina] = {};
    if (tipo === "boolean") porRotina[rotina][key] = el.checked;
    else if (tipo === "number") porRotina[rotina][key] = parseFloat(el.value) || 0;
    else if (tipo === "array") porRotina[rotina][key] = el.value.split(",").map((s) => s.trim()).filter(Boolean);
    else porRotina[rotina][key] = el.value;
  });

  Object.keys(porRotina).forEach((rotina) => ParamsController.salvar(rotina, porRotina[rotina]));

  const msg = document.querySelector("#params-central-msg");
  if (msg) {
    msg.textContent = "✅ Parâmetros salvos e sincronizados com as rotinas.";
    msg.className = "small mt-2 text-success";
    setTimeout(() => { msg.textContent = ""; }, 4000);
  }
  // Re-renderiza para refletir normalizações (ex.: arrays)
  renderizarParametrosCentral();
}
