/**
 * forms.js - Controller de Formulários (Versão Corrigida)
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

    // --- Lógica de CEP ---
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

    // --- Lógica de Máscara de CPF/CNPJ (CORRIGIDA) ---
    const aplicarMascara = () => {
      // Passamos o valor atual e o tipo selecionado para o Utils
      inputReg.value = Utils.aplicarMascaraDocumento(
        inputReg.value,
        selectTipo.value,
      );
    };

    inputReg?.addEventListener("input", aplicarMascara);

    selectTipo?.addEventListener("change", () => {
      inputReg.value = "";
      const tipo = selectTipo.value;
      labelReg.textContent = tipo === "PF" ? "CPF" : "CNPJ";
      inputReg.placeholder =
        tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00";
      inputReg.setAttribute("maxlength", tipo === "PF" ? "14" : "18");

      aplicarMascara();
      inputReg.focus();
    });

    // --- Estilização do Segmento ---
    selectSeg?.addEventListener("change", () => this.atualizarEstiloSegmento());
  },

  atualizarEstiloSegmento() {
    const select = document.querySelector("#segmento");
    if (!select) return;

    const config = Utils.obterConfigSegmento(select.value);

    // Injetamos as variáveis CSS diretamente no elemento.
    // Isso vence qualquer regra do Dark Mode sem precisar de !important no JS.
    select.style.setProperty("--seg-bg", config.bg);
    select.style.setProperty("--seg-text", config.text);
    select.style.setProperty("--seg-border", config.border);

    // Forçamos o uso das variáveis
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
      endereco: document.querySelector("#endereco").value.trim(),
      municipio: document.querySelector("#municipio").value.trim(),
      segmento: document.querySelector("#segmento").value,
      status: document.querySelector("#status").value,
      observacoes: document.querySelector("#observacoes").value.trim(),
      dataAtualizacao: new Date().toISOString(),
    };

    // Validação de Duplicidade
    const duplicado = EmpreendimentoStorage.buscarTodos().find(
      (emp) => emp.registro === dados.registro && emp.id !== Number(id),
    );

    if (duplicado) {
      return alert(
        `ERRO DE NEGÓCIO: O registro ${dados.registro} já está vinculado a "${duplicado.nome}".`,
      );
    }

    id
      ? EmpreendimentoStorage.atualizar(id, dados)
      : EmpreendimentoStorage.adicionar(dados);

    UIController.modalForm.hide();
    UIController.renderizarLista();
  },

  prepararEdicao(id) {
    const emp = EmpreendimentoStorage.buscarTodos().find(
      (item) => item.id === Number(id),
    );
    if (!emp) return;

    document.querySelector("#emp-id").value = emp.id;
    document.querySelector("#nome").value = emp.nome;
    document.querySelector("#tipo-pessoa").value = emp.tipoPessoa || "PJ";
    document.querySelector("#registro").value = emp.registro;
    document.querySelector("#responsavel").value = emp.responsavel || "";
    document.querySelector("#contato").value = emp.contato || "";
    document.querySelector("#endereco").value = emp.endereco;
    document.querySelector("#municipio").value = emp.municipio;
    document.querySelector("#segmento").value = emp.segmento;
    document.querySelector("#status").value = emp.status;
    document.querySelector("#observacoes").value = emp.observacoes || "";

    document.querySelector("#titulo-modal-form").textContent =
      `Edição: ${emp.nome}`;

    // Dispara atualização visual
    this.atualizarEstiloSegmento();

    // Ajusta o label do registro conforme o que foi carregado
    const labelReg = document.querySelector("#label-registro");
    if (labelReg)
      labelReg.textContent = emp.tipoPessoa === "PF" ? "CPF" : "CNPJ";

    UIController.modalForm.show();
  },
};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  document.querySelector("#emp-id").value = "";
  document.querySelector("#titulo-modal-form").textContent =
    "Novo Empreendimento";
  FormController.atualizarEstiloSegmento();
  UIController.modalForm.show();
};
