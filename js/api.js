/**
 * Consulta dados de empresa via CNPJ
 * @param {string} cnpj - Apenas números
 * @returns {Promise<Object>} Dados da empresa incluindo CNAE
 */

const ApiService = {
  async buscarCep(cep) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );
      const data = await response.json();
      return data.erro ? null : data;
    } catch (err) {
      console.error("Erro ViaCEP:", err);
      return null;
    }
  },

  async buscarCnpj(cnpj) {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      );
      if (!response.ok) throw new Error("CNPJ não encontrado");

      const data = await response.json();

      // Criamos um objeto padronizado para evitar erros de campos inexistentes
      return {
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || "Não possui nome fantasia",
        // BrasilAPI usa data_inicio_atividade
        data_abertura: data.data_inicio_atividade || "Não informada",
        situacao: data.descricao_situacao_cadastral || "N/A",
        sugestaoSetor:
          data.cnae_fiscal_descricao || "Atividade não identificada",
        // Mantemos o resto para os contadores e preenchimento de endereço
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        municipio: data.municipio,
        uf: data.uf,
      };
    } catch (err) {
      console.error("Erro BrasilAPI:", err);
      return null;
    }
  },
};
window.ApiService = ApiService;
