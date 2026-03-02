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

// Inicialização dos componentes após o carregamento do DOM
document.addEventListener("DOMContentLoaded", () => {
  modalForm = new bootstrap.Modal(document.getElementById("modalFormulario"));
  modalVisu = new bootstrap.Modal(document.getElementById("modalVisualizar"));
  renderizarLista();
});

/**
 * Renderiza a tabela de empreendimentos com Badges Coloridas
 */
const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase();
  const tipoFiltro = selectTipoBusca.value;
  const empreendimentos = EmpreendimentoStorage.buscarTodos();

// Inicialização segura dos Modais do Bootstrap
let modalForm, modalVisu;
document.addEventListener("DOMContentLoaded", () => {
  modalForm = new bootstrap.Modal(document.getElementById("modalFormulario"));
  modalVisu = new bootstrap.Modal(document.getElementById("modalVisualizar"));
  renderizarLista();
});

// --- EVENTOS ---
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

const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase();
  const tipoFiltro = selectTipoBusca.value;
  const empreendimentos = EmpreendimentoStorage.buscarTodos(); //

  listaCorpo.innerHTML = "";

  const dadosFiltrados = empreendimentos.filter((emp) => {
    if (!termo) return true;
    const valorBusca = String(emp[tipoFiltro] || emp.nome).toLowerCase();
    
    if (tipoFiltro === "todos") {
        return emp.nome.toLowerCase().includes(termo) || 
               emp.id.toString().includes(termo) || 
               emp.municipio.toLowerCase().includes(termo);
    }
    return valorBusca.includes(termo);
  });

  dadosFiltrados.forEach((emp) => {
    // Busca a configuração de cor definida no utils.js
    const estilo = Utils.obterConfigSegmento ? Utils.obterConfigSegmento(emp.segmento) : { bg: '#f8f9fa', text: '#6c757d', border: '#dee2e6' };
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><small class="text-muted">#${emp.id}</small></td>
        <td>
            <strong>${emp.nome}</strong><br>
            <small class="text-muted">${emp.documento}</small>
        </td>
        <td>${emp.municipio}</td>
        <td>
            <span class="badge" style="background-color: ${estilo.bg}; color: ${estilo.text}; border: 1px solid ${estilo.border}; font-weight: 500;">
                ${emp.segmento}
            </span>
        </td>
        <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
        <td class="text-center">
            <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="visualizarRegistro(${emp.id})" title="Visualizar">👁️</button>
                <button class="btn btn-sm btn-outline-warning mx-1" onclick="prepararEdicao(${emp.id})" title="Editar">✏️</button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusao(${emp.id})" title="Excluir">🗑️</button>
            </div>
        </td>
    `;
    listaCorpo.appendChild(tr);
  });
};

/**
 * Abre o modal de visualização com detalhes completos
 */
window.visualizarRegistro = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find((item) => item.id === Number(id));
  if (emp) {
    modalConteudo.innerHTML = `
        <div class="mb-3">
            <h5 class="text-primary mb-0">${emp.nome}</h5>
            <small class="text-muted">Código Interno: #${emp.id}</small>
        </div>
        <div class="row g-3">
            <div class="col-6"><strong>Documento:</strong><br>${emp.tipoPessoa} - ${emp.documento}</div>
            <div class="col-6"><strong>Status:</strong><br>${emp.status}</div>
            <div class="col-6"><strong>Responsável:</strong><br>${emp.responsavel}</div>
            <div class="col-6"><strong>Contato:</strong><br>${emp.contato}</div>
            <div class="col-12"><strong>Endereço:</strong><br>${emp.endereco}, ${emp.municipio}</div>
            <div class="col-12"><strong>Segmento:</strong><br>${emp.segmento}</div>
            <div class="col-12">
                <div class="bg-light p-3 rounded border">
                    <strong>Observações Adicionais:</strong><br>
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
 * Validação e salvamento do formulário
 */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const dados = {
    nome: inputNome.value,
    tipoPessoa: selectTipoPessoa.value,
    documento: inputDocumento.value,
    responsavel: inputResponsavel.value,
    contato: inputContato.value,
    endereco: inputEndereco.value,
    municipio: inputMunicipio.value,
    segmento: selectSegmento.value,
    status: selectStatus.value,
    observacoes: inputObs.value,
    dataAtualizacao: new Date().toISOString(),
  };

  const existentes = EmpreendimentoStorage.buscarTodos();

  // Trava de Duplicidade por CPF/CNPJ
  if (inputId.value) {
    // Verificação na Edição (Ignora o próprio ID)
    const duplicado = existentes.some((e) => e.documento === dados.documento && e.id !== Number(inputId.value));
    if (duplicado) return alert("ATENÇÃO: Este documento já está cadastrado em outro empreendimento!");
    
    if (confirm("Deseja salvar as alterações realizadas?")) {
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    } else return;
  } else {
    // Verificação no Novo Cadastro
    const duplicado = existentes.some((e) => e.documento === dados.documento);
    if (duplicado) return alert("ERRO: Este CPF/CNPJ já existe na base de dados!");

    EmpreendimentoStorage.adicionar(dados);
  }else{
    if (confirm("Deseja salvar as alterações?"))
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    else return;
  }

  modalForm.hide();
  renderizarLista();
});

// Máscara dinâmica de documento
inputDocumento.addEventListener("input", (e) => {
  e.target.value = Utils.aplicarMascaraDocumento(e.target.value, selectTipoPessoa.value);
});

// Muda máscara ao trocar tipo de pessoa
selectTipoPessoa.addEventListener("change", () => {
    inputDocumento.value = "";
    inputDocumento.placeholder = selectTipoPessoa.value === "CPF" ? "000.000.000-00" : "00.000.000/0000-00";
});

window.abrirModalCadastro = () => {
  form.reset();
  inputId.value = "";
  tituloModalForm.textContent = "Novo Empreendimento";
  modalForm.show();
};

window.prepararEdicao = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find((item) => item.id === Number(id));
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
    tituloModalForm.textContent = `Editando: ${emp.nome}`;
    modalForm.show();
  }
};

window.confirmarExclusao = (id) => {
  if (confirm("Excluir permanentemente?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

// Eventos de Busca
inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);