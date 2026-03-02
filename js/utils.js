/**
 * utils.js - Funções Utilitárias e Máscaras
 */

const Utils = {
    aplicarMascaraDocumento(valor, tipo) {
        valor = valor.replace(/\D/g, ""); 
        if (tipo === "CPF") {
            valor = valor.substring(0, 11);
            return valor
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d)/, "$1.$2")
                .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        } else {
            valor = valor.substring(0, 14);
            return valor
                .replace(/^(\d{2})(\d)/, "$1.$2")
                .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                .replace(/\.(\d{3})(\d)/, ".$1/$2")
                .replace(/(\d{4})(\d)/, "$1-$2");
        }
    },

    //Formata data ISO para padrão BR amigável
    formatarDataHora(isoString) {
        if (!isoString) return "N/A";
        const data = new Date(isoString);
        return data.toLocaleDateString('pt-BR') + ' ' + 
               data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
};