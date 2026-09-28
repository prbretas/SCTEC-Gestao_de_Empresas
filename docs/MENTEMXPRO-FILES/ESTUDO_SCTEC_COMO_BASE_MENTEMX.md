# 🏍️ Estudo Técnico — SCTEC (Gestão de Empreendimentos) como base para o MenteMX Pro

> **Status:** Estudo / Análise (não implementado)
> **Objetivo:** Entender **como o projeto SCTEC (Gestão de Empreendimentos) poderia ser aproveitado como base para o MenteMX Pro**, mapeando o que é reutilizável, o que precisa ser criado do zero (novas rotinas, tabelas, telas) e quais as decisões arquiteturais envolvidas.
>
> **Atualização (decisão tomada):** foi decidido que o MenteMX Pro **deve reaproveitar o máximo possível** do SCTEC via **monorepo com `packages/core` (Opção C)**. O detalhamento dessa estratégia está na **PARTE II** deste documento (§12 em diante).
> **Fontes:** `MENTEMXPRO-FILES/REQUIREMENTS.MD`, `DESIGN.MD`, `TASK.MD` (specs do MenteMX) + código atual do SCTEC.
> **Escopo:** análise comparativa e roadmap conceitual. **Nenhum código é alterado.**

---

## 1. Resumo dos Dois Projetos

| Dimensão | **SCTEC — Gestão de Empreendimentos** | **MenteMX Pro** |
|---|---|---|
| Domínio | Gestão empresarial (CRM, financeiro, estoque, propostas, cadastros) | Inteligência esportiva para pilotos de Motocross/offroad |
| Usuário | Operadores/admin de uma organização (B2B, multi-tenant) | Piloto/atleta individual (B2C) |
| Plataforma | **Web**, HTML + JS vanilla, sem build | **Mobile**, React Native (Expo) + backend |
| Persistência | `localStorage` (por navegador) | **Local-First**: SQLite no device + sync → PostgreSQL |
| Conectividade | Online, no navegador | **Offline-first** com fila de sincronização |
| UI | Bootstrap, telas densas | **Modo Luva** (botões ≥56dp, alto contraste, ≤3 ações) |
| Cálculos-chave | Totais financeiros, KPIs simples | **Consistência, MX Score, Radar** (algoritmos com testes de propriedade) |
| Exportação | CSV/XLSX/impressão | **PDF** server-side (PDFKit) |

> **Conclusão de alto nível:** são **domínios e plataformas diferentes**. O SCTEC **não é reutilizável como aplicação**, mas vários de seus **padrões, conceitos e — principalmente — os estudos da issue #144** são altamente reaproveitáveis como **fundação metodológica e de backend** para o MenteMX.

---

## 2. O que É Reutilizável do SCTEC

### 2.1 Padrões de código e arquitetura (conceitos, não o código literal)

| Padrão no SCTEC | Como serve ao MenteMX |
|---|---|
| **CRUD uniforme por coleção** (`XStorage.buscarTodos/adicionar/...`) | Molde direto para os *repositories* do MenteMX (pilot, bike, session, lap...) |
| **Multi-tenant por chave** (`SCTEC_X_{orgId}`) | Vira **escopo por `pilot_id`** no MenteMX (um piloto por conta) |
| **Auth + sessão** (`AuthService`, hash de senha, `requireAuth`) | Base conceitual para `POST /auth/register|login` + JWT do MenteMX |
| **Papéis/visibilidade** (`RolesController`, níveis #142) | Menos crítico no MVP (usuário individual), mas útil para times/coaches futuros |
| **Auditoria** (`criadoPor/criadoEm/atualizadoPor`) | Mapeia para `created_at/updated_at/device_id` (necessários ao sync LWW) |
| **Exportação/backup** (`AuthService` backup assinado, CSV/XLSX) | Conceito reaproveitado; no MenteMX vira exportação **PDF** de relatório |
| **Modo visualização/edição** (modais, `_setModo`) | Padrão de UX reaproveitável nas telas de detalhe |

### 2.2 Os estudos da Issue #144 são o maior ativo reaproveitável

O MenteMX **exige** exatamente o que já estudamos para o SCTEC na #144:

| Estudo #144 (SCTEC) | Aplicação no MenteMX |
|---|---|
| `ESTUDO_BACKEND_API_144.md` | O MenteMX **precisa** de backend Node/Express + PostgreSQL — mesma stack e convenções (rotas, JWT, validação, erros) |
| `ESTUDO_STORAGE_PROVIDER_144.md` | A camada de abstração sync↔async é **o coração** do modelo Local-First do MenteMX |
| `ESTUDO_MODELO_DADOS_144.md` | Metodologia de modelagem (FKs, tabelas associativas, índices) aplicável ao ER do MenteMX |
| `ESTUDO_SEGURANCA_LGPD_144.md` | Dados pessoais de atletas (nome, e-mail, performance) exigem LGPD igualmente |
| `ESTUDO_PERSISTENCIA_BANCO_144.md` | Plano faseado/reversível de persistência reaproveitável |

> **Insight central:** ao implementar a #144 no SCTEC (backend + StorageProvider), cria-se uma **fundação técnica** cuja experiência e padrões aceleram o MenteMX — embora o **código de negócio** seja distinto.

---

## 3. O que NÃO é reutilizável (precisa ser criado do zero)

| Área | Por quê |
|---|---|
| **Plataforma mobile (React Native/Expo)** | SCTEC é web vanilla; MenteMX é app nativo cross-platform |
| **SQLite local + Drizzle ORM** | SCTEC usa localStorage; MenteMX usa banco local tipado |
| **Sincronização offline-first (fila `pending_operation` + LWW)** | Inexistente no SCTEC |
| **Domínio esportivo** (voltas, sessões, setup de moto, eventos/corridas) | Nada a ver com empresas/estoque/financeiro |
| **Algoritmos** (Consistência via CV, MX Score ponderado, Radar 5D) | Lógica proprietária nova, com testes de propriedade (`fast-check`) |
| **Modo Luva / acessibilidade de pista** | Requisito de UX específico (≥56dp, WCAG AA, ≤3 ações) |
| **Gamificação (streaks/marcos)** | Nova mecânica |
| **Geração de PDF server-side (PDFKit)** | Nova capacidade |

---

## 4. Mapa de Entidades: SCTEC → MenteMX

O MenteMX define **9 entidades** (do `DESIGN.MD`). Comparando com o SCTEC:

| Entidade MenteMX | Análogo no SCTEC | Observação |
|---|---|---|
| `pilot` | `usuarios` + perfil | Conta individual; herda ideia de auth/hash/sessão |
| `bike` | `produtos`/cadastro | Entidade "possuída pelo usuário" (1:N) |
| `event` | `agenda`/compromisso | Corrida/treino com data e status (agendado/concluído) |
| `session` | `propostas`/registro-mãe com itens | "Cabeçalho" com métricas + filhos (`lap`) |
| `lap` | itens de proposta/pedido | Filho de session (1:N), como `pedido_itens` |
| `setup` | `produtos` c/ atributos | Config técnica por terreno; muitos campos numéricos |
| `mx_score_history` | (não há) | Série temporal de pontuação — **novo** |
| `streak_milestone` | (não há) | Gamificação — **novo** |
| `pending_operation` | (não há) | Fila de sync offline — **novo, essencial** |

> A **estrutura mãe→filho** (session→laps) é análoga a pedido→itens no SCTEC, então o padrão de modelagem e de UI de "registro com itens" **se transfere conceitualmente**.

---

## 5. Novas Rotinas / Módulos que o MenteMX exigiria

Caso se decida construir o MenteMX **reaproveitando a base metodológica do SCTEC** (mas em stack mobile), as rotinas novas seriam:

1. **Perfil do Piloto & Motos** (CRUD) — análogo a cadastros, porém mobile.
2. **Sessão de Voltas** (cronômetro, registro em ≤2 toques, resumo) — **nova**, crítica.
3. **Analytics** (Consistência, MX Score, Radar 5D) — **nova**, com algoritmos testados.
4. **Setup Técnico** (suspensão/pneus por terreno, duplicar setup) — **nova**.
5. **Eventos** (corrida/treino, holeshot, posição) — parcialmente análogo à agenda.
6. **Sincronização** (fila, flush, indicador, resolução de conflito LWW) — **nova**.
7. **Gamificação** (streak diário, marcos 7/30/100) — **nova**.
8. **Relatório PDF** (período, radar, evolução) — **nova** (server-side).
9. **Modo Luva** (tema de alto contraste, componentes grandes) — **transversal**.

---

## 6. Novas Tabelas (esquema PostgreSQL do MenteMX)

As 9 tabelas do MenteMX (do `DESIGN.MD`) — **todas novas** em relação ao SCTEC:

- `pilot` (id, name, email, password_hash, current_streak, record_streak, last_session_date, device_id, timestamps)
- `bike` (id, pilot_id FK, brand, model, year, displacement_cc)
- `event` (id, pilot_id FK, name, event_date, type[race|training], location, start_position, holeshot, final_position, status)
- `session` (id, pilot_id FK, bike_id FK, event_id FK, lap_count, best_lap_ms, avg_lap_ms, consistency_index, mental_score, physical_score, started_at, ended_at)
- `lap` (id, session_id FK, lap_number, lap_time_ms, is_deleted, recorded_at)
- `setup` (id, pilot_id FK, bike_id FK, terrain[mud|sand|mixed], cliques/pressões..., notes)
- `mx_score_history` (id, pilot_id FK, score, fatores..., calculated_at)
- `streak_milestone` (id, pilot_id FK, milestone_days, achieved_at)
- `pending_operation` (id, device_id, op_type, table_name, record_id, payload JSON, synced) — **fila de sync**

> A **metodologia de modelagem** do `ESTUDO_MODELO_DADOS_144.md` (FKs, `ON DELETE`, índices por `pilot_id`, tabela associativa quando N:N) aplica-se diretamente ao desenhar esse schema.

---

## 7. Arquitetura Comparada

```
SCTEC (hoje)                          MenteMX Pro (alvo)
─────────────                         ──────────────────
Navegador                             App RN/Expo
  └─ JS vanilla                         ├─ UI (Modo Luva)
  └─ localStorage (sync)                ├─ Business logic (services)
                                        ├─ SQLite local (Drizzle)   ← offline-first
                                        └─ Sync Queue (pending_ops)
                                              │  HTTPS quando online
                                        Backend Node/Express
                                          ├─ REST API + JWT
                                          ├─ Sync Service (LWW)
                                          ├─ PDF Service (PDFKit)
                                          └─ PostgreSQL
```

> Se a #144 for implementada no SCTEC, o bloco **"Backend Node/Express + PostgreSQL + StorageProvider"** passa a ser **conhecimento e padrão já exercitados**, reduzindo risco no MenteMX.

---

## 8. Estratégias de Aproveitamento (opções para decisão)

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A. Projetos independentes** | MenteMX do zero, aproveitando só a metodologia/estudos | Stack ideal para cada domínio | Sem reuso de código literal |
| **B. Backend compartilhado** | Um backend Node/PostgreSQL com módulos separados (SCTEC e MenteMX) | Reuso de auth, infra, deploy, LGPD | Acoplamento; domínios muito distintos |
| **C. Monorepo com `packages/core`** | Compartilhar utilitários (auth, validação, sync, helpers) entre web e mobile | Reuso máximo do "encanamento" | Exige TypeScript/monorepo (mudança no SCTEC) |

> O `TASK.MD` do MenteMX já prevê **monorepo com `packages/core`** — o que favorece a **Opção C** caso se queira compartilhar a lógica de fundação (não o domínio).

---

## 9. Riscos e Cuidados

| Risco | Mitigação |
|---|---|
| Tentar "forçar" o SCTEC web a virar app esportivo | Tratar como **produtos distintos**; reusar padrões, não telas |
| Reescrita síncrono→assíncrono (igual à #144) | O MenteMX **já nasce assíncrono/local-first** — resolver isso no SCTEC primeiro dá experiência |
| Algoritmos (MX Score/Consistência) sem rigor | Testes de propriedade (`fast-check`), como o `TASK.MD` prevê |
| LGPD com dados de atletas | Aplicar `ESTUDO_SEGURANCA_LGPD_144.md` (dados pessoais, consentimento, retenção) |
| Sincronização/conflitos | LWW por `updated_at`+`device_id` (já desenhado no `DESIGN.MD`) |

---

## 10. Perguntas em Aberto (para a decisão)

- [ ] MenteMX será **produto independente** (Opção A) ou compartilhará **backend/monorepo** com o SCTEC (B/C)?
- [ ] A implementação da #144 no SCTEC deve **preceder** o MenteMX (para servir de piloto de backend)?
- [ ] Haverá reuso de **componentes de UI**? (improvável: web Bootstrap vs mobile RN)
- [ ] O SCTEC migraria para **TypeScript/monorepo** para permitir `packages/core` compartilhado?
- [ ] Quem são os titulares de dados no MenteMX (piloto, equipe, patrocinador) para o mapeamento LGPD?

---

## 11. Conclusão

O SCTEC e o MenteMX Pro são **produtos de domínios e plataformas diferentes** — o SCTEC **não é reaproveitável como aplicação** para o fim esportivo. Porém, o **maior valor reutilizável** está na **fundação técnica e metodológica**: os cinco estudos da issue #144 (backend/API, camada de abstração de dados, modelo relacional, segurança/LGPD e plano de persistência) descrevem exatamente o "encanamento" que o MenteMX exige (backend Node/PostgreSQL, sync, JWT, LGPD). Conceitualmente, o padrão **CRUD por coleção**, **multi-tenant → escopo por piloto**, **registro mãe→filho** (session→laps ~ pedido→itens) e **auditoria/timestamps** transferem-se bem.

Recomenda-se tratar o MenteMX como **novo produto** (nova stack mobile + backend), **reaproveitando os padrões e estudos** do SCTEC — e, se desejado, um **`packages/core` compartilhado** para a lógica de fundação. **Nenhum código foi alterado; este é um documento de estudo para decisão.**

---

# 📦 PARTE II — Estratégia de Compartilhamento (Decisão: Opção C — Monorepo com `packages/core`)

> **Decisão registrada:** o MenteMX Pro **deve reaproveitar o máximo possível** do que já existe no SCTEC. Esta parte detalha *o quê*, *como* e *em que ordem* compartilhar, adotando a **Opção C (monorepo + `packages/core`)**.

## 12. Princípio de Reuso

Reaproveitar **lógica de fundação e regras puras** (sem DOM, sem `localStorage`, sem framework), publicá-las num pacote comum e consumi-las tanto no **SCTEC web** quanto no **MenteMX mobile/backend**. **Não** se compartilha UI (Bootstrap web ≠ React Native) nem o domínio de negócio.

```
Compartilhável  = funções puras + contratos + validações + helpers de segurança
Não compartilhável = telas/HTML, storages acoplados ao localStorage, regras de domínio específicas
```

## 13. Inventário: o que do SCTEC vai para o `packages/core`

Levantado do código atual do SCTEC:

| Origem no SCTEC | Item | Reuso no MenteMX | Ação de extração |
|---|---|---|---|
| `shared/utils.js` | `validarCNPJ`, `validarCPF`, `aplicarMascaraDocumento`, `aplicarMascaraTelefone`, `formatarDataHora` | Validação/formatação de perfil do piloto e cadastros | Extrair puro (sem DOM) |
| `shared/utils.js` | Geração/parse **CSV** | Base para exportações tabulares | Extrair puro |
| `core/auth.js` | `hashSenha` (migrar p/ bcrypt/argon2), `gerarId`, geração de código/convite | Auth do piloto, IDs únicos | Extrair + **fortalecer hash** |
| `core/auth.js` | validações de cadastro (nome, tamanho, unicidade) | Cadastro de piloto | Extrair regras puras |
| `core/roles.js` | `filtrarPorVisibilidade`, níveis (#142) | Times/coaches (fase futura) | Extrair como policy pura |
| `#144 ESTUDO_STORAGE_PROVIDER` | contrato `StorageProvider` (list/get/insert/update/remove) | **Núcleo do offline-first** do MenteMX | Formalizar como interface `core` |
| `#144 ESTUDO_BACKEND_API` | convenções REST, padrão `{ ok, data, error }`, JWT, erros | Backend do MenteMX | Reusar como padrão + middlewares |
| padrão `criadoPor/criadoEm` | helpers de auditoria/timestamp | `created_at/updated_at/device_id` (sync LWW) | Extrair helper |
| `shared/calculator.js` | utilitários numéricos (margem/arredondamento) | Base p/ formatação de métricas | Avaliar reuso |

> Os **algoritmos do MenteMX** (Consistência/MX Score/Radar) **nascem** no `packages/core` (novos), mas seguindo o **mesmo estilo de função pura testável** que já usamos no SCTEC.

## 14. Estrutura de Monorepo Proposta

```
mentemx-ecosystem/                 (ou evoluir o repo atual para monorepo)
├── package.json                   # workspaces
├── packages/
│   └── core/                      # 🟢 COMPARTILHADO (TypeScript, funções puras)
│       ├── validation/            # validarCNPJ/CPF, máscaras, e-mail
│       ├── security/              # hash (argon2/bcrypt), gerarId, tokens
│       ├── storage/               # contrato StorageProvider + InMemory
│       ├── audit/                 # timestamps, device_id, LWW helpers
│       ├── format/                # datas, moeda, CSV
│       └── metrics/               # (novo) consistencia, mx-score, radar
├── apps/
│   ├── sctec-web/                 # SCTEC atual (consome @core)
│   ├── mentemx-mobile/            # React Native/Expo (consome @core)
│   └── mentemx-backend/           # Node/Express + PostgreSQL (consome @core)
└── ...
```

- `packages/core` em **TypeScript** puro, sem dependência de browser/RN/node-específico.
- Cada app importa `@core/*` — a mesma validação de CPF roda na web, no mobile e no backend.

## 15. Impacto no SCTEC (pré-requisitos para compartilhar)

Para o SCTEC **consumir** o `packages/core`, precisaria de mudanças de base (hoje é JS vanilla sem build):

1. **Adotar TypeScript** (ou ao menos ESM com bundler) no SCTEC — mudança estrutural relevante.
2. **Introduzir etapa de build** (o SCTEC hoje não tem bundler).
3. **Extrair as funções puras** de `utils.js`/`auth.js` para `@core` e substituir os usos por imports.
4. Manter compatibilidade: os `XStorage` continuam, mas passam a usar helpers de `@core`.

> ⚠️ **Trade-off:** o maior benefício de reuso vem junto de uma **modernização do SCTEC** (TS + build + monorepo). Isso deve ser pesado: é a mudança mais cara desta estratégia.

## 16. Faseamento do Compartilhamento

1. **Fase 0 — Preparação**: criar o monorepo e `packages/core` (vazio) + toolchain TS/testes (Vitest/Jest + `fast-check`).
2. **Fase 1 — Extrair o "sem risco"**: validações e formatação puras (`validarCPF/CNPJ`, máscaras, datas, CSV) → `@core/validation|format`. SCTEC passa a importar. Testes cobrindo.
3. **Fase 2 — Segurança**: `@core/security` (hash forte, IDs, tokens) — alinhado ao `ESTUDO_SEGURANCA_LGPD_144.md`.
4. **Fase 3 — StorageProvider**: formalizar o contrato de dados em `@core/storage` (usado pelo offline-first do MenteMX e pela #144 do SCTEC).
5. **Fase 4 — Métricas MenteMX**: implementar `@core/metrics` (consistência/MX Score/Radar) — novo, com testes de propriedade.
6. **Fase 5 — Backend compartilhado (opcional)**: padrões REST/middlewares/erros de `@core` reusados por `mentemx-backend` (e, se a #144 avançar, pelo backend do SCTEC).

## 17. O que **não** compartilhar (fronteiras claras)

- **UI**: telas do SCTEC (Bootstrap/HTML) não vão para o MenteMX (RN). Só *design tokens* (cores/contraste) poderiam ser compartilhados como dados.
- **Domínio**: CRM, financeiro, estoque, propostas ≠ voltas, setups, eventos esportivos.
- **Storages acoplados**: os `XStorage` atuais (presos ao `localStorage` síncrono) não vão direto; só o **contrato** abstraído vai.

## 18. Riscos específicos da Opção C

| Risco | Mitigação |
|---|---|
| Custo de modernizar o SCTEC (TS + build) | Fazer por fases; começar extraindo só o puro/sem risco |
| Acoplar dois produtos cedo demais | `packages/core` só com o que for **genuinamente genérico** |
| Divergência de versões entre apps | Monorepo com workspaces + versionamento único |
| Regressão no SCTEC ao trocar por imports | Testes antes/depois de cada extração; feature-by-feature |
| `core` "inchar" com regra de domínio | Regra de ouro: `core` = puro e genérico; domínio fica nos apps |

## 19. Recomendação Final da Parte II

Adotar a **Opção C incrementalmente**: montar o monorepo, criar o `packages/core` e **começar extraindo o de menor risco** (validações/formatação puras), medindo o esforço de adaptar o SCTEC (que exigirá TypeScript + build). O ganho é real — a mesma base de validação, segurança, contrato de storage e (novas) métricas servindo web, mobile e backend — mas vem acoplado à **modernização do SCTEC**, que é a decisão de investimento a validar antes de propagar. As **novas rotinas/tabelas do MenteMX** (§5 e §6) permanecem específicas do produto esportivo; o compartilhamento fica na **camada de fundação**.

**Nenhum código foi alterado; este documento é de estudo para decisão.**
