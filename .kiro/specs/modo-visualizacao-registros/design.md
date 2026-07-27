# Design: Modo Visualização nos Registros — Issue #43

## Visão Geral

Todos os 4 módulos independentes (CRM, Financeiro, Agenda, Propostas) abrem o modal direto em modo edição. O módulo Cadastros já tem `FormController.prepararVisualizacao()` e `setReadOnly()` como referência. O objetivo é implementar o padrão em todos os módulos de forma consistente.

## Padrão de Implementação

Cada módulo terá uma função `_setModo(modo)` que alterna entre `"visualizacao"` e `"edicao"`:

```js
function _setModo(modo) {
  const form = document.getElementById("form-{modulo}");
  const campos = form.querySelectorAll("input, select, textarea");
  const btnSalvar = document.getElementById("btn-salvar-{modulo}");
  const btnEditar = document.getElementById("btn-editar-{modulo}");

  if (modo === "visualizacao") {
    campos.forEach((c) => {
      c.style.backgroundColor = "#e9ecef";
      c.style.cursor = "not-allowed";
      if (c.tagName === "SELECT") c.style.pointerEvents = "none";
      else c.readOnly = true;
    });
    btnSalvar?.classList.add("d-none");
    btnEditar?.classList.remove("d-none");
    form.dataset.modoVisualizacao = "true";
  } else {
    campos.forEach((c) => {
      c.style.backgroundColor = "";
      c.style.cursor = "default";
      c.style.pointerEvents = "auto";
      c.readOnly = false;
    });
    btnSalvar?.classList.remove("d-none");
    btnEditar?.classList.add("d-none");
    form.dataset.modoVisualizacao = "";
  }
}
```

## Controle de Dirty (alterações não salvas)

O modal do modal do `hide.bs.modal` event deve checar se está em modo edição antes de confirmar:

```js
modalEl.addEventListener("hide.bs.modal", (e) => {
  const form = document.getElementById("form-{modulo}");
  if (form.dataset.modoVisualizacao !== "true" && form.dataset.editId) {
    if (!confirm("Deseja descartar as alterações?")) {
      e.preventDefault();
    }
  }
});
```

## Fluxo de Estados

```
Clicar no card → visualizarXxx(id)
  └─> _setModo("visualizacao")
        └─> campos desabilitados
        └─> btn-salvar oculto
        └─> btn-editar visível

Clicar em Editar → _setModo("edicao")
  └─> campos habilitados
  └─> btn-salvar visível
  └─> btn-editar oculto

Clicar em Salvar → persistir → _setModo("visualizacao")
  └─> volta para modo visualização com dados atualizados

Clicar em Fechar (visualização) → fecha sem confirmação
Clicar em Fechar (edição) → confirma descarte → fecha
```

## Botões nos HTMLs

Cada modal precisa ter o botão "Editar" já no HTML, com classe `d-none` por padrão (fica visível ao entrar em modo visualização):

```html
<button type="button" class="btn btn-primary d-none" id="btn-editar-{modulo}">✏️ Editar</button>
<button type="submit" form="form-{modulo}" class="btn btn-success" id="btn-salvar-{modulo}">Salvar</button>
```

## Mudanças por Módulo

### CRM (`crm.js` + `crm.html`)
- Renomear `abrirEdicao()` para `visualizarOportunidade()` — abre em modo visualização
- Adicionar `_crmSetModo(modo)` 
- Adicionar botão `#btn-editar-oportunidade` no modal do `crm.html`
- Listener do `DOMContentLoaded` adiciona evento no btn-editar e no hide.bs.modal
- Novo registro abre diretamente em modo edição

### Financeiro (`financeiro.js` + `financeiro.html`)
- Renomear `editarTransacao()` para `visualizarTransacao()` — abre em modo visualização
- Adicionar `_finSetModo(modo)`
- Adicionar botão `#btn-editar-transacao` no modal do `financeiro.html`
- Listener de submit após salvar chama `_finSetModo("visualizacao")` e mantém modal aberto
- Novo registro abre em modo edição

### Agenda (`agenda.js` + `agenda.html`)
- Renomear `editarCompromisso()` para `visualizarCompromisso()` — abre em modo visualização
- Adicionar `_agendaSetModo(modo)`
- Adicionar botão `#btn-editar-compromisso` no modal do `agenda.html`
- Novo registro abre em modo edição

### Propostas (`propostas.js` + `propostas.html`)
- `visualizarProposta()` já existe — adaptar para usar `_propSetModo("visualizacao")`
- Adicionar `_propSetModo(modo)`
- Adicionar botão `#btn-editar-proposta` no modal do `propostas.html` (se não existe)
- Novo registro abre em modo edição

### Cadastros (`forms.js` — referência, ajuste menor)
- `prepararVisualizacao()` já correto — verificar que `setReadOnly(true)` usa o padrão de estilo
- `prepararEdicao()` abre em modo edição — manter comportamento

## Notas de Implementação

- O `modal.hide()` após salvar deve ser substituído por `_setModo("visualizacao")` para manter o modal aberto e exibir os dados salvos
- No Financeiro, a lista de transações usa botão `✏️` inline — muda para `👁️` que chama `visualizarTransacao()`
- No CRM, o kanban usa `onclick="abrirEdicao(...)"` nos cards — mudar para `onclick="visualizarOportunidade(...)"`
- Na Agenda, os cards usam `onclick="editarCompromisso(...)"` — mudar para `onclick="visualizarCompromisso(...)"`
