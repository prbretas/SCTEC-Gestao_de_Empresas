/**
 * config.js — Gerenciamento de configurações e identidade visual do sistema.
 * Persiste em LocalStorage por organização: SCTEC_CONFIG_{orgId}
 * Fallback para SCTEC_CONFIG quando não há organização.
 */

const CONFIG_KEY_GLOBAL = "SCTEC_CONFIG";

const CONFIG_PADRAO = {
  nomeSistema: "SCTEC - Gestão Empresarial",
  logoBase64: null,
  cores: {
    header: "#333a60",
    btn: "#006ebc",
    destaque: "#67ff61",
  },
  segmentos: [
    "Tecnologia",
    "Indústria",
    "Logística",
    "Comércio",
    "Serviços",
    "Transportes",
    "Fornecedor",
    "Cliente",
  ],
};

const ConfigController = {

  /**
   * Retorna a chave de config para a org atual (ou global como fallback).
   */
  _obterChave() {
    try {
      if (window.AuthService) {
        const sessao = AuthService.obterSessao();
        if (sessao && sessao.orgId) return `SCTEC_CONFIG_${sessao.orgId}`;
      }
    } catch {}
    return CONFIG_KEY_GLOBAL;
  },

  /**
   * Retorna a config atual ou o padrão se não houver nada salvo.
   */
  obter() {
    try {
      const salvo = localStorage.getItem(this._obterChave());
      if (!salvo) return { ...CONFIG_PADRAO, cores: { ...CONFIG_PADRAO.cores }, segmentos: [...CONFIG_PADRAO.segmentos] };
      const config = JSON.parse(salvo);
      return {
        ...CONFIG_PADRAO,
        ...config,
        cores: { ...CONFIG_PADRAO.cores, ...config.cores },
        segmentos: config.segmentos || [...CONFIG_PADRAO.segmentos],
      };
    } catch {
      return { ...CONFIG_PADRAO, cores: { ...CONFIG_PADRAO.cores }, segmentos: [...CONFIG_PADRAO.segmentos] };
    }
  },

  /**
   * Salva a config no LocalStorage da org e aplica imediatamente na UI.
   */
  salvar(config) {
    localStorage.setItem(this._obterChave(), JSON.stringify(config));
    this.aplicar(config);
  },

  /**
   * Aplica as configurações na UI da página atual.
   * Na tela de login (sem sessão), usa identidade neutra.
   */
  aplicar(config) {
    if (!config) config = this.obter();

    const navbarBrand = document.querySelector(".navbar-brand");
    if (navbarBrand) {
      navbarBrand.innerHTML = config.logoBase64
        ? `<img src="${config.logoBase64}" alt="Logo" style="height:48px;max-width:180px;width:auto;margin-right:10px;vertical-align:middle;object-fit:contain;">${config.nomeSistema}`
        : `🏭 ${config.nomeSistema}`;
    }
    document.title = config.nomeSistema || "SCTEC";

    const root = document.documentElement;
    root.style.setProperty("--sc-header", config.cores.header);
    root.style.setProperty("--sc-btn", config.cores.btn);
    root.style.setProperty("--sc-btn-hover", this._escurecer(config.cores.btn, 15));
    root.style.setProperty("--sc-btn-active", this._escurecer(config.cores.btn, 25));
    root.style.setProperty("--sc-header2", config.cores.destaque);
  },

  /**
   * Restaura as configurações para o padrão original da org atual.
   */
  restaurarPadrao() {
    localStorage.removeItem(this._obterChave());
    this.aplicar(CONFIG_PADRAO);
  },

  obterSegmentos() {
    return this.obter().segmentos;
  },

  /**
   * Exporta as configurações como JSON para download.
   */
  exportarConfiguracoes() {
    const config = this.obter();
    const payload = {
      versao: "1.0",
      dataExport: new Date().toISOString(),
      config,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SCTEC_Config_${new Date().toISOString().split("T")[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Importa configurações de um arquivo JSON.
   * @param {File} arquivo
   * @param {Function} onSuccess - callback após importação
   */
  importarConfiguracoes(arquivo, onSuccess) {
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        const config = payload.config || payload;
        if (!config.cores || !config.nomeSistema) {
          return alert("❌ Arquivo inválido. Selecione um arquivo de configurações gerado pelo SCTEC.");
        }
        if (!confirm(`Importar configurações de "${config.nomeSistema}"?\nIsso substituirá as configurações atuais.`)) return;
        this.salvar(config);
        alert("✅ Configurações importadas com sucesso!");
        if (onSuccess) onSuccess(config);
      } catch {
        alert("❌ Arquivo inválido ou corrompido.");
      }
    };
    leitor.readAsText(arquivo, "UTF-8");
  },

  _escurecer(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  },
};

window.ConfigController = ConfigController;
