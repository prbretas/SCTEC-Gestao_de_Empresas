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
      if (status) {
        // APLICA COLORAÇÃO CINZA (Trava visual que você pediu)
        el.style.backgroundColor = "#e9ecef";
        el.style.cursor = "not-allowed";
        if (el.tagName === "SELECT") el.style.pointerEvents = "none";
        else el.readOnly = true;
      } else {
        // LIBERA OS CAMPOS
        el.style.backgroundColor = "";
        el.style.cursor = "default";
        el.style.pointerEvents = "auto";
        el.readOnly = false;
      }
    });

    if (btnSalvar) {
      btnSalvar.style.display = status ? "none" : "inline-block";
    }
  },

  prepararVisualizacao(id) {
    const emp = EmpreendimentoStorage.buscarPorId(id);
    if (!emp) return;

    this.carregarDadosNoForm(emp);
    this.setReadOnly(true); // TRAVA OS INPUTS

    document.querySelector("#titulo-modal-form").textContent = `📄 Visualizar: ${emp.nome}`;

    const auditoriaDiv = document.querySelector("#auditoria-info");
    if (auditoriaDiv) {
      const dataCriacao = emp.dataCadastro ? new Date(emp.dataCadastro).toLocaleString('pt-BR') : "N/D";
      const dataUpdate = emp.dataAtualizacao ? new Date(emp.dataAtualizacao).toLocaleString('pt-BR') : "Sem alterações";

      auditoriaDiv.innerHTML = `
            <div id="auditoria-info">
                <strong>Criado em:</strong> ${dataCriacao} | 
                <strong>Última Atualização:</strong> ${dataUpdate}
            </div>
        `;
    }

    UIController.modalForm.show();
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

    const formData = new FormData(this.form);
    const dados = Object.fromEntries(formData.entries());

    if (!dados.status) dados.status = "Ativo";

    if (!this.validarFormulario(dados)) return;
    const idExistente = document.querySelector("#emp-id").value;

    const obrigatorios = ['nome', 'registro', 'responsavel', 'segmento'];
    let formValido = true;


    obrigatorios.forEach(campo => {
      const input = this.form.querySelector(`[name="${campo}"]`);
      if (!dados[campo] || dados[campo].trim() === "") {
        input.classList.add("is-invalid");
        formValido = false;
      } else {
        input.classList.remove("is-invalid");
      }
    });


    if (!formValido) {
        alert("Preencha os campos obrigatórios!");
        return;
    }

    const baseAtual = EmpreendimentoStorage.buscarTodos();
    const registroDuplicado = baseAtual.find(emp => {
      if (!emp.nome || !dados.nome) return false;

      return emp.registro === dados.registro &&
        emp.nome.toLowerCase() === dados.nome.toLowerCase() &&
        emp.segmento === dados.segmento &&
        Number(emp.id) !== Number(idExistente);
    });

    if (registroDuplicado) {
      alert(`⚠️ Registro já existente na base para o segmento ${dados.segmento}.`);
      return;
    }

    // 3. Lógica de Persistência
    try {
      if (idExistente) {
        // --- MODO EDIÇÃO ---
        const confirmar = confirm(`Deseja confirmar as alterações no registro de ${dados.nome}?`);
        if (!confirmar) return;

        EmpreendimentoStorage.atualizar(idExistente, dados);
      } else {
        // --- MODO INCLUSÃO ---
        // Salva direto sem perguntar, conforme solicitado
        EmpreendimentoStorage.adicionar(dados);
      }

      // 4. Pós-Processamento
      this.form.reset();
      UIController.modalForm.hide();
      UIController.renderizarLista();

      // Alerta de sucesso opcional para feedback
      console.log("Operação realizada com sucesso!");

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro técnico ao salvar. Verifique se o LocalStorage está acessível.");
    }
  },


  validarFormulario(dados) {
    let valido = true;
    const camposObrigatorios = ['nome', 'registro', 'segmento'];

    camposObrigatorios.forEach(campo => {
      const el = document.querySelector(`#${campo}`);
      if (!dados[campo] || dados[campo].trim() === "") {
        el.classList.add("is-invalid"); // Borda vermelha do Bootstrap
        valido = false;
      } else {
        el.classList.remove("is-invalid");
      }
    });

    if (!valido) {
      alert("PH, preencha todos os campos obrigatórios em destaque!");
    }
    return valido;
  },
  carregarDadosNoForm(emp) {
    // Reset do formulário para garantir que nada fique "sujo"
    this.form.reset();

    document.querySelector("#emp-id").value = emp.id || "";
    document.querySelector("#nome").value = emp.nome || "";
    document.querySelector("#registro").value = emp.registro || "";
    document.querySelector("#responsavel").value = emp.responsavel || "";
    document.querySelector("#email").value = emp.email || "";
    document.querySelector("#telefone").value = emp.telefone || "";

    document.querySelector("#cep").value = emp.cep || "";
    document.querySelector("#endereco").value = emp.endereco || "";
    document.querySelector("#municipio").value = emp.municipio || "";
    document.querySelector("#segmento").value = emp.segmento || "Outros";
    document.querySelector("#status").value = emp.status || "Ativo";
    document.querySelector("#observacoes").value = emp.observacoes || "";
  },

};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  document.querySelector("#emp-id").value = "";
  FormController.setReadOnly(false);
  document.querySelector("#titulo-modal-form").textContent = "Novo Empreendimento";
  UIController.modalForm.show();
};