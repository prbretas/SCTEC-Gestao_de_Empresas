const inputCep = document.querySelector("#cep");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const dados = {
    nome: inputNome.value.trim(),
    tipoPessoa: selectTipoPessoa.value,
    registro: inputRegistro.value.trim(),
    responsavel: inputResponsavel.value.trim(),
    contato: inputContato.value.trim(),
    endereco: inputEndereco.value.trim(),
    municipio: inputMunicipio.value.trim(),
    segmento: selectSegmento.value,
    status: selectStatus.value,
    observacoes: inputObs.value.trim(),
    dataAtualizacao: new Date().toISOString(),
  };

  const existentes = EmpreendimentoStorage.buscarTodos();

  // Verificação de Unicidade (CPF/CNPJ não pode repetir)
  const duplicado = existentes.find(
    (e) => e.registro === dados.registro && e.id !== Number(inputId.value),
  );

  if (duplicado) {
    alert(
      `ALERTA DE SEGURANÇA: O Registro ${dados.registro} já pertence a "${duplicado.nome}".`,
    );
    return;
  }

  if (inputId.value) {
    if (confirm("Confirmar atualização dos dados?")) {
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    } else return;
  } else {
    EmpreendimentoStorage.adicionar(dados);
  }

  modalForm.hide();
  renderizarLista();
});

// Função para aplicar máscara dinâmica
const aplicarMascaraRegistro = () => {
  const tipo = selectTipoPessoa.value;
  const label = document.querySelector("#label-registro");

  // Limpa o valor atual ao trocar o tipo para evitar confusão
  inputRegistro.value = "";

  if (tipo === "PF") {
    label.textContent = "CPF";
    inputRegistro.placeholder = "000.000.000-00";
    inputRegistro.setAttribute("maxlength", "14");
  } else {
    label.textContent = "CNPJ";
    inputRegistro.placeholder = "00.000.000/0000-00";
    inputRegistro.setAttribute("maxlength", "18");
  }
};

// Listener para quando o usuário mudar o Select
selectTipoPessoa.addEventListener("change", aplicarMascaraRegistro);

// Função de formatação enquanto digita (Input Event)
inputRegistro.addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, ""); // Remove tudo que não é número
  const tipo = selectTipoPessoa.value;

  if (tipo === "PF") {
    // Máscara CPF: 000.000.000-00
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // Máscara CNPJ: 00.000.000/0000-00
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  e.target.value = v;
});

const atualizarCorSelectSegmento = () => {
  const segmento = selectSegmento.value;
  const config = Utils.obterConfigSegmento(segmento);

  if (config) {
    selectSegmento.style.backgroundColor = config.bg;
    selectSegmento.style.color = config.text;
    selectSegmento.style.borderColor = config.border;
  }
};

// Registrar o evento de mudança no Select
selectSegmento.addEventListener("change", atualizarCorSelectSegmento);
