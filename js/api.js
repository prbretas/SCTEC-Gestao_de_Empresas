/**
 * api.js - Serviço de integração com APIs externas
 */
const ApiService = {
  // Busca CEP na API do ViaCEP
  async buscarCep(cep) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const data = await response.json();
      return data.erro ? null : data;
    } catch (error) {
      console.error("Erro na API ViaCEP:", error);
      return null;
    }
  },

  // ---Busca CNPJ na BrasilAPI ---
  async buscarCnpj(cnpj) {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return null;

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro ao buscar CNPJ:", error);
      return null;
    }
  }
};

window.ApiService = ApiService;