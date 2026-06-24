/**
 * Testes unitarios para utils.js
 * Os modulos sao carregados via tests/setup.js (setupFiles no package.json)
 */

/* global Utils */

describe('Utils.aplicarMascaraTelefone', () => {
  test('formata celular com 11 digitos', () => {
    expect(Utils.aplicarMascaraTelefone('47999990000')).toBe('(47) 99999-0000');
  });

  test('formata fixo com 10 digitos', () => {
    expect(Utils.aplicarMascaraTelefone('4733221100')).toBe('(47) 3322-1100');
  });

  test('ignora caracteres nao numericos', () => {
    expect(Utils.aplicarMascaraTelefone('(47) 99999-0000')).toBe('(47) 99999-0000');
  });

  test('retorna vazio para string vazia', () => {
    expect(Utils.aplicarMascaraTelefone('')).toBe('');
  });

  test('retorna vazio para null', () => {
    expect(Utils.aplicarMascaraTelefone(null)).toBe('');
  });

  test('retorna vazio para undefined', () => {
    expect(Utils.aplicarMascaraTelefone(undefined)).toBe('');
  });

  test('trunca digitos extras acima de 11', () => {
    expect(Utils.aplicarMascaraTelefone('479999900001234')).toBe('(47) 99999-0000');
  });
});

describe('Utils.aplicarMascaraDocumento', () => {
  test('formata CNPJ: XX.XXX.XXX/XXXX-XX', () => {
    expect(Utils.aplicarMascaraDocumento('12345678000195', 'PJ')).toBe('12.345.678/0001-95');
  });

  test('formata CPF: XXX.XXX.XXX-XX', () => {
    expect(Utils.aplicarMascaraDocumento('12345678901', 'PF')).toBe('123.456.789-01');
  });

  test('ignora pontuacao existente no CNPJ', () => {
    expect(Utils.aplicarMascaraDocumento('12.345.678/0001-95', 'PJ')).toBe('12.345.678/0001-95');
  });

  test('trunca CNPJ com mais de 14 digitos', () => {
    expect(Utils.aplicarMascaraDocumento('123456780001951234', 'PJ')).toBe('12.345.678/0001-95');
  });

  test('trunca CPF com mais de 11 digitos', () => {
    expect(Utils.aplicarMascaraDocumento('123456789019999', 'PF')).toBe('123.456.789-01');
  });
});

describe('Utils.obterConfigSegmento', () => {
  test('Tecnologia: azul Bootstrap', () => {
    expect(Utils.obterConfigSegmento('Tecnologia').bg).toBe('#0d6efd');
  });

  test('Industria: roxo', () => {
    expect(Utils.obterConfigSegmento('Indústria').bg).toBe('#9c27b0');
  });

  test('Logistica: laranja', () => {
    expect(Utils.obterConfigSegmento('Logística').bg).toBe('#ef6c00');
  });

  test('Servicos: vinho', () => {
    expect(Utils.obterConfigSegmento('Serviços').bg).toBe('#8f0e00');
  });

  test('Cliente: teal', () => {
    expect(Utils.obterConfigSegmento('Cliente').bg).toBe('#00838f');
  });

  test('Transportes: marrom', () => {
    expect(Utils.obterConfigSegmento('Transportes').bg).toBe('#602800');
  });

  test('Fornecedor: texto escuro (fundo claro)', () => {
    const config = Utils.obterConfigSegmento('Fornecedor');
    expect(config.bg).toBe('#cadd00');
    expect(config.text).toBe('#4b4b4b');
  });

  test('segmento desconhecido retorna fallback cinza', () => {
    const config = Utils.obterConfigSegmento('Outro');
    expect(config.bg).toBe('#f8f9fa');
    expect(config.text).toBe('#212529');
  });

  test('segmento vazio retorna fallback cinza', () => {
    expect(Utils.obterConfigSegmento('').bg).toBe('#f8f9fa');
  });
});

describe('Utils.formatarDataHora', () => {
  test('formata ISO string para DD/MM/YYYY HH:MM', () => {
    const resultado = Utils.formatarDataHora('2026-06-24T10:30:00.000Z');
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(resultado).toMatch(/\d{2}:\d{2}/);
  });

  test('retorna N/A para string vazia', () => {
    expect(Utils.formatarDataHora('')).toBe('N/A');
  });

  test('retorna N/A para null', () => {
    expect(Utils.formatarDataHora(null)).toBe('N/A');
  });

  test('retorna N/A para undefined', () => {
    expect(Utils.formatarDataHora(undefined)).toBe('N/A');
  });
});
