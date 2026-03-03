/**
 * utils.js - Ferramentas de apoio, I/O de arquivos e Estilização
 */
const Utils = {
  obterConfigSegmento(segmento) {
    const configs = {
      Tecnologia: { bg: "#0d6efd", text: "#e7f1ff", border: "#0d6efd" },
      Indústria: { bg: "#9c27b0", text: "#f3e5f5", border: "#9c27b0" },
      Logística: { bg: "#ef6c00", text: "#fff3e0", border: "#ef6c00" },
      Comércio: { bg: "#2e7d32", text: "#e8f5e9", border: "#2e7d32" },
      Serviços: { bg: "#8f0e00ff", text: "#fae0e0ff", border: "#8f0e00ff" },
      Cliente: { bg: "#00838f", text: "#e0f7fa", border: "#00838f" },
      Transportes: { bg: "#602800ff", text: "#faeee0ff", border: "#451d00ff" },
      Fornecedor: { bg: "#cadd00ff", text: "#4b4b4bff", border: "#b1c200ff" },
    };
    return (
      configs[segmento] || { bg: "#f8f9fa", text: "#6c757d", border: "#dee2e6" }
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
          existentes.some((e) => e.registro === docImportado) ||
          novosRegistros.some((n) => n.registro === docImportado);

        if (jaExiste) {
          duplicadosCont++;
          continue;
        }

        novosRegistros.push({
          nome: colunas[0],
          tipoPessoa: colunas[1],
          registro: docImportado,
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
      "Nome;TipoPessoa;Registro;Responsavel;Contato;Endereco;Municipio;Segmento;Status;Observacoes";
    const csvRows = [cabecalho];

    dados.forEach((item) => {
      csvRows.push(
        `${item.nome};${item.tipoPessoa};${item.registro};${item.responsavel};${item.contato};${item.endereco};${item.municipio};${item.segmento};${item.status};${(item.observacoes || "").replace(/;/g, ",")}`,
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
