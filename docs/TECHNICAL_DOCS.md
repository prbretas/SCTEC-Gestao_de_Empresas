# 🔧 Documentação Técnica — SCTEC Gestão de Empreendimentos SC

**Versão:** 1.0.0  
**Data:** Junho 2026  
**Autor:** Philippe Bretas

---

## 1. Visão Geral da Arquitetura

O SCTEC é uma **Single Page Application (SPA) front-end puro**, sem build tool, sem framework JS e sem back-end próprio. Todo o estado da aplicação é mantido no `localStorage` do navegador.

### Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Estrutura | HTML5 semântico |
| Estilização | CSS3 com variáveis customizadas + Bootstrap 5.3.0 |
| Lógica | JavaScript ES6+ (Vanilla, sem transpiler) |
| Persistência | Web Storage API (`localStorage`) |
| APIs externas | BrasilAPI (CNPJ) + ViaCEP (CEP) via `fetch()` |
| Carregamento | Scripts síncronos no final do `<body>` |

---

## 2. Estrutura de Arquivos

```
SCTEC-Gestao_de_Empresas/
├── index.html              # Única página HTML — estrutura e marcação semântica
├── css/
│   └── styles.css          # Todos os estilos, temas e variáveis CSS
├── js/
│   ├── utils.js            # Carregado 1º — sem dependências externas
│   ├── storage.js          # Carregado 2º — usa apenas LocalStorage
│   ├── api.js              # Carregado 3º — usa fetch() e expõe window.ApiService
│   ├── ui.js               # Carregado 4º — depende de utils.js e storage.js
│   ├── forms.js            # Carregado 5º — depende de todos acima
│   └── main.js             # Carregado 6º — ponto de entrada, chama init()
├── docs/
│   ├── PRODUCT_SPEC.md     # Spec de produto
│   ├── TECHNICAL_DOCS.md   # Este arquivo
│   └── ISSUES.md           # Bugs e melhorias identificados
└── README.md               # Visão geral pública do projeto
```

### Ordem de carregamento crítica

Os scripts são carregados de forma síncrona no `<body>`. A ordem é intencional para garantir que os objetos globais estejam disponíveis:

```
utils.js → storage.js → api.js → ui.js → forms.js → main.js
```

> ⚠️ Alterar esta ordem causa `ReferenceError` em tempo de execução.

---

## 3. Módulos JavaScript

### 3.1 `utils.js` — Utilitários

**Objeto global:** `Utils`

Responsabilidades:
- Mapeamento de cores por segmento (`obterConfigSegmento`)
- Máscara de CNPJ/CPF (`aplicarMascaraDocumento`)
- Máscara de telefone (`aplicarMascaraTelefone`)
- Formatação de data/hora (`formatarDataHora`)
- Exportação para CSV (`exportarCSV`)
- Importação de CSV com deduplicação (`importarCSV`)
- Download do modelo CSV (`baixarModeloCSV`)

**Não possui dependências de outros módulos do projeto.**

```javascript
// Exemplo de uso
Utils.obterConfigSegmento("Tecnologia")
// → { bg: "#0d6efd", text: "#ffffff", border: "#0d6efd" }

Utils.aplicarMascaraDocumento("12345678000195", "PJ")
// → "12.345.678/0001-95"
```

---

### 3.2 `storage.js` — Persistência

**Objeto global:** `EmpreendimentoStorage`  
**Chave LocalStorage:** `SCTEC_EMPREENDIMENTOS_DB`

Responsabilidades:
- CRUD completo sobre o array de empreendimentos serializado em JSON
- Geração de ID incremental (`obterProximoId` — usa `Math.max`)
- Timestamps de auditoria (`dataCadastro`, `dataAtualizacao`)

#### Schema do objeto persistido

```typescript
interface Empreendimento {
  id: number;                  // Gerado automaticamente
  nome: string;                // Razão Social / Nome
  tipoPessoa: "PJ" | "PF";    // ⚠️ BUG: não capturado pelo FormData (ver ISSUES.md)
  registro: string;            // CNPJ ou CPF (com ou sem máscara)
  responsavel: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  municipio?: string;
  segmento: string;
  status: "Ativo" | "Inativo";
  observacoes?: string;
  dataCadastro: string;        // ISO 8601
  dataAtualizacao?: string;    // ISO 8601 — só presente após edição
}
```

#### Métodos disponíveis

| Método | Parâmetros | Retorno | Descrição |
|---|---|---|---|
| `buscarTodos()` | — | `Empreendimento[]` | Lê e parseia o LocalStorage |
| `salvarTodos(lista)` | `Empreendimento[]` | `void` | Serializa e persiste a lista |
| `obterProximoId()` | — | `number` | `Math.max(...ids) + 1` |
| `buscarPorId(id)` | `number \| string` | `Empreendimento \| undefined` | Busca com coerção para `Number(id)` |
| `adicionar(objeto)` | `Partial<Empreendimento>` | `Empreendimento` | Adiciona com ID e `dataCadastro` |
| `atualizar(id, objeto)` | `id: number`, `objeto: Partial` | `boolean` | Merge com dados existentes |
| `excluir(id)` | `number` | `void` | Remove por ID com `filter` |

---

### 3.3 `api.js` — Integrações Externas

**Objeto global:** `ApiService` (também exposto via `window.ApiService`)

Responsabilidades:
- Consulta de endereço por CEP via ViaCEP
- Consulta de dados cadastrais de CNPJ via BrasilAPI

#### `ApiService.buscarCep(cep)`

```javascript
// Endpoint: GET https://viacep.com.br/ws/{cep}/json/
// Entrada: string (com ou sem máscara)
// Saída: objeto ViaCEP ou null

// Campos utilizados do retorno:
{
  logradouro: string,
  bairro: string,
  localidade: string,  // → campo municipio
  erro: boolean        // true quando CEP não encontrado
}
```

#### `ApiService.buscarCnpj(cnpj)`

```javascript
// Endpoint: GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
// Entrada: string (com ou sem máscara)
// Saída: objeto padronizado ou null

// Objeto retornado pelo módulo (mapeado da resposta bruta):
{
  razao_social: string,
  nome_fantasia: string,
  data_abertura: string,      // data_inicio_atividade da API
  situacao: string,           // descricao_situacao_cadastral da API
  sugestaoSetor: string,      // cnae_fiscal_descricao da API
  cep: string,
  logradouro: string,
  numero: string,
  municipio: string,
  uf: string,
  qsa: Array<{               // ⭐ Sócios — a ser incluído na próxima versão
    nome_socio: string,
    qualificacao_socio: string,
    data_entrada_sociedade: string
  }>
}
```

> ⚠️ O campo `qsa` (sócios) é retornado pela BrasilAPI mas atualmente **não é mapeado nem exibido** pelo sistema. Ver Requirement 1 em requirements.md.

---

### 3.4 `ui.js` — Interface e Renderização

**Objeto global:** `UIController`  
**Variáveis globais auxiliares:** `direcaoOrdenacao` (1 ou -1), `colunaAtual` (string)

Responsabilidades:
- Inicialização do modal Bootstrap (`bootstrap.Modal`)
- Gerenciamento do tema Dark/Light Mode
- Renderização da tabela com filtro e ordenação
- Atualização dos contadores do dashboard
- Gerenciamento dos ícones de ordenação
- Confirmação e execução de exclusão

#### Fluxo de renderização

```
UIController.renderizarLista()
  │
  ├─ 1. Lê termo de busca e filtro do DOM
  ├─ 2. Busca dados do LocalStorage (sempre fresh)
  ├─ 3. Aplica ordenação atual (colunaAtual + direcaoOrdenacao)
  ├─ 4. Aplica filtro de busca
  ├─ 5. Renderiza linhas no <tbody id="lista-corpo">
  ├─ 6. Atualiza contadores (total, ativos, filtrados)
  └─ 7. Atualiza ícones de ordenação no <thead>
```

#### Estados de ordenação

O estado de ordenação é mantido em variáveis de módulo globais (fora do objeto `UIController`), o que é uma limitação do design atual. Uma mesma chamada a `ordenar(coluna)` alterna a direção se a coluna já estiver ativa, ou reseta para ASC se for uma nova coluna.

---

### 3.5 `forms.js` — Formulário e CRUD

**Objeto global:** `FormController`  
**Função global auxiliar:** `abrirModalCadastro()`

Responsabilidades:
- Inicialização dos listeners do formulário
- Automação de preenchimento via API (blur no CEP e CNPJ)
- Aplicação de máscara de telefone em tempo real
- Estados do formulário: inclusão / edição / visualização (readonly)
- Validação de campos obrigatórios e duplicidade
- Persistência via `EmpreendimentoStorage`
- Auditoria no modal de visualização

#### Fluxo de inclusão

```
abrirModalCadastro()
  └─ Limpa form → remove ID → libera campos → exibe modal

Usuário preenche CNPJ (PJ, 14 dígitos) → blur
  └─ ApiService.buscarCnpj() → preenche nome, endereço, observações

Usuário submete formulário → handleSave()
  ├─ Coleta FormData
  ├─ Valida campos obrigatórios (nome, registro)
  ├─ Verifica duplicidade de registro
  └─ EmpreendimentoStorage.adicionar() → fecha modal → renderizarLista()
```

#### Fluxo de edição

```
FormController.prepararEdicao(id)
  └─ buscarPorId → carregarDadosNoForm → trava Nome e Registro → exibe modal

Usuário submete → handleSave()
  └─ EmpreendimentoStorage.atualizar() → fecha modal → renderizarLista()
```

---

### 3.6 `main.js` — Inicialização

Único ponto de entrada. Aguarda `DOMContentLoaded` e dispara:

```javascript
UIController.init()    // Dark mode + listeners de busca + ordenação inicial
FormController.init()  // Listeners do formulário e inputs
```

---

## 4. Persistência — LocalStorage

### Chaves utilizadas

| Chave | Tipo | Conteúdo |
|---|---|---|
| `SCTEC_EMPREENDIMENTOS_DB` | JSON string | Array de objetos `Empreendimento` |
| `SCTEC_THEME` | string | `"dark"` ou `"light"` |

### Limitações do LocalStorage

- **Capacidade:** ~5MB por origem — suficiente para milhares de registros leves
- **Sincronização:** Sem sincronização automática entre abas (evento `storage` não implementado)
- **Segurança:** Dados em texto plano, acessíveis via DevTools
- **Persistência:** Apagados ao limpar dados do site ou usar navegação privativa

---

## 5. APIs Externas

### 5.1 ViaCEP

| Item | Valor |
|---|---|
| URL base | `https://viacep.com.br/ws/{cep}/json/` |
| Método | GET |
| Autenticação | Nenhuma |
| Rate limit | Não documentado publicamente |
| Timeout implementado | ❌ Não |

**Campos mapeados:**

```
logradouro → #endereco (parte 1)
bairro     → #endereco (parte 2)
localidade → #municipio
```

### 5.2 BrasilAPI — CNPJ

| Item | Valor |
|---|---|
| URL base | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` |
| Método | GET |
| Autenticação | Nenhuma |
| Rate limit | Sim — não documentado, pode retornar 429 |
| Timeout implementado | ❌ Não |
| Documentação oficial | https://brasilapi.com.br/docs |

**Campos mapeados:**

```
razao_social               → #nome
cep                        → #cep
logradouro + numero        → #endereco
municipio                  → #municipio
data_inicio_atividade      → Observações (DATA DE ABERTURA)
nome_fantasia              → Observações (NOME FANTASIA)
descricao_situacao_cadastral → Observações (SITUAÇÃO) ⚠️ BUG: campo errado
cnae_fiscal_descricao      → Observações (CNAE PRINCIPAL)
qsa[]                      → Observações (SÓCIOS) ⭐ A implementar
```

---

## 6. CSS e Temas

### Variáveis CSS (`:root`)

```css
/* Tema Light */
--sc-header: #333a60       /* Cor do header e títulos */
--sc-header2: #67ff61      /* Borda inferior do navbar (verde) */
--sc-btn: #006ebc           /* Botão primário */
--sc-btn-hover: #005490
--sc-btn-active: #003f6c
--tab-header-bg: #f8f9fa   /* Background do header da tabela */
--tab-header-text: #333a60
--tab-border: #dee2e6

/* Tema Dark */
--dark-bg: #121212
--dark-bg-grid: #1e1e1e
--dark-input: #2c2c2c
--dark-text: #e0e0e0
--dark-border: #333333
```

### Implementação do Dark Mode

O dark mode é implementado pela adição/remoção da classe `dark-mode` no `<body>`. Os estilos de dark mode são seletores específicos do tipo `body.dark-mode .componente`, garantindo que o tema light seja o padrão.

```javascript
// UIController.initDarkMode()
document.body.classList.toggle("dark-mode", isDark);
localStorage.setItem("SCTEC_THEME", isDark ? "dark" : "light");
```

---

## 7. Segmentos e Cores

O mapeamento de cores dos badges de segmento é centralizado em `Utils.obterConfigSegmento()`:

| Segmento | Background | Texto |
|---|---|---|
| Tecnologia | `#0d6efd` (azul) | branco |
| Indústria | `#9c27b0` (roxo) | branco |
| Logística | `#ef6c00` (laranja) | branco |
| Comércio | `#58a85c` (verde) | branco |
| Serviços | `#8f0e00` (vinho) | branco |
| Cliente | `#00838f` (teal) | branco |
| Transportes | `#602800` (marrom) | branco |
| Fornecedor | `#cadd00` (amarelo) | `#4b4b4b` |

> ⚠️ O segmento "Outros" existe como fallback no código mas não é opção no `<select>` do formulário. O fallback retorna cinza claro.

---

## 8. Formato do CSV

### Cabeçalho e ordem das colunas

```
Nome;TipoPessoa;Registro;Responsavel;Email;Telefone;Endereco;Municipio;Segmento;Status;Observacoes
```

**Índices (0-based):**

| Índice | Campo |
|---|---|
| 0 | Nome |
| 1 | TipoPessoa |
| 2 | Registro |
| 3 | Responsavel |
| 4 | Email |
| 5 | Telefone |
| 6 | Endereco |
| 7 | Municipio |
| 8 | Segmento |
| 9 | Status |
| 10 | Observacoes |

- Separador: `;` (ponto e vírgula)
- Encoding: UTF-8 com BOM (`\ufeff`) para compatibilidade com Excel
- Quebra de linha: `\n`

---

## 9. Fluxos de Dados

### Fluxo: Novo Cadastro com CNPJ

```
Usuário abre modal
  → abrirModalCadastro()
  → form.reset() + setReadOnly(false)

Usuário digita CNPJ e sai do campo
  → inputReg.addEventListener("blur")
  → ApiService.buscarCnpj(cnpj)
    → fetch("https://brasilapi.com.br/api/cnpj/v1/{cnpj}")
    → preenche: nome, cep, endereco, municipio, observacoes

Usuário clica em Salvar
  → handleSave(e)
  → FormData coleta campos com atributo name=
  → Valida obrigatórios
  → Verifica duplicidade
  → EmpreendimentoStorage.adicionar(dados)
    → JSON.parse(localStorage) → push → JSON.stringify → localStorage.setItem
  → UIController.renderizarLista()
```

### Fluxo: Importação CSV

```
Usuário seleciona arquivo
  → FileReader.readAsText(arquivo, "UTF-8")
  → split por \n → para cada linha:
    → split por ";"
    → valida mínimo de 3 colunas e colunas 0 e 2 não vazias
    → normaliza CNPJ/CPF removendo \D
    → verifica duplicidade vs LocalStorage e vs lista em memória
  → exibe resumo: total / duplicados / erros / novos
  → se confirmado: EmpreendimentoStorage.adicionar() para cada novo
  → UIController.renderizarLista()
```

---

## 10. Considerações de Segurança

| Risco | Nível | Status |
|---|---|---|
| XSS via `tr.innerHTML` com dados do usuário | Médio | ⚠️ Não mitigado — dados são inseridos via template string sem sanitização |
| Dados sensíveis em texto plano no LocalStorage | Baixo | Aceitável para uso interno |
| CORS em chamadas de API | Baixo | APIs externas aceitam chamadas de qualquer origem |
| Ausência de validação de CNPJ (dígito verificador) | Médio | ⚠️ Não implementado |

---

## 11. Como Contribuir

1. Fork o repositório
2. Crie uma branch descritiva: `git checkout -b fix/mascara-telefone`
3. Implemente a correção seguindo o padrão de objetos literais do projeto
4. Teste manualmente no navegador (Light + Dark mode, responsividade)
5. Abra um Pull Request referenciando a issue correspondente
