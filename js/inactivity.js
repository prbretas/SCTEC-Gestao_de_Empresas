/**
 * inactivity.js — Logout automático por inatividade.
 * Encerra a sessão após 10 minutos sem interação do usuário.
 * Exibe aviso nos últimos 60 segundos.
 */

const InactivityWatcher = {
  TIMEOUT_MS: 10 * 60 * 1000,   // 10 minutos
  WARNING_MS: 60 * 1000,         // aviso 1 minuto antes
  _timer: null,
  _warnTimer: null,
  _toast: null,

  init() {
    this._criarToast();
    this._resetar();

    const eventos = ["mousemove", "keydown", "mousedown", "touchstart", "scroll", "click"];
    eventos.forEach((ev) =>
      document.addEventListener(ev, () => this._resetar(), { passive: true })
    );
  },

  _resetar() {
    clearTimeout(this._timer);
    clearTimeout(this._warnTimer);
    this._ocultarToast();

    // Aviso 1 minuto antes do logout
    this._warnTimer = setTimeout(() => {
      this._mostrarToast();
    }, this.TIMEOUT_MS - this.WARNING_MS);

    // Logout após 10 minutos
    this._timer = setTimeout(() => {
      this._ocultarToast();
      if (window.AuthService) {
        AuthService.logout();
      } else {
        sessionStorage.clear();
        window.location.href = "login.html";
      }
    }, this.TIMEOUT_MS);
  },

  _criarToast() {
    const div = document.createElement("div");
    div.id = "inactivity-toast";
    div.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #333a60;
      color: #fff;
      padding: 14px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      font-size: 0.9rem;
      z-index: 9999;
      display: none;
      max-width: 320px;
      border-left: 4px solid #67ff61;
    `;
    div.innerHTML = `
      ⏱️ <strong>Sessão expirando!</strong><br>
      <span style="font-size:.82rem;">Você será desconectado por inatividade em <strong id="inactivity-countdown">60</strong>s.</span>
      <br><button onclick="InactivityWatcher._resetar()" style="margin-top:8px;padding:4px 14px;background:#67ff61;color:#333;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.8rem;">Continuar</button>
    `;
    document.body.appendChild(div);
    this._toast = div;
  },

  _mostrarToast() {
    if (!this._toast) return;
    this._toast.style.display = "block";

    // Contador regressivo
    let segundos = 60;
    const el = document.getElementById("inactivity-countdown");
    const intervalo = setInterval(() => {
      segundos--;
      if (el) el.textContent = segundos;
      if (segundos <= 0) clearInterval(intervalo);
    }, 1000);
    this._toast._intervalo = intervalo;
  },

  _ocultarToast() {
    if (!this._toast) return;
    this._toast.style.display = "none";
    if (this._toast._intervalo) {
      clearInterval(this._toast._intervalo);
    }
  },
};

// Auto-inicializa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => InactivityWatcher.init());
} else {
  InactivityWatcher.init();
}
