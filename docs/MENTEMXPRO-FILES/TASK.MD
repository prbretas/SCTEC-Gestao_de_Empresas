# Implementation Plan: MenteMX Pro

## Overview

Implementação incremental da plataforma MenteMX Pro seguindo o roadmap de produto em três fases: **Fundação** (estrutura, autenticação, registro de voltas), **Inteligência** (analytics, MX Score, Radar) e **Retenção** (gamificação, exportação PDF). A stack é React Native/Expo + SQLite/Drizzle ORM no mobile e Node.js/Express/PostgreSQL no backend. Todos os algoritmos de cálculo são cobertos por testes de propriedade com `fast-check`.

---

## Tasks

<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- FASE 1 — FUNDAÇÃO (Dias 1–30)                                  -->
<!-- ═══════════════════════════════════════════════════════════════ -->

- [ ] 1. Configurar estrutura do projeto e infraestrutura base
  - Criar monorepo com workspaces: `apps/mobile` (Expo) e `apps/backend` (Node.js/Express)
  - Configurar TypeScript estrito em ambos os workspaces
  - Configurar Vitest + `@fast-check/vitest` no workspace de testes compartilhado (`packages/core`)
  - Criar `vitest.config.ts` com `globals: true` e `environment: 'node'`
  - Configurar ESLint + Prettier com regras compartilhadas
  - _Requirements: transversal_

  - [ ] 1.1 Criar estrutura de diretórios e configurar workspaces
    - Criar `apps/mobile`, `apps/backend`, `packages/core` (lógica de negócio compartilhada)
    - Configurar `tsconfig.json` base e por workspace
    - _Requirements: transversal_

  - [ ] 1.2 Configurar banco de dados local (SQLite + Drizzle ORM)
    - Instalar `expo-sqlite` e `drizzle-orm` no workspace mobile
    - Criar schema Drizzle para as 9 entidades: `pilot`, `bike`, `event`, `session`, `lap`, `setup`, `mx_score_history`, `streak_milestone`, `pending_operation`
    - Gerar e aplicar migrations iniciais
    - _Requirements: 1, 2, 3, 7, 8, 10_

  - [ ] 1.3 Configurar banco de dados PostgreSQL e ORM no backend
    - Instalar `drizzle-orm` + `pg` no workspace backend
    - Criar schema espelhando as mesmas 9 entidades do mobile
    - Configurar conexão com pool e variáveis de ambiente
    - _Requirements: 1, 3_


- [ ] 2. Implementar autenticação e cadastro de Piloto
  - Criar endpoint `POST /auth/register` com validação de e-mail único e hash de senha (bcrypt)
  - Criar endpoint `POST /auth/login` com geração de JWT
  - Criar endpoints `GET /pilots/:id` e `PUT /pilots/:id`
  - Implementar telas `RegisterScreen` e `LoginScreen` no mobile com validação de formulário
  - Aplicar padrão Modo Luva: botões >= 56dp, alto contraste, máximo 3 ações primárias
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 9.1, 9.2, 9.3_

  - [ ] 2.1 Implementar lógica de cadastro e autenticação no backend
    - Criar `authController` com register/login, validação de campos obrigatórios e e-mail duplicado
    - Gerar JWT com expiração configurável; implementar middleware de autenticação
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 2.2 Implementar telas de autenticação no mobile
    - Criar `RegisterScreen` e `LoginScreen` com React Hook Form
    - Exibir mensagens de erro descritivas por campo inválido
    - Redirecionar para `HomeScreen` após cadastro/login bem-sucedido
    - _Requirements: 1.2, 1.3, 1.4, 9.1, 9.2, 9.3_

- [ ] 3. Implementar cadastro e gestão de Motos
  - Criar endpoints `GET /pilots/:id/bikes` e `POST /pilots/:id/bikes`
  - Implementar `BikeRepository` no SQLite local com operações CRUD
  - Criar tela `ProfileScreen` com formulário de cadastro/edição de Moto
  - _Requirements: 1.5, 1.6, 1.7_

  - [ ] 3.1 Implementar `BikeRepository` (SQLite) e endpoints de Moto no backend
    - CRUD completo para a entidade `bike` com associação ao `pilot_id`
    - Validar campos obrigatórios: marca, modelo, ano, cilindrada
    - _Requirements: 1.5, 1.6, 1.7_

  - [ ]* 3.2 Escrever property test para round-trip de cadastro de Moto
    - **Property 1: Round-trip de cadastro de Moto**
    - Arbitrário: `fc.record({ brand: fc.string(), model: fc.string(), year: fc.integer({ min: 1990, max: 2030 }), displacement: fc.integer({ min: 50, max: 500 }) })`
    - Após cadastro bem-sucedido, consultar lista deve retornar moto com dados idênticos
    - Arquivo: `packages/core/src/__tests__/bike.property.test.ts`
    - **Validates: Requirements 1.6**

- [ ] 4. Checkpoint — Fundação de autenticação e perfil
  - Garantir que todos os testes passam, endpoints de auth e bikes respondem corretamente, e o schema SQLite está migrado. Perguntar ao usuário se há dúvidas antes de continuar.


- [ ] 5. Implementar registro de Sessão e Voltas (Modo Luva)
  - Criar `SessionRepository` e `LapRepository` no SQLite local
  - Implementar `SessionScreen` com registro de volta em no máximo 2 toques
  - Exibir em tempo real: última volta, melhor tempo e delta em relação ao melhor
  - Manter tela ativa (wake lock) durante sessão ativa
  - Implementar alerta de confirmação para voltas < 10 segundos
  - Permitir edição/exclusão de volta antes de encerrar sessão
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 9.1, 9.4, 9.5_

  - [ ] 5.1 Implementar `LapRepository` e `SessionRepository` no SQLite
    - INSERT imediato de volta no banco local com `lap_time_ms`, `session_id`, `lap_number`
    - Suporte a soft-delete (`is_deleted`) e edição de volta
    - _Requirements: 2.2, 2.7_

  - [ ]* 5.2 Escrever property test para persistência local imediata de Volta
    - **Property 2: Persistência local imediata de Volta**
    - Arbitrário: `fc.integer({ min: 10000, max: 300000 })`
    - Após INSERT, banco local deve conter a volta com o tempo exato, independente do estado de rede
    - Arquivo: `packages/core/src/__tests__/lap.property.test.ts`
    - **Validates: Requirements 2.2**

  - [ ] 5.3 Implementar função de formatação de tempo `formatLapTime(ms: number): string`
    - Converter milissegundos para formato `MM:SS.d`
    - Localizada em `packages/core/src/utils/formatTime.ts`
    - _Requirements: 2.3_

  - [ ]* 5.4 Escrever property test para formato de tempo de volta
    - **Property 3: Formato MM:SS.d**
    - Arbitrário: `fc.integer({ min: 0, max: 5999900 })`
    - Resultado deve corresponder ao regex `/^\d{2}:\d{2}\.\d$/`
    - Arquivo: `packages/core/src/__tests__/format.property.test.ts`
    - **Validates: Requirements 2.3**

  - [ ] 5.5 Implementar cálculo de melhor tempo e exibição em tempo real na `SessionScreen`
    - Calcular `bestLap = Math.min(...lapTimes)` e delta em relação ao melhor
    - Atualizar UI a cada nova volta registrada
    - _Requirements: 2.4_

  - [ ]* 5.6 Escrever property test para melhor tempo de Sessão
    - **Property 4: Melhor tempo de Sessão é o mínimo da lista**
    - Arbitrário: `fc.array(fc.integer({ min: 10000 }), { minLength: 1 })`
    - `bestLap` deve ser igual a `Math.min(...lapTimes)`
    - Arquivo: `packages/core/src/__tests__/session.property.test.ts`
    - **Validates: Requirements 2.4**

  - [ ] 5.7 Implementar encerramento de Sessão e cálculo do resumo
    - Calcular: contagem de voltas, melhor tempo, tempo médio e índice de Consistência
    - Exibir "Consistência indisponível — mínimo de 3 voltas necessário" quando < 3 voltas
    - _Requirements: 2.5, 4.4_

  - [ ]* 5.8 Escrever property test para completude do resumo de Sessão
    - **Property 5: Completude do resumo de Sessão**
    - Arbitrário: `fc.array(fc.integer({ min: 10000 }), { minLength: 3 })`
    - Resumo deve conter: `lapCount === lapTimes.length`, `bestLap === Math.min(...)`, `avgLap === mean(...)`, `consistency ∈ [0, 100]`
    - Arquivo: `packages/core/src/__tests__/session.property.test.ts`
    - **Validates: Requirements 2.5**


- [ ] 6. Implementar sincronização Local-First (fila `pending_ops`)
  - Implementar `syncService` com enqueue, flush e getStatus
  - Criar endpoint `POST /sync/batch` no backend
  - Detectar mudanças de conectividade e disparar flush automático
  - Exibir indicadores visuais: Offline / Sincronizando / Sincronizado / Erro
  - Implementar backoff exponencial (1s, 2s, 4s, 8s, max 5min) para falhas
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 6.1 Implementar `PendingOperationRepository` e `syncService.enqueue()`
    - INSERT em `pending_operation` com `op_type`, `table_name`, `record_id`, `payload`, `device_id`, `created_at`, `synced = false`
    - _Requirements: 3.1, 3.6_

  - [ ] 6.2 Implementar `syncService.flush()` e endpoint `POST /sync/batch`
    - Ler operações com `synced = false`, enviar em lote ao servidor
    - Marcar como `synced = true` após confirmação 200 OK
    - Implementar backoff exponencial em caso de falha
    - _Requirements: 3.2, 3.3, 3.4, 3.6_

  - [ ]* 6.3 Escrever property test para resolução de conflito LWW
    - **Property 6: Resolução de conflito preserva versão mais recente**
    - Arbitrário: `fc.record({ id: fc.uuid(), payload: fc.object(), updatedAt: fc.date() })` (dois registros com mesmo ID)
    - Após resolução, `updated_at` resultante deve ser o mais recente
    - Arquivo: `packages/core/src/__tests__/sync.property.test.ts`
    - **Validates: Requirements 3.5**

  - [ ]* 6.4 Escrever property test para integridade de dados durante sincronização
    - **Property 7: Integridade de dados durante sincronização**
    - Arbitrário: `fc.array(fc.record({ opType: fc.constantFrom('INSERT','UPDATE','DELETE'), table: fc.string(), payload: fc.object() }))`
    - Após flush bem-sucedido, todas as ops devem ter `synced = true` e dados presentes no servidor
    - Arquivo: `packages/core/src/__tests__/sync.property.test.ts`
    - **Validates: Requirements 3.6**

- [ ] 7. Implementar Módulo de Eventos
  - Criar `EventRepository` no SQLite e endpoints `GET/POST /pilots/:id/events`
  - Criar `EventsScreen` com formulário de cadastro (nome, data, tipo, pista)
  - Exibir campos adicionais para corrida: posição de largada, holeshot, posição final
  - Exibir histórico em ordem cronológica decrescente
  - Marcar eventos futuros como "Agendado"
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 7.1 Implementar `EventRepository` com CRUD e ordenação cronológica
    - Query de listagem com `ORDER BY event_date DESC`
    - Associar sessões a eventos; calcular resumo consolidado (melhor tempo, consistência média)
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [ ]* 7.2 Escrever property test para ordenação cronológica de Eventos
    - **Property 15: Ordenação cronológica decrescente de Eventos**
    - Arbitrário: `fc.array(fc.record({ id: fc.uuid(), eventDate: fc.date() }), { minLength: 2 })`
    - Lista retornada deve estar ordenada por `event_date` decrescente
    - Arquivo: `packages/core/src/__tests__/event.property.test.ts`
    - **Validates: Requirements 8.4**

  - [ ]* 7.3 Escrever property test para agregação do resumo de Evento
    - **Property 16: Agregação correta do resumo de Evento**
    - Arbitrário: `fc.array(sessionArbitrary, { minLength: 1 })`
    - `bestTime === Math.min(...sessions.map(s => s.bestLapMs))` e `avgConsistency === mean(sessions com consistência calculada)`
    - Arquivo: `packages/core/src/__tests__/event.property.test.ts`
    - **Validates: Requirements 8.5**

- [ ] 8. Checkpoint — Fundação completa
  - Garantir que todos os testes passam, sincronização funciona offline→online, eventos são listados corretamente. Perguntar ao usuário se há dúvidas antes de continuar para a Fase 2.


<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- FASE 2 — INTELIGÊNCIA (Dias 31–60)                             -->
<!-- ═══════════════════════════════════════════════════════════════ -->

- [ ] 9. Implementar cálculo de Índice de Consistência
  - Implementar `calculateConsistency(lapTimes: number[]): number | null` em `packages/core/src/analytics/consistency.ts`
  - Usar Coeficiente de Variação (CV) normalizado: `max(0, 100 × (1 - CV × k))`
  - Retornar `null` para listas com menos de 3 voltas (nunca lançar exceção)
  - Exibir índice no resumo da sessão e no histórico
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 9.1 Implementar `calculateConsistency` com CV normalizado
    - Calcular desvio padrão amostral, média e CV; aplicar fator `k` calibrado
    - Garantir retorno de 100 quando `σ = 0` (todas as voltas iguais)
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 9.2 Escrever property test para Índice de Consistência — range e invariante
    - **Property 8: Índice de Consistência — range e invariante de igualdade**
    - Arbitrário 1: `fc.array(fc.integer({ min: 10000, max: 300000 }), { minLength: 3 })` → resultado ∈ [0, 100]
    - Arbitrário 2: `fc.integer({ min: 10000, max: 300000 })` + `fc.integer({ min: 3, max: 20 })` → `calculateConsistency(Array(n).fill(t)) === 100`
    - Arquivo: `packages/core/src/__tests__/consistency.property.test.ts`
    - **Validates: Requirements 4.1, 4.2, 4.5**

- [ ] 10. Implementar cálculo do MX Score
  - Implementar `calculateMXScore(sessions: Session[], referenceDate: Date): number` em `packages/core/src/analytics/mxScore.ts`
  - Calcular os 4 fatores ponderados (40%, 30%, 20%, 10%) e aplicar `clamp(round(raw × 1000), 0, 1000)`
  - Retornar 0 para lista vazia de sessões
  - Recalcular automaticamente após sincronização de nova sessão
  - Persistir histórico em `mx_score_history`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 10.1 Implementar os 4 fatores do MX Score e função principal
    - `bestTimeFactor`, `consistencyFactor`, `frequencyFactor`, `evolutionFactor` — cada um normalizado para [0, 1]
    - Aceitar fatores negativos antes do clamp final
    - _Requirements: 5.1, 5.2, 5.6_

  - [ ]* 10.2 Escrever property test para MX Score dentro dos limites
    - **Property 9: MX Score dentro dos limites**
    - Arbitrário: `fc.array(sessionArbitrary, { maxLength: 50 })` (incluindo array vazio)
    - `calculateMXScore(sessions, date)` deve retornar inteiro ∈ [0, 1000]
    - Arquivo: `packages/core/src/__tests__/mxscore.property.test.ts`
    - **Validates: Requirements 5.1, 5.6**

  - [ ]* 10.3 Escrever property test para determinismo do MX Score
    - **Property 10: Determinismo do cálculo do MX Score**
    - Arbitrário: `fc.array(sessionArbitrary)`
    - Duas chamadas com mesmos dados devem produzir resultado idêntico
    - Arquivo: `packages/core/src/__tests__/mxscore.property.test.ts`
    - **Validates: Requirements 5.7**

  - [ ]* 10.4 Escrever property test para ponderação correta dos fatores
    - **Property 11: Ponderação correta dos fatores do MX Score**
    - Arbitrário: `fc.record({ bestTime: fc.float({ min: 0, max: 1 }), consistency: fc.float({ min: 0, max: 1 }), frequency: fc.float({ min: 0, max: 1 }), evolution: fc.float({ min: 0, max: 1 }) })`
    - Resultado deve ser equivalente à implementação de referência com pesos 40/30/20/10
    - Arquivo: `packages/core/src/__tests__/mxscore.property.test.ts`
    - **Validates: Requirements 5.2**

  - [ ] 10.5 Integrar recálculo automático do MX Score pós-sincronização
    - Disparar `calculateMXScore` após `syncService.flush()` bem-sucedido
    - Persistir resultado em `mx_score_history` e atualizar `HomeScreen`
    - _Requirements: 5.3, 5.4, 5.5_

- [ ] 11. Implementar Gráfico de Radar (Visão 360°)
  - Implementar `calculateRadarDimensions(pilotId: string): Promise<RadarData>` em `analyticsService`
  - Calcular as 5 dimensões: Performance, Consistência, Mental, Físico, Setup
  - Renderizar `RadarChart` com `@salmonco/react-native-radar-chart` na `AnalyticsScreen`
  - Exibir dimensão com valor 0 e indicador visual quando dados insuficientes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 11.1 Implementar cálculo das dimensões Performance, Consistência e Setup
    - Performance: `MX_Score / 1000 × 10`
    - Consistência: `consistência_média_últimas_5_sessões / 10`
    - Setup: fórmula composta com frequência de registros e delta de tempo pós-ajuste
    - _Requirements: 6.2, 6.3, 6.4_

  - [ ] 11.2 Implementar registro manual das dimensões Mental e Físico
    - Formulário pós-sessão com escala 1–10 para Mental e Físico
    - Validar e rejeitar valores fora de [1, 10]
    - _Requirements: 6.5_

  - [ ]* 11.3 Escrever property test para dimensões do Radar dentro do range
    - **Property 12: Dimensões do Gráfico de Radar dentro do range**
    - Arbitrário: `fc.record({ mxScore: fc.integer({ min: 0, max: 1000 }), consistencies: fc.array(fc.float({ min: 0, max: 100 })), setupData: fc.object() })`
    - Todas as 5 dimensões devem estar em [0, 10]
    - Arquivo: `packages/core/src/__tests__/radar.property.test.ts`
    - **Validates: Requirements 6.2, 6.3, 6.4**

  - [ ]* 11.4 Escrever property test para validação de input Mental e Físico
    - **Property 13: Validação de input das dimensões Mental e Físico**
    - Arbitrário: `fc.integer()` (inclui valores fora de [1, 10])
    - Valores fora de [1, 10] devem ser rejeitados; valores em [1, 10] devem ser aceitos e persistidos com valor exato
    - Arquivo: `packages/core/src/__tests__/radar.property.test.ts`
    - **Validates: Requirements 6.5**

  - [ ] 11.5 Renderizar `RadarChart` na `AnalyticsScreen` e integrar com endpoint `/pilots/:id/analytics`
    - Buscar dados do backend via `GET /pilots/:id/analytics`
    - Renderizar gráfico SVG com os valores mais recentes
    - _Requirements: 6.6, 6.7_

- [ ] 12. Implementar Módulo de Setup Técnico
  - Criar `SetupRepository` no SQLite e endpoints `GET /pilots/:id/setups`
  - Criar `SetupScreen` com formulário de suspensão dianteira/traseira e pneus
  - Validar tipo de terreno obrigatório; bloquear salvamento sem terreno
  - Suportar consulta, edição, duplicação e notas de texto livre
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 12.1 Implementar `SetupRepository` com CRUD completo no SQLite
    - INSERT/UPDATE/SELECT/DELETE para entidade `setup`
    - Validar `terrain` obrigatório antes de persistir
    - _Requirements: 7.1, 7.5, 7.8_

  - [ ]* 12.2 Escrever property test para round-trip de Setup técnico
    - **Property 14: Round-trip de Setup técnico**
    - Arbitrário: `fc.record({ terrain: fc.constantFrom('mud','sand','mixed'), frontCompression: fc.nat(), frontRebound: fc.nat(), rearCompression: fc.nat(), rearRebound: fc.nat(), rearLinkHeight: fc.float(), frontTirePressure: fc.float(), rearTirePressure: fc.float(), tireBrandModel: fc.string() })`
    - Após salvar, consultar por ID deve retornar objeto com todos os campos preservados
    - Arquivo: `packages/core/src/__tests__/setup.property.test.ts`
    - **Validates: Requirements 7.5**

  - [ ] 12.3 Implementar UI de Setup com suporte a duplicação e notas
    - Botão "Duplicar Setup" que cria cópia com novo ID
    - Campo de notas de texto livre
    - _Requirements: 7.6, 7.7_

- [ ] 13. Checkpoint — Inteligência completa
  - Garantir que todos os testes de propriedade para analytics passam, MX Score é calculado corretamente, Radar renderiza e Setup persiste com round-trip. Perguntar ao usuário se há dúvidas antes de continuar para a Fase 3.


<!-- ═══════════════════════════════════════════════════════════════ -->
<!-- FASE 3 — RETENÇÃO (Dias 61–90)                                 -->
<!-- ═══════════════════════════════════════════════════════════════ -->

- [ ] 14. Implementar Gamificação — Streaks de Treino
  - Implementar `streakService` com `getCurrentStreak`, `processEndOfDay` e `getRecord`
  - Criar job agendado no backend para processar fim de dia
  - Exibir streak atual e recorde no `ProfileScreen` e `HomeScreen`
  - Registrar marcos em `streak_milestone` (7, 30, 100 dias) de forma atômica
  - Enviar notificação push de conquista e incentivo
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 14.1 Implementar `streakService.getCurrentStreak()` e lógica de incremento
    - Calcular streak como comprimento da sequência de dias consecutivos mais recente com sessão
    - Incrementar streak em 1 quando sessão registrada em dia sem sessão prévia
    - _Requirements: 10.1, 10.3_

  - [ ]* 14.2 Escrever property test para cálculo correto do streak
    - **Property 17: Cálculo correto do streak de dias consecutivos**
    - Arbitrário: `fc.array(fc.boolean(), { minLength: 1 })` (true = dia com sessão)
    - Streak deve ser igual ao comprimento da sequência consecutiva mais recente terminando em `true`
    - Arquivo: `packages/core/src/__tests__/streak.property.test.ts`
    - **Validates: Requirements 10.1**

  - [ ]* 14.3 Escrever property test para incremento unitário do streak
    - **Property 18: Incremento unitário do streak**
    - Arbitrário: `fc.nat()` (streak atual `n`)
    - Após registrar sessão em dia sem sessão, streak resultante deve ser `n + 1`
    - Arquivo: `packages/core/src/__tests__/streak.property.test.ts`
    - **Validates: Requirements 10.3**

  - [ ] 14.4 Implementar `streakService.processEndOfDay()` com reset e registro de marcos
    - Se sem sessão no dia: registrar marcos pendentes (se `n ∈ {7, 30, 100}`), depois zerar streak
    - Registro de marco em `streak_milestone` é atômico e independente da notificação
    - _Requirements: 10.4, 10.6_

  - [ ]* 14.5 Escrever property test para reset de streak e preservação de marcos
    - **Property 19: Reset de streak e preservação de marcos**
    - Arbitrário: `fc.nat()` (streak atual `n > 0`)
    - Após `processEndOfDay` sem sessão: streak = 0; se `n ∈ {7, 30, 100}`, marco deve estar registrado antes do reset
    - Arquivo: `packages/core/src/__tests__/streak.property.test.ts`
    - **Validates: Requirements 10.4, 10.6**

  - [ ] 14.5 Implementar `streakService.getRecord()` e exibição do recorde histórico
    - Manter `record_streak` no perfil do piloto; atualizar quando `streak_atual > record_streak`
    - _Requirements: 10.5_

  - [ ]* 14.6 Escrever property test para invariante do recorde histórico
    - **Property 20: Recorde histórico de streak é invariante**
    - Arbitrário: `fc.array(fc.boolean())` (sequência de dias)
    - Em qualquer ponto da sequência, `record_streak >= streak_atual`
    - Arquivo: `packages/core/src/__tests__/streak.property.test.ts`
    - **Validates: Requirements 10.5**

- [ ] 15. Implementar Exportação de Relatórios PDF
  - Criar endpoint `POST /pilots/:id/reports` com PDFKit no backend
  - Incluir no PDF: MX Score, Gráfico de Radar, histórico de sessões, melhor tempo, evolução de Consistência, logotipo e data de geração
  - Implementar `ReportScreen` com seleção de período (7d, 30d, 90d, personalizado)
  - Disponibilizar PDF para compartilhamento via Share API nativa
  - Exibir mensagem de erro quando período não contém sessões
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 15.1 Implementar endpoint `POST /pilots/:id/reports` com PDFKit
    - Buscar dados do período no PostgreSQL; gerar PDF com PDFKit
    - Incluir todos os elementos obrigatórios: MX Score, Radar, histórico, melhor tempo, evolução de Consistência, logotipo, data
    - Retornar URL temporária para download
    - _Requirements: 11.2, 11.5_

  - [ ]* 15.2 Escrever property test para completude do relatório PDF
    - **Property 21: Completude do relatório PDF**
    - Arbitrário: `fc.record({ period: periodArbitrary, sessions: fc.array(sessionArbitrary, { minLength: 1 }) })`
    - PDF gerado deve conter todos os 7 elementos obrigatórios (verificar via metadados/estrutura do PDF)
    - Arquivo: `packages/core/src/__tests__/report.property.test.ts`
    - **Validates: Requirements 11.2, 11.5**

  - [ ] 15.3 Implementar `ReportScreen` com seleção de período e compartilhamento
    - Seletor de período com opções: 7d, 30d, 90d e intervalo personalizado
    - Chamar `reportService.generateReport()` e abrir Share API nativa após geração
    - Exibir mensagem "Não há dados suficientes para gerar o relatório" quando período vazio
    - _Requirements: 11.1, 11.3, 11.4, 11.6_

- [ ] 16. Implementar interface Modo Luva — validação e smoke tests
  - Verificar altura mínima de 56dp em todos os botões de ação primária
  - Verificar razão de contraste >= 4.5:1 (WCAG 2.1 AA) com ferramenta automatizada
  - Verificar máximo de 3 ações primárias por tela
  - Implementar tema escuro automático quando sistema operacional usa modo escuro
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 16.1 Criar testes de snapshot para componentes Modo Luva
    - Snapshot de botões primários verificando `minHeight: 56` no estilo
    - Verificar que cada tela expõe no máximo 3 ações primárias
    - _Requirements: 9.1, 9.3_

  - [ ] 16.2 Implementar tema escuro automático e verificação de contraste
    - Usar `useColorScheme()` do React Native para aplicar tema escuro automaticamente
    - Configurar paleta de cores com razão de contraste >= 4.5:1
    - _Requirements: 9.2, 9.6_

- [ ] 17. Checkpoint final — Garantir que todos os testes passam
  - Executar suite completa de testes (property tests + unit + integration)
  - Verificar cobertura de todos os 11 requisitos e 21 propriedades
  - Perguntar ao usuário se há dúvidas antes de considerar o MVP completo.


---

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido, mas cobrem as 21 propriedades de correção definidas no design
- Cada tarefa referencia requisitos específicos para rastreabilidade completa
- Os checkpoints garantem validação incremental ao final de cada fase do roadmap
- Os testes de propriedade usam `fast-check` com mínimo de 100 iterações por propriedade (padrão); em CI, usar `FC_NUM_RUNS=500`
- A lógica de negócio compartilhada (analytics, streak, formatação) fica em `packages/core` para ser testada independentemente de React Native e Node.js
- A estratégia Local-First garante que nenhuma tarefa de UI bloqueia por falta de rede

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1", "7.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.5", "6.1", "7.2"] },
    { "id": 5, "tasks": ["5.4", "5.6", "5.7", "6.2", "7.3"] },
    { "id": 6, "tasks": ["5.8", "6.3", "6.4", "9.1", "12.1"] },
    { "id": 7, "tasks": ["9.2", "10.1", "11.1", "11.2", "12.2"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5", "11.3", "11.4", "12.3"] },
    { "id": 9, "tasks": ["11.5", "14.1"] },
    { "id": 10, "tasks": ["14.2", "14.3", "14.4"] },
    { "id": 11, "tasks": ["14.5", "14.6", "15.1", "16.1", "16.2"] },
    { "id": 12, "tasks": ["15.2", "15.3"] }
  ]
}
```