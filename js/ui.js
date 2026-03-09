/**
 * ui.js - Controller de Interface (Versão Tabela Clicável)
 */
const UIController = {
  modalForm: null,

  init() {
    const modalFormElem = document.getElementById("modalFormulario");
    if (modalFormElem) this.modalForm = new bootstrap.Modal(modalFormElem);

    this.initDarkMode();
    this.renderizarLista();

    document
      .querySelector("#busca-empresa")
      ?.addEventListener("input", () => this.renderizarLista());
    document
      .querySelector("#tipo-busca")
      ?.addEventListener("change", () => this.renderizarLista());
  },
  renderizarLista() {
    const inputBusca = document.querySelector("#busca-empresa");
    const selectTipoBusca = document.querySelector("#tipo-busca");
    const listaCorpo = document.querySelector("#lista-corpo");

    const termo = inputBusca.value.toLowerCase().trim();
    const tipoFiltro = selectTipoBusca.value;
    const empresas = EmpreendimentoStorage.buscarTodos();

    const filtrados = empresas.filter((emp) => {
      if (!termo) return true;
      if (tipoFiltro === "todos")
        return Object.values(emp).join(" ").toLowerCase().includes(termo);
      return emp[tipoFiltro]?.toLowerCase().includes(termo);
    });

    listaCorpo.innerHTML = "";
    filtrados.forEach((emp) => {
      const config = Utils.obterConfigSegmento(emp.segmento);
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";

      // Evento de clique na LINHA para VISUALIZAR (apenas se não clicar nos botões)
      tr.addEventListener("click", (e) => {
        if (!e.target.closest('.btn-action')) {
          FormController.prepararVisualizacao(emp.id);
        }
      });

      tr.innerHTML = `
                <td>
                    <div class="fw-bold text-primary">${emp.nome}</div>
                    <small class="text-secondary">${emp.registro || "N/A"}</small>
                </td>
                <td>
                    <div class="small fw-bold">${emp.responsavel || "N/A"}</div>
                    <div class="small text-muted">${emp.contato || ""}</div>
                    <div class="small text-muted">${emp.telefone || ""}</div>
                </td>
                <td class="small text-wrap" style="max-width: 250px;">${emp.endereco}</td>
                <td class="small">${emp.municipio}</td>
                <td>
                    <span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning btn-action" 
                            onclick="event.stopPropagation(); FormController.prepararEdicao(${emp.id})">✏️</button>
                    <button class="btn btn-sm btn-outline-danger btn-action" 
                            onclick="event.stopPropagation(); UIController.confirmarExclusao(${emp.id})">🗑️</button>
                </td>`;
      listaCorpo.appendChild(tr);
    });
  },

  confirmarExclusao(id) {
    if (confirm("Remover este registro permanentemente?")) {
      EmpreendimentoStorage.excluir(id);
      this.renderizarLista();
    }
  },

  initDarkMode() {
    const darkModeSwitch = document.querySelector("#dark-mode-switch");
    const aplicar = (isDark) => {
      document.body.classList.toggle("dark-mode", isDark);
      localStorage.setItem("SCTEC_THEME", isDark ? "dark" : "light");
      if (darkModeSwitch) darkModeSwitch.checked = isDark;
    };
    aplicar(localStorage.getItem("SCTEC_THEME") === "dark");
    darkModeSwitch?.addEventListener("change", (e) =>
      aplicar(e.target.checked),
    );
  },
};
