/**
 * storage.js — Persistência de dados por usuário.
 * A chave de storage é dinâmica: SCTEC_DATA_{userId}
 * para garantir isolamento entre múltiplos usuários no mesmo dispositivo.
 */

const STORAGE_KEY_LEGACY = "SCTEC_EMPREENDIMENTOS_DB";

const EmpreendimentoStorage = {

  /**
   * Retorna a chave de storage do usuário atual.
   * Se não há sessão (ex: telas de login/register), usa a chave legacy.
   */
  _obterChave() {
    if (window.AuthService) {
      const chave = AuthService.obterChaveDados();
      if (chave) return chave;
    }
    return STORAGE_KEY_LEGACY;
  },

  buscarTodos() {
    try {
      const dados = localStorage.getItem(this._obterChave());
      return dados ? JSON.parse(dados) : [];
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
      localStorage.removeItem(this._obterChave());
      return [];
    }
  },

  salvarTodos(lista) {
    localStorage.setItem(this._obterChave(), JSON.stringify(lista));
  },

  obterProximoId() {
    const lista = this.buscarTodos();
    if (lista.length === 0) return 1;
    return Math.max(...lista.map((e) => e.id)) + 1;
  },

  buscarPorId(id) {
    return this.buscarTodos().find((e) => e.id === Number(id));
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
    const lista = this.buscarTodos();
    const index = lista.findIndex((e) => e.id === Number(id));

    if (index !== -1) {
      lista[index] = {
        ...lista[index],
        ...objetoAtualizado,
        id: Number(id),
        dataAtualizacao: new Date().toISOString(),
      };
      this.salvarTodos(lista);
      return true;
    }
    return false;
  },

  excluir(id) {
    let lista = this.buscarTodos();
    lista = lista.filter((e) => e.id !== Number(id));
    this.salvarTodos(lista);
  },
};
