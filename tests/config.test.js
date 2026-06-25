/**
 * Testes unitarios para config.js
 * Cobre: obter, salvar, restaurarPadrao, obterSegmentos, _escurecer
 */

/* global ConfigController */

const CONFIG_KEY = 'SCTEC_CONFIG';

beforeEach(() => {
  localStorage.clear();
});

describe('ConfigController.obter', () => {
  test('retorna padrao quando nao ha config salva', () => {
    const config = ConfigController.obter();
    expect(config.nomeSistema).toBe('SCTEC - Gestão Empresarial');
    expect(config.cores.header).toBe('#333a60');
    expect(config.segmentos).toContain('Tecnologia');
  });

  test('retorna config salva no LocalStorage', () => {
    const salva = { nomeSistema: 'Minha Empresa', cores: { header: '#ff0000', btn: '#00ff00', destaque: '#0000ff' }, segmentos: ['A', 'B'] };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(salva));
    const config = ConfigController.obter();
    expect(config.nomeSistema).toBe('Minha Empresa');
    expect(config.cores.header).toBe('#ff0000');
  });

  test('retorna padrao quando JSON invalido no localStorage', () => {
    localStorage.setItem(CONFIG_KEY, 'json-invalido{{{');
    const config = ConfigController.obter();
    expect(config.nomeSistema).toBe('SCTEC - Gestão Empresarial');
  });

  test('mescla campos novos do padrao em config antiga', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ nomeSistema: 'Antigo' }));
    const config = ConfigController.obter();
    expect(config.cores).toBeDefined();
    expect(config.segmentos).toBeDefined();
  });
});

describe('ConfigController.salvar', () => {
  test('persiste a config no LocalStorage', () => {
    const novaConfig = ConfigController.obter();
    novaConfig.nomeSistema = 'Sistema Teste';
    ConfigController.salvar(novaConfig);
    const salvo = JSON.parse(localStorage.getItem(CONFIG_KEY));
    expect(salvo.nomeSistema).toBe('Sistema Teste');
  });
});

describe('ConfigController.restaurarPadrao', () => {
  test('remove a config do LocalStorage', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ nomeSistema: 'Personalizado' }));
    ConfigController.restaurarPadrao();
    expect(localStorage.getItem(CONFIG_KEY)).toBeNull();
  });
});

describe('ConfigController.obterSegmentos', () => {
  test('retorna lista padrao de segmentos', () => {
    const segs = ConfigController.obterSegmentos();
    expect(segs).toContain('Tecnologia');
    expect(segs).toContain('Logística');
    expect(Array.isArray(segs)).toBe(true);
  });

  test('retorna segmentos customizados quando salvos', () => {
    const config = ConfigController.obter();
    config.segmentos = ['Custom1', 'Custom2'];
    ConfigController.salvar(config);
    expect(ConfigController.obterSegmentos()).toEqual(['Custom1', 'Custom2']);
  });
});

describe('ConfigController._escurecer', () => {
  test('escurece cor hex em 15%', () => {
    const resultado = ConfigController._escurecer('#006ebc', 15);
    expect(resultado).toMatch(/^#[0-9a-f]{6}$/);
    // Resultado deve ser mais escuro (valor numérico menor)
    const original = parseInt('006ebc', 16);
    const escurecido = parseInt(resultado.replace('#', ''), 16);
    expect(escurecido).toBeLessThan(original);
  });

  test('nao retorna valores negativos (cor preta no minimo)', () => {
    const resultado = ConfigController._escurecer('#000000', 50);
    expect(resultado).toBe('#000000');
  });
});
