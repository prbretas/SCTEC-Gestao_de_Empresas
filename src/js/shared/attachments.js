/**
 * attachments.js — Gerenciamento de anexos de arquivos (#58)
 * Suporta upload de imagens (JPG/PNG) e PDFs via Base64.
 * Limite: 5MB por arquivo, máximo 5 anexos por registro.
 */

const AttachmentsController = {

  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_ANEXOS: 5,
  TIPOS_ACEITOS: ["image/jpeg", "image/png", "image/webp", "application/pdf"],

  /**
   * Renderiza a área de anexos dentro de um container.
   * @param {string} containerId - ID do elemento container
   * @param {Array} anexos - array de anexos existentes
   * @param {boolean} readOnly - se true, não exibe botão de upload
   */
  renderizar(containerId, anexos = [], readOnly = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const listaAnexos = (anexos || []).map((a, idx) => {
      const isImagem = a.tipo && a.tipo.startsWith("image/");
      const preview = isImagem
        ? `<img src="${a.base64}" alt="${a.nome}" style="height:48px;max-width:80px;object-fit:cover;border-radius:4px;" />`
        : `<span style="font-size:2rem;">📄</span>`;

      const btnRemover = readOnly ? "" : `
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="AttachmentsController.remover('${containerId}', ${idx})" title="Remover">
          ✕
        </button>`;

      return `
        <div class="d-flex align-items-center gap-2 p-2 border rounded mb-2 bg-light">
          ${preview}
          <div class="flex-grow-1 small">
            <div class="fw-semibold text-truncate" style="max-width:200px;">${a.nome}</div>
            <div class="text-muted" style="font-size:.7rem;">${(a.tamanho / 1024).toFixed(0)} KB • ${new Date(a.dataUpload).toLocaleDateString("pt-BR")}</div>
          </div>
          <a href="${a.base64}" download="${a.nome}" class="btn btn-xs btn-outline-secondary" title="Download">⬇️</a>
          ${btnRemover}
        </div>`;
    }).join("");

    const qtdAtual = (anexos || []).length;
    const btnUpload = readOnly || qtdAtual >= this.MAX_ANEXOS ? "" : `
      <label class="btn btn-sm btn-outline-primary mb-0 mt-2">
        📎 Anexar arquivo (${qtdAtual}/${this.MAX_ANEXOS})
        <input type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf"
          onchange="AttachmentsController.onFileSelected('${containerId}', this)" />
      </label>
      <div class="text-muted small mt-1">JPG, PNG ou PDF • Máx. 5MB cada</div>`;

    container.innerHTML = `
      <div class="mb-2 fw-semibold small">📎 Anexos</div>
      ${listaAnexos || '<div class="text-muted small">Nenhum anexo.</div>'}
      ${btnUpload}`;
  },

  /**
   * Handler quando um arquivo é selecionado.
   * @param {string} containerId
   * @param {HTMLInputElement} input
   */
  onFileSelected(containerId, input) {
    const file = input.files[0];
    if (!file) return;

    // Validações
    if (!this.TIPOS_ACEITOS.includes(file.type)) {
      alert("⚠️ Tipo de arquivo não aceito. Use JPG, PNG ou PDF.");
      input.value = "";
      return;
    }

    if (file.size > this.MAX_SIZE_BYTES) {
      alert(`⚠️ Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 5MB.`);
      input.value = "";
      return;
    }

    const container = document.getElementById(containerId);
    const anexosAttr = container?.getAttribute("data-anexos");
    const anexos = anexosAttr ? JSON.parse(anexosAttr) : [];

    if (anexos.length >= this.MAX_ANEXOS) {
      alert(`⚠️ Máximo de ${this.MAX_ANEXOS} anexos por registro.`);
      input.value = "";
      return;
    }

    // Converte para Base64
    const reader = new FileReader();
    reader.onload = () => {
      anexos.push({
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        base64: reader.result,
        dataUpload: new Date().toISOString(),
      });
      container.setAttribute("data-anexos", JSON.stringify(anexos));
      this.renderizar(containerId, anexos, false);
    };
    reader.readAsDataURL(file);
    input.value = "";
  },

  /**
   * Remove um anexo pelo índice.
   * @param {string} containerId
   * @param {number} idx
   */
  remover(containerId, idx) {
    if (!confirm("Remover este anexo?")) return;
    const container = document.getElementById(containerId);
    const anexosAttr = container?.getAttribute("data-anexos");
    const anexos = anexosAttr ? JSON.parse(anexosAttr) : [];
    anexos.splice(idx, 1);
    container.setAttribute("data-anexos", JSON.stringify(anexos));
    this.renderizar(containerId, anexos, false);
  },

  /**
   * Retorna os anexos atuais de um container.
   * @param {string} containerId
   * @returns {Array}
   */
  obterAnexos(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const attr = container.getAttribute("data-anexos");
    return attr ? JSON.parse(attr) : [];
  },

  /**
   * Carrega anexos existentes num container (para edição).
   * @param {string} containerId
   * @param {Array} anexos
   * @param {boolean} readOnly
   */
  carregar(containerId, anexos = [], readOnly = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.setAttribute("data-anexos", JSON.stringify(anexos || []));
    this.renderizar(containerId, anexos || [], readOnly);
  },
};

window.AttachmentsController = AttachmentsController;
