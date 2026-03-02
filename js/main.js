/**
 * main.js - Interface Controller
 */

// Seletores (Baseado no index.html enviado)
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
    switch (tipoFiltro) {
      case "nome":
        return emp.nome.toLowerCase().includes(termo);
      case "id":
        return emp.id.toString().includes(termo);
      case "municipio":
        return emp.municipio.toLowerCase().includes(termo);
      case "segmento":
        return emp.segmento.toLowerCase().includes(termo);
      default:
        return (
          emp.nome.toLowerCase().includes(termo) ||
          emp.id.toString().includes(termo)
        );
    }
  });

  dadosFiltrados.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><small class="text-muted">#${emp.id}</small></td>
            <td><strong>${emp.nome}</strong><br><small>${emp.documento}</small></td>
            <td>${emp.municipio}</td>
            <td><span class="badge bg-light text-dark border">${emp.segmento}</span></td>
            <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="visualizarRegistro(${emp.id})">👁️</button>
                <button class="btn btn-sm btn-outline-warning mx-1" onclick="prepararEdicao(${emp.id})">✏️</button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusao(${emp.id})">🗑️</button>
            </td>
        `;
    listaCorpo.appendChild(tr);
  });
};

window.abrirModalCadastro = () => {
  form.reset();
  inputId.value = "";
  tituloModalForm.textContent = "Novo Empreendimento";
  btnSalvar.className = "btn btn-success px-4";
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
    tituloModalForm.textContent = `Editando #${emp.id}`;
    btnSalvar.className = "btn btn-warning px-4";
    modalForm.show();
  }
};

window.visualizarRegistro = (id) => {
  const emp = EmpreendimentoStorage.buscarTodos().find(
    (item) => item.id === Number(id),
  );
  if (emp) {
    modalConteudo.innerHTML = `
            <h6>${emp.nome} <small class="text-muted">#${emp.id}</small></h6>
            <hr>
            <p><strong>Doc:</strong> ${emp.tipoPessoa} - ${emp.documento}</p>
            <p><strong>Contato:</strong> ${emp.responsavel} (${emp.contato})</p>
            <p><strong>Localização:</strong> ${emp.endereco}, ${emp.municipio}</p>
            <p><strong>Segmento:</strong> ${emp.segmento} | <strong>Status:</strong> ${emp.status}</p>
            <div class="bg-light p-3 rounded border"><strong>Observações:</strong><br>${emp.observacoes || "Nenhuma observação registrada."}</div>
            <p class="mt-3 mb-0 text-end"><small class="text-muted">Última atualização: ${Utils.formatarDataHora(emp.dataAtualizacao)}</small></p>
        `;
    modalVisu.show();
  }
};

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

  // Verificação de duplicidade no cadastro manual (Novo)
  if (!inputId.value) {
    const duplicado = EmpreendimentoStorage.buscarTodos().some(
      (e) => e.documento === dados.documento,
    );
    if (duplicado)
      return alert("Erro: Já existe um empreendimento com este documento!");
    EmpreendimentoStorage.adicionar(dados);
  } else {
    if (confirm("Deseja salvar as alterações?"))
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    else return;
  }

  modalForm.hide();
  renderizarLista();
});

window.confirmarExclusao = (id) => {
  if (confirm("Excluir permanentemente?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);
