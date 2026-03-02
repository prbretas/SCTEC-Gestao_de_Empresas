/**
 * Módulo de Persistência (Data Access Layer)
 * Responsável por todas as operações de I/O no localStorage
 */
const STORAGE_KEY = 'SCTEC_EMPREENDIMENTOS_DB';

const EmpreendimentoStorage = {
    
    // Retorna todos os registros
    buscarTodos() {
        const dados = localStorage.getItem(STORAGE_KEY);
        return dados ? JSON.parse(dados) : [];
    },

    // Salva a lista completa (sobrescreve)
    salvarTodos(lista) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    },

    // Adiciona um novo registro com ID único
    adicionar(objeto) {
        const lista = this.buscarTodos();
        const novoRegistro = {
            ...objeto,
            id: Date.now(), // Gera um ID único baseado no timestamp
            dataCadastro: new Date().toISOString()
        };
        lista.push(novoRegistro);
        this.salvarTodos(lista);
        return novoRegistro;
    },

    // Atualiza um registro existente pelo ID
    atualizar(id, objetoAtualizado) {
        let lista = this.buscarTodos();
        const index = lista.findIndex(item => item.id === Number(id));
        
        if (index !== -1) {
            lista[index] = { ...lista[index], ...objetoAtualizado };
            this.salvarTodos(lista);
            return true;
        }
        return false;
    },

    // Remove um registro pelo ID
    excluir(id) {
        const lista = this.buscarTodos();
        const novaLista = lista.filter(item => item.id !== Number(id));
        this.salvarTodos(novaLista);
    }
};



