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
      inputReg.value = ""; // Limpa para evitar resíduos de máscara anterior
      const tipo = selectTipo.value;

      // Ajusta Label e Placeholder
      if (labelReg) labelReg.textContent = tipo === "PF" ? "CPF" : "CNPJ";
      inputReg.placeholder =
        tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00";

      // Define limite físico de caracteres para evitar erros de input
      inputReg.setAttribute("maxlength", tipo === "PF" ? "14" : "18");
      inputReg.focus();
    });

    // --- Estilização do Segmento ---
    selectSeg?.addEventListener("change", () => this.atualizarEstiloSegmento());
  },

  atualizarEstiloSegmento() {
    const select = document.querySelector("#segmento");
    if (!select) return;

    const config = Utils.obterConfigSegmento(select.value);

    // Aplicamos os estilos com !important via setProperty para vencer o CSS do Dark Mode
    select.style.setProperty("background-color", config.bg, "important");
    select.style.setProperty("color", config.text, "important");
    select.style.setProperty("border-color", config.border, "important");
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
};

window.abrirModalCadastro = () => {
  FormController.form.reset();
  document.querySelector("#emp-id").value = "";
  document.querySelector("#titulo-modal-form").textContent =
    "Novo Empreendimento";
  FormController.atualizarEstiloSegmento();
  UIController.modalForm.show();
};
