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
    let v = valor.replace(/\D/g, "");
    if (tipo === "PF") {
      v = v.substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
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
    valor = valor.replace(/\D/g, "");
    if (valor.length > 10) {
      return valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    }
    return valor.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
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

  /**
   * Valida CNPJ pelo algoritmo dos dígitos verificadores da Receita Federal.
   * @param {string} cnpj - Com ou sem máscara
   * @returns {boolean}
   */
  validarCNPJ(cnpj) {
    const c = cnpj.replace(/\D/g, "");
    if (c.length !== 14) return false;
    // Rejeita sequências uniformes (00000000000000, 11111111111111 etc.)
    if (/^(\d)\1+$/.test(c)) return false;

    const calc = (digits, len) => {
      let sum = 0;
      let pos = len - 7;
      for (let i = len; i >= 1; i--) {
        sum += Number(digits.charAt(len - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return result;
    };

    const d1 = calc(c, 12);
    if (d1 !== Number(c.charAt(12))) return false;

    const d2 = calc(c, 13);
    return d2 === Number(c.charAt(13));
  },

  /**
   * Valida CPF pelo algoritmo dos dígitos verificadores da Receita Federal.
   * @param {string} cpf - Com ou sem máscara
   * @returns {boolean}
   */
  validarCPF(cpf) {
    const c = cpf.replace(/\D/g, "");
    if (c.length !== 11) return false;
    if (/^(\d)\1+$/.test(c)) return false;

    const calcDigito = (slice, peso) => {
      let sum = 0;
      for (let i = 0; i < slice.length; i++) {
        sum += Number(slice.charAt(i)) * (peso - i);
      }
      const resto = (sum * 10) % 11;
      return resto === 10 || resto === 11 ? 0 : resto;
    };

    const d1 = calcDigito(c.substring(0, 9), 10);
    if (d1 !== Number(c.charAt(9))) return false;

    const d2 = calcDigito(c.substring(0, 10), 11);
    return d2 === Number(c.charAt(10));
  },

  exportarCSV() {
    const dados = EmpreendimentoStorage.buscarTodos();
    if (dados.length === 0) return alert("Não há dados para exportar.");

    const cabecalho = "Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes";
    const csvRows = [cabecalho];

    dados.forEach((item) => {
      const limpar = (texto) => (texto || "").toString().replace(/;/g, ",").replace(/\n/g, " ").trim();
      const row = [
        limpar(item.nome),
        limpar(item.tipoPessoa || "PJ"),
        limpar(item.registro),
        limpar(item.responsavel),
        limpar(item.email),
        limpar(item.telefone),
        limpar(item.endereco),
        limpar(item.municipio),
        limpar(item.segmento),
        limpar(item.status),
        limpar(item.observacoes),
      ];
      csvRows.push(row.join(";"));
    });

    const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `SCTEC_Export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  },

  importarCSV(arquivo) {
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      const conteudo = e.target.result;
      const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim() !== "");

      if (linhas.length <= 1) {
        return alert("O arquivo está vazio ou contém apenas o cabeçalho.");
      }

      const registrosNaBase = EmpreendimentoStorage.buscarTodos();
      const novosParaImportar = [];

      const totalNoArquivo = linhas.length - 1;
      let duplicadosEncontrados = 0;
      let errosLayout = 0;

      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i]
          .split(";")
          .map((c) => c.replace(/^"|"$/g, "").trim());

        if (colunas.length < 3 || !colunas[0] || !colunas[2]) {
          errosLayout++;
          continue;
        }

        const registroLido = colunas[2];
        const registroLimpo = registroLido.replace(/\D/g, "");

        const jaExisteNaBase = registrosNaBase.some(
          (r) => (r.registro || "").replace(/\D/g, "") === registroLimpo
        );
        const jaEstaNaListaNova = novosParaImportar.some(
          (r) => (r.registro || "").replace(/\D/g, "") === registroLimpo
        );

        if (jaExisteNaBase || jaEstaNaListaNova) {
          duplicadosEncontrados++;
          continue;
        }

        novosParaImportar.push({
          nome: colunas[0],
          tipoPessoa: colunas[1] || "PJ",
          registro: registroLido,
          responsavel: colunas[3] || "",
          email: colunas[4] || "",
          telefone: colunas[5] || "",
          endereco: colunas[6] || "",
          municipio: colunas[7] || "",
          segmento: colunas[8] || "Outros",
          status: colunas[9] || "Ativo",
          observacoes: colunas[10] || "",
        });
      }

      const resumo =
        `📊 RESUMO DA IMPORTAÇÃO\n` +
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
    const cabecalho = "Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes";
    const exemplo = "Exemplo Empresa SC;PJ;00.000.000/0000-00;Philippe PH;contato@exemplo.com.br;(47) 99999-8888;Rua das Indústrias, 100;Joinville;Tecnologia;Ativo;Registro de teste para importação";

    const conteudo = [cabecalho, exemplo].join("\n");
    const blob = new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", "SCTEC_Modelo_Importacao.csv");
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("Modelo CSV gerado com sucesso.");
  },

  /**
   * Faz o backup completo do LocalStorage como arquivo JSON.
   * FEATURE-05
   */
  backupJSON() {
    const dados = EmpreendimentoStorage.buscarTodos();
    if (dados.length === 0) return alert("Não há dados para fazer backup.");

    const payload = {
      versao: "1.0",
      dataBackup: new Date().toISOString(),
      totalRegistros: dados.length,
      registros: dados,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", `SCTEC_Backup_${new Date().toISOString().split("T")[0]}.json`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Backup gerado: ${dados.length} registros.`);
  },

  /**
   * Restaura o backup de um arquivo JSON gerado por backupJSON().
   * FEATURE-05
   * @param {File} arquivo
   */
  restaurarJSON(arquivo) {
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      let payload;
      try {
        payload = JSON.parse(e.target.result);
      } catch {
        return alert("❌ Arquivo inválido. Selecione um backup gerado pelo SCTEC.");
      }

      if (!payload.registros || !Array.isArray(payload.registros)) {
        return alert("❌ Formato de backup inválido. O arquivo não contém registros.");
      }

      const total = payload.registros.length;
      const dataBackup = payload.dataBackup
        ? new Date(payload.dataBackup).toLocaleString("pt-BR")
        : "Data desconhecida";

      const confirmMsg =
        `📦 RESTAURAR BACKUP\n` +
        `----------------------------------\n` +
        `📅 Data do backup: ${dataBackup}\n` +
        `📄 Registros a restaurar: ${total}\n` +
        `----------------------------------\n` +
        `⚠️ ATENÇÃO: Isso substituirá TODOS os dados atuais.\n` +
        `Deseja continuar?`;

      if (!confirm(confirmMsg)) return;

      EmpreendimentoStorage.salvarTodos(payload.registros);
      alert(`✅ Backup restaurado! ${total} registros carregados.`);

      if (window.UIController) {
        window.UIController.renderizarLista();
      } else {
        location.reload();
      }
    };

    leitor.onerror = () => alert("Erro ao ler o arquivo de backup.");
    leitor.readAsText(arquivo, "UTF-8");
  },
};
