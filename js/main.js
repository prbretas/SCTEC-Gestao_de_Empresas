const form = document.querySelector('#form-empreendimento');
const listaCorpo = document.querySelector('#lista-corpo');
const inputBusca = document.querySelector('#busca-empresa');

const renderizar = (filtro = '') => {
    const dados = EmpreendimentoStorage.buscarTodos().filter(e => 
        e.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        e.id.toString().includes(filtro) ||
        e.municipio.toLowerCase().includes(filtro.toLowerCase())
    );
    listaCorpo.innerHTML = dados.map(e => `
        <tr>
            <td><small>#${e.id}</small></td>
            <td>${e.nome}</td>
            <td>${e.municipio}</td>
            <td><span class="badge ${e.status === 'Ativo' ? 'bg-success' : 'bg-danger'}">${e.status}</span></td>
            <td>
                <button onclick="prepararEdicao(${e.id})" class="btn btn-sm btn-warning">Edit</button>
                <button onclick="confirmarExclusao(${e.id})" class="btn btn-sm btn-danger">X</button>
            </td>
        </tr>
    `).join('');
};

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.querySelector('#emp-id').value;
    const obj = {
        nome: document.querySelector('#nome').value,
        responsavel: document.querySelector('#responsavel').value,
        contato: document.querySelector('#contato').value,
        municipio: document.querySelector('#municipio').value,
        segmento: document.querySelector('#segmento').value,
        status: document.querySelector('#status').value
    };
    id ? EmpreendimentoStorage.atualizar(id, obj) : EmpreendimentoStorage.adicionar(obj);
    form.reset(); document.querySelector('#emp-id').value = '';
    renderizar();
});

inputBusca.addEventListener('input', (e) => renderizar(e.target.value));
window.confirmarExclusao = (id) => { if(confirm('Excluir?')) { EmpreendimentoStorage.excluir(id); renderizar(); } };
window.prepararEdicao = (id) => { /* Lógica de preencher campos */ };
document.addEventListener('DOMContentLoaded', () => renderizar());