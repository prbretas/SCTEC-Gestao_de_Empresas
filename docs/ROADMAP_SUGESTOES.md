# 🗺️ Roadmap de Sugestões — SCTEC Gestão de Empreendimentos

**Documento:** Ideias e sugestões de evolução do produto  
**Data:** Junho 2026  
**Autor:** Philippe Bretas

> Este documento lista ideias organizadas por prioridade para guiar o desenvolvimento futuro do SCTEC.  
> Todas as novas telas e rotinas **devem seguir obrigatoriamente** as regras de design definidas na seção 1.

---

## 1. 🎨 Regra de Design — Padrão Obrigatório para Novas Telas

Toda nova tela, rotina ou componente adicionado ao SCTEC deve seguir estas diretrizes:

### 1.1 Estrutura de Página
- Manter o **navbar superior** com a logo/nome do sistema e o toggle de Dark Mode
- Conteúdo dentro de `<main class="container">`
- Usar **cards Bootstrap** com `shadow-sm border-0` para agrupar seções
- Títulos de seção com a classe `#rotinaTitle` (cor `--sc-header`, fonte bold)

### 1.2 Cores e Variáveis CSS
- Sempre usar as variáveis CSS definidas em `styles.css` (`:root`)
- **Nunca** usar cores hardcoded em HTML — usar variáveis ou classes Bootstrap
- Botão principal de ação: classe `btn-success` (que é azul customizado `--sc-btn`)
- Botões secundários: `btn-outline-secondary`
- Badges de status: `bg-success` (ativo) e `bg-danger` (inativo)

### 1.3 Dark Mode
- Toda nova tela deve funcionar em Dark Mode sem ajuste manual do usuário
- Novos componentes CSS devem ter seletores `body.dark-mode .componente`
- Testar os dois temas antes de abrir qualquer PR

### 1.4 Responsividade
- Usar sistema de grid Bootstrap (`col-md-X`) em todos os formulários
- Tabelas dentro de `div.table-responsive`
- Botões de ação em linha: `d-flex gap-2`

### 1.5 Modais
- Usar `modal-lg modal-dialog-centered` como padrão
- Header do modal com fundo `var(--sc-header)` e texto branco
- Footer com botão Fechar (cinza) e botão de ação principal (azul)
- Incluir informações de auditoria no footer quando aplicável

### 1.6 Acessibilidade
- Todo `<button>` deve ter `aria-label` quando o texto for apenas ícone
- Colunas ordenáveis devem ter `aria-sort`
- Campos de formulário devem ter `<label>` associado via `for`/`id`

---

## 2. ⚙️ Tela de Configurações e Parâmetros

**Prioridade:** 🔴 Alta — base para muitas outras evoluções

### 2.1 O que seria
Uma tela dedicada acessível pelo navbar (ícone de engrenagem ⚙️) onde o usuário configura a aparência e os parâmetros do sistema sem precisar editar código.

### 2.2 Configurações de Identidade Visual
```
📌 Logo da empresa
   - Upload de imagem (PNG/SVG, max 500KB)
   - Exibida no navbar no lugar do emoji 🏭
   - Salva em base64 no LocalStorage (chave: SCTEC_CONFIG)

📌 Nome do sistema
   - Campo de texto livre ("SCTEC - Gestão Empresarial" → nome personalizado)
   - Exibido no navbar e no title da aba do navegador

📌 Cores customizadas
   - Cor primária (navbar, header) → altera --sc-header via CSS vars dinâmicas
   - Cor de destaque (borda navbar) → altera --sc-header2
   - Cor dos botões principais → altera --sc-btn
   - Preview em tempo real antes de salvar
```

### 2.3 Parâmetros do Sistema
```
📌 Segmentos disponíveis
   - Lista editável de segmentos (adicionar, remover, reordenar)
   - Cor associada a cada segmento (picker de cor)
   - Sincroniza automaticamente com o <select> do formulário

📌 Status disponíveis
   - Adicionar novos status além de Ativo/Inativo
   - Ex: "Em prospecção", "Suspenso", "Em análise"

📌 Campos customizados
   - Adicionar até 3 campos extras ao cadastro (nome + tipo: texto/número/data)
   - Aparecem no formulário e na exportação CSV

📌 API e Integrações
   - Toggle para habilitar/desabilitar consulta automática de CNPJ
   - Toggle para habilitar/desabilitar consulta de CEP
   - Timeout da API (segundos)
```

### 2.4 Dados e Armazenamento
```
📌 Backup automático
   - Frequência: manual / a cada 7 dias / a cada 30 dias
   - Notificação visual quando backup está atrasado

📌 Limite de registros
   - Aviso quando ultrapassar N registros (padrão: 500)
```

### 2.5 Implementação sugerida
- Nova página: `settings.html` ou seção inline via modal grande
- Salvar configurações em: `localStorage.setItem('SCTEC_CONFIG', JSON.stringify(config))`
- Carregar no `main.js` antes de inicializar os outros controllers
- CSS dinâmico: `document.documentElement.style.setProperty('--sc-header', cor)`

---

## 3. 📋 Novas Rotinas com os Registros Existentes

### 3.1 Tela de Relatórios e Dashboard Analítico
**Prioridade:** 🟡 Média

Aproveitar os dados cadastrados para gerar visões estratégicas:

```
📊 Gráficos (usando Chart.js via CDN — sem instalação)
   - Distribuição por Segmento (gráfico de pizza)
   - Empreendimentos por Município (gráfico de barras)
   - Evolução de cadastros por mês (linha do tempo)
   - Percentual Ativo vs Inativo

📋 Tabela de indicadores
   - Top 5 municípios com mais registros
   - Segmentos mais cadastrados
   - Últimos 10 cadastros realizados
   - Registros sem e-mail ou telefone (qualidade do dado)
```

---

### 3.2 Módulo de Contatos / Agenda
**Prioridade:** 🟡 Média

Cada empresa cadastrada pode ter múltiplos contatos vinculados:

```
👤 Por empresa: lista de contatos
   - Nome completo
   - Cargo / Departamento
   - Telefone direto
   - E-mail
   - WhatsApp (link direto wa.me/)
   - Aniversário (opcional)

📱 Ações rápidas
   - Botão "Ligar" (tel: link)
   - Botão "E-mail" (mailto: link)
   - Botão "WhatsApp" (https://wa.me/)

💾 Persistência
   - Array de contatos dentro do objeto do empreendimento
   - Exportação CSV com todos os contatos
```

---

### 3.3 Módulo de Ocorrências / Histórico de Interações
**Prioridade:** 🟡 Média

Registrar o histórico de interações com cada empresa:

```
📝 Por empresa: timeline de ocorrências
   - Data e hora
   - Tipo: Ligação / Reunião / E-mail / Visita / Proposta / Contrato
   - Descrição livre
   - Responsável (usuário que registrou)
   - Status: Aberto / Concluído / Pendente

🔔 Alertas
   - Ocorrências com follow-up pendente destacadas na lista principal
   - Badge de quantidade de ocorrências abertas na linha da tabela
```

---

### 3.4 Módulo de Documentos Vinculados
**Prioridade:** 🟢 Baixa

Anexar documentos a cada cadastro:

```
📎 Upload de documentos
   - Contrato social (PDF)
   - Certidões (PDF)
   - Fotos do local (JPG/PNG)
   - Limite: 5MB por arquivo, 10 arquivos por empresa
   - Armazenamento: base64 no LocalStorage (limitado) ou IndexedDB (recomendado)

📋 Listagem
   - Nome, tipo, data de upload, tamanho
   - Botão para visualizar (PDF inline) e baixar
```

---

### 3.5 Módulo de Tarefas / Follow-up
**Prioridade:** 🟡 Média

Um mini-CRM para acompanhamento comercial:

```
✅ Tarefas vinculadas a empresas
   - Título
   - Data de vencimento
   - Prioridade: Alta / Média / Baixa
   - Responsável
   - Status: A fazer / Em andamento / Concluída

📅 Visão de calendário
   - Mini-calendário mostrando tarefas do dia/semana
   - Destaque visual para tarefas vencidas (vermelho)

🔔 Notificações
   - Badge no navbar quando há tarefas vencidas
```

---

### 3.6 Exportação para Excel (.xlsx)
**Prioridade:** 🟡 Média

Além do CSV atual, gerar arquivos Excel reais com formatação:

```
📊 Usando SheetJS (xlsx) via CDN
   - Cabeçalhos em negrito e com cor
   - Linhas zebradas
   - Colunas com largura automática
   - Múltiplas abas: Empreendimentos / Contatos / Ocorrências
   - Exportar seleção filtrada (não apenas tudo)
```

---

### 3.7 Paginação da Tabela
**Prioridade:** 🟡 Média — issue #13 já aberta

```
📄 Controles de paginação
   - Select: 10 / 25 / 50 / 100 registros por página
   - Navegação: ← Anterior | 1 2 3 ... N | Próxima →
   - Contador: "Exibindo 1–25 de 347 registros"
   - Compatível com filtros de busca e ordenação
```

---

### 3.8 Tela de Importação Avançada com Preview
**Prioridade:** 🟢 Baixa

Melhorar o fluxo de importação CSV atual:

```
📊 Preview antes de confirmar
   - Tabela com os registros que serão importados
   - Destaque em vermelho para linhas com erro
   - Destaque em amarelo para duplicatas
   - Checkbox para selecionar quais linhas importar

🔧 Mapeamento de colunas
   - Arrastar e soltar para mapear colunas do CSV para campos do sistema
   - Útil para importar de sistemas externos com estrutura diferente
```

---

### 3.9 Multi-usuário básico (sem backend)
**Prioridade:** 🟢 Baixa

Simular perfis de usuário sem necessidade de servidor:

```
👥 Perfis salvos localmente
   - Nome do usuário (exibido no navbar)
   - Avatar com iniciais ou foto (base64)
   - Preferências individuais de tema e layout
   - Log de ações (quem cadastrou / editou cada registro)
   - Senha de proteção simples (hash SHA-256 no LocalStorage)

⚠️ Limitação: sem backend real, não há isolamento de dados entre usuários
   — serve para auditoria e personalização visual apenas
```

---

### 3.10 Modo Offline com PWA
**Prioridade:** 🟢 Baixa

Transformar o SCTEC em um Progressive Web App:

```
📱 Instalável como app
   - manifest.json com ícone e nome
   - Service Worker para cache offline
   - Funciona sem internet (dados já no LocalStorage)
   - Ícone na tela inicial do celular/desktop

🔄 Sincronização futura
   - Fila de alterações offline para sincronizar quando voltar online
   - Base para uma eventual migração para backend
```

---

## 4. 🔌 Integrações Externas Sugeridas

| Integração | O que faz | Dificuldade |
|---|---|---|
| **Receita Federal WS** | Situação fiscal atualizada | Média |
| **Google Maps Embed** | Mapa do endereço no modal de visualização | Baixa |
| **ViaCEP já integrado** | ✅ Implementado | — |
| **BrasilAPI CNPJ já integrado** | ✅ Implementado | — |
| **WhatsApp Business API** | Enviar mensagem direto da tela | Alta |
| **Google Sheets API** | Sincronizar dados com planilha Google | Alta |
| **Zapier / Make webhook** | Automatizar fluxos ao cadastrar empresa | Média |

---

## 5. 🏗️ Melhorias Técnicas Futuras

| Item | Descrição | Impacto |
|---|---|---|
| **IndexedDB** | Substituir LocalStorage por IndexedDB — suporta arquivos binários e volumes maiores | Alto |
| **Backend Node.js/Supabase** | Persistência real, multi-usuário, acesso de qualquer dispositivo | Alto |
| **TypeScript** | Adicionar tipagem estática para reduzir bugs em tempo de desenvolvimento | Médio |
| **Build com Vite** | Bundler moderno — minificação, tree-shaking, hot-reload | Médio |
| **Testes E2E com Playwright** | Testes automatizados de interface (clique, digitação, navegação) | Médio |
| **i18n** | Suporte a múltiplos idiomas (pt-BR / en / es) | Baixo |
| **Sincronização entre abas** | `window.addEventListener('storage')` para atualizar dados em tempo real | Baixo |

---

## 6. 📅 Ordem Sugerida de Implementação

```
Sprint 1 (curto prazo)
  1. Tela de Configurações — identidade visual e parâmetros (seção 2)
  2. Paginação da tabela — issue #13 já aberta
  3. Exportação para Excel (.xlsx) — seção 3.6

Sprint 2 (médio prazo)
  4. Módulo de Contatos vinculados — seção 3.2
  5. Dashboard analítico com gráficos — seção 3.1
  6. Módulo de Tarefas / Follow-up — seção 3.5

Sprint 3 (longo prazo)
  7. Módulo de Ocorrências / Histórico — seção 3.3
  8. Importação avançada com preview — seção 3.8
  9. PWA / modo offline — seção 3.10
 10. Backend + multi-usuário real — seção 3.9 + técnico
```

---

*Documento mantido por Philippe Bretas — atualizar conforme o produto evolui.*
