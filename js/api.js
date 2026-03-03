/**
 * api.js - Serviço de integração com APIs externas
 */
const ApiService = {
    // Busca CEP na API do ViaCEP
    async buscarCep(cep) {
        // Remove caracteres não numéricos
        const cleanCep = cep.replace(/\D/g, '');
        
        if (cleanCep.length !== 8) return null;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                console.warn("CEP não encontrado.");
                return null;
            }
            return data;
        } catch (error) {
            console.error("Erro na requisição da API:", error);
            return null;
        }
    }
};

// Se você não estiver usando módulos (type="module"), 
// pode remover o 'export default' e apenas usar a constante global.
window.ApiService = ApiService;