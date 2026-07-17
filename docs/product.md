# SCTEC — Gestão Empresarial

> Sistema web de gestão empresarial para cadastros, CRM, financeiro, agenda e propostas.

## Objetivo

O SCTEC centraliza a gestão de empreendimentos, parceiros e operações comerciais de organizações no estado de Santa Catarina. Elimina planilhas fragmentadas ao oferecer um sistema integrado, acessível pelo navegador sem necessidade de instalação, com suporte a múltiplos usuários por organização.

## Público-Alvo

| Perfil | Descrição |
|--------|-----------|
| Admin da Organização | Configura o sistema, gerencia usuários, papéis de trabalho e módulos ativos |
| Operador Logístico | Cadastra e consulta empreendimentos diariamente |
| Analista Comercial | Gerencia oportunidades no CRM e elabora propostas |
| Analista Financeiro | Lança e acompanha entradas e saídas financeiras |
| Usuário Geral | Acessa os módulos permitidos pelo seu papel de trabalho |

## Funcionalidades Principais

- **Autenticação e Organizações** — login por nickname, senha SHA-256, isolamento de dados por organização, código de convite para novos usuários
- **Cadastro de Empreendimentos** — CRUD completo com consulta automática de CNPJ (BrasilAPI) e CEP (ViaCEP), QSA (sócios), contatos e tarefas vinculados
- **Dashboard Analítico** — indicadores de cadastros, CRM, financeiro, propostas e agenda
- **Agenda de Compromissos** — registro e acompanhamento de reuniões, visitas, ligações e prazos
- **CRM — Funil de Vendas** — board Kanban com 6 etapas (Prospecção → Fechado/Perdido)
- **Controle Financeiro** — lançamentos de entradas e saídas com resumo por período
- **Propostas e Orçamentos** — criação com itens, totais automáticos e impressão PDF
- **Configurações** — identidade visual customizável, segmentos, módulos ativos por organização
- **Gerenciar Usuários (Admin)** — listagem, papéis de trabalho e controle de acesso por módulo

## Princípios de Design

- Sem instalação — roda 100% no navegador via GitHub Pages
- Dados isolados por organização — múltiplos usuários compartilham a mesma base
- Dark/Light mode — preferência salva por sessão
- Responsivo — funciona em desktop e mobile
- Sem dependência de backend — persistência via localStorage (roadmap: migração para PostgreSQL)
