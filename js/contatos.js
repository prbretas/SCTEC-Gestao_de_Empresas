/**
 * ContatosController — Gerencia contatos vinculados a cada empreendimento
 * Funcionalidades: CRUD, links rápidos (tel:, mailto:, whatsapp), persistência
 */

const ContatosController = {
  contatosAtuais: [], // Array temporário de contatos em edição
  empresaIdAtual: null, // ID da empresa sendo editada

  init() {
    // Inicializa os event listeners para a aba de contatos
    document
      .querySelector("#btn-adicionar-contato")
      ?.addEventListener("click", () => this.abrirModalContato());

    document
      .querySelector("#btn-fechar-modal-contato")
      ?.addEventListener("click", () => this.fecharModalContato());

    document
      .querySelector("#form-contato")
      ?.addEventListener("submit", (e) => this.salvarContato(e));
  },

  /**
   * Carrega os contatos de uma empresa para a lista
   */
  carregarContatos(empresaId, contatos = []) {
    this.empresaIdAtual = empresaId;
    this.contatosAtuais = JSON.parse(JSON.stringify(contatos || []));
    this.renderizarLista();
  },

  /**
   * Renderiza a lista de contatos na aba
   */
  renderizarLista() {
    const container = document.querySelector("#contatos-lista");
    if (!container) return;

    if (this.contatosAtuais.length === 0) {
      container.innerHTML =
        '<div class="text-muted small">Nenhum contato cadastrado. Clique em "Adicionar" para começar.</div>';
      return;
    }

    container.innerHTML = this.contatosAtuais
      .map((contato, idx) => this.renderizarCartaoContato(contato, idx))
      .join("");

    // Reaplica event listeners nos botões de ação
    container.querySelectorAll(".btn-editar-contato").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.editarContato(idx);
      });
    });

    container.querySelectorAll(".btn-remover-contato").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.removerContato(idx);
      });
    });

    // Links rápidos
    container.querySelectorAll(".btn-ligar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const telefone = e.currentTarget.dataset.telefone;
        window.location.href = `tel:${telefone}`;
      });
    });

    container.querySelectorAll(".btn-email").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const email = e.currentTarget.dataset.email;
        window.location.href = `mailto:${email}`;
      });
    });

    container.querySelectorAll(".btn-whatsapp").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const telefone = e.currentTarget.dataset.telefone
          .replace(/\D/g, "");
        window.open(
          `https://wa.me/55${telefone.slice(-11)}?text=Olá, tudo bem?`,
          "_blank",
        );
      });
    });
  },

  /**
   * Renderiza um cartão de contato com informações e ações rápidas
   */
  renderizarCartaoContato(contato, idx) {
    return `
      <div class="card mb-2 border-left-primary">
        <div class="card-body pb-2">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-0 fw-bold">${contato.nome}</h6>
              <small class="text-muted">${contato.cargo || "Sem cargo"}</small>
            </div>
            <div class="d-flex gap-1">
              <button 
                type="button" 
                class="btn-editar-contato btn btn-sm btn-outline-secondary" 
                data-index="${idx}"
                title="Editar contato"
              >
                ✏️
              </button>
              <button 
                type="button" 
                class="btn-remover-contato btn btn-sm btn-outline-danger" 
                data-index="${idx}"
                title="Remover contato"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="small mb-2">
            ${
              contato.email
                ? `<div>📧 <a href="mailto:${contato.email}" class="text-decoration-none">${contato.email}</a></div>`
                : ""
            }
            ${
              contato.telefone
                ? `<div>📱 ${contato.telefone}</div>`
                : ""
            }
            ${
              contato.whatsapp
                ? `<div>💬 ${contato.whatsapp}</div>`
                : ""
            }
          </div>

          ${
            contato.observacao
              ? `<small class="text-muted d-block mb-2"><strong>Obs:</strong> ${contato.observacao}</small>`
              : ""
          }

          <div class="d-flex gap-1 pt-1">
            ${
              contato.telefone
                ? `
              <button 
                type="button" 
                class="btn-ligar btn btn-xs btn-outline-success" 
                data-telefone="${contato.telefone}"
                title="Ligar"
              >
                ☎️ Ligar
              </button>
              <button 
                type="button" 
                class="btn-whatsapp btn btn-xs btn-outline-info" 
                data-telefone="${contato.telefone}"
                title="Enviar WhatsApp"
              >
                💬 WhatsApp
              </button>
            `
                : ""
            }
            ${
              contato.email
                ? `
              <button 
                type="button" 
                class="btn-email btn btn-xs btn-outline-primary" 
                data-email="${contato.email}"
                title="Enviar E-mail"
              >
                📧 E-mail
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Abre o modal para adicionar/editar contato
   */
  abrirModalContato(idxEdicao = null) {
    const modal = document.querySelector("#modal-contato");
    const form = document.querySelector("#form-contato");
    const title = document.querySelector("#titulo-modal-contato");

    if (!modal || !form) return;

    form.reset();
    form.dataset.indexEdicao = idxEdicao !== null ? idxEdicao : "-1";

    if (idxEdicao !== null) {
      const contato = this.contatosAtuais[idxEdicao];
      if (contato) {
        title.textContent = "✏️ Editar Contato";
        document.querySelector("#contato-nome").value = contato.nome || "";
        document.querySelector("#contato-cargo").value = contato.cargo || "";
        document.querySelector("#contato-telefone").value =
          contato.telefone || "";
        document.querySelector("#contato-email").value = contato.email || "";
        document.querySelector("#contato-whatsapp").value =
          contato.whatsapp || "";
        document.querySelector("#contato-observacao").value =
          contato.observacao || "";
      }
    } else {
      title.textContent = "➕ Novo Contato";
    }

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  },

  /**
   * Fecha o modal de contato
   */
  fecharModalContato() {
    const modal = document.querySelector("#modal-contato");
    if (modal) {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) bootstrapModal.hide();
    }
  },

  /**
   * Salva um novo contato ou atualiza existente
   */
  salvarContato(e) {
    e.preventDefault();

    const nome = document.querySelector("#contato-nome").value.trim().toUpperCase();
    const cargo = document.querySelector("#contato-cargo").value.trim().toUpperCase();
    const telefone = document.querySelector("#contato-telefone").value.trim();
    const email = document.querySelector("#contato-email").value.trim().toUpperCase();
    const whatsapp = document.querySelector("#contato-whatsapp").value.trim();
    const observacao = document
      .querySelector("#contato-observacao")
      .value.trim().toUpperCase();

    // Validação
    if (!nome) {
      alert("⚠️ Nome do contato é obrigatório.");
      return;
    }

    if (!telefone && !email && !whatsapp) {
      alert(
        "⚠️ Pelo menos um dos campos (Telefone, E-mail ou WhatsApp) é obrigatório.",
      );
      return;
    }

    const indexEdicao = parseInt(
      document.querySelector("#form-contato").dataset.indexEdicao,
    );

    const novoContato = {
      nome,
      cargo,
      telefone,
      email,
      whatsapp,
      observacao,
      dataCriacao: new Date().toISOString(),
    };

    if (indexEdicao >= 0) {
      // Edição — mantém data de criação original
      novoContato.dataCriacao =
        this.contatosAtuais[indexEdicao].dataCriacao;
      this.contatosAtuais[indexEdicao] = novoContato;
    } else {
      // Adição
      this.contatosAtuais.push(novoContato);
    }

    this.fecharModalContato();
    this.renderizarLista();
  },

  /**
   * Abre o modal para editar um contato existente
   */
  editarContato(idx) {
    this.abrirModalContato(idx);
  },

  /**
   * Remove um contato da lista
   */
  removerContato(idx) {
    if (confirm("Tem certeza que deseja remover este contato?")) {
      this.contatosAtuais.splice(idx, 1);
      this.renderizarLista();
    }
  },

  /**
   * Obtém os contatos atuais (para persistência ao salvar a empresa)
   */
  obterContatos() {
    return this.contatosAtuais;
  },
};

// Inicializa quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ContatosController.init());
} else {
  ContatosController.init();
}
