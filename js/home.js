/**
 * home.js — Lógica da tela home (hub de navegação).
 */
document.addEventListener("DOMContentLoaded", () => {
  // Guard de rota
  const sessao = AuthService.requireAuth();
  if (!sessao) return;

  // Aplica config visual
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Preenche saudação
  document.getElementById("home-nome-usuario").textContent = sessao.nome;
  document.getElementById("home-id-usuario").textContent = `#${sessao.id}`;

  // Dark mode
  const switchBtn = document.getElementById("dark-mode-switch");
  const aplicarDark = (dark) => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("SCTEC_THEME", dark ? "dark" : "light");
    if (switchBtn) switchBtn.checked = dark;
  };
  aplicarDark(localStorage.getItem("SCTEC_THEME") === "dark");
  switchBtn?.addEventListener("change", (e) => aplicarDark(e.target.checked));

  // Logout
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Deseja sair do sistema?")) {
      AuthService.logout();
    }
  });
});
