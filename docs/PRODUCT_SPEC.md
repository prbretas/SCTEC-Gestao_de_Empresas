# 📋 Product Spec — SCTEC Gestão de Empreendimentos SC

**Versão:** 1.0.0  
**Data:** Junho 2026  
**Autor:** Philippe Bretas  
**Status:** Ativo

---

## 1. Visão do Produto

O **SCTEC** é uma aplicação web de gestão cadastral de empreendimentos corporativos focada no estado de Santa Catarina. Seu objetivo central é reduzir o esforço manual de cadastro e garantir a integridade dos dados através de automação inteligente via APIs públicas brasileiras.

> **Missão:** Ser a ferramenta de referência para gestão do portfólio de parceiros, clientes e fornecedores de operações logísticas e industriais em Santa Catarina.

---

## 2. Público-Alvo

| Perfil | Descrição |
|---|---|
| **Operador Logístico** | Usuário principal. Cadastra, edita e consulta empreendimentos diariamente |
| **Analista de Dados** | Exporta e importa bases via CSV para relatórios e integrações |
| **Gestor / PO** | Acompanha indicadores (total de registros, ativos) e valida dados cadastrais |

---

## 3. Funcionalidades Principais

### 3.1 CRUD de Empreendimentos

| Operação | Descrição |
|---|---|
| **Criar** | Modal com formulário completo. Validação de campos obrigatórios e duplicidade de CNPJ/CPF |
| **Visualizar** | Clique na linha da tabela abre modal somente leitura com dados de auditoria (criação/atualização) |
| **Editar** | Botão ✏️ abre modal com campos habilitados. Nome e Registro bloqueados para preservar integridade |
| **Excluir** | Botão 🗑️ com confirmação de diálogo antes de remover |

### 3.2 Automação via APIs

| API | Gatilho | Resultado |
|---|---|---|
| **BrasilAPI (CNPJ)** | Blur no campo Registro com tipo PJ e 14 dígitos | Preenche Razão Social, Endereço, CEP e campo Observações com dados cadastrais e QSA (sócios) |
| **ViaCEP (CEP)** | Blur no campo CEP com 8 dígitos | Preenche Endereço e Município |

### 3.3 Busca e Filtros

- Busca em tempo real com debounce implícito via evento `input`
- Filtro por campo: Todos / Nome·Razão / CPF·CNPJ / Município / Segmento
- Ordenação por coluna (ID, Empresa, Responsável, Município, Segmento, Status) com toggle ASC/DESC

### 3.4 Importação e Exportação CSV

- **Exportar:** Gera arquivo CSV com BOM UTF-8, 11 colunas, nome com data ISO
- **Importar:** Parse com detecção de duplicidade (normaliza CNPJ/CPF removendo pontuação), resume importação antes de confirmar
- **Modelo:** Download de CSV modelo para facilitar preenchimento externo

### 3.5 Dashboard de Indicadores

- Card **Total de Registros** — contagem total na base
- Card **Empreendimentos Ativos** — filtrado por `status === "Ativo"`
- Card **Resultados da Busca** — contador dinâmico com ícone de funil ativo/inativo

### 3.6 Tema Dark/Light

- Toggle na navbar
- Preferência persistida no LocalStorage (`SCTEC_THEME`)
- Transição CSS suave de 0,3s

---

## 4. Modelo de Dados

### Objeto `Empreendimento` (LocalStorage)

```json
{
  "id": 1,
  "nome": "Empresa Exemplo LTDA",
  "tipoPessoa": "PJ",
  "registro": "00.000.000/0001-00",
  "responsavel": "João Silva",
  "email": "joao@empresa.com",
  "telefone": "(47) 99999-0000",
  "cep": "89200-000",
  "endereco": "Rua das Indústrias, 100",
  "municipio": "Joinville",
  "segmento": "Tecnologia",
  "status": "Ativo",
  "observacoes": "Notas livres + dados automáticos do CNPJ",
  "dataCadastro": "2026-06-24T10:00:00.000Z",
  "dataAtualizacao": "2026-06-24T12:00:00.000Z"
}
```

**Chave do LocalStorage:** `SCTEC_EMPREENDIMENTOS_DB`

### Segmentos Disponíveis

`Tecnologia` · `Indústria` · `Logística` · `Comércio` · `Serviços` · `Transportes` · `Fornecedor` · `Cliente`

---

## 5. Regras de Negócio

| Regra | Descrição |
|---|---|
| **RN-01** | CNPJ/CPF é único na base (chave de negócio). Duplicidade bloqueia inclusão e importação |
| **RN-02** | No modo edição, os campos Nome e Registro são somente leitura |
| **RN-03** | Status padrão de novos registros é `Ativo` |
| **RN-04** | IDs são numéricos sequenciais gerados pelo maior ID existente + 1 |
| **RN-05** | Registros excluídos não podem ser recuperados (sem soft delete) |
| **RN-06** | Dados de CNPJ preenchidos automaticamente podem ser editados manualmente antes de salvar |

---

## 6. Limitações Conhecidas (v1.0)

| Limitação | Impacto | Mitigação Planejada |
|---|---|---|
| Persistência apenas em LocalStorage | Dados não sincronizados entre dispositivos/abas | Migração para backend/IndexedDB no roadmap |
| Sem autenticação/autorização | Qualquer usuário tem acesso total | Fora do escopo atual (uso interno) |
| Sem paginação | Performance degrada com >500 registros | Paginação ou virtualização planejada |
| Sem validação de dígito verificador de CNPJ/CPF | Aceita documentos inválidos | Implementar algoritmo de validação |
| Sem backup automático | Risco de perda de dados ao limpar cache | Botão de backup/restore planejado |
| Dependência de APIs externas sem fallback | Falha de rede bloqueia automação | Implementar timeout e mensagens claras |

---

## 7. Arquitetura de Alto Nível

```
┌─────────────────────────────────────┐
│            Browser (Client)         │
│                                     │
│  index.html ──► Bootstrap 5.3       │
│       │                             │
│  ┌────▼────────────────────────┐    │
│  │        JavaScript Layer     │    │
│  │  main.js  (inicialização)   │    │
│  │  ui.js    (DOM / render)    │    │
│  │  forms.js (form / CRUD)     │    │
│  │  storage.js (LocalStorage)  │    │
│  │  api.js   (fetch / APIs)    │    │
│  │  utils.js (CSV / máscaras)  │    │
│  └────────────┬────────────────┘    │
│               │                     │
│  ┌────────────▼────────────────┐    │
│  │       LocalStorage          │    │
│  │  SCTEC_EMPREENDIMENTOS_DB   │    │
│  │  SCTEC_THEME                │    │
│  └─────────────────────────────┘    │
└──────────────┬──────────────────────┘
               │ fetch()
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐   ┌────────▼───────┐
│ BrasilAPI  │   │    ViaCEP      │
│ /cnpj/v1/  │   │ /ws/{cep}/json │
└────────────┘   └────────────────┘
```

---

## 8. Roadmap de Melhorias

### 🔴 Alta Prioridade (Bugs Críticos)
- [ ] Corrigir campo `tipoPessoa` não capturado pelo FormData
- [ ] Corrigir campo `situacao` nas observações do CNPJ
- [ ] Corrigir máscara de telefone (regex incorreta)
- [ ] Remover código morto (`validarFormulario`, `preencherForm`, `elSC`)
- [ ] Corrigir mensagem de validação com texto de desenvolvimento

### 🟡 Média Prioridade (Novas Funcionalidades)
- [ ] Incluir sócios (QSA) nas observações do CNPJ
- [ ] Adicionar spinner/loading durante consultas de API
- [ ] Validar dígitos verificadores de CNPJ/CPF
- [ ] Paginação da tabela
- [ ] Confirmação ao fechar modal com dados não salvos

### 🟢 Baixa Prioridade (Melhorias de Qualidade)
- [ ] Backup e restore do LocalStorage
- [ ] Acessibilidade (ARIA labels, navegação por teclado)
- [ ] Sincronização entre abas (evento `storage`)
- [ ] Validação de CNPJ/CPF no CSV de importação
- [ ] Campo de data de cadastro visível na tabela

---

## 9. Como Executar

```bash
# Opção 1 — Abrir diretamente
Abra index.html no navegador

# Opção 2 — Live Server (VS Code) — recomendado para APIs
Instale a extensão Live Server e clique em "Go Live"

# Opção 3 — Acesso online
https://prbretas.github.io/SCTEC-Gestao_de_Empresas/
```

> ⚠️ Abrir via `file://` pode bloquear as chamadas de API por restrições CORS do navegador. Use o Live Server.

---

## 10. Dependências Externas

| Dependência | Versão | Uso |
|---|---|---|
| Bootstrap CSS | 5.3.0 | Estilização e componentes UI |
| Bootstrap JS Bundle | 5.3.0 | Modal, Switch e utilitários |
| BrasilAPI | v1 | Consulta de dados cadastrais por CNPJ |
| ViaCEP | — | Consulta de endereço por CEP |
