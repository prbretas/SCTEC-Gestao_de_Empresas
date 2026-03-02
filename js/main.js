/**
 * main.js - Interface Controller
 */

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

// --- EVENTOS DE MÁSCARA (Usando Utils) ---
inputDocumento.addEventListener("input", (e) => {
  e.target.value = Utils.aplicarMascaraDocumento(e.target.value, selectTipoPessoa.value);
});

selectTipoPessoa.addEventListener("change", () => {
  inputDocumento.value = "";
  inputDocumento.placeholder = selectTipoPessoa.value === "CPF" ? "000.000.000-00" : "00.000.000/0000-00";
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
    if (!termo) return true;
    switch (tipoFiltro) {
      case "nome": return emp.nome.toLowerCase().includes(termo);
      case "id": return emp.id.toString().includes(termo);
      case "municipio": return emp.municipio.toLowerCase().includes(termo);
      case "endereco": return (emp.endereco || "").toLowerCase().includes(termo);
      case "segmento": return emp.segmento.toLowerCase().includes(termo);
      default: 
        return emp.nome.toLowerCase().includes(termo) || 
               emp.id.toString().includes(termo) || 
               emp.municipio.toLowerCase().includes(termo) ||
               emp.segmento.toLowerCase().includes(termo);
    }
  });
dadosFiltrados.forEach((emp) => {
    const tr = document.createElement("tr");
    // Adicionado o campo de data de atualização no canto (small text-muted)
    tr.innerHTML = `
            <td><small class="text-muted">#${emp.id}</small></td>
            <td>
                <strong>${emp.nome}</strong><br>
                <small class="text-secondary">${emp.tipoPessoa || 'DOC'}: ${emp.documento || 'N/A'}</small>
            </td>
            <td>${emp.municipio}</td>
            <td><span class="badge bg-light text-dark border">${emp.segmento}</span></td>
            <td>
                <span class="badge ${emp.status === "Ativo" ? "bg-success" : "bg-danger"}">${emp.status}</span>
                <br>
                <small class="text-muted" style="font-size: 0.7rem;">Atu. em: ${Utils.formatarDataHora(emp.dataAtualizacao)}</small>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="prepararEdicao(${emp.id})">Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarExclusao(${emp.id})">Excluir</button>
            </td>
        `;
    listaCorpo.appendChild(tr);
  });
};

// --- CRUD ---
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
    dataAtualizacao: new Date().toISOString()
  };

  // VERIFICAÇÃO SE É EDIÇÃO OU NOVO
  if (inputId.value) {
    // Se EDIÇÃO: Solicita confirmação antes de salvar
    const confirmar = confirm(
      `ATENÇÃO: Você está alterando o registro #${inputId.value} (${dados.nome}).\n\nConfirma as alterações?`
    );

    if (confirmar) {
      EmpreendimentoStorage.atualizar(inputId.value, dados);
      alert("Registro atualizado com sucesso!");
    } else {
      // Se o usuário cancelar, interrompe a função aqui
      return; 
    }
  } else {
    // É um NOVO CADASTRO: Salva direto (Agilidade)
    EmpreendimentoStorage.adicionar(dados);
    alert("Novo empreendimento cadastrado!");
  }

  resetarFormulario();
  renderizarLista();
};

form.addEventListener("submit", manipularEnvioFormulario);
document.addEventListener("DOMContentLoaded", () => renderizarLista());
inputBusca.addEventListener("input", renderizarLista);
selectTipoBusca.addEventListener("change", renderizarLista);

// --- GLOBAIS ---
window.confirmarExclusao = (id) => {
  if (confirm("Deseja remover este registro?")) {
    EmpreendimentoStorage.excluir(id);
    renderizarLista();
  }
};
// --- FUNÇÃO DE EDIÇÃO (CARREGAR CAMPOS) ---
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

    // Feedback visual para o usuário saber que entrou em modo de edição
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    console.log(`Editando registro: ${id}`);
  }
};