/**
 * utils.js - Ferramentas de apoio, I/O de arquivos e Estilização
 */
const Utils = {
  obterConfigSegmento(segmento) {
    const configs = {
      Tecnologia: { bg: "#e7f1ff", text: "#0d6efd", border: "#0d6efd" },
      Indústria: { bg: "#f3e5f5", text: "#9c27b0", border: "#9c27b0" },
      Logística: { bg: "#fff3e0", text: "#ef6c00", border: "#ef6c00" },
      Comércio: { bg: "#e8f5e9", text: "#2e7d32", border: "#2e7d32" },
      Serviços: { bg: "#e0f7fa", text: "#00838f", border: "#00838f" },
    };
    return (
      configs[segmento] || { bg: "#f8f9fa", text: "#6c757d", border: "#dee2e6" }
    );
  },

  aplicarMascaraDocumento(valor, tipo) {
    valor = valor.replace(/\D/g, "");
    if (tipo === "CPF") {
      valor = valor.substring(0, 11);
      return valor
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      valor = valor.substring(0, 14);
      return valor
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
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

  // --- FUNÇÃO DE IMPORTAÇÃO RESTAURADA ---
  importarCSV(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const texto = e.target.result;
      const linhas = texto.split(/\r?\n/);
      const separador = linhas[0].includes(";") ? ";" : ",";

      const existentes = EmpreendimentoStorage.buscarTodos();
      const novosRegistros = [];
      let duplicadosCont = 0;

      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;

        const colunas = linhas[i]
          .split(separador)
          .map((c) => c.replace(/"/g, "").trim());
        const docImportado = colunas[2];

        // Trava de duplicidade
        const jaExiste =
          existentes.some((e) => e.documento === docImportado) ||
          novosRegistros.some((n) => n.documento === docImportado);

        if (jaExiste) {
          duplicadosCont++;
          continue;
        }

        novosRegistros.push({
          nome: colunas[0],
          tipoPessoa: colunas[1],
          documento: docImportado,
          responsavel: colunas[3],
          contato: colunas[4],
          endereco: colunas[5],
          municipio: colunas[6],
          segmento: colunas[7],
          status: colunas[8],
          observacoes: colunas[9] || "",
          dataAtualizacao: new Date().toISOString(),
        });
      }

      if (novosRegistros.length > 0) {
        if (
          confirm(
            `Importar ${novosRegistros.length} registros? (${duplicadosCont} duplicados ignorados).`,
          )
        ) {
          novosRegistros.forEach((r) => EmpreendimentoStorage.adicionar(r));
          location.reload();
        }
      } else {
        alert("Nenhum registro novo para importar.");
      }
    };
    leitor.readAsText(arquivo, "UTF-8");
  },

  // --- FUNÇÃO DE EXPORTAÇÃO RESTAURADA ---
  exportarCSV() {
    const dados = EmpreendimentoStorage.buscarTodos();
    if (dados.length === 0) return alert("Não há dados para exportar.");

    const cabecalho =
      "Nome;TipoPessoa;Documento;Responsavel;Contato;Endereco;Municipio;Segmento;Status;Observacoes";
    const csvRows = [cabecalho];

    dados.forEach((item) => {
      csvRows.push(
        `${item.nome};${item.tipoPessoa};${item.documento};${item.responsavel};${item.contato};${item.endereco};${item.municipio};${item.segmento};${item.status};${(item.observacoes || "").replace(/;/g, ",")}`,
      );
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `sctec_backup_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
