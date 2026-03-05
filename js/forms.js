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
      if (inputCep.disabled) return;

      const cep = inputCep.value.replace(/\D/g, "");
      if (cep.length === 8) {
        console.log("Iniciando busca para o CEP:", cep); // Debug
        const dados = await ApiService.buscarCep(cep);

        if (dados) {
          document.querySelector("#endereco").value =
            `${dados.logradouro}${dados.bairro ? ", " + dados.bairro : ""}`;
          document.querySelector("#municipio").value = dados.localidade;
          console.log("Campos preenchidos com sucesso.");
        } else {
          alert("CEP não encontrado ou erro na rede.");
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

    inputs.forEach((el) => {
      if (status) {
        el.classList.add("campo-bloqueado");
        if (el.tagName === "SELECT") el.style.pointerEvents = "none";
        else el.readOnly = true;
      } else {
        el.classList.remove("campo-bloqueado");
        el.style.pointerEvents = "auto";
        el.readOnly = false;
      }
    });

    if (btnSalvar) btnSalvar.style.display = status ? "none" : "inline-block";
    this.atualizarEstiloSegmento();
  },

  /**
   * Trava apenas os campos que não podem ser alterados após a criação
   */
  travarCamposIntegridade() {
    const seletores = ["#nome", "#registro", "#tipo-pessoa", "#segmento"];
    seletores.forEach((s) => {
      const el = document.querySelector(s);
      if (el) {
        el.classList.add("campo-bloqueado");
        if (el.tagName === "SELECT") el.style.pointerEvents = "none";
        else el.readOnly = true;
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
    const dados = {
      nome: document.querySelector("#nome").value,
      tipoPessoa: document.querySelector("#tipo-pessoa").value,
      registro: document.querySelector("#registro").value,
      responsavel: document.querySelector("#responsavel").value,
      contato: document.querySelector("#contato").value,
      cep: document.querySelector("#cep").value,
      endereco: document.querySelector("#endereco").value,
      municipio: document.querySelector("#municipio").value,
      segmento: document.querySelector("#segmento").value,
      status: document.querySelector("#status").value,
      observacoes: document.querySelector("#observacoes").value,
    };

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
      (i) => i.id === Number(id),
    );
    if (!emp) return;
    this.carregarDadosNoForm(emp);
    this.setReadOnly(false); // Libera o form
    this.travarCamposIntegridade(); // Mas trava os campos de regra de negócio
    document.querySelector("#titulo-modal-form").textContent =
      `✏️ Editando: ${emp.nome}`;
    UIController.modalForm.show();
  },
  carregarDadosNoForm(emp) {
    document.querySelector("#emp-id").value = emp.id;
    document.querySelector("#nome").value = emp.nome;
    document.querySelector("#tipo-pessoa").value = emp.tipoPessoa;
    document.querySelector("#registro").value = emp.registro;
    document.querySelector("#responsavel").value = emp.responsavel;
    document.querySelector("#contato").value = emp.contato;
    document.querySelector("#cep").value = emp.cep;
    document.querySelector("#endereco").value = emp.endereco;
    document.querySelector("#municipio").value = emp.municipio;
    document.querySelector("#segmento").value = emp.segmento;
    document.querySelector("#status").value = emp.status;
    document.querySelector("#observacoes").value = emp.observacoes;
    this.atualizarEstiloSegmento();
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
