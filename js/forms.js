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

    // Lógica ViaCEP
    inputCep?.addEventListener("blur", async () => {
      const cep = inputCep.value.replace(/\D/g, "");
      if (cep.length === 8) {
        const dados = await ApiService.buscarCep(cep);
        if (dados) {
          document.querySelector("#endereco").value = `${dados.logradouro}, ${dados.bairro}`;
          document.querySelector("#municipio").value = dados.localidade;
        }
      }
    });

    // Lógica BrasilAPI + Preenchimento de Observações
    inputReg?.addEventListener("blur", async () => {
      const reg = inputReg.value.replace(/\D/g, "");
      if (selectTipo.value === "PJ" && reg.length === 14) {
        const dados = await ApiService.buscarCnpj(reg);
        if (dados) {
          // Preenchimento básico
          document.querySelector("#nome").value = dados.razao_social;
          document.querySelector("#cep").value = dados.cep;
          document.querySelector("#endereco").value = `${dados.logradouro}, ${dados.numero}`;
          document.querySelector("#municipio").value = dados.municipio;

          // Montagem das informações adicionais para o campo Observações
          const infoExtra = `--- INFO AUTOMÁTICA CNPJ ---
                            NOME FANTASIA: ${dados.nome_fantasia || "Não informado"}
                            DATA DE ABERTURA: ${dados.data_abertura || "N/A"}
                            SITUAÇÃO: ${dados.descricao_situacao_cadastral || "N/A"}
                            CNAE PRINCIPAL: ${dados.cnae_fiscal_descricao || "N/A"}                            
                            ----------------------------`;

          const campoObs = document.querySelector("#observacoes");
          // Adiciona a info mantendo o que já estava escrito ou limpa se for novo
          campoObs.value = campoObs.value ? campoObs.value + "\n\n" + infoExtra : infoExtra;
        }
      }
    });
  },

  setReadOnly(status) {
    const inputs = this.form.querySelectorAll("input, select, textarea");
    const btnSalvar = document.querySelector("#btn-salvar");
    inputs.forEach(el => {
      el.readOnly = status;
      if (el.tagName === "SELECT") el.style.pointerEvents = status ? "none" : "auto";
      el.classList.toggle("bg-light", status);
    });
    if (btnSalvar) btnSalvar.style.display = status ? "none" : "block";
  },

  prepararVisualizacao(id) {
    const emp = EmpreendimentoStorage.buscarPorId(id);
    if (emp) {
      this.preencherForm(emp);
      this.setReadOnly(true);
      document.querySelector("#titulo-modal-form").textContent = "Visualizar Registro";
      UIController.modalForm.show();
    }
  },

  prepararEdicao(id) {
    const emp = EmpreendimentoStorage.buscarPorId(id);
    if (emp) {
      this.preencherForm(emp);
      this.setReadOnly(false);
      document.querySelector("#titulo-modal-form").textContent = "Editar Registro";
      UIController.modalForm.show();
    }
  },

  preencherForm(emp) {
    document.querySelector("#emp-id").value = emp.id;
    document.querySelector("#nome").value = emp.nome;
    document.querySelector("#tipo-pessoa").value = emp.tipoPessoa;
    document.querySelector("#registro").value = emp.registro;
    document.querySelector("#responsavel").value = emp.responsavel;
    document.querySelector("#cep").value = emp.cep || "";
    document.querySelector("#endereco").value = emp.endereco;
    document.querySelector("#municipio").value = emp.municipio;
    document.querySelector("#segmento").value = emp.segmento;
    document.querySelector("#status").value = emp.status;
    document.querySelector("#observacoes").value = emp.observacoes || "";
  },

  async handleSave(e) {
    e.preventDefault();
    const id = document.querySelector("#emp-id").value;
    const dados = {
      nome: document.querySelector("#nome").value,
      tipoPessoa: document.querySelector("#tipo-pessoa").value,
      registro: document.querySelector("#registro").value,
      responsavel: document.querySelector("#responsavel").value,
      cep: document.querySelector("#cep").value,
      endereco: document.querySelector("#endereco").value,
      municipio: document.querySelector("#municipio").value,
      segmento: document.querySelector("#segmento").value,
      status: document.querySelector("#status").value,
      observacoes: document.querySelector("#observacoes").value,
    };

    if (id) EmpreendimentoStorage.atualizar(id, dados);
    else EmpreendimentoStorage.adicionar(dados);

    UIController.modalForm.hide();
    UIController.renderizarLista();
  }
};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  document.querySelector("#emp-id").value = "";
  FormController.setReadOnly(false);
  document.querySelector("#titulo-modal-form").textContent = "Novo Empreendimento";
  UIController.modalForm.show();
};