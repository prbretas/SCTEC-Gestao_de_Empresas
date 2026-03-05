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
      if (tipoFiltro === "localizacao")
        return (emp.municipio + emp.endereco).toLowerCase().includes(termo);
      return emp[tipoFiltro]?.toLowerCase().includes(termo);
    });

    listaCorpo.innerHTML = "";
    filtrados.forEach((emp) => {
      const config = Utils.obterConfigSegmento(emp.segmento);
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.title = "Clique para ver detalhes";

      // Evento de clique na linha para VISUALIZAR
      tr.addEventListener("click", () =>
        FormController.prepararVisualizacao(emp.id),
      );

      tr.innerHTML = `
                <td><strong>#${emp.id}</strong></td>
                <td>${emp.nome}</td>
                <td><code class="text-reset">${emp.registro || "N/A"}</code></td>
                <td>${emp.municipio}</td>
                <td class="text-truncate" style="max-width: 150px;">${emp.endereco}</td>
                <td><span class="badge" style="background-color: ${config.bg}; color: ${config.text}; border: 1px solid ${config.border}">${emp.segmento}</span></td>
                <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
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
