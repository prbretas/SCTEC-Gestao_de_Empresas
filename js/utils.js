/**
 * utils.js - Ferramentas de apoio, I/O de arquivos e Estilização
 */
const Utils = {
  obterConfigSegmento(segmento) {
    const configs = {
      Tecnologia: { bg: "#0d6efd", text: "#ffffff", border: "#0d6efd" },
      Indústria: { bg: "#9c27b0", text: "#ffffff", border: "#9c27b0" },
      Logística: { bg: "#ef6c00", text: "#ffffff", border: "#ef6c00" },
      Comércio: { bg: "#58a85cff", text: "#ffffff", border: "#2e7d32" },
      Serviços: { bg: "#8f0e00", text: "#ffffff", border: "#8f0e00" },
      Cliente: { bg: "#00838f", text: "#ffffff", border: "#00838f" },
      Transportes: { bg: "#602800", text: "#ffffff", border: "#451d00" },
      Fornecedor: { bg: "#cadd00", text: "#4b4b4b", border: "#b1c200" },
    };
    return (
      configs[segmento] || { bg: "#f8f9fa", text: "#212529", border: "#dee2e6" }
    );
  },

  aplicarMascaraDocumento(valor, tipo) {
    // Remove tudo que não é número para garantir pureza do dado
    let v = valor.replace(/\D/g, "");

    if (tipo === "PF") {
      // Máscara CPF: 000.000.000-00 (Máximo 11 dígitos numéricos)
      v = v.substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      // Máscara CNPJ: 00.000.000/0000-00 (Máximo 14 dígitos numéricos)
      v = v.substring(0, 14);
      v = v.replace(/^(\d{2})(\d)/, "$1.$2");
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
      v = v.replace(/(\d{4})(\d)/, "$1-$2");
    }
    return v;
  },

  aplicarMascaraTelefone(valor) {
    if (!valor) return "";
    valor = valor.replace(/\D/g, ""); // Remove tudo que não é número
    valor = valor.replace(/^(\)2)(\d)/g, "($1) $2"); // Coloca parênteses no DDD

    if (valor.length > 10) {
      // Formato Celular: (00) 00000-0000
      return valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else {
      // Formato Fixo: (00) 0000-0000
      return valor.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
    }
  },
  formatarDataHora(isoString) {
    if (!isoString) return "N/A";
    const data = new Date(isoString);
    return (
      data.toLocaleDateString("pt-BR") +
      " " +
      data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  },

  exportarCSV() {
    const dados = EmpreendimentoStorage.buscarTodos();
    if (dados.length === 0) return alert("Não há dados para exportar.");

    // 11 Colunas no cabeçalho
    const cabecalho = "Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes";
    const csvRows = [cabecalho];

    dados.forEach((item) => {
      const limpar = (texto) => (texto || "").toString().replace(/;/g, ",").replace(/\n/g, " ").trim();

      // MONTAGEM RIGOROSA DAS 11 COLUNAS
      const row = [
        limpar(item.nome),
        limpar(item.tipoPessoa || "PJ"), // Coluna 1
        limpar(item.registro),           // Coluna 2
        limpar(item.responsavel),        // Coluna 3
        limpar(item.email),              // Coluna 4
        limpar(item.telefone),           // Coluna 5
        limpar(item.endereco),           // Coluna 6
        limpar(item.municipio),          // Coluna 7
        limpar(item.segmento),           // Coluna 8
        limpar(item.status),             // Coluna 9
        limpar(item.observacoes)         // Coluna 10
      ];

      csvRows.push(row.join(";"));
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SCTEC_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },

  importarCSV(arquivo) {
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const conteudo = e.target.result;
      // Divide por quebras de linha e limpa linhas vazias
      const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");

      if (linhas.length <= 1) {
        return alert("O arquivo está vazio ou contém apenas o cabeçalho.");
      }

      const registrosNaBase = EmpreendimentoStorage.buscarTodos();
      const novosParaImportar = [];

      let totalNoArquivo = linhas.length - 1;
      let duplicadosEncontrados = 0;
      let errosLayout = 0;

      // Começamos em 1 para pular o cabeçalho
      for (let i = 1; i < linhas.length; i++) {
        // Divide por ponto e vírgula e remove aspas extras
        const colunas = linhas[i]
          .split(";")
          .map((c) => c.replace(/^"|"$/g, "").trim());

        // VALIDAÇÃO DE LAYOUT: 
        // O CSV deve ter 11 colunas conforme o exportarCSV (índices 0 a 10)
        if (colunas.length < 3 || !colunas[0] || !colunas[2]) {
          errosLayout++;
          continue;
        }

        const registroLido = colunas[2];
        const registroLimpo = registroLido.replace(/\D/g, "");

        // Verifica duplicidade no LocalStorage (Normalizado)
        const jaExisteNaBase = registrosNaBase.some(
          (r) => (r.registro || "").replace(/\D/g, "") === registroLimpo
        );

        // Verifica duplicidade dentro do próprio CSV (evita importar a mesma linha 2x)
        const jaEstaNaListaNova = novosParaImportar.some(
          (r) => (r.registro || "").replace(/\D/g, "") === registroLimpo
        );

        if (jaExisteNaBase || jaEstaNaListaNova) {
          duplicadosEncontrados++;
          continue;
        }

        // MAPEAMENTO RIGOROSO (Espelhado com o exportarCSV)
        novosParaImportar.push({
          nome: colunas[0],
          tipoPessoa: colunas[1] || "PJ", // Coluna 1
          registro: registroLido,           // Coluna 2
          responsavel: colunas[3] || "",    // Coluna 3
          email: colunas[4] || "",          // Coluna 4
          telefone: colunas[5] || "",       // Coluna 5
          endereco: colunas[6] || "",       // Coluna 6
          municipio: colunas[7] || "",      // Coluna 7
          segmento: colunas[8] || "Outros", // Coluna 8
          status: colunas[9] || "Ativo",    // Coluna 9
          observacoes: colunas[10] || ""    // Coluna 10
        });
      }

      // --- FEEDBACK AO USUÁRIO ---
      const resumo = `📊 RESUMO DA IMPORTAÇÃO\n` +
        `----------------------------------\n` +
        `📄 Registros no arquivo: ${totalNoArquivo}\n` +
        `⚠️ Duplicados ignorados: ${duplicadosEncontrados}\n` +
        `❌ Erros de estrutura: ${errosLayout}\n\n` +
        `📥 TOTAL A IMPORTAR: ${novosParaImportar.length}\n` +
        `----------------------------------\n` +
        `Confirma a inclusão no sistema?`;

      if (novosParaImportar.length > 0) {
        if (confirm(resumo)) {
          novosParaImportar.forEach((reg) => EmpreendimentoStorage.adicionar(reg));
          alert(`✅ Sucesso! ${novosParaImportar.length} registros importados.`);

          if (window.UIController) {
            window.UIController.renderizarLista();
          } else {
            location.reload();
          }
        }
      } else {
        alert("Nenhum registro novo encontrado para importar.");
      }
    };

    leitor.onerror = () => alert("Erro ao ler o arquivo.");
    leitor.readAsText(arquivo, "UTF-8");
  },

  baixarModeloCSV() {
    // Definição do cabeçalho esperado pelo sistema de importação
    const cabecalho =
      "Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes";
    // Linha de exemplo para orientar o usuário
    const exemplo =
      "Empresa Exemplo LTDA;PJ;00.000.000/0000-00;João Silva;admin@exemplo.com;(47) 99999-9999;Rua das Flores, 123;Joinville;Logística;Ativo;Exemplo de observação";

    const conteudo = [cabecalho, exemplo].join("\n");

    // \ufeff é o BOM (Byte Order Mark) para o Excel reconhecer acentos e caracteres especiais
    const blob = new Blob(["\ufeff" + conteudo], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_SCTEC.csv");
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("Modelo de planilha gerado com sucesso.");
  },
};

