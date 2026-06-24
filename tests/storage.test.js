/**
 * Testes unitarios para storage.js
 * Os modulos sao carregados via tests/setup.js (setupFiles no package.json)
 */

/* global EmpreendimentoStorage */

const STORAGE_KEY = 'SCTEC_EMPREENDIMENTOS_DB';

beforeEach(() => {
  localStorage.clear();
});

describe('EmpreendimentoStorage.buscarTodos', () => {
  test('retorna array vazio quando LocalStorage esta vazio', () => {
    expect(EmpreendimentoStorage.buscarTodos()).toEqual([]);
  });

  test('retorna registros armazenados', () => {
    const dados = [{ id: 1, nome: 'Empresa A', registro: '12345678000195' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    expect(EmpreendimentoStorage.buscarTodos()).toEqual(dados);
  });

  test('retorna array vazio quando JSON e invalido', () => {
    localStorage.setItem(STORAGE_KEY, 'json-invalido{{{');
    expect(EmpreendimentoStorage.buscarTodos()).toEqual([]);
  });
});

describe('EmpreendimentoStorage.obterProximoId', () => {
  test('retorna 1 quando a base esta vazia', () => {
    expect(EmpreendimentoStorage.obterProximoId()).toBe(1);
  });

  test('retorna max(id) + 1', () => {
    const dados = [{ id: 1 }, { id: 5 }, { id: 3 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    expect(EmpreendimentoStorage.obterProximoId()).toBe(6);
  });
});

describe('EmpreendimentoStorage.adicionar', () => {
  test('adiciona com ID auto-gerado', () => {
    const novo = EmpreendimentoStorage.adicionar({ nome: 'Empresa', registro: '111' });
    expect(novo.id).toBe(1);
    expect(novo.nome).toBe('Empresa');
  });

  test('adiciona dataCadastro como ISO string valida', () => {
    const novo = EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    expect(new Date(novo.dataCadastro).toISOString()).toBe(novo.dataCadastro);
  });

  test('incrementa IDs sequencialmente', () => {
    const a = EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    const b = EmpreendimentoStorage.adicionar({ nome: 'B', registro: '2' });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  test('persiste no localStorage', () => {
    EmpreendimentoStorage.adicionar({ nome: 'Persistida', registro: '999' });
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(dados[0].nome).toBe('Persistida');
  });
});

describe('EmpreendimentoStorage.buscarPorId', () => {
  test('retorna o registro correto', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    EmpreendimentoStorage.adicionar({ nome: 'B', registro: '2' });
    expect(EmpreendimentoStorage.buscarPorId(2).nome).toBe('B');
  });

  test('retorna undefined para ID inexistente', () => {
    expect(EmpreendimentoStorage.buscarPorId(999)).toBeUndefined();
  });

  test('aceita ID como string', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    expect(EmpreendimentoStorage.buscarPorId('1').nome).toBe('A');
  });
});

describe('EmpreendimentoStorage.atualizar', () => {
  test('atualiza sem perder dados anteriores', () => {
    EmpreendimentoStorage.adicionar({ nome: 'Original', registro: '1', status: 'Ativo' });
    expect(EmpreendimentoStorage.atualizar(1, { status: 'Inativo' })).toBe(true);
    const atualizado = EmpreendimentoStorage.buscarPorId(1);
    expect(atualizado.status).toBe('Inativo');
    expect(atualizado.nome).toBe('Original');
  });

  test('preserva dataCadastro original', () => {
    const novo = EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    EmpreendimentoStorage.atualizar(1, { nome: 'Editado' });
    expect(EmpreendimentoStorage.buscarPorId(1).dataCadastro).toBe(novo.dataCadastro);
  });

  test('adiciona dataAtualizacao', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    EmpreendimentoStorage.atualizar(1, { nome: 'Editado' });
    expect(EmpreendimentoStorage.buscarPorId(1).dataAtualizacao).toBeDefined();
  });

  test('preserva o ID original', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    EmpreendimentoStorage.atualizar(1, { id: 999 });
    expect(EmpreendimentoStorage.buscarPorId(1).id).toBe(1);
  });

  test('retorna false para ID inexistente', () => {
    expect(EmpreendimentoStorage.atualizar(999, { nome: 'X' })).toBe(false);
  });
});

describe('EmpreendimentoStorage.excluir', () => {
  test('remove o registro correto', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    EmpreendimentoStorage.adicionar({ nome: 'B', registro: '2' });
    EmpreendimentoStorage.excluir(1);
    const lista = EmpreendimentoStorage.buscarTodos();
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe('B');
  });

  test('nao lanca erro para ID inexistente', () => {
    EmpreendimentoStorage.adicionar({ nome: 'A', registro: '1' });
    expect(() => EmpreendimentoStorage.excluir(999)).not.toThrow();
    expect(EmpreendimentoStorage.buscarTodos()).toHaveLength(1);
  });
});
