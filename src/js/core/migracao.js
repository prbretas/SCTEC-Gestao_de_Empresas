/**
 * migracao.js — Serviço de migração / portabilidade de dados (#144, Fase 4).
 *
 * Permite exportar e importar TODOS os dados de uma organização em um único
 * arquivo JSON, atravessando todas as coleções persistidas via StorageProvider
 * (crm, agenda, financeiro, entrada, produtos, propostas, etc.).
 *
 * Uso típico (tela "Fonte de Dados" do Admin):
 *   const json = MigracaoService.exportarTudo();      // string JSON p/ download
 *   MigracaoService.importarTudo(jsonString);         // restaura as coleções
 *
 * O serviço opera sobre o provider ativo através do fast-path síncrono
 * (`listSync`/`replaceAllSync`), então funciona tanto no modo local quanto em
 * qualquer provider futuro que suporte acesso síncrono. Sem provider, cai
 * direto no localStorage.
 */

const MigracaoService = {
  /** Versão do formato do arquivo de exportação. */
  FORMATO_VERSAO: 1,

  /**
   * Coleções conhecidas do sistema. Devem coincidir com os `_colecao`
   * declarados em cada *Storage e com as chaves SCTEC_{COLECAO}_{orgId}.
   */
  COLECOES: [
    "crm",
    "agenda",
    "financeiro",
    "entrada",
    "produtos",
    "propostas",
    "estoque",
    "enderecos",
    "filiais",
  ],

  /** Resolve o orgId da sessão atual (mesmo critério dos storages). */
  _orgId() {
    if (window.AuthService) {
      const s = AuthService.obterSessao();
      if (s) return s.orgId || s.id;
    }
    return "local";
  },

  _temProvider() {
    return !!(window.StorageProvider && typeof StorageProvider.listSync === "function");
  },

  /** Lê uma coleção (via provider, com fallback localStorage). */
  _lerColecao(colecao, orgId) {
    if (this._temProvider()) {
      try { return StorageProvider.listSync(colecao, orgId); } catch { /* fallback */ }
    }
    try {
      return JSON.parse(
        localStorage.getItem(`SCTEC_${String(colecao).toUpperCase()}_${orgId}`) || "[]"
      );
    } catch {
      return [];
    }
  },

  /** Grava uma coleção inteira (via provider, com fallback localStorage). */
  _gravarColecao(colecao, orgId, lista) {
    const dados = Array.isArray(lista) ? lista : [];
    if (this._temProvider()) {
      StorageProvider.replaceAllSync(colecao, orgId, dados);
      return;
    }
    localStorage.setItem(
      `SCTEC_${String(colecao).toUpperCase()}_${orgId}`,
      JSON.stringify(dados)
    );
  },

  /**
   * Exporta todos os dados da organização atual.
   * @param {string} [orgId] — organização alvo (padrão: sessão atual).
   * @returns {string} JSON serializado pronto para download.
   */
  exportarTudo(orgId) {
    const org = orgId || this._orgId();
    const colecoes = {};
    this.COLECOES.forEach((colecao) => {
      colecoes[colecao] = this._lerColecao(colecao, org);
    });
    const pacote = {
      formato: "sctec-export",
      versao: this.FORMATO_VERSAO,
      orgId: org,
      exportadoEm: new Date().toISOString(),
      colecoes,
    };
    return JSON.stringify(pacote, null, 2);
  },

  /**
   * Importa dados a partir de um pacote JSON (string ou objeto).
   * Substitui integralmente as coleções presentes no pacote.
   * @param {string|object} entrada — JSON exportado por `exportarTudo`.
   * @param {object} [opcoes]
   * @param {string} [opcoes.orgId] — sobrescreve o org de destino.
   * @returns {{ importadas: string[], totalRegistros: number }}
   */
  importarTudo(entrada, opcoes = {}) {
    let pacote;
    if (typeof entrada === "string") {
      pacote = JSON.parse(entrada);
    } else if (entrada && typeof entrada === "object") {
      pacote = entrada;
    } else {
      throw new Error("Entrada inválida: forneça o JSON exportado.");
    }

    if (!pacote || pacote.formato !== "sctec-export" || !pacote.colecoes) {
      throw new Error("Arquivo de importação inválido ou em formato desconhecido.");
    }

    const org = opcoes.orgId || this._orgId();
    const importadas = [];
    let totalRegistros = 0;

    Object.keys(pacote.colecoes).forEach((colecao) => {
      const lista = pacote.colecoes[colecao];
      if (!Array.isArray(lista)) return;
      this._gravarColecao(colecao, org, lista);
      importadas.push(colecao);
      totalRegistros += lista.length;
    });

    return { importadas, totalRegistros };
  },
};

window.MigracaoService = MigracaoService;
