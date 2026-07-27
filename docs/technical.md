# Documentação Técnica — SCTEC

## Arquitetura

Aplicação front-end pura: HTML + CSS (Bootstrap 5.3) + JavaScript vanilla. Sem bundler, transpilador ou framework. Scripts carregados via `<script>` em ordem de dependência no HTML.

### Mapa de Módulos

```
src/js/
├── core/               # Infraestrutura transversal
│   ├── auth.js         # AuthService — sessão, login, guard de rota
│   ├── config.js       # ConfigController — identidade visual por org
│   ├── inactivity.js   # Logout por inatividade
│   ├── modules.js      # MODULOS_CATALOGO — catálogo de módulos
│   ├── navbar.js       # NavbarController — navbar padronizado
│   ├── storage.js      # EmpreendimentoStorage — CRUD no localStorage
│   └── theme.js        # ThemeController — Dark/Light mode
├── shared/             # Compartilhado pela tela de Cadastros
│   ├── api.js          # ApiService — BrasilAPI (CNPJ) e ViaCEP (CEP)
│   ├── contatos.js     # ContatosController — aba de contatos vinculados
│   ├── forms.js        # FormController — formulário, validação, QSA
│   ├── main.js         # Bootstrap de cadastros.html
│   ├── tarefas.js      # TarefasController — aba de tarefas e follow-up
│   ├── ui.js           # UIController — lista, paginação, ordenação
│   └── utils.js        # Utils — máscaras, validações, exportações
├── modules/            # Módulos independentes (cada um inicializa seu próprio DOMContentLoaded)
│   ├── agenda.js       # AgendaStorage + renderização de compromissos
│   ├── crm.js          # CrmStorage + board kanban
│   ├── financeiro.js   # FinanceiroStorage + controle de transações
│   └── propostas.js    # PropostasStorage + geração e impressão de propostas
└── pages/              # Páginas únicas
    ├── admin.js
    ├── dashboard.js
    ├── home.js
    ├── login.js
    ├── register.js
    └── settings.js
```

## Ordem de Carregamento de Scripts (cadastros.html)

```
config.js → auth.js → utils.js → storage.js → api.js → ui.js → theme.js → navbar.js → forms.js → contatos.js → tarefas.js → main.js → inactivity.js
```

Os módulos independentes (crm.html, financeiro.html, agenda.html, propostas.html) seguem a ordem:

```
config.js → auth.js → storage.js → modules.js → theme.js → navbar.js → {modulo}.js → inactivity.js
```

## Estrutura do Objeto Empreendimento (localStorage)

**Chave:** `SCTEC_DATA_{userId}` (ex: `SCTEC_DATA_1`)

```json
{
  "id": 1,
  "nome": "EMPRESA EXEMPLO LTDA",
  "tipoPessoa": "PJ",
  "registro": "00.000.000/0001-00",
  "responsavel": "NOME RESPONSAVEL",
  "email": "contato@exemplo.com",
  "telefone": "(47) 99999-8888",
  "cep": "89000-000",
  "endereco": "RUA EXEMPLO, 100",
  "estado": "SC",
  "municipio": "JOINVILLE",
  "segmento": "Tecnologia",
  "status": "Ativo",
  "observacoes": "...",
  "socios": [
    {
      "nome_socio": "NOME DO SOCIO",
      "qualificacao_socio": "Sócio-Administrador",
      "data_entrada_sociedade": "2020-01-01"
    }
  ],
  "contatos": [
    { "nome": "Contato 1", "cargo": "Gerente", "telefone": "(47) 99999-0000", "email": "contato@ex.com" }
  ],
  "tarefas": [
    { "titulo": "Follow-up", "status": "A fazer", "prioridade": "Alta", "vencimento": "2025-12-31" }
  ],
  "dataCadastro": "2025-01-01T00:00:00.000Z",
  "dataAtualizacao": "2025-01-02T00:00:00.000Z"
}
```

## Chaves do localStorage

| Chave | Módulo | Escopo |
|-------|--------|--------|
| `SCTEC_DATA_{userId}` | Empreendimentos | Por usuário |
| `SCTEC_CRM_{orgId}` | Oportunidades CRM | Por organização |
| `SCTEC_FINANCEIRO_{orgId}` | Transações Financeiras | Por organização |
| `SCTEC_AGENDA_{orgId}` | Compromissos | Por organização |
| `SCTEC_PROPOSTAS_{orgId}` | Propostas e Orçamentos | Por organização |
| `SCTEC_CONFIG_{orgId}` | Configurações visuais | Por organização |
| `SCTEC_THEME` | Preferência dark/light | Global (dispositivo) |
| `SCTEC_PAGE_SIZE` | Itens por página | Global (dispositivo) |

## Contratos das APIs Externas

### BrasilAPI — CNPJ

```
GET https://brasilapi.com.br/api/cnpj/v1/{cnpj14digitos}
```

| Campo da API | Uso no sistema |
|---|---|
| `razao_social` | Campo Nome/Razão Social |
| `nome_fantasia` | Campo Observações |
| `data_inicio_atividade` | Campo Observações |
| `descricao_situacao_cadastral` | Campo Observações (SITUAÇÃO) |
| `cnae_fiscal_descricao` | Campo Observações (CNAE) |
| `cep`, `logradouro`, `numero`, `municipio`, `uf` | Campos de endereço |
| `qsa[]` | Seção de Sócios (nome_socio, qualificacao_socio, data_entrada_sociedade) |

### ViaCEP — CEP

```
GET https://viacep.com.br/ws/{cep8digitos}/json/
```

| Campo da API | Uso no sistema |
|---|---|
| `logradouro`, `bairro` | Campo Endereço |
| `localidade` | Campo Município |
| `uf` | Select Estado |

## Como Executar

### Produção (apenas HTML)

1. Clonar o repositório
2. Abrir `src/SCTEC-Gestao_de_Empresas/` com Live Server (VS Code) ou qualquer servidor HTTP estático
3. Acessar `index.html` — redireciona automaticamente para login
4. Criar conta em `register.html`

> Não requer instalação de dependências. Todos os scripts externos são carregados via CDN (Bootstrap, SheetJS).

### Desenvolvimento e Testes

```bash
cd src/SCTEC-Gestao_de_Empresas/
npm install       # Instala Vitest, ESLint e dependências de dev
npm test          # Executa a suite de testes unitários com Vitest
npm run lint      # Executa o ESLint
```

## Convenções de Código

- Cada módulo expõe um `const NomeController = { ... }` ou `const NomeStorage = { ... }` no escopo global
- Controllers que precisam de acesso externo devem ser expostos via `window.NomeController = NomeController`
- Cada módulo independente inicializa tudo no seu `DOMContentLoaded` — sem dependência de `main.js`
- `main.js` é exclusivo de `cadastros.html` e cola todos os controllers da tela de cadastros
- Campos de texto são normalizados para MAIÚSCULAS ao salvar (exceto email)
