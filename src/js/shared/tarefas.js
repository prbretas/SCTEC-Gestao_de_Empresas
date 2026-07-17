/**
 * TarefasController — Gerencia tarefas e follow-up de empresas
 * Funcionalidades: CRUD, prioridades, status, destaque de vencidas, badge na tabela
 */

const TarefasController = {
  tarefasAtuais: [], // Array temporário de tarefas em edição
  empresaIdAtual: null, // ID da empresa sendo editada

  init() {
    document
      .querySelector("#btn-adicionar-tarefa")
      ?.addEventListener("click", () => this.abrirModalTarefa());

    document
      .querySelector("#btn-fechar-modal-tarefa")
      ?.addEventListener("click", () => this.fecharModalTarefa());

    document
      .querySelector("#form-tarefa")
      ?.addEventListener("submit", (e) => this.salvarTarefa(e));
  },

  /**
   * Carrega as tarefas de uma empresa para a lista
   */
  carregarTarefas(empresaId, tarefas = []) {
    this.empresaIdAtual = empresaId;
    this.tarefasAtuais = JSON.parse(JSON.stringify(tarefas || []));
    this.renderizarLista();
  },

  /**
   * Renderiza a lista de tarefas na aba
   */
  renderizarLista() {
    const container = document.querySelector("#tarefas-lista");
    if (!container) return;

    if (this.tarefasAtuais.length === 0) {
      container.innerHTML =
        '<div class="text-muted small">Nenhuma tarefa cadastrada. Clique em "Adicionar" para começar.</div>';
      return;
    }

    container.innerHTML = this.tarefasAtuais
      .map((tarefa, idx) => this.renderizarCartaoTarefa(tarefa, idx))
      .join("");

    // Event listeners para editar e remover
    container.querySelectorAll(".btn-editar-tarefa").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.editarTarefa(idx);
      });
    });

    container.querySelectorAll(".btn-remover-tarefa").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.removerTarefa(idx);
      });
    });

    // Toggle de status (clicar em checkbox)
    container.querySelectorAll(".check-tarefa").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        const tarefa = this.tarefasAtuais[idx];
        if (tarefa) {
          tarefa.status =
            tarefa.status === "Concluida" ? "A fazer" : "Concluida";
          this.renderizarLista();
        }
      });
    });
  },

  /**
   * Renderiza um cartão de tarefa com informações de prioridade, status e vencimento
   */
  renderizarCartaoTarefa(tarefa, idx) {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    const dataTarefa = new Date(tarefa.dataVencimento);
    dataTarefa.setHours(0, 0, 0, 0);

    const estaVencida =
      tarefa.status !== "Concluida" && dataTarefa < agora;
    const diasAte = Math.floor(
      (dataTarefa - agora) / (1000 * 60 * 60 * 24),
    );

    const bgClass =
      estaVencida && tarefa.status !== "Concluida"
        ? "bg-danger bg-opacity-10 border-danger"
        : "";
    const iconePrioridade = this.obterIconePrioridade(tarefa.prioridade);
    const iconeStatus = this.obterIconeStatus(tarefa.status);

    const dataBR = new Date(tarefa.dataVencimento).toLocaleDateString("pt-BR");

    return `
      <div class="card mb-2 ${bgClass}">
        <div class="card-body pb-2">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-start gap-2 flex-grow-1">
              <input 
                type="checkbox" 
                class="check-tarefa form-check-input mt-1" 
                data-index="${idx}"
                ${tarefa.status === "Concluida" ? "checked" : ""}
              />
              <div>
                <h6 class="mb-1 ${tarefa.status === "Concluida" ? "text-decoration-line-through text-muted" : ""}">${tarefa.titulo}</h6>
                <small class="text-muted">${tarefa.descricao || ""}</small>
              </div>
            </div>
            <div class="d-flex gap-1">
              <button 
                type="button" 
                class="btn-editar-tarefa btn btn-sm btn-outline-secondary" 
                data-index="${idx}"
                title="Editar tarefa"
              >
                ✏️
              </button>
              <button 
                type="button" 
                class="btn-remover-tarefa btn btn-sm btn-outline-danger" 
                data-index="${idx}"
                title="Remover tarefa"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="d-flex gap-2 flex-wrap mb-2 small">
            <span class="badge bg-secondary">${iconePrioridade} ${tarefa.prioridade}</span>
            <span class="badge ${tarefa.status === "Concluida" ? "bg-success" : tarefa.status === "Em andamento" ? "bg-warning" : "bg-light text-dark"}">${iconeStatus} ${tarefa.status}</span>
            <span class="badge bg-info">📅 ${dataBR}${estaVencida ? ' ⚠️ VENCIDA' : diasAte === 0 ? ' (HOJE)' : diasAte === 1 ? ' (AMANHÃ)' : diasAte < 0 ? ` (${Math.abs(diasAte)} dias atrás)` : ''}</span>
          </div>

          ${
            tarefa.responsavel
              ? `<small class="text-muted">👤 Responsável: <strong>${tarefa.responsavel}</strong></small>`
              : ""
          }
        </div>
      </div>
    `;
  },

  /**
   * Retorna ícone baseado na prioridade
   */
  obterIconePrioridade(prioridade) {
    const iconesMap = {
      Alta: "🔴",
      Media: "🟡",
      Baixa: "🟢",
    };
    return iconesMap[prioridade] || "⚪";
  },

  /**
   * Retorna ícone baseado no status
   */
  obterIconeStatus(status) {
    const iconesMap = {
      "A fazer": "📝",
      "Em andamento": "⏳",
      Concluida: "✅",
    };
    return iconesMap[status] || "❓";
  },

  /**
   * Abre o modal para adicionar/editar tarefa
   */
  abrirModalTarefa(idxEdicao = null) {
    const modal = document.querySelector("#modal-tarefa");
    const form = document.querySelector("#form-tarefa");
    const title = document.querySelector("#titulo-modal-tarefa");

    if (!modal || !form) return;

    form.reset();
    form.dataset.indexEdicao = idxEdicao !== null ? idxEdicao : "-1";

    if (idxEdicao !== null) {
      const tarefa = this.tarefasAtuais[idxEdicao];
      if (tarefa) {
        title.textContent = "✏️ Editar Tarefa";
        document.querySelector("#tarefa-titulo").value = tarefa.titulo || "";
        document.querySelector("#tarefa-descricao").value =
          tarefa.descricao || "";
        document.querySelector("#tarefa-vencimento").value =
          tarefa.dataVencimento || "";
        document.querySelector("#tarefa-prioridade").value =
          tarefa.prioridade || "Media";
        document.querySelector("#tarefa-responsavel").value =
          tarefa.responsavel || "";
        document.querySelector("#tarefa-status").value =
          tarefa.status || "A fazer";
      }
    } else {
      title.textContent = "➕ Nova Tarefa";
      // Define data de vencimento padrão para amanhã
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const dataBR = amanha.toISOString().split("T")[0];
      document.querySelector("#tarefa-vencimento").value = dataBR;
    }

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  },

  /**
   * Fecha o modal de tarefa
   */
  fecharModalTarefa() {
    const modal = document.querySelector("#modal-tarefa");
    if (modal) {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) bootstrapModal.hide();
    }
  },

  /**
   * Salva uma nova tarefa ou atualiza existente
   */
  salvarTarefa(e) {
    e.preventDefault();

    const titulo = document.querySelector("#tarefa-titulo").value.trim().toUpperCase();
    const descricao = document
      .querySelector("#tarefa-descricao")
      .value.trim().toUpperCase();
    const dataVencimento = document
      .querySelector("#tarefa-vencimento")
      .value.trim();
    const prioridade = document.querySelector("#tarefa-prioridade").value;
    const responsavel = document
      .querySelector("#tarefa-responsavel")
      .value.trim().toUpperCase();
    const status = document.querySelector("#tarefa-status").value;

    // Validação
    if (!titulo) {
      alert("⚠️ Título da tarefa é obrigatório.");
      return;
    }

    if (!dataVencimento) {
      alert("⚠️ Data de vencimento é obrigatória.");
      return;
    }

    const indexEdicao = parseInt(
      document.querySelector("#form-tarefa").dataset.indexEdicao,
    );

    const novaTarefa = {
      titulo,
      descricao,
      dataVencimento,
      prioridade,
      responsavel,
      status,
      dataCriacao: new Date().toISOString(),
    };

    if (indexEdicao >= 0) {
      // Edição
      novaTarefa.dataCriacao = this.tarefasAtuais[indexEdicao].dataCriacao;
      this.tarefasAtuais[indexEdicao] = novaTarefa;
    } else {
      // Adição
      this.tarefasAtuais.push(novaTarefa);
    }

    this.fecharModalTarefa();
    this.renderizarLista();
  },

  /**
   * Abre o modal para editar uma tarefa existente
   */
  editarTarefa(idx) {
    this.abrirModalTarefa(idx);
  },

  /**
   * Remove uma tarefa da lista
   */
  removerTarefa(idx) {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      this.tarefasAtuais.splice(idx, 1);
      this.renderizarLista();
    }
  },

  /**
   * Conta tarefas vencidas no array
   */
  contarVencidas() {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);

    return this.tarefasAtuais.filter((t) => {
      const dataTarefa = new Date(t.dataVencimento);
      dataTarefa.setHours(0, 0, 0, 0);
      return t.status !== "Concluida" && dataTarefa < agora;
    }).length;
  },

  /**
   * Obtém as tarefas atuais (para persistência ao salvar a empresa)
   */
  obterTarefas() {
    return this.tarefasAtuais;
  },
};

// Inicializa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => TarefasController.init());
} else {
  TarefasController.init();
}
