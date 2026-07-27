# Documento de Requisitos

## Introdução

Esta feature implementa o **Modo Visualização (somente leitura)** como comportamento padrão ao abrir qualquer registro nos módulos do sistema SCTEC Gestão de Empreendimentos. Atualmente, clicar em qualquer card/registro abre o modal diretamente em modo edição. O novo padrão consiste em abrir sempre em modo visualização, com os campos travados, e liberar a edição apenas quando o usuário solicitar explicitamente clicando em "Editar". O comportamento deve ser padronizado nas cinco rotinas afetadas: Propostas, CRM, Agenda, Financeiro e Cadastros.

## Glossário

- **Modal**: Janela sobreposta ao conteúdo principal usada para exibir ou editar um registro.
- **Modo Visualização**: Estado do modal em que todos os campos estão desabilitados/somente leitura e nenhuma alteração pode ser feita.
- **Modo Edição**: Estado do modal em que os campos estão liberados para entrada de dados pelo usuário.
- **ModoController**: Componente lógico (por módulo ou compartilhado) responsável por alternar o estado do modal entre Modo Visualização e Modo Edição.
- **FormController**: Controlador existente em `forms.js` (módulo Cadastros) que já implementa `setReadOnly()` e `prepararVisualizacao()` como referência de padrão a ser seguido.
- **Módulos afetados**: CRM (`crm.js`), Financeiro (`financeiro.js`), Agenda (`agenda.js`), Propostas (`propostas.js`) e Cadastros (`forms.js`).
- **dirty**: Estado interno do formulário indicando que há alterações não salvas desde a última abertura em modo edição.
- **btn-salvar-{modulo}**: Convenção de ID para o botão Salvar de cada módulo (ex.: `btn-salvar-crm`, `btn-salvar-financeiro`).
- **btn-editar-{modulo}**: Convenção de ID para o botão Editar de cada módulo (ex.: `btn-editar-crm`, `btn-editar-financeiro`).

---

## Requisitos

### Requisito 1 — Abertura padrão em modo visualização

**User Story:** Como usuário do sistema, quero que ao clicar em qualquer card ou registro o modal abra em modo visualização, para que eu não altere dados acidentalmente ao apenas consultar um registro.

#### Critérios de Aceite

1. WHEN o usuário clica em um card ou registro existente em qualquer módulo, THE Modal SHALL abrir exibindo os dados do registro com todos os campos no estado desabilitado (disabled/readonly).
2. WHEN o Modal abre em modo visualização, THE ModoController SHALL exibir o botão "Editar" e ocultar o botão "Salvar".
3. WHEN o Modal abre em modo visualização, THE ModoController SHALL definir o estado interno como "visualização" (não-dirty).
4. THE ModoController SHALL aplicar o modo visualização sem abrir um modal secundário separado — a alternância de modo ocorre dentro do mesmo modal já aberto.

---

### Requisito 2 — Transição para modo edição

**User Story:** Como usuário do sistema, quero poder clicar em "Editar" dentro do modal de visualização para liberar os campos e salvar alterações, para que a edição seja uma ação explícita e intencional.

#### Critérios de Aceite

1. WHEN o usuário clica no botão "Editar" no modal em modo visualização, THE ModoController SHALL habilitar todos os campos do formulário para entrada de dados.
2. WHEN o ModoController transita para modo edição, THE Modal SHALL ocultar o botão "Editar" e exibir o botão "Salvar".
3. WHEN o ModoController transita para modo edição, THE Modal SHALL manter todos os dados já preenchidos nos campos, sem resetar o formulário.
4. WHEN o usuário altera qualquer campo no modo edição, THE ModoController SHALL registrar o estado interno como dirty.

---

### Requisito 3 — Botão Fechar no modo visualização

**User Story:** Como usuário do sistema, quero que o botão "Fechar" no modo visualização feche o modal diretamente sem pedir confirmação, para que a consulta de registros seja ágil e sem fricção.

#### Critérios de Aceite

1. WHEN o usuário clica em "Fechar" enquanto o modal está em modo visualização, THE Modal SHALL fechar imediatamente sem exibir nenhuma mensagem de confirmação.
2. WHEN o Modal é fechado no modo visualização, THE ModoController SHALL descartar quaisquer dados temporários sem persistência.

---

### Requisito 4 — Botão Fechar no modo edição

**User Story:** Como usuário do sistema, quero que o botão "Fechar" no modo edição exiba uma confirmação antes de fechar, para que eu não perca alterações feitas acidentalmente.

#### Critérios de Aceite

1. WHEN o usuário clica em "Fechar" enquanto o modal está em modo edição e o estado interno é dirty, THE Modal SHALL exibir uma mensagem de confirmação com o texto "Deseja descartar as alterações?".
2. WHEN o usuário confirma o descarte na mensagem de confirmação, THE Modal SHALL fechar e descartar todas as alterações não salvas.
3. WHEN o usuário cancela o descarte na mensagem de confirmação, THE Modal SHALL permanecer aberto no modo edição com os dados preservados.
4. WHEN o usuário clica em "Fechar" no modo edição mas o estado interno não é dirty (nenhuma alteração foi feita), THE Modal SHALL fechar diretamente sem exibir mensagem de confirmação.

---

### Requisito 5 — Salvar e retornar ao modo visualização

**User Story:** Como usuário do sistema, quero que após salvar um registro o modal retorne automaticamente ao modo visualização, para que eu possa conferir os dados salvos antes de fechar.

#### Critérios de Aceite

1. WHEN o usuário clica em "Salvar" e os dados são válidos e persistidos com sucesso, THE ModoController SHALL transitar o modal de volta para o modo visualização.
2. WHEN o ModoController retorna para o modo visualização após salvar, THE Modal SHALL exibir o botão "Editar", ocultar o botão "Salvar" e travar todos os campos novamente.
3. WHEN o ModoController retorna para o modo visualização após salvar, THE ModoController SHALL limpar o estado dirty.
4. IF a validação dos dados falha ao tentar salvar, THEN THE Modal SHALL permanecer no modo edição com os dados preenchidos e exibir a mensagem de erro correspondente.

---

### Requisito 6 — Padronização entre módulos

**User Story:** Como desenvolvedor do sistema, quero que o comportamento de modo visualização/edição seja padronizado em todas as cinco rotinas afetadas, para que a experiência do usuário seja consistente em todo o sistema.

#### Critérios de Aceite

1. THE ModoController SHALL implementar a alternância de modo visualização/edição nos módulos CRM (`crm.js`), Financeiro (`financeiro.js`), Agenda (`agenda.js`) e Propostas (`propostas.js`), seguindo o mesmo padrão já existente em `FormController` do módulo Cadastros (`forms.js`).
2. WHEN qualquer módulo aplica o modo visualização, THE ModoController SHALL aplicar estilo visual consistente aos campos desabilitados (fundo `#e9ecef`, cursor `not-allowed` para inputs/textareas; `pointer-events: none` para selects).
3. THE ModoController SHALL utilizar as convenções de ID já estabelecidas no HTML de cada módulo: `btn-salvar-{modulo}` e `btn-editar-{modulo}`.
4. WHEN o módulo Cadastros já possui comportamento similar implementado via `FormController`, THE FormController SHALL ser revisado para garantir que segue integralmente o mesmo padrão definido nesta spec, sem regressões.

---

### Requisito 7 — Abertura de novo registro

**User Story:** Como usuário do sistema, quero que ao criar um novo registro o modal abra diretamente em modo edição, para que eu possa preencher os dados imediatamente sem precisar clicar em "Editar".

#### Critérios de Aceite

1. WHEN o usuário clica no botão de criação de novo registro (ex.: "Nova Oportunidade", "Nova Transação"), THE Modal SHALL abrir diretamente em modo edição com todos os campos habilitados.
2. WHEN o Modal abre para novo registro, THE ModoController SHALL ocultar o botão "Editar" e exibir o botão "Salvar".
3. WHEN o usuário clica em "Fechar" ao criar um novo registro com campos preenchidos (estado dirty), THE Modal SHALL exibir a mensagem de confirmação "Deseja descartar as alterações?".
