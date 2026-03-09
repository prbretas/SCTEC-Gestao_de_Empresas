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

  formatarDataHora(isoString) {
    if (!isoString) return "N/A";
    const data = new Date(isoString);
    return (
      data.toLocaleDateString("pt-BR") +
      " " +
      data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    );
  },

  // --- FUNÇÃO DE EXPORTAÇÃO ---
  exportarCSV() {
    const dados = EmpreendimentoStorage.buscarTodos();
    if (dados.length === 0) return alert("Não há dados para exportar.");

    // Cabeçalho idêntico ao esperado na importação
    const cabecalho =
      "Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes";
    const csvRows = [cabecalho];

    dados.forEach((item) => {
      //Remove pontos e vírgulas e quebras de linha para não quebrar o CSV
      const limpar = (texto) =>
        (texto || "").toString().replace(/;/g, ",").replace(/\n/g, " ");

      csvRows.push(
        [
          limpar(item.nome),
          limpar(item.tipoPessoa),
          limpar(item.registro),
          limpar(item.responsavel),
          limpar(item.email),
          limpar(item.telefone),
          limpar(item.endereco),
          limpar(item.municipio),
          limpar(item.segmento),
          limpar(item.status),
          limpar(item.observacoes),
        ].join(";"),
      );
    });

    // \ufeff garante que o Excel entenda como UTF-8
    const blob = new Blob(["\ufeff" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SCTEC_Export_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`;
    link.click();
  },

  importarCSV(arquivo) {
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const conteudo = e.target.result;
      // Divide por quebra de linha e remove linhas vazias ou apenas com espaços
      const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");

      if (linhas.length <= 1) {
        return alert("O arquivo está vazio ou contém apenas o cabeçalho.");
      }

      const registrosNaBase = EmpreendimentoStorage.buscarTodos();
      const novosParaImportar = [];

      let totalNoArquivo = linhas.length - 1; // Desconsidera cabeçalho
      let duplicadosEncontrados = 0;
      let errosLayout = 0;

      // Itera sobre as linhas de dados
      for (let i = 1; i < linhas.length; i++) {
        // Limpa aspas e espaços extras
        const colunas = linhas[i]
          .split(";")
          .map((c) => c.replace(/^"|"$/g, "").trim());

        // Validação de layout: Nome, Tipo e Registro são obrigatórios (Colunas 0, 1 e 2)
        if (colunas.length < 3 || !colunas[0] || !colunas[2]) {
          errosLayout++;
          continue;
        }

        const registroLido = colunas[2];

        // Verifica se o CPF/CNPJ já existe na base do LocalStorage
        const jaExisteNaBase = registrosNaBase.some(
          (r) => r.registro === registroLido,
        );

        // Verifica se já não estamos adicionando ele nesta mesma importação (evita duplicados no próprio CSV)
        const jaEstaNaListaNova = novosParaImportar.some(
          (r) => r.registro === registroLido,
        );

        if (jaExisteNaBase || jaEstaNaListaNova) {
          duplicadosEncontrados++;
          continue;
        }

        // Mapeia o objeto conforme o modelo do sistema
        novosParaImportar.push({
          nome: colunas[0],
          tipoPessoa: colunas[1] || "PJ",
          registro: registroLido,
          responsavel: colunas[3] || "",
          email: colunas[4] || "",
          telefone: colunas[4] || "",
          endereco: colunas[5] || "",
          municipio: colunas[6] || "",
          segmento: colunas[7] || "Outros",
          status: colunas[8] || "Ativo",
          observacoes: colunas[9] || "",
        });
      }

      // --- CONSTRUÇÃO DO ALERTA DE CONFIRMAÇÃO ---
      const resumoMensagem =
        `📊 RESUMO DA IMPORTAÇÃO\n` +
        `----------------------------------\n` +
        `📄 Registros encontrados no arquivo: ${totalNoArquivo}\n` +
        `⚠️ Registros já existentes na base: ${duplicadosEncontrados} (não serão importados)\n` +
        `❌ Erros de layout/inválidos: ${errosLayout}\n\n` +
        `📥 TOTAL A SER IMPORTADO: ${novosParaImportar.length}\n` +
        `----------------------------------\n` +
        `Deseja confirmar o processamento destes dados?`;

      if (novosParaImportar.length > 0) {
        // O comando 'confirm' do JS já gera os botões "OK" (Aprovar) e "Cancelar"
        if (confirm(resumoMensagem)) {
          novosParaImportar.forEach((reg) =>
            EmpreendimentoStorage.adicionar(reg),
          );

          alert(
            `✅ Sucesso! ${novosParaImportar.length} registros foram importados.`,
          );

          // Atualiza a tela se o controller estiver disponível
          if (window.UIController) {
            window.UIController.renderizarLista();
          } else {
            location.reload();
          }
        } else {
          console.log("Importação cancelada pelo usuário.");
        }
      } else {
        alert(
          `Nenhum registro novo para importar!\n\n` +
            `- Total no arquivo: ${totalNoArquivo}\n` +
            `- Duplicados: ${duplicadosEncontrados}\n` +
            `- Erros: ${errosLayout}`,
        );
      }
    };

    leitor.onerror = () => alert("Erro ao ler o arquivo selecionado.");
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

