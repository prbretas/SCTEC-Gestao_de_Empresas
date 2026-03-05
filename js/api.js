/**
 * api.js - Serviço de integração com APIs externas
 */
const ApiService = {
    // Busca CEP na API do ViaCEP
 async buscarCep(cep) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        // Correção: Validar se a resposta do servidor foi 200 OK
        if (!response.ok) throw new Error("Falha na rede");
        
        const data = await response.json();
        if (data.erro) return null;
        return data;
    } catch (error) {
        console.error("Erro na API ViaCEP:", error);
        return null; // Retorno silencioso para não travar o formulário
    }
}
};

// Se você não estiver usando módulos (type="module"), 
// pode remover o 'export default' e apenas usar a constante global.
window.ApiService = ApiService;