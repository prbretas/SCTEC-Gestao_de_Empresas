/**
 * utils.js - Funções Utilitárias e I/O de Arquivos
 */
const Utils = {
    // Máscara para CPF/CNPJ
    aplicarMascaraDocumento(valor, tipo) {
        valor = valor.replace(/\D/g, ""); 
        if (tipo === "CPF") {
            valor = valor.substring(0, 11);
            return valor.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        } else {
            valor = valor.substring(0, 14);
            return valor.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
        }
    },

    formatarDataHora(isoString) {
        if (!isoString) return "N/A";
        const data = new Date(isoString);
        return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },

    // --- EXPORTAÇÃO (Gera CSV compatível com Excel BR) ---
    exportarCSV() {
        const dados = EmpreendimentoStorage.buscarTodos();
        if (dados.length === 0) return alert("Não há dados para exportar.");

        const cabecalho = ["ID", "Nome", "TipoPessoa", "Documento", "Responsavel", "Contato", "Endereco", "Municipio", "Segmento", "Status", "Observacoes"];
        const csvRows = [cabecalho.join(";")]; // Usando ponto-e-vírgula por padrão

        dados.forEach(item => {
            const row = [
                item.id,
                `"${item.nome}"`,
                item.tipoPessoa,
                item.documento,
                `"${item.responsavel}"`,
                item.contato,
                `"${item.endereco}"`,
                `"${item.municipio}"`,
                item.segmento,
                item.status,
                `"${(item.observacoes || "").replace(/\n/g, " ")}"`
            ];
            csvRows.push(row.join(";"));
        });

        const blob = new Blob(["\ufeff" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sctec_export_${Date.now()}.csv`;
        a.click();
    },

    baixarModeloCSV() {
        const cabecalho = "Nome;TipoPessoa(CPF/CNPJ);Documento;Responsavel;Contato;Endereco;Municipio;Segmento;Status;Observacoes";
        const exemplo = "Exemplo Logística;CNPJ;00.000.000/0000-00;PH;ph@sctec.com;Rua SC, 10;Joinville;Logística;Ativo;Teste de importação";
        const blob = new Blob(["\ufeff" + cabecalho + "\n" + exemplo], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "modelo_sctec.csv";
        a.click();
    },

    // --- IMPORTAÇÃO COM DETECÇÃO AUTOMÁTICA DE SEPARADOR ---
    importarCSV(event) {
        const arquivo = event.target.files[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = (e) => {
            const texto = e.target.result;
            const linhas = texto.split(/\r?\n/);
            if (linhas.length < 2) return alert("Arquivo vazio ou inválido.");

            // Inteligência: Detecta se o arquivo usa , ou ;
            const primeiraLinha = linhas[0];
            const separador = primeiraLinha.includes(";") ? ";" : ",";
            
            const novosRegistros = [];
            for (let i = 1; i < linhas.length; i++) {
                if (!linhas[i].trim()) continue;
                const colunas = linhas[i].split(separador);
                
                novosRegistros.push({
                    nome: colunas[0]?.replace(/"/g, ""),
                    tipoPessoa: colunas[1],
                    documento: colunas[2],
                    responsavel: colunas[3]?.replace(/"/g, ""),
                    contato: colunas[4],
                    endereco: colunas[5]?.replace(/"/g, ""),
                    municipio: colunas[6]?.replace(/"/g, ""),
                    segmento: colunas[7],
                    status: colunas[8],
                    observacoes: colunas[9]?.replace(/"/g, ""),
                    dataAtualizacao: new Date().toISOString()
                });
            }

            if (confirm(`Detectamos ${novosRegistros.length} registros usando separador "${separador}". Confirmar importação?`)) {
                novosRegistros.forEach(r => EmpreendimentoStorage.adicionar(r));
                window.location.reload(); 
            }
        };
        leitor.readAsText(arquivo);
    }
};