/**
 * utils.js - Ferramentas de apoio, I/O de arquivos e Estilização
 */
const Utils = {
  obterConfigSegmento(segmento) {
    const configs = {
      Tecnologia: { bg: "#0d6efd", text: "#ffffff", border: "#0d6efd" },
      Indústria: { bg: "#9c27b0", text: "#ffffff", border: "#9c27b0" },
      Logística: { bg: "#ef6c00", text: "#ffffff", border: "#ef6c00" },
      Comércio: { bg: "#2e7d32", text: "#ffffff", border: "#2e7d32" },
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
      "Nome;TipoPessoa;Registro;Responsavel;Contato;Endereco;Municipio;Segmento;Status;Observacoes";
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
          limpar(item.contato),
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
      const linhas = conteudo.split(/\r?\n/);
      if (linhas.length <= 1) return alert("Arquivo vazio ou sem dados.");

      const registrosExistentes = EmpreendimentoStorage.buscarTodos();
      const novosRegistros = [];
      let duplicadosCont = 0;

      // Começa do 1 para pular o cabeçalho
      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].split(";");
        if (colunas.length < 9) continue; // Linha inválida

        const registroLimpo = colunas[2]?.trim();

        // Validação de Duplicidade (Regra de Ouro em ERP)
        const jaExiste =
          registrosExistentes.some((r) => r.registro === registroLimpo) ||
          novosRegistros.some((r) => r.registro === registroLimpo);

        if (jaExiste) {
          duplicadosCont++;
          continue;
        }

        novosRegistros.push({
          nome: colunas[0]?.trim(),
          tipoPessoa: colunas[1]?.trim(),
          registro: registroLimpo,
          responsavel: colunas[3]?.trim(),
          contato: colunas[4]?.trim(),
          endereco: colunas[5]?.trim(),
          municipio: colunas[6]?.trim(),
          segmento: colunas[7]?.trim(),
          status: colunas[8]?.trim(),
          observacoes: colunas[9]?.trim() || "",
        });
      }

      if (novosRegistros.length > 0) {
        if (
          confirm(
            `Deseja importar ${novosRegistros.length} novos registros?\n(${duplicadosCont} duplicados foram ignorados).`,
          )
        ) {
          novosRegistros.forEach((r) => EmpreendimentoStorage.adicionar(r));
          // Em vez de reload, chamamos a renderização se o UIController estiver disponível
          if (window.UIController) {
            window.UIController.renderizarLista();
          } else {
            location.reload();
          }
        }
      } else {
        alert(
          "Nenhum novo registro encontrado para importar (Todos já existem ou arquivo inválido).",
        );
      }
    };
    leitor.readAsText(arquivo, "UTF-8");
  },
};
