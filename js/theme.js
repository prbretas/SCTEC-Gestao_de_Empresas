/**
 * theme.js — Gerenciamento centralizado de Dark/Light Mode.
 * Lê e salva o estado em localStorage para persistir entre telas.
 */

const ThemeController = {
  CHAVE: "SCTEC_THEME",

  /**
   * Aplica o tema salvo ao carregar a página.
   * Deve ser chamado em todas as telas no DOMContentLoaded.
   */
  init(switchId = "dark-mode-switch") {
    const isDark = localStorage.getItem(this.CHAVE) === "dark";
    this._aplicar(isDark);

    const switchBtn = document.getElementById(switchId);
    if (switchBtn) {
      switchBtn.checked = isDark;
      switchBtn.addEventListener("change", (e) => {
        this._aplicar(e.target.checked);
        localStorage.setItem(this.CHAVE, e.target.checked ? "dark" : "light");
      });
    }
  },

  _aplicar(dark) {
    document.body.classList.toggle("dark-mode", dark);
    // Atualiza todos os switches na página (pode haver mais de um)
    document.querySelectorAll("#dark-mode-switch").forEach((el) => {
      el.checked = dark;
    });
  },

  isDark() {
    return localStorage.getItem(this.CHAVE) === "dark";
  },
};

window.ThemeController = ThemeController;
