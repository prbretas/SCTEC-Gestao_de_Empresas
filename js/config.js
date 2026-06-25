/**
 * config.js — Gerenciamento de configurações e identidade visual do sistema.
 * Persiste em LocalStorage sob a chave SCTEC_CONFIG.
 * Feature: #17
 */

const CONFIG_KEY = "SCTEC_CONFIG";

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
   * Retorna a config atual ou o padrão se não houver nada salvo.
   */
  obter() {
    try {
      const salvo = localStorage.getItem(CONFIG_KEY);
      if (!salvo) return { ...CONFIG_PADRAO, cores: { ...CONFIG_PADRAO.cores }, segmentos: [...CONFIG_PADRAO.segmentos] };
      const config = JSON.parse(salvo);
      // Garante que campos novos do padrão existam em configs antigas
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
   * Salva a config no LocalStorage e aplica imediatamente na UI.
   */
  salvar(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    this.aplicar(config);
  },

  /**
   * Aplica as configurações na UI da página atual (navbar, cores, title).
   */
  aplicar(config) {
    if (!config) config = this.obter();

    // Nome do sistema
    const navbarBrand = document.querySelector(".navbar-brand");
    if (navbarBrand) {
      navbarBrand.innerHTML = config.logoBase64
        ? `<img src="${config.logoBase64}" alt="Logo" style="height:32px;width:auto;margin-right:8px;vertical-align:middle;">${config.nomeSistema}`
        : `🏭 ${config.nomeSistema}`;
    }
    document.title = config.nomeSistema || "SCTEC";

    // Cores via CSS custom properties
    const root = document.documentElement;
    root.style.setProperty("--sc-header", config.cores.header);
    root.style.setProperty("--sc-btn", config.cores.btn);
    root.style.setProperty("--sc-btn-hover", this._escurecer(config.cores.btn, 15));
    root.style.setProperty("--sc-btn-active", this._escurecer(config.cores.btn, 25));
    root.style.setProperty("--sc-header2", config.cores.destaque);
  },

  /**
   * Restaura as configurações para o padrão original.
   */
  restaurarPadrao() {
    localStorage.removeItem(CONFIG_KEY);
    this.aplicar(CONFIG_PADRAO);
  },

  /**
   * Retorna a lista de segmentos ativos (da config ou o padrão).
   */
  obterSegmentos() {
    return this.obter().segmentos;
  },

  /**
   * Escurece uma cor hex em `percent`%.
   * Usado para gerar hover/active dos botões.
   */
  _escurecer(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  },
};

window.ConfigController = ConfigController;
