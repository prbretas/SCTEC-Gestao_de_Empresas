# Requirements Document

## Introduction

O MenteMX Pro é uma plataforma de inteligência esportiva e programa mental voltada para pilotos e atletas do mundo offroad. A plataforma transforma a percepção subjetiva do piloto em dados analíticos estruturados, permitindo evolução técnica e mental baseada em métricas reais de performance, consistência e setup de moto.

O sistema opera em modelo **Local-First**: os dados são registrados offline e sincronizados com o servidor quando há conexão disponível. A interface segue o padrão **Modo Luva** — botões grandes, alto contraste e comandos simplificados para uso rápido entre baterias de treino ou corrida.

O MVP cobre três módulos principais: **Analytics**, **Setup Técnico** e **Eventos**.

---

## Glossary

- **Piloto**: Usuário principal da plataforma, praticante de Motocross.
- **Moto**: Motocicleta off-road registrada pelo Piloto na plataforma.
- **Volta**: Registro de tempo de uma volta completa em uma pista.
- **Sessão**: Conjunto de voltas registradas em um mesmo treino ou bateria de corrida.
- **Evento**: Corrida ou treino cadastrado pelo Piloto.
- **Setup**: Configuração técnica da Moto para um determinado tipo de terreno.
- **Suspensão**: Sistema de amortecimento dianteiro e traseiro da Moto.
- **Clique**: Unidade de ajuste incremental da Suspensão (compressão ou retorno).
- **Holeshot**: Posição de primeiro lugar na largada de uma corrida.
- **MX_Score**: Pontuação proprietária de 0 a 1000 que representa a performance recente do Piloto.
- **Consistência**: Métrica calculada a partir do desvio padrão dos tempos de Volta de uma Sessão.
- **Gráfico_Radar**: Visualização em formato de teia com cinco dimensões: Performance, Consistência, Mental, Físico e Setup.
- **Sistema**: A plataforma MenteMX Pro como um todo.
- **App**: A aplicação mobile do MenteMX Pro.
- **Servidor**: Infraestrutura de backend Node.js responsável pela persistência e sincronização dos dados.
- **Banco_Local**: Armazenamento de dados no dispositivo do Piloto, disponível sem conexão à internet.

---

## Requirements

### Requirement 1: Cadastro de Piloto e Moto

**User Story:** Como piloto de Motocross, quero cadastrar meu perfil e minha moto na plataforma, para que meus dados de performance e setup sejam organizados de forma personalizada.

#### Acceptance Criteria

1. THE Sistema SHALL permitir que o Piloto crie uma conta com nome, e-mail e senha.
2. WHEN o Piloto submete o formulário de cadastro com dados válidos, THE Sistema SHALL criar o perfil do Piloto e redirecioná-lo para a tela inicial.
3. IF o e-mail informado já estiver cadastrado, THEN THE Sistema SHALL exibir a mensagem "E-mail já cadastrado. Faça login ou recupere sua senha." e bloquear a criação da conta.
4. IF o Piloto submete o formulário com campos obrigatórios em branco, THEN THE Sistema SHALL destacar os campos inválidos e exibir mensagens de erro descritivas.
5. THE Sistema SHALL permitir que o Piloto cadastre uma ou mais Motos, informando marca, modelo, ano e cilindrada.
6. WHEN o Piloto cadastra uma Moto com sucesso, THE Sistema SHALL associar a Moto ao perfil do Piloto e torná-la disponível para seleção nos módulos de Sessão e Setup.
7. THE Sistema SHALL permitir que o Piloto edite os dados do seu perfil e das suas Motos a qualquer momento.

---

### Requirement 2: Registro de Tempos de Volta (Sessão)

**User Story:** Como piloto, quero registrar os tempos de cada volta durante um treino ou corrida, para que eu possa acompanhar minha evolução e calcular métricas de consistência.

#### Acceptance Criteria

1. THE App SHALL permitir que o Piloto inicie uma nova Sessão selecionando uma Moto cadastrada e um Evento (ou criando um Evento avulso).
2. WHEN o Piloto registra o tempo de uma Volta, THE App SHALL armazenar o tempo no Banco_Local imediatamente, independentemente de haver conexão com a internet.
3. THE App SHALL permitir que o Piloto registre tempos de Volta com precisão de décimos de segundo (formato MM:SS.d).
4. THE App SHALL exibir, em tempo real durante a Sessão, o tempo da última Volta, o melhor tempo da Sessão e a diferença em relação à melhor Volta.
5. WHEN o Piloto encerra a Sessão, THE App SHALL calcular e exibir o resumo com: número de voltas, melhor tempo, tempo médio e índice de Consistência.
6. IF o Piloto registrar uma Volta com tempo inferior a 10 segundos, THEN THE App SHALL exibir um alerta de confirmação antes de salvar, pois pode ser um registro acidental.
7. THE App SHALL permitir que o Piloto exclua ou edite uma Volta registrada antes de encerrar a Sessão.

---

### Requirement 3: Sincronização Offline/Online (Local-First)

**User Story:** Como piloto que frequentemente treina em locais sem sinal de internet, quero que o app funcione completamente offline, para que eu não perca nenhum dado registrado na pista.

#### Acceptance Criteria

1. WHEN o App detecta ausência de conexão com a internet, THE App SHALL habilitar automaticamente o modo offline, permitindo o registro de Sessões, Voltas e Setups sem nenhuma ação adicional do Piloto.
2. WHEN o App detecta que a conexão com a internet foi restabelecida, THE App SHALL iniciar automaticamente a sincronização dos dados pendentes com o Servidor.
3. WHILE a sincronização estiver em andamento, THE App SHALL exibir um indicador visual de progresso ao Piloto.
4. WHEN a sincronização for concluída com sucesso, THE App SHALL confirmar ao Piloto que todos os dados foram salvos na nuvem.
5. IF ocorrer um conflito de dados durante a sincronização (mesmo registro alterado em dois dispositivos), THEN THE Sistema SHALL preservar a versão mais recente com base no timestamp e notificar o Piloto sobre o conflito resolvido.
6. THE App SHALL garantir que nenhum dado registrado no Banco_Local seja perdido durante o processo de sincronização.

---

### Requirement 4: Cálculo de Consistência

**User Story:** Como piloto, quero visualizar meu índice de consistência por sessão, para que eu possa identificar se estou mantendo um ritmo estável ou se meu desempenho oscila muito.

#### Acceptance Criteria

1. WHEN uma Sessão é encerrada com 3 ou mais Voltas registradas, THE Sistema SHALL calcular o índice de Consistência com base no desvio padrão dos tempos de Volta da Sessão.
2. THE Sistema SHALL expressar o índice de Consistência em uma escala de 0 a 100, onde 100 representa desvio padrão zero (todas as voltas com o mesmo tempo).
3. THE Sistema SHALL exibir o índice de Consistência no resumo da Sessão e no histórico de Sessões do Piloto.
4. IF uma Sessão tiver menos de 3 Voltas registradas, THEN THE Sistema SHALL exibir "Consistência indisponível — mínimo de 3 voltas necessário" no lugar do índice.
5. FOR ALL Sessões com os mesmos tempos de Volta, THE Sistema SHALL calcular o índice de Consistência como 100 (propriedade de invariância).
6. THE Sistema SHALL manter o histórico de Consistência por Sessão para permitir análise de evolução ao longo do tempo.

---

### Requirement 5: MX Score

**User Story:** Como piloto, quero ter uma pontuação única que resuma minha performance recente, para que eu possa acompanhar minha evolução de forma simples e motivadora.

#### Acceptance Criteria

1. THE Sistema SHALL calcular o MX_Score do Piloto em uma escala de 0 a 1000 com base nas Sessões registradas nos últimos 30 dias.
2. THE Sistema SHALL compor o MX_Score considerando os seguintes fatores ponderados: melhor tempo relativo ao histórico do Piloto (40%), índice de Consistência médio (30%), frequência de treinos (20%) e evolução de tempo entre Sessões (10%), aceitando valores zero ou negativos para qualquer fator no cálculo.
3. WHEN o Piloto registra uma nova Sessão, THE Sistema SHALL recalcular o MX_Score automaticamente após a sincronização com o Servidor.
4. THE App SHALL exibir o MX_Score atual do Piloto de forma destacada na tela inicial.
5. THE Sistema SHALL manter o histórico do MX_Score para permitir a visualização da evolução ao longo do tempo em gráfico de linha.
6. IF o Piloto não registrar nenhuma Sessão nos últimos 30 dias, THEN THE Sistema SHALL exibir o MX_Score como 0 e apresentar uma mensagem de incentivo ao treino.
7. FOR ALL Sessões idênticas inseridas em sequência, THE Sistema SHALL produzir o mesmo MX_Score (propriedade de idempotência do cálculo).

---

### Requirement 6: Gráfico de Radar (Visão 360°)

**User Story:** Como piloto, quero visualizar minha performance em cinco dimensões num gráfico de radar, para que eu possa identificar rapidamente quais áreas precisam de mais atenção.

#### Acceptance Criteria

1. THE App SHALL exibir o Gráfico_Radar com cinco dimensões: Performance, Consistência, Mental, Físico e Setup.
2. THE Sistema SHALL calcular a dimensão Performance com base no MX_Score e nos tempos de Volta recentes.
3. THE Sistema SHALL calcular a dimensão Consistência com base no índice de Consistência médio das últimas 5 Sessões.
4. THE Sistema SHALL calcular a dimensão Setup com base na frequência de registros de Setup e na variação de tempos após ajustes, permitindo que o valor da dimensão seja baixo ou zero quando os ajustes resultarem em piora de performance.
5. THE App SHALL permitir que o Piloto registre manualmente as dimensões Mental e Físico após cada Sessão, em uma escala de 1 a 10.
6. WHEN o Piloto acessa o dashboard de analytics, THE App SHALL renderizar o Gráfico_Radar com os valores mais recentes de todas as cinco dimensões.
7. IF alguma dimensão não possuir dados suficientes para cálculo, THEN THE App SHALL exibir essa dimensão com valor zero e indicar visualmente que o dado está pendente.

---

### Requirement 7: Módulo de Setup Técnico

**User Story:** Como piloto, quero registrar e consultar as configurações de suspensão e pneus da minha moto para diferentes tipos de terreno, para que eu nunca perca um setup que funcionou bem.

#### Acceptance Criteria

1. THE App SHALL permitir que o Piloto registre um Setup para uma Moto, associando-o a um tipo de terreno: barro, areia ou misto.
2. THE App SHALL permitir o registro dos seguintes parâmetros de Suspensão dianteira: número de cliques de compressão e número de cliques de retorno.
3. THE App SHALL permitir o registro dos seguintes parâmetros de Suspensão traseira: número de cliques de compressão, número de cliques de retorno e altura do link.
4. THE App SHALL permitir o registro dos parâmetros de pneus: pressão dianteira (em PSI ou Bar), pressão traseira e tipo de pneu (marca e modelo).
5. WHEN o Piloto salva um Setup, THE App SHALL armazená-lo no Banco_Local e associá-lo à Moto e ao tipo de terreno selecionados.
6. THE App SHALL permitir que o Piloto consulte, edite e duplique Setups previamente registrados.
7. THE App SHALL permitir que o Piloto adicione notas de texto livre a um Setup para registrar observações subjetivas.
8. IF o Piloto tentar salvar um Setup sem informar o tipo de terreno, THEN THE App SHALL exibir uma mensagem de erro e bloquear o salvamento.

---

### Requirement 8: Módulo de Eventos

**User Story:** Como piloto, quero cadastrar corridas e treinos como eventos, para que eu possa organizar minhas Sessões por contexto e acompanhar minha evolução em competições.

#### Acceptance Criteria

1. THE App SHALL permitir que o Piloto cadastre um Evento informando: nome, data, tipo (corrida ou treino) e pista/local.
2. WHEN o Piloto cadastra um Evento do tipo corrida, THE App SHALL disponibilizar campos adicionais para registro de: posição de largada, resultado do Holeshot (sim/não) e posição final.
3. THE App SHALL permitir que o Piloto associe uma ou mais Sessões a um Evento.
4. THE App SHALL exibir o histórico de Eventos do Piloto em ordem cronológica decrescente.
5. WHEN o Piloto acessa um Evento, THE App SHALL exibir o resumo consolidado das Sessões associadas, incluindo melhor tempo, Consistência média e MX_Score do período.
6. IF o Piloto tentar cadastrar um Evento com data no futuro, THEN THE App SHALL permitir o cadastro e marcá-lo como "Agendado" até que a data seja atingida.

---

### Requirement 9: Interface Modo Luva (Acessibilidade de Pista)

**User Story:** Como piloto que usa luvas e está sob pressão entre baterias, quero uma interface com elementos grandes e de alto contraste, para que eu consiga registrar dados rapidamente sem tirar as luvas.

#### Acceptance Criteria

1. THE App SHALL renderizar todos os botões de ação primária com altura mínima de 56dp (density-independent pixels) para facilitar o toque com luvas.
2. THE App SHALL utilizar esquema de cores de alto contraste com razão mínima de 4.5:1 entre texto e fundo, conforme WCAG 2.1 AA.
3. THE App SHALL exibir no máximo 3 ações primárias por tela para reduzir a carga cognitiva em situações de pista.
4. THE App SHALL permitir o registro de uma Volta com no máximo 2 toques na tela a partir da tela de Sessão ativa.
5. THE App SHALL manter a tela ativa (sem bloqueio automático) enquanto uma Sessão estiver em andamento, exceto quando o gerenciamento de energia do sistema operacional precisar intervir em condições críticas de bateria ou emergência.
6. WHERE o dispositivo suportar modo escuro do sistema operacional, THE App SHALL aplicar automaticamente o tema de alto contraste escuro.

---

### Requirement 10: Gamificação — Streaks de Treino

**User Story:** Como piloto, quero ser recompensado por manter uma frequência regular de treinos, para que eu me mantenha motivado a registrar minha evolução continuamente.

#### Acceptance Criteria

1. THE Sistema SHALL calcular e manter o streak (sequência) de dias consecutivos com pelo menos uma Sessão registrada pelo Piloto.
2. THE App SHALL exibir o streak atual do Piloto de forma destacada no perfil e na tela inicial.
3. WHEN o Piloto registra uma Sessão em um dia sem Sessão prévia, THE Sistema SHALL incrementar o streak em 1 dia.
4. IF o Piloto não registrar nenhuma Sessão em um dia corrido, THEN THE Sistema SHALL processar e registrar quaisquer conquistas de marco de streak atingidas antes de zerar o streak, e em seguida notificar o Piloto com uma mensagem de incentivo.
5. THE Sistema SHALL registrar o recorde histórico de streak do Piloto e exibi-lo no perfil.
6. WHEN o Piloto atinge marcos de streak (7, 30 e 100 dias), THE Sistema SHALL registrar o marco no perfil do Piloto e THE App SHALL exibir uma notificação de conquista, sendo que o registro do marco ocorre independentemente do sucesso da exibição da notificação.

---

### Requirement 11: Exportação de Relatórios

**User Story:** Como piloto, quero exportar um relatório de performance para compartilhar com minha equipe ou patrocinadores, para que eu possa demonstrar minha evolução de forma profissional.

#### Acceptance Criteria

1. THE App SHALL permitir que o Piloto gere um relatório de performance em formato PDF.
2. THE Sistema SHALL incluir no relatório: MX_Score atual, Gráfico_Radar, histórico de Sessões do período selecionado, melhor tempo registrado e evolução do índice de Consistência.
3. THE App SHALL permitir que o Piloto selecione o período do relatório (últimos 7 dias, 30 dias, 90 dias ou intervalo personalizado).
4. WHEN o relatório é gerado com sucesso, THE App SHALL disponibilizá-lo para compartilhamento via aplicativos nativos do dispositivo (WhatsApp, e-mail, etc.), sendo que a falha no compartilhamento não invalida o relatório gerado.
5. THE Sistema SHALL incluir no relatório o logotipo do MenteMX Pro e a data de geração.
6. IF o período selecionado não contiver nenhuma Sessão registrada, THEN THE App SHALL informar ao Piloto que não há dados suficientes para gerar o relatório.