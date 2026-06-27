/**
 * agenda.js — Módulo de Agenda de Compromissos.
 * Armazena compromissos no mesmo storage da org (SCTEC_DATA_ORG_{orgId}).
 * Chave dedicada: SCTEC_AGENDA_{orgId|userId}
 */

const AgendaStorage = {
  _obterChave() {
    if (window.AuthService) {
      const sessao = AuthService.obterSessao();
      if (sessao) return `SCTEC_AGENDA_${sessao.orgId || sessao.id}`;
    }
    return "SCTEC_AGENDA_local";
  },

  buscarTodos() {
    try {
      return JSON.parse(localStorage.getItem(this._obterChave()) || "[]");
    } catch { return []; }
  },

  salvarTodos(lista) {
    localStorage.setItem(this._obterChave(), JSON.stringify(lista));
  },

  adicionar(comp) {
    const lista = this.buscarTodos();
    comp.id = Date.now().toString();
    comp.criadoEm = new Date().toISOString();
    lista.push(comp);
    this.salvarTodos(lista);
    return comp;
  },

  atualizar(id, dados) {
    const lista = this.buscarTodos();
    const idx = lista.findIndex((c) => c.id === id);
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], ...dados, id };
      this.salvarTodos(lista);
    }
  },

  excluir(id) {
    this.salvarTodos(this.buscarTodos().filter((c) => c.id !== id));
  },
};

// ─── Inicialização ─────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const sessao = AuthService.requireAuth();
  if (!sessao) return;

  if (window.ConfigController) ConfigController.aplicar(ConfigController.obter());

  const modal = new bootstrap.Modal(document.getElementById("modal-compromisso"));

  // Preenche o select de empresas com dados do storage
  _preencherEmpresas();

  // Define o mês atual no filtro
  const hoje = new Date();
  document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  renderizarLista();

  // Eventos
  document.getElementById("btn-novo-compromisso").addEventListener("click", () => {
    _resetarForm();
    document.getElementById("titulo-modal-compromisso").textContent = "📅 Novo Compromisso";
    // Pré-preenche a data com hoje
    document.getElementById("comp-data").value = new Date().toISOString().split("T")[0];
    modal.show();
  });

  document.getElementById("form-compromisso").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-compromisso").dataset.editId;
    const dados = _coletarForm();
    if (!dados) return;

    if (id) {
      AgendaStorage.atualizar(id, dados);
    } else {
      AgendaStorage.adicionar(dados);
    }

    modal.hide();
    renderizarLista();
  });

  ["filtro-mes", "filtro-tipo", "filtro-busca"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderizarLista);
    document.getElementById(id)?.addEventListener("change", renderizarLista);
  });

  document.getElementById("btn-limpar-filtro").addEventListener("click", () => {
    document.getElementById("filtro-tipo").value = "";
    document.getElementById("filtro-busca").value = "";
    const hoje = new Date();
    document.getElementById("filtro-mes").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    renderizarLista();
  });
});

function _preencherEmpresas() {
  const select = document.getElementById("comp-empresa");
  if (!select || !window.EmpreendimentoStorage) return;
  const empresas = EmpreendimentoStorage.buscarTodos();
  empresas.forEach((emp) => {
    const opt = document.createElement("option");
    opt.value = emp.id;
    opt.textContent = emp.nome;
    select.appendChild(opt);
  });
}

function _resetarForm() {
  const form = document.getElementById("form-compromisso");
  form.reset();
  delete form.dataset.editId;
}

function _coletarForm() {
  const titulo = document.getElementById("comp-titulo").value.trim();
  const data = document.getElementById("comp-data").value;
  if (!titulo || !data) { alert("Título e Data são obrigatórios."); return null; }
  return {
    titulo,
    data,
    hora: document.getElementById("comp-hora").value,
    tipo: document.getElementById("comp-tipo").value,
    empresaId: document.getElementById("comp-empresa").value,
    descricao: document.getElementById("comp-descricao").value.trim(),
    status: document.getElementById("comp-status").value,
  };
}

function renderizarLista() {
  const container = document.getElementById("agenda-lista");
  const vazio = document.getElementById("agenda-vazio");
  if (!container) return;

  const mesFiltro = document.getElementById("filtro-mes").value;
  const tipoFiltro = document.getElementById("filtro-tipo").value;
  const busca = document.getElementById("filtro-busca").value.toLowerCase().trim();

  let dados = AgendaStorage.buscarTodos()
    .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""));

  if (mesFiltro) {
    dados = dados.filter((c) => c.data && c.data.startsWith(mesFiltro));
  }
  if (tipoFiltro) {
    dados = dados.filter((c) => c.tipo === tipoFiltro);
  }
  if (busca) {
    dados = dados.filter((c) =>
      c.titulo?.toLowerCase().includes(busca) || c.descricao?.toLowerCase().includes(busca)
    );
  }

  if (dados.length === 0) {
    container.innerHTML = "";
    vazio?.classList.remove("d-none");
    return;
  }
  vazio?.classList.add("d-none");

  const tipoConfig = {
    reuniao:  { icon: "🤝", badge: "bg-primary" },
    visita:   { icon: "🏢", badge: "bg-info text-dark" },
    ligacao:  { icon: "📞", badge: "bg-secondary" },
    prazo:    { icon: "⏰", badge: "bg-danger" },
    outro:    { icon: "📌", badge: "bg-dark" },
  };

  const statusConfig = {
    pendente:  { icon: "⏳", badge: "bg-warning text-dark" },
    concluido: { icon: "✅", badge: "bg-success" },
    cancelado: { icon: "❌", badge: "bg-secondary" },
  };

  container.innerHTML = dados.map((c) => {
    const tc = tipoConfig[c.tipo] || tipoConfig.outro;
    const sc = statusConfig[c.status] || statusConfig.pendente;
    const dataFmt = c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : "";
    return `
      <div class="card shadow-sm border-0 mb-3">
        <div class="card-body p-3 d-flex align-items-start gap-3">
          <div style="font-size:2rem;line-height:1;">${tc.icon}</div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
              <h6 class="fw-bold mb-1">${c.titulo}</h6>
              <div class="d-flex gap-1">
                <span class="badge ${tc.badge}">${c.tipo}</span>
                <span class="badge ${sc.badge}">${sc.icon} ${c.status}</span>
              </div>
            </div>
            <div class="small text-muted">
              📅 ${dataFmt}${c.hora ? " às " + c.hora : ""}
              ${c.descricao ? `<br>📝 ${c.descricao}` : ""}
            </div>
          </div>
          <div class="d-flex flex-column gap-1">
            <button class="btn btn-xs btn-outline-warning" onclick="editarCompromisso('${c.id}')">✏️</button>
            <button class="btn btn-xs btn-outline-danger" onclick="excluirCompromisso('${c.id}')">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

function editarCompromisso(id) {
  const comp = AgendaStorage.buscarTodos().find((c) => c.id === id);
  if (!comp) return;

  document.getElementById("titulo-modal-compromisso").textContent = "✏️ Editar Compromisso";
  document.getElementById("comp-titulo").value = comp.titulo || "";
  document.getElementById("comp-data").value = comp.data || "";
  document.getElementById("comp-hora").value = comp.hora || "";
  document.getElementById("comp-tipo").value = comp.tipo || "outro";
  document.getElementById("comp-empresa").value = comp.empresaId || "";
  document.getElementById("comp-descricao").value = comp.descricao || "";
  document.getElementById("comp-status").value = comp.status || "pendente";
  document.getElementById("form-compromisso").dataset.editId = id;

  new bootstrap.Modal(document.getElementById("modal-compromisso")).show();
}

function excluirCompromisso(id) {
  if (!confirm("Deseja remover este compromisso?")) return;
  AgendaStorage.excluir(id);
  renderizarLista();
}
