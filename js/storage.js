/**
 * Módulo de Persistência (Data Access Layer)
 * Responsável por todas as operações de I/O no localStorage
 */
const STORAGE_KEY = 'SCTEC_EMPREENDIMENTOS_DB';
const ID_KEY = 'SCTEC_LAST_ID';
const EmpreendimentoStorage = {
    
    buscarTodos() {
        const dados = localStorage.getItem(STORAGE_KEY);
        return dados ? JSON.parse(dados) : [];
    },

    salvarTodos(lista) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    },

    // Função interna para gerir o próximo ID (Estilo Auto-incremento)
    obterProximoId() {
        let ultimoId = localStorage.getItem(ID_KEY);
        // Se não existir, começa em 1, senão soma +1
        let proximoId = ultimoId ? parseInt(ultimoId) + 1 : 1;
        localStorage.setItem(ID_KEY, proximoId);
        return proximoId;
    },

    adicionar(objeto) {
        const lista = this.buscarTodos();
        const novoRegistro = {
            ...objeto,
            id: this.obterProximoId(),
            dataCadastro: new Date().toISOString()
        };
        lista.push(novoRegistro);
        this.salvarTodos(lista);
        return novoRegistro;
    },

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

    excluir(id) {
        const lista = this.buscarTodos();
        const novaLista = lista.filter(item => item.id !== Number(id));
        this.salvarTodos(novaLista);
    }
};