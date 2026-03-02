/**
 * main.js - Interface Controller
 */

// Seletores básicos
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
const btnCancelar = document.querySelector("#btn-cancelar");
const btnSalvar = document.querySelector("#btn-salvar");
const tituloForm = document.querySelector("#titulo-form");
const modalConteudo = document.querySelector("#modal-conteudo");
const instanciaModal = new bootstrap.Modal(
  document.getElementById("modalVisualizar"),
);

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

const resetarFormulario = () => {
  form.reset();
  inputId.value = "";
  btnCancelar.style.display = "none";
  btnSalvar.textContent = "Confirmar e Salvar";
  btnSalvar.classList.replace("btn-warning", "btn-success");
  tituloForm.textContent = "Cadastro / Edição";
  tituloForm.classList.remove("text-warning");
};

const renderizarLista = () => {
  const termo = inputBusca.value.toLowerCase();
  const tipoFiltro = selectTipoBusca.value;
  const empreendimentos = EmpreendimentoStorage.buscarTodos();

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
      case "endereco":
        return (emp.endereco || "").toLowerCase().includes(termo);
      case "segmento":
        return emp.segmento.toLowerCase().includes(termo);
      default:
        return (
          emp.nome.toLowerCase().includes(termo) ||
          emp.id.toString().includes(termo) ||
          emp.municipio.toLowerCase().includes(termo) ||
          emp.segmento.toLowerCase().includes(termo)
        );
    }
  });

  dadosFiltrados.forEach((emp) => {
    const tr = document.createElement("tr");
    // Removida a data da grid conforme solicitado
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

const manipularEnvioFormulario = (event) => {
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
    if (confirm(`Confirma as alterações no registro #${inputId.value}?`)) {
      EmpreendimentoStorage.atualizar(inputId.value, dados);
    } else {
      return;
    }
  } else {
    EmpreendimentoStorage.adicionar(dados);
  }

  resetarFormulario();
  renderizarLista();
};

// --- FUNÇÃO DE VISUALIZAÇÃO (MODAL) ---
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
    instanciaModal.show();
  }
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

    btnCancelar.style.display = "block";
    btnSalvar.textContent = "Atualizar Registro";
    btnSalvar.classList.replace("btn-success", "btn-warning");
    tituloForm.textContent = `Editando: #${emp.id}`;
    tituloForm.classList.add("text-warning");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

window.confirmarExclusao = (id) => {
  if (confirm("Deseja remover este registro?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

form.addEventListener("submit", manipularEnvioFormulario);
document.addEventListener("DOMContentLoaded", () => renderizarLista());
inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);
