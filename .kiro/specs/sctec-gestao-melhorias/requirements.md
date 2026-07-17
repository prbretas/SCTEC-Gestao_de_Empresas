# Requirements: SCTEC Gestão de Empreendimentos — Melhorias e Documentação

## Introdução

O SCTEC é uma aplicação web front-end para gerenciamento de empreendimentos corporativos no estado de Santa Catarina. Este documento formaliza os requisitos para um conjunto de melhorias planejadas, cobrindo: documentação do produto, documentação técnica, correção de bugs identificados e novas funcionalidades — com destaque para a exibição de sócios ao consultar o CNPJ via BrasilAPI.

## Glossário

| Termo | Definição |
|---|---|
| Empreendimento | Empresa ou pessoa física cadastrada no sistema |
| QSA | Quadro de Sócios e Administradores — array retornado pela BrasilAPI |
| CNPJ | Cadastro Nacional da Pessoa Jurídica |
| CPF | Cadastro de Pessoas Físicas |
| BrasilAPI | API pública brasileira de dados cadastrais (CNPJ, CEP etc.) |
| ViaCEP | Webservice público de consulta de endereço por CEP |
| LocalStorage | Mecanismo de persistência de dados no navegador |
| Spec | Documento de especificação formal de produto ou feature |
| FormData | API nativa do browser para coleta de dados de formulário |

---

## Requisitos

### Requirement 1: Exibir Sócios da Empresa nas Observações ao Consultar CNPJ

**User Story:** Como operador do sistema, quero que ao consultar um CNPJ via BrasilAPI, os sócios da empresa (QSA) sejam exibidos automaticamente no campo Observações, para que eu tenha uma visão completa do quadro societário sem precisar acessar fontes externas.

#### Acceptance Criteria

1. WHEN o usuário preenche um CNPJ válido (14 dígitos) no campo Registro com tipo PJ e o foco sai do campo, THEN o sistema SHALL consultar a BrasilAPI e, se o campo `qsa` estiver presente e não for vazio, SHALL incluir no campo Observações uma seção formatada com os dados dos sócios.
2. WHEN a BrasilAPI retorna o array `qsa`, THEN o sistema SHALL exibir para cada sócio: nome completo, qualificação e data de entrada na sociedade.
3. WHEN o campo `qsa` estiver ausente ou vazio, THEN o sistema SHALL exibir no campo Observações a linha `SÓCIOS: Não informados na base da Receita Federal`.
4. WHEN o campo Observações já contiver conteúdo preexistente, THEN o sistema SHALL concatenar a seção de sócios ao conteúdo existente sem apagar dados anteriores.
5. WHILE o sistema estiver aguardando resposta da BrasilAPI, THEN o campo Registro SHALL exibir um indicador visual de carregamento (atributo `disabled` temporário e placeholder "Consultando...").
6. IF a BrasilAPI retornar erro ou timeout, THEN o sistema SHALL exibir no campo Observações a linha `SÓCIOS: Erro ao consultar — verifique manualmente`.

---

### Requirement 2: Corrigir Campo `tipoPessoa` não Capturado pelo FormData

**User Story:** Como desenvolvedor, quero que o tipo de pessoa (PJ/PF) seja corretamente persistido no LocalStorage, para que os dados exportados e exibidos reflitam a classificação correta do registro.

#### Acceptance Criteria

1. WHEN o usuário salva um novo empreendimento, THEN o sistema SHALL persistir o campo `tipoPessoa` com o valor selecionado no dropdown (PJ ou PF).
2. WHEN um empreendimento é exportado via CSV, THEN a coluna `TipoPessoa` SHALL conter o valor correto (PJ ou PF) para cada registro.
3. WHEN um empreendimento é carregado no modal de edição ou visualização, THEN o dropdown de tipo de pessoa SHALL refletir o valor gravado no LocalStorage.

---

### Requirement 3: Corrigir Campo `situacao` nas Observações do CNPJ

**User Story:** Como operador, quero que a situação cadastral da empresa apareça corretamente no campo Observações ao consultar um CNPJ, para garantir que os dados exibidos sejam fidedignos à Receita Federal.

#### Acceptance Criteria

1. WHEN a BrasilAPI retorna dados do CNPJ, THEN o campo `SITUAÇÃO` nas Observações SHALL exibir o valor de `descricao_situacao_cadastral` retornado pela API.
2. IF `descricao_situacao_cadastral` não estiver disponível, THEN o sistema SHALL exibir `N/A` neste campo.

---

### Requirement 4: Remover Código Morto e Consolidar Validações

**User Story:** Como desenvolvedor, quero que o código seja limpo e sem funções duplicadas ou inacessíveis, para facilitar a manutenção e evitar confusão durante o desenvolvimento.

#### Acceptance Criteria

1. WHEN o código de `forms.js` for revisado, THEN as funções `validarFormulario()` e `preencherForm()` SHALL ser removidas ou integradas, eliminando a duplicidade com `handleSave()` e `carregarDadosNoForm()`.
2. WHEN o código de `ui.js` for revisado, THEN a referência à variável `elSC` e ao elemento `#qtd-sc` inexistente SHALL ser removida.
3. WHEN um campo obrigatório não for preenchido no formulário, THEN a mensagem de alerta SHALL ser genérica e profissional, sem referências a nomes de desenvolvimento (ex: "⚠️ Preencha...").

---

### Requirement 5: Corrigir Máscara de Telefone

**User Story:** Como operador, quero que a máscara de telefone funcione corretamente ao digitar, para que o número seja formatado automaticamente no padrão brasileiro.

#### Acceptance Criteria

1. WHEN o usuário digita um número de telefone com 11 dígitos no campo Telefone, THEN o sistema SHALL formatar como `(XX) XXXXX-XXXX` (celular).
2. WHEN o usuário digita um número de telefone com 10 dígitos, THEN o sistema SHALL formatar como `(XX) XXXX-XXXX` (fixo).
3. WHEN a máscara é aplicada, THEN caracteres não numéricos SHALL ser ignorados.

---

### Requirement 6: Adicionar Feedback Visual Durante Consultas de API

**User Story:** Como operador, quero ver um indicador de carregamento enquanto o sistema consulta o CNPJ ou o CEP, para saber que a operação está em andamento e não clicar duas vezes.

#### Acceptance Criteria

1. WHEN o sistema inicia uma consulta à BrasilAPI ou ViaCEP, THEN os campos preenchidos automaticamente SHALL ser desabilitados temporariamente.
2. WHEN a consulta à API é concluída (com sucesso ou erro), THEN os campos SHALL ser reabilitados imediatamente.
3. WHEN a consulta está em andamento, THEN o campo de registro SHALL exibir texto de placeholder indicando o carregamento.

---

### Requirement 7: Spec de Produto e Documentação Técnica

**User Story:** Como Product Owner e desenvolvedor, quero ter um documento de spec de produto e uma documentação técnica detalhada do projeto, para facilitar o onboarding de novos colaboradores e orientar o desenvolvimento futuro.

#### Acceptance Criteria

1. WHEN o spec de produto for criado, THEN SHALL cobrir: visão do produto, público-alvo, funcionalidades principais, limitações conhecidas e roadmap de melhorias.
2. WHEN a documentação técnica for criada, THEN SHALL cobrir: arquitetura dos módulos, fluxo de dados, contratos das APIs externas utilizadas, estrutura do LocalStorage e instruções de execução.
3. WHEN o arquivo de issues for criado, THEN SHALL listar todos os bugs e melhorias identificados com severidade, descrição clara e critério de aceite para resolução.
