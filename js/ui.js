let direcaoOrdenacao = 1; // 1 para A-Z, -1 para Z-A
let colunaAtual = "";

const UIController = {
  modalForm: null,

  init() {
    const modalElem = document.getElementById("modalFormulario");
    if (modalElem) this.modalForm = new bootstrap.Modal(modalElem);

    this.initDarkMode();
    this.renderizarLista();

    document
      .querySelector("#busca-empresa")
      ?.addEventListener("input", () => this.renderizarLista());
    document
      .querySelector("#tipo-busca")
      ?.addEventListener("change", () => this.renderizarLista());
  },

  renderizarLista(listaParaUso = null) {
    const listaCorpo = document.querySelector("#lista-corpo");
    if (!listaCorpo) return;

    const termo = document
      .querySelector("#busca-empresa")
      .value.toLowerCase()
      .trim();
    const filtro = document.querySelector("#tipo-busca").value;

    // 1. Definição da base de dados: Se vier uma lista ordenada, usa ela. Senão, busca do storage.
    let baseDeDados = listaParaUso || EmpreendimentoStorage.buscarTodos();

    // 2. Aplicação do Filtro de busca (Search)
    const filtrados = baseDeDados.filter((emp) => {
      if (!termo) return true;
      if (filtro === "todos") {
        // Busca em todos os campos transformando o objeto em string
        return Object.values(emp).join(" ").toLowerCase().includes(termo);
      }
      // Busca apenas na coluna selecionada no select
      return emp[filtro]?.toLowerCase().includes(termo);
    });

    // 3. Limpeza e Renderização
    listaCorpo.innerHTML = "";

    filtrados.forEach((emp) => {
      const config = Utils.obterConfigSegmento(emp.segmento);
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";

      tr.addEventListener("click", () =>
        FormController.prepararVisualizacao(emp.id),
      );

      tr.innerHTML = `
      <td>${emp.id}</td>
      <td>
        <div class="fw-bold text-primary">${emp.nome}</div>
        <div class="small">${emp.registro}</div>
      </td>
      <td>
        <div class="fw-bold">${emp.responsavel || "N/D"}</div>
        <div class="small">${emp.email || ""}</div>
        <div class="small">${emp.telefone || ""}</div>
      </td>
      <td class="small text-wrap" style="max-width: 200px;">${emp.endereco || ""}</td>
      <td class="small">${emp.municipio || ""}</td>
      <td>
        <span class="badge" style="background-color: ${config.bg}; color: ${config.text}; border: 1px solid ${config.border}">
          ${emp.segmento}
        </span>
      </td>
      <td>
        <span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">
          ${emp.status || "Ativo"}
        </span>
      </td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-warning" 
          onclick="event.stopPropagation(); FormController.prepararEdicao(${emp.id})">✏️</button>
        <button class="btn btn-sm btn-outline-danger" 
          onclick="event.stopPropagation(); UIController.confirmarExclusao(${emp.id})">🗑️</button>
      </td>
    `;
      listaCorpo.appendChild(tr);
    });

    // 4. Atualização dos contadores
    // Passamos a base real do storage e a lista que realmente está em tela (filtrados)
    this.atualizarContadores(EmpreendimentoStorage.buscarTodos(), filtrados);
  },

  confirmarExclusao(id) {
    if (confirm("Deseja remover este registro?")) {
      EmpreendimentoStorage.excluir(id);
      this.renderizarLista();
    }
  },

  initDarkMode() {
    const switchBtn = document.querySelector("#dark-mode-switch");
    const aplicar = (dark) => {
      document.body.classList.toggle("dark-mode", dark);
      localStorage.setItem("SCTEC_THEME", dark ? "dark" : "light");
      if (switchBtn) switchBtn.checked = dark;
    };
    aplicar(localStorage.getItem("SCTEC_THEME") === "dark");
    switchBtn?.addEventListener("change", (e) => aplicar(e.target.checked));
  },

  atualizarContadores(listaCompleta, listaExibida) {
    const total = listaCompleta.length;
    const filtrados = listaExibida.length;

    const ativos = listaCompleta.filter((emp) => emp.status === "Ativo").length;

    // Atualiza o HTML
    const elTotal = document.querySelector("#qtd-total");
    const elSC = document.querySelector("#qtd-sc");
    const elFiltrados = document.querySelector("#qtd-filtrados");
    const elAtivos = document.querySelector("#qtd-ativos");
    const iconFiltro = document.querySelector("#icon-filtro");

    if (elTotal) elTotal.innerText = listaCompleta.length;
    if (elAtivos) elAtivos.innerText = ativos;
    if (elFiltrados) elFiltrados.innerText = listaExibida.length;

    // Se a lista exibida for menor que a total, o ícone de filtro fica em destaque (amarelo)
    if (iconFiltro) {
      if (filtrados < total) {
        iconFiltro.classList.replace("text-white", "text-warning");
        iconFiltro.title = "Filtro Ativo";
      } else {
        iconFiltro.classList.replace("text-warning", "text-white");
        iconFiltro.title = "Sem filtros";
      }
    }
  },

  ordenar(coluna) {
    // Se clicar na mesma coluna, inverte a ordem. Se for nova, começa A-Z.
    if (colunaAtual === coluna) {
      direcaoOrdenacao *= -1;
    } else {
      colunaAtual = coluna;
      direcaoOrdenacao = 1;
    }

    // Buscamos os dados atuais (respeitando o que está no Storage)
    const empresas = EmpreendimentoStorage.buscarTodos();

    // Lógica de Comparação
    empresas.sort((a, b) => {
      let valA = a[coluna] ? a[coluna].toString().toLowerCase() : "";
      let valB = b[coluna] ? b[coluna].toString().toLowerCase() : "";

      // Tratamento especial para números (como o ID)
      if (!isNaN(valA) && !isNaN(valB)) {
        return (Number(valA) - Number(valB)) * direcaoOrdenacao;
      }

      // Ordenação de texto padrão
      if (valA < valB) return -1 * direcaoOrdenacao;
      if (valA > valB) return 1 * direcaoOrdenacao;
      return 0;
    });

    // IMPORTANTE: Após ordenar o array, precisamos salvar essa ordem temporária
    // ou apenas renderizar a lista novamente.
    this.renderizarComOrdem(empresas);
  },

  renderizarComOrdem(listaOrdenada) {
    // Aqui chamamos a sua função renderizarLista, mas passando a lista já ordenada
    // Se a sua renderizarLista() busca sempre do Storage, vamos precisar de um pequeno ajuste:
    this.renderizarLista(listaOrdenada);
  },
};
