/**
 * Módulo Principal (Interface Controller)
 */

// Seletores de Elementos da Interface
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

// NOVOS SELETORES (CPF/CNPJ)
const selectTipoPessoa = document.querySelector("#tipo-pessoa");
const inputDocumento = document.querySelector("#documento");

// --- MÁSCARA DE DOCUMENTO ---
const aplicarMascaraDocumento = (valor, tipo) => {
  valor = valor.replace(/\D/g, ""); 
  if (tipo === "CPF") {
    valor = valor.substring(0, 11);
    return valor
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    valor = valor.substring(0, 14);
    return valor
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
};

inputDocumento.addEventListener("input", (e) => {
  e.target.value = aplicarMascaraDocumento(e.target.value, selectTipoPessoa.value);
});

selectTipoPessoa.addEventListener("change", () => {
  inputDocumento.value = "";
  inputDocumento.placeholder = selectTipoPessoa.value === "CPF" ? "000.000.000-00" : "00.000.000/0000-00";
});

// --- FUNÇÕES DE INTERFACE --
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
    if (!termo) return true;
    switch (tipoFiltro) {
      case "nome": return emp.nome.toLowerCase().includes(termo);
      case "id": return emp.id.toString().includes(termo);
      case "municipio": return emp.municipio.toLowerCase().includes(termo);
      case "endereco": return (emp.endereco || "").toLowerCase().includes(termo);
      default: return emp.nome.toLowerCase().includes(termo) || emp.id.toString().includes(termo);
    }
  });

  dadosFiltrados.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><small class="text-muted">#${emp.id}</small></td>
            <td>
                <strong>${emp.nome}</strong><br>
                <small class="text-secondary">${emp.tipoPessoa || 'DOC'}: ${emp.documento || 'N/A'}</small>
            </td>
            <td>${emp.municipio}</td>
            <td>${emp.segmento}</td>
            <td><span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-warning" onclick="prepararEdicao(${emp.id})">Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusao(${emp.id})">Excluir</button>
            </td>
        `;
    listaCorpo.appendChild(tr);
  });
};

// --- LOGICA DE NEGÓCIO ---
const manipularEnvioFormulario = (event) => {
  event.preventDefault();

  const dados = {
    nome: inputNome.value,
    tipoPessoa: selectTipoPessoa.value, // Salvando o tipo
    documento: inputDocumento.value,   // Salvando o documento
    responsavel: inputResponsavel.value,
    contato: inputContato.value,
    endereco: inputEndereco.value,
    municipio: inputMunicipio.value,
    segmento: selectSegmento.value,
    status: selectStatus.value,
  };

  if (inputId.value) {
    EmpreendimentoStorage.atualizar(inputId.value, dados);
  } else {
    EmpreendimentoStorage.adicionar(dados);
  }

  resetarFormulario();
  renderizarLista();
};

// --- EVENTOS ---
form.addEventListener("submit", manipularEnvioFormulario);
document.addEventListener("DOMContentLoaded", () => renderizarLista());
inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);

// --- FUNÇÕES GLOBAIS ---
window.confirmarExclusao = (id) => {
  if (confirm("Deseja remover este registro?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};

window.prepararEdicao = (id) => {
  const lista = EmpreendimentoStorage.buscarTodos();
  const emp = lista.find((item) => item.id === Number(id));

  if (emp) {
    // PREENCHIMENTO DOS CAMPOS (Resolvendo o erro de não voltar ao input)
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

    // Scroll para o topo para facilitar a visualização do formulário
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};