let direcaoOrdenacao = 1; // 1 para A-Z, -1 para Z-A
let colunaAtual = "id";

const UIController = {
  modalForm: null,

  init() {
    const modalElem = document.getElementById("modalFormulario");
    if (modalElem) this.modalForm = new bootstrap.Modal(modalElem);

    // 1. Inicializa o tema (Dark Mode)
    this.initDarkMode();

    // 2. Configura os eventos de busca (APENAS UMA VEZ)
    document
      .querySelector("#busca-empresa")
      ?.addEventListener("input", () => this.renderizarLista());
    document
      .querySelector("#tipo-busca")
      ?.addEventListener("change", () => this.renderizarLista());

    // 3. Define a ordenação inicial com um pequeno delay
    // Isso garante que o DOM está pronto para receber os ícones 🔼/🔽
    setTimeout(() => {
      this.ordenar("id");
    }, 200);

    console.log("SCTEC - Sistema Inicializado com Ordenação Padrão.");
  },

  renderizarLista(listaOrdenadaManual = null) {
    const listaCorpo = document.querySelector("#lista-corpo");
    if (!listaCorpo) return;

    const termo = document
      .querySelector("#busca-empresa")
      .value.toLowerCase()
      .trim();
    const filtro = document.querySelector("#tipo-busca").value;

    // 1. SEMPRE buscamos a base atualizada para garantir que novos registros apareçam
    let dados = listaOrdenadaManual || EmpreendimentoStorage.buscarTodos();

    // 2. Aplicamos a ordenação ATUAL (global) antes de filtrar
    // Isso garante que mesmo buscando, a ordem escolhida (ex: Município) se mantenha
    dados.sort((a, b) => {
      let valA = a[colunaAtual] ? a[colunaAtual].toString().toLowerCase() : "";
      let valB = b[colunaAtual] ? b[colunaAtual].toString().toLowerCase() : "";

      if (!isNaN(valA) && !isNaN(valB)) {
        return (Number(valA) - Number(valB)) * direcaoOrdenacao;
      }
      return valA.localeCompare(valB) * direcaoOrdenacao;
    });

    // 3. Filtramos os dados já ordenados
    const filtrados = dados.filter((emp) => {
      if (!termo) return true;
      if (filtro === "todos") {
        return Object.values(emp).join(" ").toLowerCase().includes(termo);
      }
      return emp[filtro]?.toLowerCase().includes(termo);
    });

    // 4. Renderização no DOM
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
                <button class="btn btn-sm btn-outline-warning" onclick="event.stopPropagation(); FormController.prepararEdicao(${emp.id})">✏️</button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); UIController.confirmarExclusao(${emp.id})">🗑️</button>
            </td>
        `;
      listaCorpo.appendChild(tr);
    });

    // 5. Atualização dos contadores
    this.atualizarContadores(EmpreendimentoStorage.buscarTodos(), filtrados);
    // 6. Garante que o ícone de ordenação permaneça visível após renderizar
    this.atualizarIconesOrdenacao(colunaAtual, direcaoOrdenacao);
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
  atualizarIconesOrdenacao(colunaAtiva, direcao) {
    // 1. Limpa todos os spans
    const spans = document.querySelectorAll(".sort-icon");
    spans.forEach((span) => {
      span.textContent = "";
    });

    // 2. Busca o cabeçalho exato
    const seletor = `th[data-coluna="${colunaAtiva}"] .sort-icon`;
    const thAtivo = document.querySelector(seletor);

    if (thAtivo) {
      thAtivo.textContent = direcao === 1 ? " 🔼" : " 🔽";
    } else {
      // Se este erro aparecer no seu console (F12), o nome no HTML está errado
      console.warn(`Elemento ${seletor} não encontrado no DOM.`);
    }
  },
  ordenar(coluna) {
    if (colunaAtual === coluna) {
      direcaoOrdenacao *= -1;
    } else {
      colunaAtual = coluna;
      direcaoOrdenacao = 1;
    }

    this.renderizarLista();
  },

  renderizarComOrdem(listaOrdenada) {
    // Aqui chamamos a sua função renderizarLista, mas passando a lista já ordenada
    // Se a sua renderizarLista() busca sempre do Storage, vamos precisar de um pequeno ajuste:
    this.renderizarLista(listaOrdenada);
  },
};
