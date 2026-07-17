# Atas de Reunião — SCTEC Gestão Empresarial

---

## 17/07/2026 — Refinamento de Novas Funcionalidades

### Funcionalidades discutidas

- **Papéis de Trabalho** (#41): cada usuário terá exatamente um papel; papel não pode ser excluído se tiver usuários vinculados; gestão exclusiva do Admin da organização; código de convite diferenciado por papel (sufixo numérico)
- **Auditoria de Registros** (#42): campos `criadoPor`, `criadoEm`, `atualizadoPor`, `atualizadoEm` em todos os registros; exibição em texto simples no modal-footer; visível em modo edição e visualização
- **Modo Visualização** (#43): modal abre em somente leitura por padrão; botão Editar libera campos; Fechar no modo visualização fecha direto; Fechar no modo edição exige confirmação; referenciar comportamento atual de `cadastros.html`
- **Dashboard V2** (#44): métricas de CRM, Financeiro, Propostas e Agenda; configuração por papel de trabalho; admin seleciona tipo de gráfico por widget (Chart.js já disponível)

### Regras de negócio definidas

- Usuário tem exatamente 1 papel de trabalho (não pode acumular)
- Papel com usuários vinculados não pode ser excluído
- Apenas Admin da org gerencia papéis
- Configuração do dashboard é por papel de trabalho, não por usuário individual

### Próximos passos

- Iniciar implementação das issues abertas por prioridade
- Sprint 1 foco: #33, #35, #36 (Navbar e Dark Mode)
- Sprint 2 foco: #34, #37, #41, #42, #43 (Segurança, Testes, Papéis, Auditoria, Visualização)
- Sprint 3 foco: #38, #39, #44 (Dashboards, Relatórios)

---

## 16/07/2026 — Reestruturação de Pastas

### Funcionalidades discutidas

- Reorganização profissional: JS migrado para `src/js/{core,pages,modules,shared}/`
- CSS migrado para `src/css/`
- HTMLs mantidos na raiz para compatibilidade com GitHub Pages
- 145/145 testes passando após a migração

### Observações

- `login.html` renomeado para `index.html` para que o GitHub Pages sirva a tela de login como entrada
- Todas as referências internas atualizadas
- ESLint configurado para o novo path `src/js/**/*.js`
