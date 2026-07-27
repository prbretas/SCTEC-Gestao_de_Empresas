document.addEventListener("DOMContentLoaded", () => {
    try {
        // Aplica configurações salvas (cores, logo, nome) antes de tudo
        if (window.ConfigController) ConfigController.aplicar();
    } catch (e) {
        console.warn("SCTEC - ConfigController: erro ao aplicar config", e);
    }

    // Renderiza navbar padronizado
    if (window.NavbarController) {
        NavbarController.init("cadastros");
    } else {
        console.error("SCTEC - NavbarController não encontrado. Verificar ordem de scripts em cadastros.html.");
    }

    // Aplica tema (Dark/Light Mode)
    if (window.ThemeController) ThemeController.init();

    // Inicializa os controllers globais
    UIController.init();
    FormController.init();
    console.log("SCTEC - Sistema Operacional");
});
