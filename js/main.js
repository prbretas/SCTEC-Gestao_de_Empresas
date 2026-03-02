/**
 * Módulo Principal (Interface Controller)
 * Gerencia a interação entre o HTML e a camada de Storage
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
const inputBusca = document.querySelector('#busca-empresa');

// --- FUNÇÕES DE INTERFACE --
const resetarFormulario = () => {
  form.reset();
  inputId.value = "";
};

const renderizarLista = (termo = '') => {
    const empreendimentos = EmpreendimentoStorage.buscarTodos();
    listaCorpo.innerHTML = ''; 

    // Lógica de Filtro
    const dadosFiltrados = empreendimentos.filter(emp => {
        const busca = termo.toLowerCase();
        return emp.nome.toLowerCase().includes(busca) || 
               emp.id.toString().includes(busca) ||
               emp.municipio.toLowerCase().includes(busca);
    });

    dadosFiltrados.forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><small class="text-muted">#${emp.id}</small></td>
            <td><strong>${emp.nome}</strong><br><small>${emp.endereco || ''}</small></td>
            <td>${emp.municipio}</td>
            <td>${emp.segmento}</td>
            <td>
                <span class="badge ${emp.status === 'Ativo' ? 'bg-success' : 'bg-danger'}">
                    ${emp.status}
                </span>
            </td>
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
  renderizarLista(); // Chama sem parâmetros para mostrar todos após salvar
};

// --- EVENTOS ---

form.addEventListener("submit", manipularEnvioFormulario);

document.addEventListener("DOMContentLoaded", () => renderizarLista());

// Evento da Barra de Busca
inputBusca.addEventListener('input', (e) => {
    renderizarLista(e.target.value);
});

// Funções Globais
window.confirmarExclusao = (id) => {
    if (confirm("Tem certeza que deseja REMOVER definitivamente este empreendimento?")) {
        EmpreendimentoStorage.excluir(id);
        renderizarLista();
    }
};

window.prepararEdicao = (id) => {
    const lista = EmpreendimentoStorage.buscarTodos();
    const emp = lista.find(item => item.id === Number(id));

    if (emp) {
        inputId.value = emp.id;
        inputNome.value = emp.nome;
        inputResponsavel.value = emp.responsavel;
        inputContato.value = emp.contato;
        inputEndereco.value = emp.endereco;
        inputMunicipio.value = emp.municipio;
        selectSegmento.value = emp.segmento;
        selectStatus.value = emp.status;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};