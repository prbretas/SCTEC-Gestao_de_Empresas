document.addEventListener("DOMContentLoaded", () => {
    // Aplica configurações salvas (cores, logo, nome) antes de tudo
    ConfigController.aplicar();
    // Renderiza navbar padronizado
    if (window.NavbarController) NavbarController.init("cadastros");
    if (window.ThemeController) ThemeController.init();
    // Inicializa os controllers globais
    UIController.init();
    FormController.init();
    console.log("SCTEC - Sistema Operacional");
});