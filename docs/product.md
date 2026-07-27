# SCTEC — Gestão de Empreendimentos SC

## Visão do Produto

Aplicação web front-end para gerenciamento de empreendimentos corporativos no estado de Santa Catarina. Permite cadastrar, acompanhar e exportar dados de empresas e pessoas físicas com integração a APIs públicas brasileiras (BrasilAPI e ViaCEP).

## Público-Alvo

Operadores e gestores de entidades de fomento ao desenvolvimento empresarial em SC. Usuários com perfil de analista ou operador de cadastro.

## Funcionalidades Principais

| Módulo | Descrição |
|--------|-----------|
| **Cadastros** | CRUD de empreendimentos (PJ/PF), busca automática de CNPJ e CEP, QSA de sócios, exportação CSV/Excel/JSON |
| **CRM** | Funil de vendas em kanban com 6 etapas: Prospecção → Contato → Proposta → Negociação → Fechado/Perdido |
| **Financeiro** | Controle de entradas/saídas por mês, categoria e empresa vinculada |
| **Agenda** | Compromissos (reunião, visita, ligação, prazo) vinculados a empresas |
| **Propostas** | Orçamentos com itens, totais automáticos e impressão em PDF |
| **Dashboard** | Métricas consolidadas por segmento e município |
| **Autenticação** | Login/logout com isolamento de dados por usuário e organização |

## Limitações Conhecidas

- Dados armazenados exclusivamente no `localStorage` do navegador — sem backend ou sincronização entre dispositivos
- Sem controle de acesso granular por papel de usuário (em desenvolvimento — issue #41)
- Sem suporte offline além dos dados já carregados
- Dependência de APIs externas (BrasilAPI, ViaCEP) — sem cache ou fallback offline

## Roadmap

### Sprint 1 — Curto Prazo
- `#35` Navbar padronizado em todas as telas
- `#36` Sincronização do Dark Mode entre telas
- `#33` Bug: navbar ausente na tela de Cadastros

### Sprint 2 — Médio Prazo
- `#43` Modo visualização nos registros (somente leitura)
- `#42` Auditoria de registros em todas as rotinas
- `#41` Papéis de trabalho por organização
- `#37` Suite de testes automatizados antes de cada commit
- `#34` Alterar senha nas Configurações Pessoais

### Sprint 3 — Longo Prazo
- `#44` Dashboard V2 com métricas completas e configurável por papel
- `#39` Relatórios avançados consolidados
- `#38` Mini-dashboards por módulo
- `#27` Progressive Web App instalável com suporte offline
- `#26` Importação CSV com preview e mapeamento de colunas
