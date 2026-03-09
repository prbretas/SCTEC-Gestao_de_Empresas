const ApiService = {
  async buscarCep(cep) {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return null;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
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
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error("CNPJ não encontrado");
      return await response.json();
    } catch (err) {
      console.error("Erro BrasilAPI:", err);
      return null;
    }
  }
};
window.ApiService = ApiService;