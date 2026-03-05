/**
 * api.js - Serviço de integração com APIs externas
 */
const ApiService = {
  // Busca CEP na API do ViaCEP
  async buscarCep(cep) {
    // 1. Sanitização rigorosa
    const cleanCep = cep.replace(/\D/g, "");

    // 2. Validação de integridade antes da requisição
    if (cleanCep.length !== 8) {
      console.warn("CEP Inválido: Formato incorreto.");
      return null;
    }

    try {
      // 3. Timeout para evitar que a UI trave em caso de lentidão da API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos

      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
        {
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const data = await response.json();

      // A API do ViaCEP retorna erro: true se o CEP não existir
      if (data.erro) {
        console.warn("CEP não encontrado na base de dados.");
        return null;
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Erro: A requisição ao ViaCEP excedeu o tempo limite.");
      } else {
        console.error("Erro na API ViaCEP:", error);
      }
      return null;
    }
  },
};

// Garante que o serviço esteja disponível globalmente para o forms.js
window.ApiService = ApiService;
