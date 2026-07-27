# Tasks: Modo Visualização nos Registros — Issue #43

- [ ] 1. Implementar modo visualização no módulo CRM (`crm.js` + `crm.html`)
  - Adicionar função `_crmSetModo(modo)` que alterna campos e botões entre visualização/edição
  - Renomear `abrirEdicao(id)` para `visualizarOportunidade(id)` e fazer abrir em modo visualização
  - Adicionar botão `#btn-editar-oportunidade` no modal de `crm.html` com classe `d-none`
  - Conectar evento `click` do btn-editar para chamar `_crmSetModo("edicao")`
  - Adicionar listener `hide.bs.modal` com confirmação apenas no modo edição
  - Novo registro (`btn-nova-oportunidade`) deve abrir em modo edição direto
  - Submit do form salva, fecha modal e re-renderiza o kanban
  - Atualizar cards do kanban: `onclick` usa `visualizarOportunidade` em vez de `abrirEdicao`

- [ ] 2. Implementar modo visualização no módulo Financeiro (`financeiro.js` + `financeiro.html`)
  - Adicionar função `_finSetModo(modo)` que alterna campos e botões
  - Renomear `editarTransacao(id)` para `visualizarTransacao(id)` e fazer abrir em modo visualização
  - Adicionar botão `#btn-editar-transacao` no modal de `financeiro.html` com classe `d-none`
  - Conectar evento `click` do btn-editar para chamar `_finSetModo("edicao")`
  - Adicionar listener `hide.bs.modal` com confirmação apenas no modo edição
  - Novo registro abre em modo edição; após salvar retorna ao modo visualização mantendo modal aberto
  - Atualizar tabela: botão de ação inline passa a chamar `visualizarTransacao(id)` com ícone `👁️`

- [ ] 3. Implementar modo visualização no módulo Agenda (`agenda.js` + `agenda.html`)
  - Adicionar função `_agendaSetModo(modo)` que alterna campos e botões
  - Renomear `editarCompromisso(id)` para `visualizarCompromisso(id)` e fazer abrir em modo visualização
  - Adicionar botão `#btn-editar-compromisso` no modal de `agenda.html` com classe `d-none`
  - Conectar evento `click` do btn-editar para chamar `_agendaSetModo("edicao")`
  - Adicionar listener `hide.bs.modal` com confirmação apenas no modo edição
  - Novo registro abre em modo edição
  - Atualizar cards da lista: `onclick` usa `visualizarCompromisso` em vez de `editarCompromisso`

- [ ] 4. Implementar modo visualização no módulo Propostas (`propostas.js` + `propostas.html`)
  - Adicionar função `_propSetModo(modo)` que alterna campos, botões e btn-add-item
  - Verificar se `visualizarProposta(id)` já abre em modo visualização; se não, corrigir
  - Adicionar botão `#btn-editar-proposta` no modal de `propostas.html` com classe `d-none` (se não existe)
  - Conectar evento `click` do btn-editar para chamar `_propSetModo("edicao")`
  - Adicionar listener `hide.bs.modal` com confirmação apenas no modo edição
  - Novo registro abre em modo edição
  - Botão de ver (`👁️ Ver`) nos cards deve chamar `visualizarProposta(id)` em modo visualização

- [ ] 5. Verificar e padronizar módulo Cadastros (`forms.js`)
  - Confirmar que `prepararVisualizacao(id)` usa estilo visual consistente com os outros módulos (fundo `#e9ecef`, cursor `not-allowed`)
  - Confirmar que `prepararEdicao(id)` libera campos corretamente
  - Confirmar que o listener `hide.bs.modal` em `ui.js`/`main.js` verifica modo antes de confirmar

- [ ] 6. Executar suite de testes e commitar
  - Rodar `npm test` e garantir 0 falhas
  - Commitar todas as mudanças na branch `feature/43-modo-visualizacao-todos-modulos`
  - Push e linkar ao PR com `Closes #43`
