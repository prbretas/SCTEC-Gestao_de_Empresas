# 🐛 Issues & Melhorias — SCTEC Gestão de Empreendimentos

> Documento gerado pela análise estática do código-fonte em Junho/2026.  
> Use este arquivo para criar as issues no GitHub com labels adequadas.

---

## 🔴 Bugs Críticos

---

### BUG-01 — Campo `tipoPessoa` não é persistido no LocalStorage

**Arquivo:** `index.html` + `forms.js`  
**Severidade:** 🔴 Alta  
**Labels sugeridas:** `bug`, `data-integrity`

**Descrição:**  
O elemento `<select id="tipo-pessoa">` não possui o atributo `name`, portanto o `FormData` coletado em `handleSave()` não captura este campo. Ao salvar, o campo `tipoPessoa` fica `undefined` no objeto persistido.

**Evidência no código (`index.html`):**
```html
<!-- ❌ Falta name="tipoPessoa" -->
<select id="tipo-pessoa" class="form-select" style="max-width: 70px">
```

**Impacto:**
- Exportação CSV sempre exibe "PJ" como fallback, independente do tipo cadastrado
- Lógica de máscara de documento e consulta CNPJ pode não funcionar em edições

**Correção:**
```html
<!-- ✅ Correto -->
<select id="tipo-pessoa" name="tipoPessoa" class="form-select" style="max-width: 70px">
```

---

### BUG-02 — Campo `SITUAÇÃO` nas Observações sempre exibe `undefined`

**Arquivo:** `forms.js` (linha ~56)  
**Severidade:** 🔴 Alta  
**Labels sugeridas:** `bug`, `api-integration`

**Descrição:**  
Em `forms.js`, na montagem do texto das observações, o código referencia `dados.descricao_situacao_cadastral`. Porém, em `api.js`, o campo é mapeado para `dados.situacao`. O campo original da API não é repassado no objeto padronizado retornado por `buscarCnpj()`.

**Evidência no código (`forms.js`):**
```javascript
// ❌ dados.descricao_situacao_cadastral não existe no objeto retornado
SITUAÇÃO: ${dados.descricao_situacao_cadastral || "N/A"}
```

**Objeto retornado por `api.js`:**
```javascript
{
  situacao: data.descricao_situacao_cadastral, // campo está aqui
  // ...
}
```

**Correção em `forms.js`:**
```javascript
// ✅ Usar o campo mapeado correto
SITUAÇÃO: ${dados.situacao || "N/A"}
```

---

### BUG-03 — Máscara de telefone com regex incorreta

**Arquivo:** `utils.js` (linha ~44)  
**Severidade:** 🔴 Alta  
**Labels sugeridas:** `bug`, `ux`

**Descrição:**  
A função `aplicarMascaraTelefone` possui uma regex com parêntese mal escapado que nunca corresponde a nenhum input, tornando o segundo `replace` completamente ineficaz.

**Evidência:**
```javascript
// ❌ Regex incorreta — (\)2) nunca corresponde a input real
valor = valor.replace(/^(\)2)(\d)/g, "($1) $2");
```

**Correção:**
```javascript
// ✅ Linha desnecessária — remover. Os dois replaces finais já cobrem todos os casos.
// Apenas remover a linha com a regex inválida.
aplicarMascaraTelefone(valor) {
  if (!valor) return "";
  valor = valor.replace(/\D/g, "");
  if (valor.length > 10) {
    return valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  }
  return valor.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
}
```

---

### BUG-04 — Referência a elemento `#qtd-sc` inexistente no HTML

**Arquivo:** `ui.js` (método `atualizarContadores`)  
**Severidade:** 🟡 Média  
**Labels sugeridas:** `bug`, `dead-code`

**Descrição:**  
O método `atualizarContadores` declara a variável `elSC` referenciando `document.querySelector("#qtd-sc")`. Este elemento não existe no HTML. O código não quebra (querySelector retorna null), mas gera confusão e indica que um indicador foi removido do HTML sem limpar o código JS.

**Evidência:**
```javascript
const elSC = document.querySelector("#qtd-sc"); // null — elemento não existe
// ...
// elSC nunca é usado após a declaração
```

**Correção:** Remover a declaração de `elSC` e qualquer uso associado.

---

### BUG-05 — Mensagem de validação com texto de desenvolvimento exposto

**Arquivo:** `forms.js` (método `handleSave`)  
**Severidade:** 🟡 Média  
**Labels sugeridas:** `bug`, `ux`

**Descrição:**  
A mensagem de alerta para campos obrigatórios contém o nome do desenvolvedor, o que é inadequado para um produto em produção.

**Evidência:**
```javascript
// ❌ Texto de desenvolvimento exposto ao usuário
alert("⚠️ PH, preencha os campos obrigatórios em destaque!");
```

**Correção:**
```javascript
// ✅ Mensagem genérica e profissional
alert("⚠️ Preencha os campos obrigatórios em destaque.");
```

---

## 🟡 Código Morto / Refatoração

---

### REFACTOR-01 — Função `validarFormulario()` nunca é chamada

**Arquivo:** `forms.js`  
**Severidade:** 🟡 Média  
**Labels sugeridas:** `refactor`, `dead-code`

**Descrição:**  
A função `validarFormulario()` em `forms.js` duplica exatamente a lógica de validação inline presente em `handleSave()`. Ela nunca é chamada em nenhum lugar do código.

**Correção:** Remover `validarFormulario()` ou substituir o bloco inline em `handleSave()` por uma chamada a ela (consolidação).

---

### REFACTOR-02 — Função `preencherForm()` nunca é chamada

**Arquivo:** `forms.js`  
**Severidade:** 🟡 Média  
**Labels sugeridas:** `refactor`, `dead-code`

**Descrição:**  
A função `preencherForm()` duplica exatamente o comportamento de `carregarDadosNoForm()`, que é a função efetivamente usada em `prepararVisualizacao()` e `prepararEdicao()`. `preencherForm()` nunca é invocada.

**Correção:** Remover `preencherForm()`.

---

### REFACTOR-03 — Função `renderizarComOrdem()` é redundante

**Arquivo:** `ui.js`  
**Severidade:** 🟢 Baixa  
**Labels sugeridas:** `refactor`, `dead-code`

**Descrição:**  
O método `renderizarComOrdem(listaOrdenada)` apenas delega para `renderizarLista(listaOrdenada)`. Não há uso distinto que justifique a existência deste método wrapper.

---

## 🟢 Novas Funcionalidades

---

### FEATURE-01 — Exibir sócios (QSA) nas Observações ao consultar CNPJ ⭐

**Arquivo:** `api.js` + `forms.js`  
**Prioridade:** 🔴 Alta  
**Labels sugeridas:** `enhancement`, `api-integration`

**Descrição:**  
A BrasilAPI retorna o array `qsa` (Quadro de Sócios e Administradores) na resposta da consulta de CNPJ. Atualmente este dado é ignorado. O usuário deseja que os sócios sejam exibidos no campo Observações.

**Campos disponíveis no `qsa[]`:**
- `nome_socio` — nome completo do sócio
- `qualificacao_socio` — ex: "Sócio-Administrador"
- `data_entrada_sociedade` — data no formato `YYYY-MM-DD`

**Implementação sugerida em `api.js`:**
```javascript
// Incluir no objeto retornado por buscarCnpj():
socios: data.qsa || []
```

**Implementação sugerida em `forms.js`:**
```javascript
// Na montagem das observações:
let secaoSocios = "";
if (dados.socios && dados.socios.length > 0) {
  secaoSocios = "\n\n--- QUADRO DE SÓCIOS (QSA) ---\n";
  dados.socios.forEach((socio, i) => {
    secaoSocios += `${i + 1}. ${socio.nome_socio}\n`;
    secaoSocios += `   Qualificação: ${socio.qualificacao_socio}\n`;
    secaoSocios += `   Entrada: ${socio.data_entrada_sociedade || "N/D"}\n`;
  });
  secaoSocios += "-------------------------------";
} else {
  secaoSocios = "\n\nSÓCIOS: Não informados na base da Receita Federal";
}
```

---

### FEATURE-02 — Feedback visual (loading) durante consultas de API

**Arquivo:** `forms.js`  
**Prioridade:** 🟡 Média  
**Labels sugeridas:** `enhancement`, `ux`

**Descrição:**  
Atualmente não há nenhuma indicação visual de que o sistema está consultando uma API externa. O usuário pode pensar que a ação travou ou clicar múltiplas vezes.

**Implementação sugerida:**
```javascript
// Antes do fetch
inputReg.disabled = true;
inputReg.placeholder = "Consultando CNPJ...";

// Após o fetch (finally)
inputReg.disabled = false;
inputReg.placeholder = "";
```

---

### FEATURE-03 — Validação de dígitos verificadores do CNPJ/CPF

**Arquivo:** `utils.js` (nova função) + `forms.js`  
**Prioridade:** 🟡 Média  
**Labels sugeridas:** `enhancement`, `data-integrity`

**Descrição:**  
O sistema aceita qualquer sequência de 14 dígitos como CNPJ válido, sem verificar os dígitos verificadores. Isso permite o cadastro de CNPJs inválidos e chamadas desnecessárias à API.

**Referência do algoritmo:** https://www.geradorcpf.com/algoritmo_do_cnpj.htm

---

### FEATURE-04 — Paginação da tabela

**Arquivo:** `ui.js` + `index.html`  
**Prioridade:** 🟡 Média  
**Labels sugeridas:** `enhancement`, `performance`

**Descrição:**  
Com mais de 200-300 registros, a renderização de todas as linhas do DOM impacta a performance. Implementar paginação simples (ex: 25/50/100 por página) ou virtualização.

---

### FEATURE-05 — Backup e Restore do LocalStorage

**Arquivo:** `utils.js` + `index.html`  
**Prioridade:** 🟡 Média  
**Labels sugeridas:** `enhancement`, `data-management`

**Descrição:**  
Não existe mecanismo de backup. Se o usuário limpar os dados do navegador ou mudar de dispositivo, toda a base é perdida. Adicionar botões de:
- **Backup:** Download de JSON com todos os dados
- **Restore:** Upload de JSON para restaurar a base

---

### FEATURE-06 — Confirmação ao fechar modal com dados não salvos

**Arquivo:** `forms.js` + `index.html`  
**Prioridade:** 🟢 Baixa  
**Labels sugeridas:** `enhancement`, `ux`

**Descrição:**  
Ao fechar o modal pelo botão "X" ou "Fechar" após preencher dados, não há aviso de perda. Adicionar listener no evento `hide.bs.modal` para verificar se o form foi modificado.

---

### FEATURE-07 — Sincronização entre abas do navegador

**Arquivo:** `ui.js`  
**Prioridade:** 🟢 Baixa  
**Labels sugeridas:** `enhancement`, `data-management`

**Descrição:**  
Se o usuário abrir o SCTEC em duas abas simultaneamente, as alterações feitas em uma aba não são refletidas na outra até recarregar. Implementar o evento `window.addEventListener("storage", ...)` para detectar mudanças no LocalStorage.

---

### FEATURE-08 — Acessibilidade (ARIA + navegação por teclado)

**Arquivo:** `index.html` + `css/styles.css`  
**Prioridade:** 🟢 Baixa  
**Labels sugeridas:** `accessibility`, `enhancement`

**Descrição:**  
- Botões de ação da tabela (✏️ e 🗑️) não possuem `aria-label`
- Colunas ordenáveis não possuem `aria-sort`
- Badges de status e segmento não possuem texto alternativo para leitores de tela

---

### FEATURE-09 — Validação de CNPJ/CPF na importação CSV

**Arquivo:** `utils.js` (método `importarCSV`)  
**Prioridade:** 🟢 Baixa  
**Labels sugeridas:** `enhancement`, `data-integrity`

**Descrição:**  
A importação valida apenas a existência da coluna e duplicidade, mas não verifica se o CNPJ/CPF é matematicamente válido. Documentos inválidos podem ser importados em massa.

---

## 📊 Resumo

| Categoria | Quantidade |
|---|---|
| 🔴 Bugs críticos | 3 |
| 🟡 Bugs médios / Refatoração | 5 |
| 🔴 Features prioritárias | 1 |
| 🟡 Features médias | 3 |
| 🟢 Features baixa prioridade | 4 |
| **Total** | **16** |

---

## 📋 Sugestão de Labels para o GitHub

```
bug           → Comportamento incorreto confirmado
enhancement   → Nova funcionalidade ou melhoria
refactor      → Limpeza de código sem mudança de comportamento
dead-code     → Código que nunca é executado
data-integrity → Problema relacionado à integridade dos dados
api-integration → Problema na integração com APIs externas
ux            → Experiência do usuário
performance   → Impacto em velocidade ou uso de recursos
accessibility → Conformidade com acessibilidade
data-management → Gestão de dados (backup, exportação, importação)
```
