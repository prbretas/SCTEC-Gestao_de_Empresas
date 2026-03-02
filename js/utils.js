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
    }
};