/**
 * main.js - Interface Controller
 */

// Seletores
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
const inputBusca = document.querySelector("#busca-empresa");
const selectTipoBusca = document.querySelector("#tipo-busca");
const selectTipoPessoa = document.querySelector("#tipo-pessoa");
const inputDocumento = document.querySelector("#documento");

// Seletores de UI
const tituloModalForm = document.querySelector("#titulo-modal-form");
const btnSalvar = document.querySelector("#btn-salvar");
const modalConteudo = document.querySelector("#modal-conteudo");

// Instâncias de Modais do Bootstrap
const modalForm = new bootstrap.Modal(
  document.getElementById("modalFormulario"),
);
const modalVisu = new bootstrap.Modal(
  document.getElementById("modalVisualizar"),
);

// --- EVENTOS DE MÁSCARA ---
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

// --- INTERFACE ---
const resetarFormulario = () => {
  form.reset();
  inputId.value = "";
};

const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase();
  const tipoFiltro = selectTipoBusca.value;
  const empreendimentos = EmpreendimentoStorage.buscarTodos();

  listaCorpo.innerHTML = "";

  const dadosFiltrados = empreendimentos.filter((emp) => {
    const termoBusca = termo;
    if (!termoBusca) return true;

    switch (tipoFiltro) {
      case "nome":
        return emp.nome.toLowerCase().includes(termoBusca);
      case "id":
        return emp.id.toString().includes(termoBusca);
      case "municipio":
        return emp.municipio.toLowerCase().includes(termoBusca);
      case "segmento":
        return emp.segmento.toLowerCase().includes(termoBusca);
      default:
        return (
          emp.nome.toLowerCase().includes(termoBusca) ||
          emp.id.toString().includes(termoBusca) ||
          emp.municipio.toLowerCase().includes(termoBusca)
        );
    }
  });

  dadosFiltrados.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><small class="text-muted">#${emp.id}</small></td>
            <td>
                <strong>${emp.nome}</strong><br>
                <small class="text-secondary">${emp.tipoPessoa || "DOC"}: ${emp.documento || "N/A"}</small>
            </td>
            <td>${emp.municipio}</td>
            <td><span class="badge bg-light text-dark border">${emp.segmento}</span></td>
            <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" title="Visualizar" onclick="visualizarRegistro(${emp.id})">👁️</button>
                <button class="btn btn-sm btn-outline-warning me-1" title="Editar" onclick="prepararEdicao(${emp.id})">✏️</button>
                <button class="btn btn-sm btn-outline-danger" title="Excluir" onclick="confirmarExclusao(${emp.id})">🗑️</button>
            </td>
        `;
    listaCorpo.appendChild(tr);
  });
};

// --- LOGICA DE MODAIS ---
window.abrirModalCadastro = () => {
  resetarFormulario();
  tituloModalForm.textContent = "Novo Empreendimento";
  btnSalvar.textContent = "Confirmar e Salvar";
  btnSalvar.className = "btn btn-success px-4";
  modalForm.show();
};

window.prepararEdicao = (id) => {
  const lista = EmpreendimentoStorage.buscarTodos();
  const emp = lista.find((item) => item.id === Number(id));

  if (emp) {
    inputId.value = emp.id;
    inputNome.value = emp.nome;
    selectTipoPessoa.value = emp.tipoPessoa || "CPF";
    inputDocumento.value = emp.documento || "";
    inputResponsavel.value = emp.responsavel;
    inputContato.value = emp.contato;
    inputEndereco.value = emp.endereco;
    inputMunicipio.value = emp.municipio;
    selectSegmento.value = emp.segmento;
    selectStatus.value = emp.status;

    tituloModalForm.textContent = `Editando Registro #${emp.id}`;
    btnSalvar.textContent = "Atualizar Alterações";
    btnSalvar.className = "btn btn-warning px-4";
    modalForm.show();
  }
};

window.visualizarRegistro = (id) => {
  const lista = EmpreendimentoStorage.buscarTodos();
  const emp = lista.find((item) => item.id === Number(id));

  if (emp) {
    modalConteudo.innerHTML = `
            <div class="mb-3 border-bottom pb-2">
                <small class="text-muted d-block">ID do Registro</small>
                <strong>#${emp.id}</strong>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <small class="text-muted d-block">Empresa</small>
                    <strong>${emp.nome}</strong>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">${emp.tipoPessoa}</small>
                    <strong>${emp.documento}</strong>
                </div>
            </div>
            <div class="mb-3">
                <small class="text-muted d-block">Responsável / Contato</small>
                <span>${emp.responsavel} (${emp.contato})</span>
            </div>
            <div class="mb-3">
                <small class="text-muted d-block">Endereço</small>
                <span>${emp.endereco}, ${emp.municipio} - SC</span>
            </div>
            <div class="row mb-3">
                <div class="col-6">
                    <small class="text-muted d-block">Segmento</small>
                    <span class="badge bg-info text-dark">${emp.segmento}</span>
                </div>
                <div class="col-6">
                    <small class="text-muted d-block">Status</small>
                    <span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span>
                </div>
            </div>
            <div class="mt-4 pt-2 border-top text-end">
                <small class="text-muted">Última atualização: ${Utils.formatarDataHora(emp.dataAtualizacao)}</small>
            </div>
        `;
    modalVisu.show();
  }
};

// --- CRUD ---
form.addEventListener("submit", (event) => {
  event.preventDefault();

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
    dataAtualizacao: new Date().toISOString(),
  };

  if (inputId.value) {
    if (confirm(`Confirmar as alterações no registro #${inputId.value}?`)) {
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    } else {
      return;
    }
  } else {
    EmpreendimentoStorage.adicionar(dados);
  }

  modalForm.hide();
  renderizarLista();
});

window.confirmarExclusao = (id) => {
  if (confirm("Deseja remover este registro permanentemente?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

document.addEventListener("DOMContentLoaded", renderizarLista);
inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);
