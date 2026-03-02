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
const inputDocumento = document.querySelector("#documento");

const tituloModalForm = document.querySelector("#titulo-modal-form");
const btnSalvar = document.querySelector("#btn-salvar");
const modalConteudo = document.querySelector("#modal-conteudo");

let modalForm, modalVisu;

// Inicialização segura dos componentes
document.addEventListener("DOMContentLoaded", () => {
  const modalFormElem = document.getElementById("modalFormulario");
  const modalVisuElem = document.getElementById("modalVisualizar");

  if (modalFormElem) modalForm = new bootstrap.Modal(modalFormElem);
  if (modalVisuElem) modalVisu = new bootstrap.Modal(modalVisuElem);

  renderizarLista();
});

/**
 * Renderiza a tabela com tratamento de cores e proteção contra campos vazios
 */
const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase();
  const tipoFiltro = selectTipoBusca.value;
  const empreendimentos = EmpreendimentoStorage.buscarTodos();
  listaCorpo.innerHTML = "";

  const dadosFiltrados = empreendimentos.filter((emp) => {
    if (!termo) return true;
    const campoParaFiltrar = String(emp[tipoFiltro] || emp.nome).toLowerCase();
    return campoParaFiltrar.includes(termo);
  });

  dadosFiltrados.forEach((emp) => {
    // PROTEÇÃO: Se Utils.obterConfigSegmento não existir no utils.js, define uma cor padrão
    const estilo =
      typeof Utils.obterConfigSegmento === "function"
        ? Utils.obterConfigSegmento(emp.segmento)
        : { bg: "#f8f9fa", text: "#6c757d", border: "#dee2e6" };

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><small class="text-muted">#${emp.id}</small></td>
        <td>
            <strong>${emp.nome || "Sem Nome"}</strong><br>
            <small class="text-muted">${emp.documento || "Sem Documento"}</small>
        </td>
        <td>${emp.municipio || "N/D"}</td>
        <td>
            <span class="badge" style="background-color: ${estilo.bg}; color: ${estilo.text}; border: 1px solid ${estilo.border}; font-weight: 500;">
                ${emp.segmento || "Outros"}
            </span>
        </td>
        <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
        <td class="text-center">
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="visualizarRegistro(${emp.id})" title="Ver Detalhes">👁️</button>
                <button class="btn btn-sm btn-outline-warning mx-1" onclick="prepararEdicao(${emp.id})" title="Editar">✏️</button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusao(${emp.id})" title="Excluir">🗑️</button>
            </div>
        </td>
    `;
    listaCorpo.appendChild(tr);
  });
};

/**
 * Visualização Detalhada (Corrige o erro de campos indefinidos no modal)
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
            <div class="col-6"><strong>Documento:</strong><br>${emp.documento}</div>
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
    documento: inputDocumento.value.trim(),
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
    (e) => e.documento === dados.documento && e.id !== Number(inputId.value),
  );

  if (duplicado) {
    alert(
      `ALERTA DE SEGURANÇA: O documento ${dados.documento} já pertence a "${duplicado.nome}".`,
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
inputDocumento.addEventListener("input", (e) => {
  e.target.value = Utils.aplicarMascaraDocumento(
    e.target.value,
    selectTipoPessoa.value,
  );
});

selectTipoPessoa.addEventListener("change", () => {
  inputDocumento.value = "";
  inputDocumento.placeholder =
    selectTipoPessoa.value === "CPF" ? "000.000.000-00" : "00.000.000/0000-00";
});

window.abrirModalCadastro = () => {
  form.reset();
  inputId.value = "";
  tituloModalForm.textContent = "Novo Empreendimento";
  modalForm.show();
};

window.prepararEdicao = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find(
    (item) => item.id === Number(id),
  );
  if (emp) {
    inputId.value = emp.id;
    inputNome.value = emp.nome;
    selectTipoPessoa.value = emp.tipoPessoa;
    inputDocumento.value = emp.documento;
    inputResponsavel.value = emp.responsavel;
    inputContato.value = emp.contato;
    inputEndereco.value = emp.endereco;
    inputMunicipio.value = emp.municipio;
    selectSegmento.value = emp.segmento;
    selectStatus.value = emp.status;
    inputObs.value = emp.observacoes || "";
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
