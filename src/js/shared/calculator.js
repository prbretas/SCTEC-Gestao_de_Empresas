/**
 * calculator.js — Numpad popup discreto para campos numéricos (#97)
 * Ícone ao lado do campo que abre dropdown com teclado numérico.
 * Apenas números + ponto decimal + backspace + confirmar.
 */

const CalculatorController = {
  _targetInput: null,
  _popover: null,

  init() {
    // Adiciona ícone de numpad em inputs numéricos dentro de modais
    document.querySelectorAll('input[type="number"]').forEach((input) => {
      if (input.closest(".modal") && !input.dataset.numpadAdded) {
        input.dataset.numpadAdded = "true";
        const wrapper = input.parentElement;
        if (!wrapper) return;
        wrapper.style.position = "relative";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline-secondary numpad-trigger";
        btn.title = "Teclado numérico";
        btn.innerHTML = "⌨️";
        btn.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);z-index:2;font-size:.65rem;padding:1px 5px;border:none;background:transparent;";
        wrapper.appendChild(btn);

        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          CalculatorController._abrir(input, btn);
        });
      }
    });

    // Fecha ao clicar fora
    document.addEventListener("click", () => CalculatorController._fechar());
  },

  _abrir(input, triggerBtn) {
    this._fechar();
    this._targetInput = input;

    const pop = document.createElement("div");
    pop.id = "numpad-popup";
    pop.style.cssText = "position:absolute;top:100%;right:0;z-index:9999;background:#fff;border:1px solid #dee2e6;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);padding:8px;width:180px;margin-top:4px;";
    pop.addEventListener("click", (e) => e.stopPropagation());

    const teclas = [
      ["7", "8", "9"],
      ["4", "5", "6"],
      ["1", "2", "3"],
      [".", "0", "⌫"],
    ];

    let html = `<div class="text-center mb-2"><input type="text" id="numpad-display" class="form-control form-control-sm text-end fw-bold" value="${input.value || ""}" readonly style="font-size:1.1rem;" /></div>`;
    teclas.forEach((row) => {
      html += `<div class="d-flex gap-1 mb-1">`;
      row.forEach((k) => {
        const cls = k === "⌫" ? "btn-outline-danger" : "btn-outline-dark";
        html += `<button type="button" class="btn ${cls} flex-fill numpad-key" data-key="${k}" style="font-size:1rem;padding:8px 0;">${k}</button>`;
      });
      html += `</div>`;
    });
    html += `<button type="button" class="btn btn-success w-100 mt-1" id="numpad-confirm" style="font-size:.85rem;">✅ OK</button>`;

    pop.innerHTML = html;
    triggerBtn.parentElement.appendChild(pop);
    this._popover = pop;

    // Eventos das teclas
    pop.querySelectorAll(".numpad-key").forEach((btn) => {
      btn.addEventListener("click", () => {
        const display = document.getElementById("numpad-display");
        if (!display) return;
        const key = btn.dataset.key;
        if (key === "⌫") {
          display.value = display.value.slice(0, -1);
        } else {
          display.value += key;
        }
      });
    });

    // Confirmar
    pop.querySelector("#numpad-confirm")?.addEventListener("click", () => {
      const valor = document.getElementById("numpad-display")?.value || "";
      if (this._targetInput) {
        this._targetInput.value = valor;
        this._targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      this._fechar();
    });
  },

  _fechar() {
    if (this._popover) {
      this._popover.remove();
      this._popover = null;
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => CalculatorController.init(), 500));
} else {
  setTimeout(() => CalculatorController.init(), 500);
}

window.CalculatorController = CalculatorController;
