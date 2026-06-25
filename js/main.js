document.addEventListener("DOMContentLoaded", () => {
    // Aplica configurações salvas (cores, logo, nome) antes de tudo
    ConfigController.aplicar();
    // Inicializa os controllers globais
    UIController.init();
    FormController.init();
    console.log("SCTEC - Sistema Operacional");
});