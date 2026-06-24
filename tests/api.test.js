/**
 * Testes unitarios para api.js
 * Os modulos sao carregados via tests/setup.js (setupFiles no package.json)
 */

/* global ApiService */

// Mock do fetch antes de cada teste
beforeEach(() => {
  global.fetch = jest.fn();
});

const mockApiResponseCnpj = {
  razao_social: 'EMPRESA TESTE LTDA',
  nome_fantasia: 'Empresa Teste',
  data_inicio_atividade: '2010-01-15',
  descricao_situacao_cadastral: 'ATIVA',
  cnae_fiscal_descricao: 'Desenvolvimento de programas de computador',
  cep: '89200000',
  logradouro: 'Rua das Industrias',
  numero: '100',
  municipio: 'Joinville',
  uf: 'SC',
  qsa: [
    { nome_socio: 'JOAO DA SILVA', qualificacao_socio: 'Socio-Administrador', data_entrada_sociedade: '2010-01-15' },
    { nome_socio: 'MARIA SOUZA', qualificacao_socio: 'Socia', data_entrada_sociedade: '2015-06-20' },
  ],
};

// ─────────────────────────────────────────────────────────
// buscarCep
// ─────────────────────────────────────────────────────────

describe('ApiService.buscarCep', () => {
  test('retorna dados para CEP valido', async () => {
    const mock = { logradouro: 'Rua X', bairro: 'Y', localidade: 'Joinville', uf: 'SC' };
    global.fetch.mockResolvedValueOnce({ json: async () => mock });

    const resultado = await ApiService.buscarCep('89200000');
    expect(resultado).toEqual(mock);
    expect(global.fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/89200000/json/');
  });

  test('remove mascara do CEP antes de chamar a API', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ logradouro: 'X', bairro: 'Y', localidade: 'Z' }) });
    await ApiService.buscarCep('89.200-000');
    expect(global.fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/89200000/json/');
  });

  test('retorna null para CEP com menos de 8 digitos', async () => {
    expect(await ApiService.buscarCep('1234')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('retorna null quando API retorna erro=true', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => ({ erro: true }) });
    expect(await ApiService.buscarCep('00000000')).toBeNull();
  });

  test('retorna null quando fetch lanca excecao', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    expect(await ApiService.buscarCep('89200000')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────
// buscarCnpj
// ─────────────────────────────────────────────────────────

describe('ApiService.buscarCnpj', () => {
  const cnpj = '12345678000195';

  test('mapeia campos corretamente', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponseCnpj });
    const r = await ApiService.buscarCnpj(cnpj);

    expect(r.razao_social).toBe('EMPRESA TESTE LTDA');
    expect(r.data_abertura).toBe('2010-01-15');
    expect(r.situacao).toBe('ATIVA'); // BUG-02 corrigido: campo correto
    expect(r.sugestaoSetor).toBe('Desenvolvimento de programas de computador');
  });

  test('inclui socios mapeados do qsa', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponseCnpj });
    const r = await ApiService.buscarCnpj(cnpj);

    expect(r.socios).toHaveLength(2);
    expect(r.socios[0].nome_socio).toBe('JOAO DA SILVA');
    expect(r.socios[1].nome_socio).toBe('MARIA SOUZA');
  });

  test('retorna socios=[] quando qsa ausente', async () => {
    const sem = { ...mockApiResponseCnpj };
    delete sem.qsa;
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => sem });
    const r = await ApiService.buscarCnpj(cnpj);
    expect(r.socios).toEqual([]);
  });

  test('remove mascara do CNPJ antes de chamar a API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockApiResponseCnpj });
    await ApiService.buscarCnpj('12.345.678/0001-95');
    expect(global.fetch).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/12345678000195');
  });

  test('retorna null para CNPJ com menos de 14 digitos', async () => {
    expect(await ApiService.buscarCnpj('12345')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('retorna null quando resposta nao-ok (404)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    expect(await ApiService.buscarCnpj(cnpj)).toBeNull();
  });

  test('retorna null quando fetch lanca excecao', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    expect(await ApiService.buscarCnpj(cnpj)).toBeNull();
  });

  test('usa fallback quando nome_fantasia e null', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...mockApiResponseCnpj, nome_fantasia: null }) });
    const r = await ApiService.buscarCnpj(cnpj);
    expect(r.nome_fantasia).toBe('Não possui nome fantasia');
  });

  test('usa fallback quando data_inicio_atividade e null', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...mockApiResponseCnpj, data_inicio_atividade: null }) });
    const r = await ApiService.buscarCnpj(cnpj);
    expect(r.data_abertura).toBe('Não informada');
  });
});
