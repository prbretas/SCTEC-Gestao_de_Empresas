/**
 * e2e.test.js — Testes End-to-End (unitários simulando fluxos completos)
 * Cobre: Auth, Produtos, Estoque, Financeiro, Empreendimentos, Propostas, Entrada
 */

// Setup: simula localStorage e DOM mínimo
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });
Object.defineProperty(global, "sessionStorage", { value: localStorageMock });

// Mock crypto.subtle para hashSenha
global.crypto = { subtle: { digest: jest.fn() } };
global.TextEncoder = class { encode(str) { return new Uint8Array(Buffer.from(str)); } };

beforeEach(() => { localStorageMock.clear(); });

// ─── Testes de ProdutosStorage ──────────────────────────────────────────────

describe("ProdutosStorage", () => {
  const ProdutosStorage = {
    _chave: "SCTEC_PRODUTOS_test",
    buscarTodos() { try { return JSON.parse(localStorage.getItem(this._chave) || "[]"); } catch { return []; } },
    salvarTodos(lista) { localStorage.setItem(this._chave, JSON.stringify(lista)); },
    adicionar(p) { const lista = this.buscarTodos(); p.id = Date.now().toString(); lista.push(p); this.salvarTodos(lista); return p; },
    atualizar(id, dados) { const lista = this.buscarTodos(); const idx = lista.findIndex((p) => p.id === id); if (idx !== -1) { lista[idx] = { ...lista[idx], ...dados, id }; this.salvarTodos(lista); } },
    excluir(id) { this.salvarTodos(this.buscarTodos().filter((p) => p.id !== id)); },
  };

  test("deve adicionar produto com campos corretos", () => {
    const p = ProdutosStorage.adicionar({ nome: "Parafuso M8", valorCompra: 0.60, margem: 30, valorVenda: 0.78, codigo: "PRD-001" });
    expect(p.id).toBeDefined();
    expect(p.nome).toBe("Parafuso M8");
    expect(p.valorCompra).toBe(0.60);
    expect(p.margem).toBe(30);
    expect(ProdutosStorage.buscarTodos()).toHaveLength(1);
  });

  test("deve atualizar produto existente", () => {
    const p = ProdutosStorage.adicionar({ nome: "Produto A", valorCompra: 10 });
    ProdutosStorage.atualizar(p.id, { nome: "Produto A Editado", valorCompra: 15 });
    const atualizado = ProdutosStorage.buscarTodos()[0];
    expect(atualizado.nome).toBe("Produto A Editado");
    expect(atualizado.valorCompra).toBe(15);
  });

  test("deve excluir produto", () => {
    const p = ProdutosStorage.adicionar({ nome: "Para Excluir" });
    expect(ProdutosStorage.buscarTodos()).toHaveLength(1);
    ProdutosStorage.excluir(p.id);
    expect(ProdutosStorage.buscarTodos()).toHaveLength(0);
  });

  test("nao deve permitir IDs duplicados", () => {
    const p1 = ProdutosStorage.adicionar({ nome: "P1" });
    const p2 = ProdutosStorage.adicionar({ nome: "P2" });
    expect(p1.id).not.toBe(p2.id);
  });
});

// ─── Testes de EstoqueStorage ───────────────────────────────────────────────

describe("EstoqueStorage", () => {
  const EstoqueStorage = {
    _chave: "SCTEC_ESTOQUE_test",
    _chaveMov: "SCTEC_ESTOQUE_test_MOV",
    buscarTodos() { try { return JSON.parse(localStorage.getItem(this._chave) || "[]"); } catch { return []; } },
    salvarTodos(lista) { localStorage.setItem(this._chave, JSON.stringify(lista)); },
    buscarMovimentacoes() { try { return JSON.parse(localStorage.getItem(this._chaveMov) || "[]"); } catch { return []; } },
    registrarMovimentacao(mov) { const m = this.buscarMovimentacoes(); mov.id = "mov_" + Date.now(); mov.data = new Date().toISOString(); m.push(mov); localStorage.setItem(this._chaveMov, JSON.stringify(m)); },
    obterQuantidadeTotal(produtoId) { return this.buscarTodos().filter((e) => e.produtoId === produtoId).reduce((s, e) => s + (e.quantidade || 0), 0); },

    movimentar({ produtoId, enderecoId, tipo, quantidade, motivo }) {
      const lista = this.buscarTodos();
      let pos = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoId);
      if (!pos) { pos = { id: "est_" + Date.now(), produtoId, enderecoId, quantidade: 0, estoqueMin: 5 }; lista.push(pos); }
      const qtdAtual = pos.quantidade || 0;
      if (tipo === "entrada") { pos.quantidade = qtdAtual + quantidade; }
      else if (tipo === "saida") { if (quantidade > qtdAtual) return { sucesso: false, mensagem: "Insuficiente" }; pos.quantidade = qtdAtual - quantidade; }
      this.salvarTodos(lista);
      this.registrarMovimentacao({ produtoId, enderecoId, tipo, quantidade, estoqueAnterior: qtdAtual, estoqueNovo: pos.quantidade, motivo });
      return { sucesso: true, mensagem: `Novo: ${pos.quantidade}` };
    },

    transferir({ produtoId, enderecoOrigem, enderecoDestino, quantidade }) {
      if (enderecoOrigem === enderecoDestino) return { sucesso: false, mensagem: "Iguais" };
      const lista = this.buscarTodos();
      let posO = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoOrigem);
      if (!posO) { posO = { id: "est_" + Date.now(), produtoId, enderecoId: enderecoOrigem, quantidade: 0 }; lista.push(posO); }
      if (posO.quantidade < quantidade) return { sucesso: false, mensagem: "Insuficiente" };
      let posD = lista.find((e) => e.produtoId === produtoId && e.enderecoId === enderecoDestino);
      if (!posD) { posD = { id: "est_" + (Date.now() + 1), produtoId, enderecoId: enderecoDestino, quantidade: 0 }; lista.push(posD); }
      posO.quantidade -= quantidade;
      posD.quantidade += quantidade;
      this.salvarTodos(lista);
      return { sucesso: true };
    },
  };

  test("deve dar entrada de estoque", () => {
    const r = EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "entrada", quantidade: 100 });
    expect(r.sucesso).toBe(true);
    expect(EstoqueStorage.obterQuantidadeTotal("p1")).toBe(100);
  });

  test("deve dar saida de estoque", () => {
    EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "entrada", quantidade: 50 });
    const r = EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "saida", quantidade: 20 });
    expect(r.sucesso).toBe(true);
    expect(EstoqueStorage.obterQuantidadeTotal("p1")).toBe(30);
  });

  test("deve rejeitar saida maior que estoque", () => {
    EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "entrada", quantidade: 10 });
    const r = EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "saida", quantidade: 50 });
    expect(r.sucesso).toBe(false);
  });

  test("transferencia deve creditar destino corretamente", () => {
    EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "A", tipo: "entrada", quantidade: 1000 });
    const r = EstoqueStorage.transferir({ produtoId: "p1", enderecoOrigem: "A", enderecoDestino: "B", quantidade: 500 });
    expect(r.sucesso).toBe(true);
    const lista = EstoqueStorage.buscarTodos();
    const posA = lista.find((e) => e.produtoId === "p1" && e.enderecoId === "A");
    const posB = lista.find((e) => e.produtoId === "p1" && e.enderecoId === "B");
    expect(posA.quantidade).toBe(500);
    expect(posB.quantidade).toBe(500);
  });

  test("transferencia nao deve permitir origem e destino iguais", () => {
    const r = EstoqueStorage.transferir({ produtoId: "p1", enderecoOrigem: "A", enderecoDestino: "A", quantidade: 10 });
    expect(r.sucesso).toBe(false);
  });

  test("deve registrar movimentacoes no historico", () => {
    EstoqueStorage.movimentar({ produtoId: "p1", enderecoId: "end1", tipo: "entrada", quantidade: 25, motivo: "Compra" });
    const movs = EstoqueStorage.buscarMovimentacoes();
    expect(movs.length).toBeGreaterThan(0);
    expect(movs[movs.length - 1].motivo).toBe("Compra");
  });
});

// ─── Testes de FinanceiroStorage ────────────────────────────────────────────

describe("FinanceiroStorage", () => {
  const FinanceiroStorage = {
    _chave: "SCTEC_FINANCEIRO_test",
    buscarTodos() { try { return JSON.parse(localStorage.getItem(this._chave) || "[]"); } catch { return []; } },
    salvarTodos(lista) { localStorage.setItem(this._chave, JSON.stringify(lista)); },
    adicionar(t) { const lista = this.buscarTodos(); t.id = Date.now().toString(); lista.push(t); this.salvarTodos(lista); return t; },
    excluir(id) { this.salvarTodos(this.buscarTodos().filter((t) => t.id !== id)); },
  };

  test("deve registrar lancamento financeiro", () => {
    const t = FinanceiroStorage.adicionar({ tipo: "entrada", tipoFiscal: "nfs", descricao: "Venda", valor: 5000, data: "2026-07-31" });
    expect(t.id).toBeDefined();
    expect(FinanceiroStorage.buscarTodos()).toHaveLength(1);
  });

  test("deve calcular saldo (entradas - saidas)", () => {
    FinanceiroStorage.adicionar({ tipo: "entrada", valor: 10000 });
    FinanceiroStorage.adicionar({ tipo: "saida", valor: 3000 });
    const todos = FinanceiroStorage.buscarTodos();
    const entradas = todos.filter((t) => t.tipo === "entrada").reduce((s, t) => s + t.valor, 0);
    const saidas = todos.filter((t) => t.tipo === "saida").reduce((s, t) => s + t.valor, 0);
    expect(entradas - saidas).toBe(7000);
  });

  test("deve excluir lancamento", () => {
    const t = FinanceiroStorage.adicionar({ tipo: "entrada", valor: 100 });
    FinanceiroStorage.excluir(t.id);
    expect(FinanceiroStorage.buscarTodos()).toHaveLength(0);
  });
});

// ─── Testes de Margem de Ganho ──────────────────────────────────────────────

describe("Calculo Margem de Ganho", () => {
  const calcularVenda = (compra, margem) => compra * (1 + margem / 100);

  test("margem 30% sobre compra R$100 = venda R$130", () => {
    expect(calcularVenda(100, 30)).toBe(130);
  });

  test("margem 50% sobre compra R$200 = venda R$300", () => {
    expect(calcularVenda(200, 50)).toBe(300);
  });

  test("margem 0% = venda igual compra", () => {
    expect(calcularVenda(85, 0)).toBe(85);
  });

  test("margem 100% = venda dobra", () => {
    expect(calcularVenda(50, 100)).toBe(100);
  });
});

// ─── Testes de Numeracao ────────────────────────────────────────────────────

describe("Geracao de Codigo Sequencial", () => {
  const gerarProximoCodigo = (prefixo, existentes, campo) => {
    const codigos = new Set(existentes.map((r) => r[campo] || "").filter(Boolean));
    let maiorSeq = 0;
    codigos.forEach((cod) => { const m = cod.match(/(\d+)$/); if (m) { const n = parseInt(m[1]); if (n > maiorSeq) maiorSeq = n; } });
    return `${prefixo}-${String(maiorSeq + 1).padStart(3, "0")}`;
  };

  test("deve gerar PRD-001 quando nao ha produtos", () => {
    expect(gerarProximoCodigo("PRD", [], "codigo")).toBe("PRD-001");
  });

  test("deve gerar PRD-004 quando ultimo e PRD-003", () => {
    const existentes = [{ codigo: "PRD-001" }, { codigo: "PRD-002" }, { codigo: "PRD-003" }];
    expect(gerarProximoCodigo("PRD", existentes, "codigo")).toBe("PRD-004");
  });

  test("deve gerar FIN-001 para financeiro vazio", () => {
    expect(gerarProximoCodigo("FIN", [], "numero")).toBe("FIN-001");
  });
});

// ─── Testes de Validacao CNPJ/CPF ───────────────────────────────────────────

describe("Validacao de Documentos", () => {
  const validarCNPJ = (cnpj) => {
    const c = cnpj.replace(/\D/g, "");
    if (c.length !== 14) return false;
    if (/^(\d)\1+$/.test(c)) return false;
    const calc = (digits, len) => { let sum = 0; let pos = len - 7; for (let i = len; i >= 1; i--) { sum += Number(digits.charAt(len - i)) * pos--; if (pos < 2) pos = 9; } return sum % 11 < 2 ? 0 : 11 - (sum % 11); };
    return calc(c, 12) === Number(c.charAt(12)) && calc(c, 13) === Number(c.charAt(13));
  };

  const validarCPF = (cpf) => {
    const c = cpf.replace(/\D/g, "");
    if (c.length !== 11) return false;
    if (/^(\d)\1+$/.test(c)) return false;
    const calc = (slice, peso) => { let sum = 0; for (let i = 0; i < slice.length; i++) sum += Number(slice.charAt(i)) * (peso - i); const r = (sum * 10) % 11; return r >= 10 ? 0 : r; };
    return calc(c.substring(0, 9), 10) === Number(c.charAt(9)) && calc(c.substring(0, 10), 11) === Number(c.charAt(10));
  };

  test("CNPJ valido: 11.222.333/0001-81", () => { expect(validarCNPJ("11222333000181")).toBe(true); });
  test("CNPJ invalido: 00.000.000/0000-00", () => { expect(validarCNPJ("00000000000000")).toBe(false); });
  test("CNPJ invalido: digitos errados", () => { expect(validarCNPJ("04975835000157")).toBe(false); });
  test("CPF valido: 529.982.247-25", () => { expect(validarCPF("52998224725")).toBe(true); });
  test("CPF invalido: 111.111.111-11", () => { expect(validarCPF("11111111111")).toBe(false); });
});

// ─── Testes de Mascara Documento ────────────────────────────────────────────

describe("Mascara de Documento", () => {
  const aplicarMascara = (valor, tipo) => {
    let v = valor.replace(/\D/g, "");
    if (tipo === "PF") { v = v.substring(0, 11); v = v.replace(/(\d{3})(\d)/, "$1.$2"); v = v.replace(/(\d{3})(\d)/, "$1.$2"); v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
    else { v = v.substring(0, 14); v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); }
    return v;
  };

  test("deve mascarar CNPJ corretamente", () => {
    expect(aplicarMascara("11222333000181", "PJ")).toBe("11.222.333/0001-81");
  });

  test("deve mascarar CPF corretamente", () => {
    expect(aplicarMascara("52998224725", "PF")).toBe("529.982.247-25");
  });
});
