document.addEventListener("DOMContentLoaded", () => {
    try {
        // Aplica configurações salvas (cores, logo, nome) antes de tudo
        if (window.ConfigController) ConfigController.aplicar();
    } catch (e) {
        console.warn("SCTEC - ConfigController: erro ao aplicar config", e);
    }

    // Guard de acesso ao módulo de cadastros
    if (window.ModulesController && !ModulesController.requireModuleAccess("cadastros")) return;

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

    // Botão Editar no modo visualização
    document.getElementById("btn-editar-empreendimento")?.addEventListener("click", () => {
        FormController.setReadOnly(false);
        document.querySelector("#titulo-modal-form").textContent = "✏️ Editar Empreendimento";
    });

    console.log("SCTEC - Sistema Operacional");
});
