/**
 * storage.js - Módulo de Persistência (LocalStorage)
 */
const STORAGE_KEY = "SCTEC_EMPREENDIMENTOS_DB";
const ID_KEY = "SCTEC_LAST_ID";

const EmpreendimentoStorage = {
  buscarTodos() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  },

  salvarTodos(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  },

  obterProximoId() {
    const lista = this.buscarTodos();
    if (lista.length === 0) return 1;
    // Garante que o ID nunca se repita, mesmo se o cache de ID_KEY sumir
    const maxId = Math.max(...lista.map((item) => item.id));
    return maxId + 1;
  },

  adicionar(objeto) {
    const lista = this.buscarTodos();
    const novoRegistro = {
      ...objeto,
      id: this.obterProximoId(),
      dataCadastro: new Date().toISOString(),
    };
    lista.push(novoRegistro);
    this.salvarTodos(lista);
    return novoRegistro;
  },

  atualizar(id, objetoAtualizado) {
    let lista = this.buscarTodos();
    const index = lista.findIndex((item) => item.id === Number(id));

    if (index !== -1) {
      lista[index] = {
        ...lista[index],
        ...objetoAtualizado,
        dataAtualizacao: new Date().toISOString(),
      };
      this.salvarTodos(lista);
      return true;
    }
    return false;
  },

  excluir(id) {
    let lista = this.buscarTodos();
    lista = lista.filter((item) => item.id !== Number(id));
    this.salvarTodos(lista);
  },
};
