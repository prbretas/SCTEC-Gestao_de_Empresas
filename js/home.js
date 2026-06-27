/**
 * home.js — Lógica da tela home (hub de navegação).
 */
document.addEventListener("DOMContentLoaded", () => {
  // Guard de rota
  const sessao = AuthService.requireAuth();
  if (!sessao) return;

  // Aplica config visual
  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  // Preenche saudação com nickname#ID
  document.getElementById("home-nome-usuario").textContent = sessao.nome;
  document.getElementById("home-id-usuario").textContent = sessao.identidade || `${sessao.nome}#${sessao.id}`;

  // Exibe badge de role
  const badgeRole = document.getElementById("home-role-badge");
  if (badgeRole) {
    if (sessao.role === "admin") {
      badgeRole.textContent = "👑 Admin";
      badgeRole.className = "badge bg-warning text-dark ms-2";
    } else {
      badgeRole.textContent = "👤 Usuário";
      badgeRole.className = "badge bg-secondary ms-2";
    }
  }

  // Exibe código de convite apenas para Admin
  const codigoEl = document.getElementById("home-codigo-convite");
  if (codigoEl && sessao.role === "admin") {
    const codigo = AuthService.obterCodigoConvite();
    if (codigo) {
      codigoEl.textContent = `Convite: ${codigo}`;
      codigoEl.style.display = "inline-block";
    }
  }

  // Oculta card de Configurações para não-Admin
  if (sessao.role !== "admin") {
    const cardSettings = document.getElementById("card-settings");
    if (cardSettings) cardSettings.style.display = "none";
  }

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
