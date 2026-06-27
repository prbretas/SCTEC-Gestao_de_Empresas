/**
 * settings.js — Lógica da tela de Configurações do Sistema.
 */

// Guard de rota — apenas Admin pode acessar Configurações
if (window.AuthService) AuthService.requireAuth(true);

let configAtual = ConfigController.obter();

document.addEventListener("DOMContentLoaded", () => {
  ConfigController.aplicar(configAtual);
  carregarFormulario(configAtual);
  initDarkMode();
  initEventos();
  renderizarModulos();
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
}

function initDarkMode() {
  const switchBtn = document.querySelector("#dark-mode-switch");
  const aplicar = (dark) => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("SCTEC_THEME", dark ? "dark" : "light");
    if (switchBtn) switchBtn.checked = dark;
  };
  aplicar(localStorage.getItem("SCTEC_THEME") === "dark");
  switchBtn?.addEventListener("change", (e) => aplicar(e.target.checked));
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
