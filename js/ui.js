/**
 * ui.js - Controller de Interface
 */
const UIController = {
  modalForm: null,
  modalVisu: null,

  init() {
    const modalFormElem = document.getElementById("modalFormulario");
    const modalVisuElem = document.getElementById("modalVisualizar");
    if (modalFormElem) this.modalForm = new bootstrap.Modal(modalFormElem);
    if (modalVisuElem) this.modalVisu = new bootstrap.Modal(modalVisuElem);

    this.initDarkMode();
    this.renderizarLista();

    // Listeners de Busca
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
      if (tipoFiltro === "todos") {
        return Object.values(emp).join(" ").toLowerCase().includes(termo);
      }
      const mapa = {
        id: emp.id?.toString(),
        nome: emp.nome,
        registro: emp.registro,
        segmento: emp.segmento,
        status: emp.status,
      };
      if (tipoFiltro === "localizacao")
        return (emp.municipio + emp.endereco).toLowerCase().includes(termo);
      return mapa[tipoFiltro]?.toLowerCase().includes(termo);
    });

    listaCorpo.innerHTML = "";
    filtrados.forEach((emp) => {
      const config = Utils.obterConfigSegmento(emp.segmento);
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><strong>#${emp.id}</strong></td>
                <td>${emp.nome}</td>
                <td><code class="text-reset">${emp.registro || "N/A"}</code></td>
                <td>${emp.municipio}</td>
                <td class="text-truncate" style="max-width: 150px;">${emp.endereco}</td>
                <td><span class="badge" style="background-color: ${config.bg}; color: ${config.text}; border: 1px solid ${config.border}">${emp.segmento}</span></td>
                <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info btn-action" onclick="UIController.visualizarRegistro(${emp.id})">👁️</button>
                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="FormController.prepararEdicao(${emp.id})">✏️</button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="UIController.confirmarExclusao(${emp.id})">🗑️</button>
                </td>`;
      listaCorpo.appendChild(tr);
    });
  },

  visualizarRegistro(id) {
    const emp = EmpreendimentoStorage.buscarTodos().find(
      (item) => item.id === Number(id),
    );
    if (!emp) return;

    document.querySelector("#modal-conteudo").innerHTML = `
            <div class="mb-3 border-bottom pb-2">
                <h5 class="text-primary mb-0">${emp.nome}</h5>
                <small class="text-muted">ID Sistema: #${emp.id}</small>
            </div>
            <div class="row g-3">
                <div class="col-6"><strong>Tipo:</strong><br>${emp.tipoPessoa}</div>
                <div class="col-6"><strong>Registro:</strong><br>${emp.registro}</div>
                <div class="col-12"><strong>Endereço:</strong><br>${emp.endereco}, ${emp.municipio}</div>
                <div class="col-12"><strong>Segmento:</strong><br><span class="badge bg-light text-dark border">${emp.segmento}</span></div>
                <div class="col-12"><div class="bg-light p-3 rounded border"><strong>Obs:</strong><br>${emp.observacoes || "N/A"}</div></div>
            </div>`;
    this.modalVisu.show();
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
