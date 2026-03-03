/**
 * main.js - Interface Controller
 * Responsável por gerenciar a UI e as validações de negócio.
 */

// Seletores da Interface
const form = document.querySelector("#form-empreendimento");
const listaCorpo = document.querySelector("#lista-corpo");
const inputId = document.querySelector("#emp-id");
const inputNome = document.querySelector("#nome");
const inputEndereco = document.querySelector("#endereco");
const inputResponsavel = document.querySelector("#responsavel");
const inputContato = document.querySelector("#contato");
const inputMunicipio = document.querySelector("#municipio");
const selectSegmento = document.querySelector("#segmento");
const selectStatus = document.querySelector("#status");
const inputObs = document.querySelector("#observacoes");
const inputBusca = document.querySelector("#busca-empresa");
const selectTipoBusca = document.querySelector("#tipo-busca");
const selectTipoPessoa = document.querySelector("#tipo-pessoa");
const inputRegistro = document.querySelector("#registro");

const tituloModalForm = document.querySelector("#titulo-modal-form");
const btnSalvar = document.querySelector("#btn-salvar");
const modalConteudo = document.querySelector("#modal-conteudo");

const inputCep = document.querySelector("#cep");

let modalForm, modalVisu;

// Inicialização segura dos componentes
document.addEventListener("DOMContentLoaded", () => {
  const modalFormElem = document.getElementById("modalFormulario");
  const modalVisuElem = document.getElementById("modalVisualizar");

  if (modalFormElem) modalForm = new bootstrap.Modal(modalFormElem);
  if (modalVisuElem) modalVisu = new bootstrap.Modal(modalVisuElem);

  renderizarLista();
});

const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase().trim();
  const tipoFiltro = selectTipoBusca.value;
  const empresas = EmpreendimentoStorage.buscarTodos();
  

  const filtrados = empresas.filter((emp) => {
    if (!termo) return true;

    // LÓGICA "TODOS": Busca em todos os atributos (agora incluindo 'registro')
    if (tipoFiltro === "todos") {
      const valores = Object.values(emp).join(" ").toLowerCase();
      return valores.includes(termo);
    }

    switch (tipoFiltro) {
      case "id":
        return emp.id?.toString().includes(termo);
      case "nome":
        return emp.nome?.toLowerCase().includes(termo);
      case "registro":
        return emp.registro?.toLowerCase().includes(termo);
      case "localizacao":
        return (
          emp.municipio?.toLowerCase().includes(termo) ||
          emp.endereco?.toLowerCase().includes(termo)
        );
      case "segmento":
        return emp.segmento?.toLowerCase().includes(termo);
      case "status":
        return emp.status?.toLowerCase().includes(termo);
      default:
        return true;
    }
  });

  listaCorpo.innerHTML = "";

  filtrados.forEach((emp) => {
    const config = Utils.obterConfigSegmento(emp.segmento);
    const tr = document.createElement("tr");

    tr.innerHTML = `
    <td><strong>#${emp.id}</strong></td>
    <td>${emp.nome}</td>
    <td><code class="text-reset">${emp.registro || "N/A"}</code></td> <td>${emp.municipio}</td>
    <td class="text-truncate" style="max-width: 150px;">${emp.endereco}</td>
        <td>
            <span class="badge" style="background-color: ${config.bg}; color: ${config.text}; border: 1px solid ${config.border}">
                ${emp.segmento}
            </span>
        </td>
        <td>
            <span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">
                ${emp.status}
            </span>
        </td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-info btn-action" onclick="window.visualizarRegistro(${emp.id})" title="Ver Detalhes">👁️</button>
            <button class="btn btn-sm btn-outline-warning btn-action" onclick="window.prepararEdicao(${emp.id})" title="Editar">✏️</button>
            <button class="btn btn-sm btn-outline-danger btn-action" onclick="window.confirmarExclusao(${emp.id})" title="Excluir">🗑️</button>
        </td>
    `;
    listaCorpo.appendChild(tr);
  });
};

window.visualizarRegistro = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find(
    (item) => item.id === Number(id),
  );

  if (emp && modalVisu) {
    modalConteudo.innerHTML = `
        <div class="mb-3 border-bottom pb-2">
            <h5 class="text-primary mb-0">${emp.nome}</h5>
            <small class="text-muted">ID Sistema: #${emp.id}</small>
        </div>
        <div class="row g-3">
            <div class="col-6"><strong>Tipo:</strong><br>${emp.tipoPessoa || "N/A"}</div>
            <div class="col-6"><strong>Registro:</strong><br>${emp.registro || "N/A"}</div>
            <div class="col-6"><strong>Responsável:</strong><br>${emp.responsavel || "Não informado"}</div>
            <div class="col-6"><strong>Contato:</strong><br>${emp.contato || "Não informado"}</div>
            <div class="col-12"><strong>Localização:</strong><br>${emp.endereco}, ${emp.municipio}</div>
            <div class="col-12"><strong>Segmento:</strong><br><span class="badge bg-light text-dark border">${emp.segmento}</span></div>
            <div class="col-12">
                <div class="bg-light p-3 rounded border">
                    <strong>Observações:</strong><br>
                    ${emp.observacoes || "Nenhuma observação registrada."}
                </div>
            </div>
        </div>
        <div class="mt-3 text-end">
            <small class="text-muted">Última atualização: ${Utils.formatarDataHora(emp.dataAtualizacao)}</small>
        </div>
    `;
    modalVisu.show();
  }
};
/**
 * Visualização Detalhada
 */
window.visualizarRegistro = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find(
    (item) => item.id === Number(id),
  );
  if (emp && modalVisu) {
    modalConteudo.innerHTML = `
        <div class="mb-3 border-bottom pb-2">
            <h5 class="text-primary mb-0">${emp.nome}</h5>
            <small class="text-muted">ID Sistema: #${emp.id}</small>
        </div>
        <div class="row g-3">
            <div class="col-6"><strong>Tipo:</strong><br>${emp.tipoPessoa}</div>
            <div class="col-6"><strong>Registro:</strong><br>${emp.registro}</div>
            <div class="col-6"><strong>Responsável:</strong><br>${emp.responsavel || "Não informado"}</div>
            <div class="col-6"><strong>Contato:</strong><br>${emp.contato || "Não informado"}</div>
            <div class="col-12"><strong>Endereço:</strong><br>${emp.endereco}, ${emp.municipio}</div>
            <div class="col-12"><strong>Segmento:</strong><br><span class="badge bg-light text-dark border">${emp.segmento}</span></div>
            <div class="col-12">
                <div class="bg-light p-3 rounded border">
                    <strong>Observações:</strong><br>
                    ${emp.observacoes || "Nenhuma nota fiscal ou observação registrada."}
                </div>
            </div>
        </div>
        <div class="mt-3 text-end">
            <small class="text-muted">Sincronizado em: ${Utils.formatarDataHora(emp.dataAtualizacao)}</small>
        </div>
    `;
    modalVisu.show();
  }
};

/**
 * Validação de formulário com Trava de Duplicidade CPF/CNPJ
 */
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

// Eventos de Máscara e Interface
inputRegistro.addEventListener("input", (e) => {
  e.target.value = Utils.aplicarMascaraDocumento(
    e.target.value,
    selectTipoPessoa.value,
  );
});

selectTipoPessoa.addEventListener("change", () => {
  inputRegistro.value = "";
  inputRegistro.placeholder =
    selectTipoPessoa.value === "CPF" ? "000.000.000-00" : "00.000.000/0000-00";
});

window.abrirModalCadastro = () => {
  form.reset();
  inputId.value = "";
  tituloModalForm.textContent = "Novo Empreendimento";
  modalForm.show();
  atualizarCorSelectSegmento();
};

window.prepararEdicao = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find((item) => item.id === Number(id));

  if (emp) {
    inputId.value = emp.id;
    inputNome.value = emp.nome;
    inputRegistro.value = emp.registro || "";
    inputEndereco.value = emp.endereco;
    inputMunicipio.value = emp.municipio || ""; // Agora preenche o município
    inputResponsavel.value = emp.responsavel;
    inputContato.value = emp.contato;
    selectSegmento.value = emp.segmento;
    selectStatus.value = emp.status;
    inputObs.value = emp.observacoes || "";
    
    // Limpa o campo de CEP para nova busca se desejar
    if (document.querySelector("#cep")) document.querySelector("#cep").value = "";

    tituloModalForm.textContent = `Edição: ${emp.nome}`;
    modalForm.show();
  }
};

window.confirmarExclusao = (id) => {
  if (confirm("Remover este registro permanentemente?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);

/******************** DARK MODE INTEGRADO **********************/
const darkModeSwitch = document.querySelector("#dark-mode-switch");

const aplicarDarkMode = (isDark) => {
  if (isDark) {
    document.body.classList.add("dark-mode");
    if (darkModeSwitch) darkModeSwitch.checked = true;
    localStorage.setItem("SCTEC_THEME", "dark");
  } else {
    document.body.classList.remove("dark-mode");
    if (darkModeSwitch) darkModeSwitch.checked = false;
    localStorage.setItem("SCTEC_THEME", "light");
  }
};

// Inicialização do Tema
document.addEventListener("DOMContentLoaded", () => {
  const temaSalvo = localStorage.getItem("SCTEC_THEME");
  aplicarDarkMode(temaSalvo === "dark");

  if (darkModeSwitch) {
    darkModeSwitch.addEventListener("change", (e) => {
      aplicarDarkMode(e.target.checked);
    });
  }

  renderizarLista(); // Garante que o grid carregue com as classes novas
});

if (inputCep) {
  inputCep.addEventListener("blur", async () => {
    const cep = inputCep.value;
    if (cep.length >= 8) {
      const dadosEndereco = await ApiService.buscarCep(cep);
      if (dadosEndereco) {
        // Preenche os campos automaticamente
        inputEndereco.value = `${dadosEndereco.logradouro}, ${dadosEndereco.bairro}`;
        inputMunicipio.value = dadosEndereco.localidade;
        // O foco vai para o próximo campo disponível
        selectSegmento.focus();
      }
    }
  });
}

// Listener para a API de CEP dentro do Pop-up
if (inputCep) {
  inputCep.addEventListener("blur", async () => {
    const cep = inputCep.value.replace(/\D/g, "");
    if (cep.length === 8) {
      inputEndereco.placeholder = "Buscando endereço...";
      const dados = await ApiService.buscarCep(cep);
      
      if (dados && !dados.erro) {
        inputEndereco.value = `${dados.logradouro}${dados.bairro ? ', ' + dados.bairro : ''}`;
        inputMunicipio.value = dados.localidade;
        inputEndereco.placeholder = "";
      } else {
        alert("CEP não encontrado.");
        inputEndereco.placeholder = "";
      }
    }
  });
}


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