/**
 * forms.js - Controller de Formulários (Versão com Travas de Integridade)
 */
const FormController = {
  form: document.querySelector("#form-empreendimento"),

  init() {
    if (!this.form) return;
    this.form.addEventListener("submit", (e) => this.handleSave(e));
    this.initInputs();
  },

  initInputs() {
    const inputCep = document.querySelector("#cep");
    const inputReg = document.querySelector("#registro");
    const selectTipo = document.querySelector("#tipo-pessoa");
    const selectSeg = document.querySelector("#segmento");
    const labelReg = document.querySelector("#label-registro");

    inputCep?.addEventListener("blur", async () => {
      // Se o campo estiver desabilitado (modo visualização ou trava), não busca
      if (inputCep.disabled) return;

      const cep = inputCep.value.replace(/\D/g, "");
      if (cep.length === 8) {
        const dados = await ApiService.buscarCep(cep);
        if (dados && !dados.erro) {
          document.querySelector("#endereco").value =
            `${dados.logradouro}${dados.bairro ? ", " + dados.bairro : ""}`;
          document.querySelector("#municipio").value = dados.localidade;
        }
      }
    });

    const aplicarMascara = () => {
      inputReg.value = Utils.aplicarMascaraDocumento(
        inputReg.value,
        selectTipo.value,
      );
    };

    inputReg?.addEventListener("input", aplicarMascara);

    selectTipo?.addEventListener("change", () => {
      inputReg.value = "";
      const tipo = selectTipo.value;
      if (labelReg) labelReg.textContent = tipo === "PF" ? "CPF" : "CNPJ";
      inputReg.placeholder =
        tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00";
      inputReg.setAttribute("maxlength", tipo === "PF" ? "14" : "18");
      inputReg.focus();
    });

    selectSeg?.addEventListener("change", () => this.atualizarEstiloSegmento());
  },

  /**
   * Define o estado de todos os campos do formulário
   * @param {boolean} status - true para desabilitar tudo, false para habilitar tudo
   */
  setReadOnly(status) {
    const inputs = this.form.querySelectorAll("input, select, textarea");
    const btnSalvar = document.querySelector("#btn-salvar");

    inputs.forEach((el) => (el.disabled = status));
    if (btnSalvar) btnSalvar.style.display = status ? "none" : "inline-block";
  },

  /**
   * Trava apenas os campos que não podem ser alterados após a criação
   */
  travarCamposIntegridade() {
    // Campos que não podem ser alterados após o primeiro salvamento:
    const camposImutaveis = ["#nome", "#tipo-pessoa", "#registro", "#segmento"];

    camposImutaveis.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.disabled = true;
        // Adiciona um feedback visual de campo travado
        el.style.backgroundColor = "var(--dark-bg-grid)";
        el.style.cursor = "not-allowed";
        el.title =
          "Este campo não pode ser alterado para manter a integridade dos dados.";
      }
    });
  },

  atualizarEstiloSegmento() {
    const select = document.querySelector("#segmento");
    if (!select) return;
    const config = Utils.obterConfigSegmento(select.value);
    select.style.setProperty("--seg-bg", config.bg);
    select.style.setProperty("--seg-text", config.text);
    select.style.setProperty("--seg-border", config.border);
    select.style.backgroundColor = "var(--seg-bg)";
    select.style.color = "var(--seg-text)";
    select.style.borderColor = "var(--seg-border)";
  },

  handleSave(e) {
    e.preventDefault();
    const id = document.querySelector("#emp-id").value;

    // Capturamos os dados. Nota: Campos 'disabled' não vêm no FormData padrão,
    // então pegamos via querySelector diretamente para garantir que o objeto de salvamento esteja completo.
    const dados = {
      nome: document.querySelector("#nome").value.trim(),
      tipoPessoa: document.querySelector("#tipo-pessoa").value,
      registro: document.querySelector("#registro").value.trim(),
      responsavel: document.querySelector("#responsavel").value.trim(),
      contato: document.querySelector("#contato").value.trim(),
      cep: document.querySelector("#cep").value.trim(),
      endereco: document.querySelector("#endereco").value.trim(),
      municipio: document.querySelector("#municipio").value.trim(),
      segmento: document.querySelector("#segmento").value,
      status: document.querySelector("#status").value,
      observacoes: document.querySelector("#observacoes").value.trim(),
    };

    const duplicado = EmpreendimentoStorage.buscarTodos().find(
      (emp) => emp.registro === dados.registro && emp.id !== Number(id),
    );

    if (duplicado) {
      return alert(
        `ERRO: O registro ${dados.registro} já pertence a "${duplicado.nome}".`,
      );
    }

    id
      ? EmpreendimentoStorage.atualizar(id, dados)
      : EmpreendimentoStorage.adicionar(dados);
    UIController.modalForm.hide();
    UIController.renderizarLista();
  },

  prepararVisualizacao(id) {
    const emp = EmpreendimentoStorage.buscarTodos().find(
      (item) => item.id === Number(id),
    );
    if (!emp) return;

    this.carregarDadosNoForm(emp);
    this.setReadOnly(true); // Bloqueia TUDO
    document.querySelector("#titulo-modal-form").textContent =
      `🔍 Visualizando: ${emp.nome}`;

    const infoAudit = document.querySelector("#auditoria-info");
    const dataAlt = emp.dataAtualizacao || emp.dataCadastro;
    infoAudit.innerHTML = `Criado em: ${Utils.formatarDataHora(emp.dataCadastro)}<br>Última alteração: ${Utils.formatarDataHora(dataAlt)}`;

    UIController.modalForm.show();
  },

  prepararEdicao(id) {
    const emp = EmpreendimentoStorage.buscarTodos().find(
      (item) => item.id === Number(id),
    );
    if (!emp) return;

    this.carregarDadosNoForm(emp);
    this.setReadOnly(false); // Libera o formulário primeiro

    // REGRA DE NEGÓCIO: Trava campos de integridade após a criação
    this.travarCamposIntegridade();

    document.querySelector("#titulo-modal-form").textContent =
      `✏️ Editando: ${emp.nome}`;
    document.querySelector("#auditoria-info").innerHTML = "";

    UIController.modalForm.show();
  },

  carregarDadosNoForm(emp) {
    document.querySelector("#emp-id").value = emp.id;
    document.querySelector("#nome").value = emp.nome;
    document.querySelector("#tipo-pessoa").value = emp.tipoPessoa || "PJ";
    document.querySelector("#registro").value = emp.registro;
    document.querySelector("#responsavel").value = emp.responsavel || "";
    document.querySelector("#contato").value = emp.contato || "";
    document.querySelector("#cep").value = emp.cep || "";
    document.querySelector("#endereco").value = emp.endereco;
    document.querySelector("#municipio").value = emp.municipio;
    document.querySelector("#segmento").value = emp.segmento;
    document.querySelector("#status").value = emp.status;
    document.querySelector("#observacoes").value = emp.observacoes || "";

    this.atualizarEstiloSegmento();
    const labelReg = document.querySelector("#label-registro");
    if (labelReg)
      labelReg.textContent = emp.tipoPessoa === "PF" ? "CPF" : "CNPJ";

    // Resetar estilos de travamento que podem ter vindo de edições anteriores
    const inputs = this.form.querySelectorAll("input, select");
    inputs.forEach((el) => {
      el.style.backgroundColor = "";
      el.style.cursor = "";
    });
  },
};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  FormController.setReadOnly(false); // Tudo liberado para novos registros
  document.querySelector("#emp-id").value = "";
  document.querySelector("#titulo-modal-form").textContent =
    "Novo Empreendimento";
  document.querySelector("#auditoria-info").innerHTML = "";

  // Limpa estilos de travamento
  const inputs = FormController.form.querySelectorAll("input, select");
  inputs.forEach((el) => {
    el.style.backgroundColor = "";
    el.style.cursor = "";
  });

  FormController.atualizarEstiloSegmento();
  UIController.modalForm.show();
};
