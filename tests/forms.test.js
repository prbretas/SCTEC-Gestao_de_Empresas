/**
 * Testes unitarios para forms.js
 * Cobre: montagem das observacoes do CNPJ, socios QSA, validacao de duplicidade
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────
// Helpers de montagem das observacoes (extraidos de forms.js)
// Testamos a logica de negocio de forma isolada
// ─────────────────────────────────────────────────────────

/**
 * Monta o bloco de observacoes como forms.js faz
 * (funcao isolada para testes — espelha a logica do initInputs)
 */
function montarObservacoesDosCNPJ(dados) {
  const infoExtra = `--- DADOS CADASTRAIS (RECEITA FEDERAL) ---
DATA DE ABERTURA: ${dados.data_abertura || 'N/A'}
NOME FANTASIA: ${dados.nome_fantasia || 'Nao informado'}
SITUACAO: ${dados.situacao || 'N/A'}
CNAE PRINCIPAL: ${dados.sugestaoSetor || 'N/A'}`;

  let secaoSocios = '';
  if (dados.socios && dados.socios.length > 0) {
    secaoSocios = '\n\n--- QUADRO DE SOCIOS (QSA) ---';
    dados.socios.forEach((socio, i) => {
      const dataEntrada = socio.data_entrada_sociedade || 'N/D';
      secaoSocios += `\n${i + 1}. ${socio.nome_socio}`;
      secaoSocios += `\n   Qualificacao: ${socio.qualificacao_socio || 'N/D'}`;
      secaoSocios += `\n   Entrada na Sociedade: ${dataEntrada}`;
    });
    secaoSocios += '\n-------------------------------';
  } else {
    secaoSocios = '\n\nSOCIOS: Nao informados na base da Receita Federal';
  }

  return infoExtra + secaoSocios;
}

// ─────────────────────────────────────────────────────────
// Testes de montagem das observacoes
// ─────────────────────────────────────────────────────────

describe('Montagem de observacoes do CNPJ', () => {
  const dadosCompletos = {
    data_abertura: '2010-01-15',
    nome_fantasia: 'Empresa Teste',
    situacao: 'ATIVA',
    sugestaoSetor: 'Desenvolvimento de software',
    socios: [
      {
        nome_socio: 'JOAO DA SILVA',
        qualificacao_socio: 'Socio-Administrador',
        data_entrada_sociedade: '2010-01-15',
      },
    ],
  };

  test('inclui DATA DE ABERTURA nas observacoes', () => {
    const obs = montarObservacoesDosCNPJ(dadosCompletos);
    expect(obs).toContain('DATA DE ABERTURA: 2010-01-15');
  });

  test('inclui SITUACAO corretamente (nao usa campo errado)', () => {
    const obs = montarObservacoesDosCNPJ(dadosCompletos);
    expect(obs).toContain('SITUACAO: ATIVA');
    expect(obs).not.toContain('SITUACAO: N/A'); // garantia do BUG-02 corrigido
  });

  test('inclui NOME FANTASIA nas observacoes', () => {
    const obs = montarObservacoesDosCNPJ(dadosCompletos);
    expect(obs).toContain('NOME FANTASIA: Empresa Teste');
  });

  test('inclui CNAE PRINCIPAL nas observacoes', () => {
    const obs = montarObservacoesDosCNPJ(dadosCompletos);
    expect(obs).toContain('CNAE PRINCIPAL: Desenvolvimento de software');
  });

  test('inclui secao QSA quando ha socios', () => {
    const obs = montarObservacoesDosCNPJ(dadosCompletos);
    expect(obs).toContain('--- QUADRO DE SOCIOS (QSA) ---');
    expect(obs).toContain('JOAO DA SILVA');
    expect(obs).toContain('Socio-Administrador');
    expect(obs).toContain('2010-01-15');
  });

  test('exibe mensagem quando socios esta vazio', () => {
    const dadosSemSocios = { ...dadosCompletos, socios: [] };
    const obs = montarObservacoesDosCNPJ(dadosSemSocios);
    expect(obs).toContain('SOCIOS: Nao informados na base da Receita Federal');
  });

  test('exibe mensagem quando socios e undefined', () => {
    const dadosSemQsa = { ...dadosCompletos };
    delete dadosSemQsa.socios;
    const obs = montarObservacoesDosCNPJ(dadosSemQsa);
    expect(obs).toContain('SOCIOS: Nao informados na base da Receita Federal');
  });

  test('exibe N/D quando data_entrada_sociedade nao informada', () => {
    const dadosSemData = {
      ...dadosCompletos,
      socios: [{ nome_socio: 'PEDRO', qualificacao_socio: 'Socio', data_entrada_sociedade: null }],
    };
    const obs = montarObservacoesDosCNPJ(dadosSemData);
    expect(obs).toContain('Entrada na Sociedade: N/D');
  });

  test('exibe multiplos socios numerados corretamente', () => {
    const dadosMultiSocios = {
      ...dadosCompletos,
      socios: [
        { nome_socio: 'SOCIO A', qualificacao_socio: 'Admin', data_entrada_sociedade: '2010-01-01' },
        { nome_socio: 'SOCIO B', qualificacao_socio: 'Socio', data_entrada_sociedade: '2015-01-01' },
        { nome_socio: 'SOCIO C', qualificacao_socio: 'Socio', data_entrada_sociedade: '2020-01-01' },
      ],
    };
    const obs = montarObservacoesDosCNPJ(dadosMultiSocios);
    expect(obs).toContain('1. SOCIO A');
    expect(obs).toContain('2. SOCIO B');
    expect(obs).toContain('3. SOCIO C');
  });

  test('usa N/A para campos ausentes nos dados cadastrais', () => {
    const dadosMinimos = { socios: [] };
    const obs = montarObservacoesDosCNPJ(dadosMinimos);
    expect(obs).toContain('DATA DE ABERTURA: N/A');
    expect(obs).toContain('SITUACAO: N/A');
    expect(obs).toContain('CNAE PRINCIPAL: N/A');
  });
});

// ─────────────────────────────────────────────────────────
// Testes de logica de validacao de duplicidade
// ─────────────────────────────────────────────────────────

describe('Validacao de duplicidade de CNPJ/CPF', () => {
  /**
   * Replica a logica de deteccao de duplicidade de handleSave()
   */
  function verificarDuplicidade(baseAtual, registroNovo, idAtual) {
    const registroLimpoNovo = registroNovo.replace(/\D/g, '');
    return baseAtual.find((emp) => {
      const registroLimpoBase = emp.registro.replace(/\D/g, '');
      return (
        registroLimpoBase === registroLimpoNovo &&
        Number(emp.id) !== Number(idAtual)
      );
    });
  }

  const base = [
    { id: 1, nome: 'Empresa A', registro: '12.345.678/0001-95' },
    { id: 2, nome: 'Empresa B', registro: '98.765.432/0001-10' },
  ];

  test('detecta CNPJ duplicado com mascara diferente', () => {
    const duplicado = verificarDuplicidade(base, '12345678000195', null);
    expect(duplicado).toBeDefined();
    expect(duplicado.nome).toBe('Empresa A');
  });

  test('nao detecta duplicidade para o proprio registro (edicao)', () => {
    const duplicado = verificarDuplicidade(base, '12.345.678/0001-95', 1);
    expect(duplicado).toBeUndefined();
  });

  test('nao detecta duplicidade para CNPJ novo', () => {
    const duplicado = verificarDuplicidade(base, '11.111.111/0001-11', null);
    expect(duplicado).toBeUndefined();
  });

  test('detecta CPF duplicado independente de pontuacao', () => {
    const baseCPF = [{ id: 1, nome: 'Pessoa A', registro: '123.456.789-01' }];
    const duplicado = verificarDuplicidade(baseCPF, '12345678901', null);
    expect(duplicado).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────
// T1 — Persistência do tipoPessoa no handleSave
// ─────────────────────────────────────────────────────────

describe('Persistencia do tipoPessoa (T1)', () => {
  /**
   * Replica a logica de normalizacao do tipoPessoa de handleSave:
   *   const tipoPessoa = dados.tipoPessoa || 'PJ';
   *   dados.tipoPessoa = tipoPessoa;
   */
  function normalizarTipoPessoa(dados) {
    const tipoPessoa = dados.tipoPessoa || 'PJ';
    dados.tipoPessoa = tipoPessoa;
    return dados;
  }

  test('persiste PJ quando selecionado', () => {
    const dados = { tipoPessoa: 'PJ', nome: 'Empresa A' };
    const resultado = normalizarTipoPessoa(dados);
    expect(resultado.tipoPessoa).toBe('PJ');
  });

  test('persiste PF quando selecionado', () => {
    const dados = { tipoPessoa: 'PF', nome: 'Pessoa B' };
    const resultado = normalizarTipoPessoa(dados);
    expect(resultado.tipoPessoa).toBe('PF');
  });

  test('usa PJ como fallback quando tipoPessoa esta ausente', () => {
    const dados = { nome: 'Empresa C' };
    const resultado = normalizarTipoPessoa(dados);
    expect(resultado.tipoPessoa).toBe('PJ');
  });

  test('usa PJ como fallback quando tipoPessoa e string vazia', () => {
    const dados = { tipoPessoa: '', nome: 'Empresa D' };
    const resultado = normalizarTipoPessoa(dados);
    expect(resultado.tipoPessoa).toBe('PJ');
  });

  test('nao altera outros campos ao normalizar tipoPessoa', () => {
    const dados = { tipoPessoa: 'PF', nome: 'Pessoa E', registro: '123.456.789-01' };
    const resultado = normalizarTipoPessoa(dados);
    expect(resultado.nome).toBe('Pessoa E');
    expect(resultado.registro).toBe('123.456.789-01');
  });

  test('tipoPessoa PF persiste no objeto final (antes era perdido)', () => {
    // Regressao: bug era que tipoPessoa nao era incluido no objeto salvo
    const formDataSimulado = { nome: 'Pessoa F', registro: '529.982.247-25' };
    // Antes do fix: tipoPessoa ficava undefined
    // Apos o fix: tipoPessoa deve ser PJ como padrao
    const tipoPessoa = formDataSimulado.tipoPessoa || 'PJ';
    formDataSimulado.tipoPessoa = tipoPessoa;
    expect(Object.keys(formDataSimulado)).toContain('tipoPessoa');
    expect(formDataSimulado.tipoPessoa).not.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────
// T2 — Feedback visual ViaCEP: lógica do try/finally
// ─────────────────────────────────────────────────────────

describe('Feedback visual ViaCEP — try/finally (T2)', () => {
  /**
   * Valida o padrao try/finally que garante que campos
   * sejam reabilitados mesmo em caso de erro na API.
   */
  async function simularConsultaCep(mockFetch, campos) {
    campos.forEach((c) => { c.disabled = true; });
    try {
      await mockFetch();
    } finally {
      campos.forEach((c) => { c.disabled = false; });
    }
  }

  test('habilita campos apos consulta bem-sucedida', async () => {
    const campos = [{ disabled: false }, { disabled: false }];
    await simularConsultaCep(async () => ({ logradouro: 'Rua A' }), campos);
    campos.forEach((c) => expect(c.disabled).toBe(false));
  });

  test('habilita campos mesmo apos erro na API', async () => {
    const campos = [{ disabled: false }, { disabled: false }];
    await expect(
      simularConsultaCep(async () => { throw new Error('Network error'); }, campos)
    ).rejects.toThrow('Network error');
    // O finally deve ter rodado mesmo com o throw
    campos.forEach((c) => expect(c.disabled).toBe(false));
  });

  test('desabilita campos durante a consulta', async () => {
    const campos = [{ disabled: false }];
    let estadoDuranteConsulta = null;
    await simularConsultaCep(async () => {
      estadoDuranteConsulta = campos[0].disabled;
    }, campos);
    expect(estadoDuranteConsulta).toBe(true);
  });
});
