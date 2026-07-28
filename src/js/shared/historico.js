/**
 * HistoricoController — Timeline de interações/ocorrências por empresa (#23)
 * CRUD de ocorrências vinculadas ao empreendimento.
 */

const HistoricoController = {
  ocorrenciasAtuais: [],
  empresaIdAtual: null,

  init() {
    document.querySelector("#btn-adicionar-ocorrencia")
      ?.addEventListener("click", () => this.abrirModal());
    document.querySelector("#btn-fechar-modal-ocorrencia")
      ?.addEventListener("click", () => this.fecharModal());
    document.querySelector("#form-ocorrencia")
      ?.addEventListener("submit", (e) => this.salvar(e));
  },

  carregarOcorrencias(empresaId, ocorrencias = []) {
    this.empresaIdAtual = empresaId;
    this.ocorrenciasAtuais = JSON.parse(JSON.stringify(ocorrencias || []));
    this.renderizar();
  },

  renderizar() {
    const container = document.querySelector("#historico-lista");
    if (!container) return;

    if (this.ocorrenciasAtuais.length === 0) {
      container.innerHTML = '<div class="text-muted small">Nenhuma interação registrada.</div>';
      return;
    }

    // Ordena por data (mais recente primeiro)
    const sorted = [...this.ocorrenciasAtuais].sort((a, b) =>
      (b.data + (b.hora || "")).localeCompare(a.data + (a.hora || ""))
    );

    const tipoConfig = {
      ligacao: { icon: "📞", cor: "secondary" },
      reuniao: { icon: "🤝", cor: "primary" },
      email: { icon: "📧", cor: "info" },
      visita: { icon: "🏢", cor: "success" },
      proposta: { icon: "📄", cor: "warning" },
      contrato: { icon: "📝", cor: "dark" },
      outro: { icon: "📌", cor: "secondary" },
    };

    const statusConfig = {
      concluido: { icon: "✅", badge: "bg-success" },
      pendente: { icon: "⏳", badge: "bg-warning text-dark" },
      aberto: { icon: "🔓", badge: "bg-info" },
    };

    container.innerHTML = sorted.map((oc, idx) => {
      const tc = tipoConfig[oc.tipo] || tipoConfig.outro;
      const sc = statusConfig[oc.status] || statusConfig.concluido;
      const dataFmt = oc.data ? new Date(oc.data + "T12:00:00").toLocaleDateString("pt-BR") : "";

      return `
        <div class="d-flex gap-3 mb-3 pb-3 border-bottom">
          <div class="text-center" style="min-width:40px;">
            <div style="font-size:1.5rem;">${tc.icon}</div>
            <div class="small text-muted">${dataFmt}</div>
            ${oc.hora ? `<div class="small text-muted">${oc.hora}</div>` : ""}
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <span class="badge bg-${tc.cor} me-1">${oc.tipo}</span>
                <span class="badge ${sc.badge}">${sc.icon} ${oc.status}</span>
              </div>
              <div class="d-flex gap-1">
                <button type="button" class="btn btn-xs btn-outline-secondary" onclick="HistoricoController.abrirModal(${idx})">✏️</button>
                <button type="button" class="btn btn-xs btn-outline-danger" onclick="HistoricoController.remover(${idx})">🗑️</button>
              </div>
            </div>
            <p class="mb-0 mt-1 small">${oc.descricao || ""}</p>
          </div>
        </div>`;
    }).join("");
  },

  abrirModal(idxEdicao = null) {
    const modal = document.querySelector("#modal-ocorrencia");
    const form = document.querySelector("#form-ocorrencia");
    const title = document.querySelector("#titulo-modal-ocorrencia");
    if (!modal || !form) return;

    form.reset();
    form.dataset.indexEdicao = idxEdicao !== null ? idxEdicao : "-1";

    if (idxEdicao !== null && idxEdicao >= 0) {
      const oc = this.ocorrenciasAtuais[idxEdicao];
      if (oc) {
        title.textContent = "✏️ Editar Ocorrência";
        document.querySelector("#ocorrencia-data").value = oc.data || "";
        document.querySelector("#ocorrencia-hora").value = oc.hora || "";
        document.querySelector("#ocorrencia-tipo").value = oc.tipo || "outro";
        document.querySelector("#ocorrencia-descricao").value = oc.descricao || "";
        document.querySelector("#ocorrencia-status").value = oc.status || "concluido";
      }
    } else {
      title.textContent = "➕ Nova Ocorrência";
      document.querySelector("#ocorrencia-data").value = new Date().toISOString().split("T")[0];
    }

    new bootstrap.Modal(modal).show();
  },

  fecharModal() {
    const modal = document.querySelector("#modal-ocorrencia");
    if (modal) {
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  },

  salvar(e) {
    e.preventDefault();
    const data = document.querySelector("#ocorrencia-data").value;
    const descricao = document.querySelector("#ocorrencia-descricao").value.trim();
    if (!data || !descricao) { alert("⚠️ Data e Descrição são obrigatórios."); return; }

    const ocorrencia = {
      data,
      hora: document.querySelector("#ocorrencia-hora").value || "",
      tipo: document.querySelector("#ocorrencia-tipo").value,
      descricao,
      status: document.querySelector("#ocorrencia-status").value,
      dataCriacao: new Date().toISOString(),
    };

    const idx = parseInt(document.querySelector("#form-ocorrencia").dataset.indexEdicao);
    if (idx >= 0) {
      ocorrencia.dataCriacao = this.ocorrenciasAtuais[idx].dataCriacao;
      this.ocorrenciasAtuais[idx] = ocorrencia;
    } else {
      this.ocorrenciasAtuais.push(ocorrencia);
    }

    this.fecharModal();
    this.renderizar();
  },

  remover(idx) {
    if (!confirm("Remover esta ocorrência?")) return;
    this.ocorrenciasAtuais.splice(idx, 1);
    this.renderizar();
  },

  obterOcorrencias() {
    return this.ocorrenciasAtuais;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => HistoricoController.init());
} else {
  HistoricoController.init();
}

window.HistoricoController = HistoricoController;
