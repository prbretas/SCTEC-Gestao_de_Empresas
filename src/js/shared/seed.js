/**
 * seed.js — Injeção de dados de teste/demonstração (#113)
 * Pode ser chamado via console: SeedController.executar()
 * Ou via botão na tela de configurações (admin only).
 */

const SeedController = {

  /**
   * Injeta dados de demonstração no sistema.
   * Só executa se não houver dados existentes (ou forçado).
   * @param {boolean} forcar - se true, adiciona mesmo com dados existentes
   */
  executar(forcar = false) {
    const sessao = window.AuthService ? AuthService.obterSessao() : null;
    if (!sessao) { alert("Faça login primeiro."); return; }

    if (!forcar) {
      const produtosExistentes = window.ProdutosStorage ? ProdutosStorage.buscarTodos().length : 0;
      if (produtosExistentes > 0) {
        if (!confirm(`Já existem ${produtosExistentes} produtos cadastrados.\nDeseja adicionar dados de demonstração mesmo assim?`)) return;
      }
    }

    let totalCriados = 0;

    // ─── Produtos ─────────────────────────────────────────────────────────
    if (window.ProdutosStorage) {
      const produtos = [
        { codigo: "PRD-001", nome: "Parafuso M8 Inox", categoria: "materiais", unidade: "un", preco: 0.85, valorVenda: 1.50, valorCompra: 0.60, lote: "LT-2026-A01" },
        { codigo: "PRD-002", nome: "Chapa de Aço 2mm", categoria: "materiais", unidade: "m2", preco: 45.00, valorVenda: 65.00, valorCompra: 38.00, lote: "LT-2026-A02" },
        { codigo: "PRD-003", nome: "Motor Elétrico 5CV", categoria: "equipamentos", unidade: "un", preco: 2800.00, valorVenda: 3500.00, valorCompra: 2200.00 },
        { codigo: "PRD-004", nome: "Óleo Lubrificante 20L", categoria: "insumos", unidade: "l", preco: 120.00, valorVenda: 180.00, valorCompra: 95.00, lote: "LT-2026-B01" },
        { codigo: "PRD-005", nome: "Correia Transportadora 1m", categoria: "materiais", unidade: "m", preco: 85.00, valorVenda: 120.00, valorCompra: 65.00 },
        { codigo: "PRD-006", nome: "Sensor de Temperatura PT100", categoria: "equipamentos", unidade: "un", preco: 350.00, valorVenda: 480.00, valorCompra: 280.00 },
        { codigo: "PRD-007", nome: "Graxa Industrial 1kg", categoria: "insumos", unidade: "kg", preco: 28.00, valorVenda: 42.00, valorCompra: 20.00, lote: "LT-2026-C01" },
        { codigo: "PRD-008", nome: "Mangueira Hidráulica 3/4", categoria: "materiais", unidade: "m", preco: 32.00, valorVenda: 48.00, valorCompra: 24.00 },
      ];

      produtos.forEach((p) => {
        const existente = ProdutosStorage.buscarTodos().find((e) => e.codigo === p.codigo);
        if (!existente) {
          ProdutosStorage.adicionar(p);
          totalCriados++;
        }
      });
    }

    // ─── Empreendimentos ──────────────────────────────────────────────────
    if (window.EmpreendimentoStorage) {
      const empresas = [
        { nome: "TECH SOLUTIONS LTDA", tipoPessoa: "PJ", registro: "12.345.678/0001-90", responsavel: "Carlos Silva", email: "contato@techsolutions.com.br", telefone: "(47) 3333-4444", municipio: "Joinville", estado: "SC", segmento: "Tecnologia", tipoCadastro: "cliente", status: "Ativo" },
        { nome: "DISTRIBUIDORA ABC", tipoPessoa: "PJ", registro: "98.765.432/0001-10", responsavel: "Maria Santos", email: "maria@distrib-abc.com.br", telefone: "(48) 9999-8888", municipio: "Florianópolis", estado: "SC", segmento: "Logística", tipoCadastro: "fornecedor", status: "Ativo" },
        { nome: "TRANSPORTES RÁPIDO SC", tipoPessoa: "PJ", registro: "55.666.777/0001-33", responsavel: "João Oliveira", email: "joao@rapido.com.br", telefone: "(47) 2222-1111", municipio: "Blumenau", estado: "SC", segmento: "Transportes", tipoCadastro: "transportador", status: "Ativo" },
        { nome: "FILIAL CENTRO", tipoPessoa: "PJ", registro: "11.222.333/0002-44", responsavel: "Ana Costa", municipio: "Joinville", estado: "SC", segmento: "Serviços", tipoCadastro: "filial", status: "Ativo" },
      ];

      empresas.forEach((e) => {
        const existente = EmpreendimentoStorage.buscarTodos().find((x) => x.registro === e.registro);
        if (!existente) {
          EmpreendimentoStorage.adicionar(e);
          totalCriados++;
        }
      });
    }

    // ─── Lançamentos Financeiros ──────────────────────────────────────────
    if (window.FinanceiroStorage) {
      const lancamentos = [
        { numero: "FIN-001", tipo: "entrada", tipoFiscal: "nfs", descricao: "Venda de equipamentos - Pedido #001", valor: 7500, data: "2026-07-15", statusPagamento: "pago", formaPagamento: "pix", categoria: "produtos" },
        { numero: "FIN-002", tipo: "saida", tipoFiscal: "nfe", descricao: "Compra de insumos - NF 4521", valor: 3200, data: "2026-07-20", statusPagamento: "pendente", formaPagamento: "boleto", categoria: "produtos" },
        { numero: "FIN-003", tipo: "entrada", tipoFiscal: "nfs", descricao: "Serviço de manutenção preventiva", valor: 4800, data: "2026-07-25", statusPagamento: "pago", formaPagamento: "transferencia", categoria: "servicos" },
        { numero: "FIN-004", tipo: "saida", tipoFiscal: "nfe", descricao: "Aluguel galpão - Julho/2026", valor: 8500, data: "2026-07-01", statusPagamento: "pago", formaPagamento: "boleto", categoria: "aluguel" },
      ];

      lancamentos.forEach((l) => {
        const existente = FinanceiroStorage.buscarTodos().find((x) => x.numero === l.numero);
        if (!existente) {
          FinanceiroStorage.adicionar(l);
          totalCriados++;
        }
      });
    }

    alert(`✅ Seed concluído!\n${totalCriados} registros de demonstração criados.`);
    if (totalCriados > 0) location.reload();
  },

  /**
   * Remove TODOS os dados de demonstração (registros com código PRD-00X, FIN-00X, etc.)
   * CUIDADO: ação destrutiva.
   */
  limpar() {
    if (!confirm("⚠️ ATENÇÃO: Isso removerá TODOS os dados do sistema (produtos, financeiro, empreendimentos).\n\nDeseja continuar?")) return;
    if (!confirm("Tem certeza ABSOLUTA? Esta ação não pode ser desfeita.")) return;

    if (window.ProdutosStorage) ProdutosStorage.salvarTodos([]);
    if (window.FinanceiroStorage) FinanceiroStorage.salvarTodos([]);
    if (window.EstoqueStorage) EstoqueStorage.salvarTodos([]);

    alert("🗑️ Dados removidos. Recarregando...");
    location.reload();
  },
};

window.SeedController = SeedController;
