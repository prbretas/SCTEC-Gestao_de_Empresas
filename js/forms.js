/**
 * forms.js - Controller de Formulários (Versão com Visualização Integrada)
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

  setReadOnly(status) {
    const inputs = this.form.querySelectorAll("input, select, textarea");
    const btnSalvar = document.querySelector("#btn-salvar");

    inputs.forEach((el) => (el.disabled = status));
    if (btnSalvar) btnSalvar.style.display = status ? "none" : "inline-block";
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
    this.setReadOnly(true);
    document.querySelector("#titulo-modal-form").textContent =
      `Visualizar: ${emp.nome}`;

    // Auditoria
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
    this.setReadOnly(false);
    document.querySelector("#titulo-modal-form").textContent =
      `Editar: ${emp.nome}`;
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
  },
};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  FormController.setReadOnly(false);
  document.querySelector("#emp-id").value = "";
  document.querySelector("#titulo-modal-form").textContent =
    "Novo Empreendimento";
  document.querySelector("#auditoria-info").innerHTML = "";
  FormController.atualizarEstiloSegmento();
  UIController.modalForm.show();
};
