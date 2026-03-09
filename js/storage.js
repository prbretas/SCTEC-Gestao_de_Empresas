const STORAGE_KEY = "SCTEC_EMPREENDIMENTOS_DB";

const EmpreendimentoStorage = {
  buscarTodos() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
      return [];
    }
  },

  salvarTodos(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  },

  obterProximoId() {
    const lista = this.buscarTodos();
    if (lista.length === 0) return 1;
    return Math.max(...lista.map(e => e.id)) + 1;
  },

  buscarPorId(id) {
    return this.buscarTodos().find(e => e.id === Number(id));
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
    const lista = this.buscarTodos();
    const index = lista.findIndex(e => e.id === Number(id));

    if (index !== -1) {
      // Mantém os dados antigos (como data de cadastro) e sobrepõe com os novos
      lista[index] = {
        ...lista[index],
        ...objetoAtualizado,
        id: Number(id), // Garante que o ID permaneça o mesmo
        dataAtualizacao: new Date().toISOString()
      };
      this.salvarTodos(lista);
      return true;
    }
    return false;
  },

  excluir(id) {
    let lista = this.buscarTodos();
    lista = lista.filter(e => e.id !== Number(id));
    this.salvarTodos(lista);
  }
};