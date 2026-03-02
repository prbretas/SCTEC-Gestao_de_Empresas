const STORAGE_KEY = 'SCTEC_EMPREENDIMENTOS_DB';
const EmpreendimentoStorage = {
    buscarTodos: () => JSON.parse(localStorage.getItem(STORAGE_KEY)) || [],
    salvarTodos: (lista) => localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)),
    adicionar(obj) {
        const lista = this.buscarTodos();
        const novo = { ...obj, id: Date.now(), data: new Date().toISOString() };
        lista.push(novo);
        this.salvarTodos(lista);
        return novo;
    },
    atualizar(id, obj) {
        let lista = this.buscarTodos();
        const i = lista.findIndex(item => item.id === Number(id));
        if (i !== -1) { lista[i] = { ...lista[i], ...obj }; this.salvarTodos(lista); }
    },
    excluir: (id) => {
        const nova = EmpreendimentoStorage.buscarTodos().filter(i => i.id !== Number(id));
        EmpreendimentoStorage.salvarTodos(nova);
    }
};