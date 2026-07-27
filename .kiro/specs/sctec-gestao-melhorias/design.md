# Design: SCTEC Gestão de Empreendimentos — Melhorias e Documentação

## Visão Geral da Arquitetura

O SCTEC é uma aplicação front-end pura (HTML + CSS + JS vanilla), sem bundler ou framework. Todos os módulos são carregados via `<script>` em ordem de dependência no HTML. A persistência é feita via `localStorage` com chave isolada por usuário (`SCTEC_DATA_{userId}`).

```
cadastros.html
└── DOMContentLoaded → main.js
    ├── ConfigController.aplicar()         (config.js)
    ├── NavbarController.init("cadastros") (navbar.js)
    ├── ThemeController.init()             (theme.js)
    ├── UIController.init()                (ui.js)
    └── FormController.init()              (forms.js)
```

### Mapa de Módulos

| Camada | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| Core | `auth.js` | Sessão, login, guard de rota |
| Core | `storage.js` | CRUD no localStorage (`EmpreendimentoStorage`) |
| Core | `navbar.js` | Navbar padronizado (renderiza `#app-navbar`) |
| Core | `theme.js` | Dark/Light mode centralizado |
| Core | `config.js` | Configurações visuais (cores, logo, nome) |
| Core | `inactivity.js` | Logout por inatividade |
| Shared | `api.js` | `ApiService` — BrasilAPI (CNPJ) e ViaCEP (CEP) |
| Shared | `forms.js` | `FormController` — formulário, validação, save, sócios QSA |
| Shared | `ui.js` | `UIController` — lista, paginação, ordenação, dark mode |
| Shared | `utils.js` | Máscaras, validação CNPJ/CPF, export CSV/Excel/JSON |
| Shared | `main.js` | Bootstrap de `cadastros.html` — cola todos os controllers |
| Shared | `contatos.js` | `ContatosController` — aba de contatos vinculados |
| Shared | `tarefas.js` | `TarefasController` — aba de tarefas e follow-up |
| Modules | `crm.js` | Módulo CRM |
| Modules | `financeiro.js` | Módulo Financeiro |
| Modules | `agenda.js` | Módulo Agenda |
| Modules | `propostas.js` | Módulo Propostas |
| Pages | `home.js`, `dashboard.js`, `admin.js`, etc. | Páginas independentes |

### Estrutura do Objeto Empreendimento (LocalStorage)

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
  "socios": [...],
  "contatos": [...],
  "tarefas": [...],
  "dataCadastro": "2025-01-01T00:00:00.000Z",
  "dataAtualizacao": "2025-01-02T00:00:00.000Z"
}
```

---

## Design por Requisito

### Req 1 & 3 — QSA (Sócios) e `situacao` do CNPJ

**Status atual:** Já implementado em `forms.js` (`montarObservacoesExtras`, `renderizarSocios`) e `api.js` (`buscarCnpj`).

**Problema identificado no Req 3:** `api.js` já mapeia `data.descricao_situacao_cadastral` para `situacao`. O campo `montarObservacoesExtras` usa `dados.situacao` corretamente. Nenhuma alteração necessária — apenas validar no teste.

**Ponto de atenção:** `FormData` não captura `<select id="tipo-pessoa" name="tipoPessoa">` quando o select está dentro de um `input-group` sem estar dentro do `<form>`. Precisa verificar no HTML se o select está dentro do `<form id="form-empreendimento">`. Confirmado: o select está dentro do form, mas o bug pode ser que `tipoPessoa` está ausente no objeto `dados` porque o FormData não captura selects corretamente em alguns browsers ao usar `Object.fromEntries`.

### Req 2 — Correção do `tipoPessoa` no FormData

**Causa raiz:** Em `handleSave`, o `FormData` coleta entradas por `name`. O select `#tipo-pessoa` tem `name="tipoPessoa"` — a coleta deveria funcionar. O bug real é que `handleSave` usa `dados.tipoPessoa || "PJ"` como fallback, mas não persiste explicitamente. A linha:

```js
const tipoPessoa = dados.tipoPessoa || "PJ";
```

usa a variável local `tipoPessoa` mas **não a insere em `dados`** antes de persistir. O objeto salvo no storage não inclui `tipoPessoa`.

**Correção:** Antes de `EmpreendimentoStorage.adicionar(dados)` / `atualizar()`, adicionar:

```js
dados.tipoPessoa = tipoPessoa;
```

### Req 4 — Limpeza de Código Morto em `forms.js` e `ui.js`

**`forms.js`:** Não há funções `validarFormulario()` ou `preencherForm()` no código atual — foram removidas em versão anterior. Req atendido. A mensagem de alerta `"⚠️ Preencha os campos obrigatórios em destaque."` já é genérica e profissional.

**`ui.js`:** Não há referência a `elSC` ou `#qtd-sc` no código atual. Req já atendido.

**Ação necessária:** Verificar mensagem `"⚠️ Estado (UF) é obrigatório."` — está correta.

### Req 5 — Máscara de Telefone

**Status atual:** `Utils.aplicarMascaraTelefone` já implementa:
- 11 dígitos → `(XX) XXXXX-XXXX`
- 10 dígitos → `(XX) XXXX-XXXX`
- Ignora não-numéricos

O listener está em `FormController.initInputs()`. **Req já atendido no código.**

### Req 6 — Feedback Visual durante Consultas de API

**Status atual:** `forms.js` já implementa para CNPJ:

```js
inputReg.disabled = true;
inputReg.placeholder = "Consultando CNPJ...";
// ... await ...
inputReg.disabled = false;
inputReg.placeholder = "";
```

Para CEP (ViaCEP), **ainda não há feedback visual** — os campos de endereço não são desabilitados durante a consulta.

**Correção para ViaCEP:** Desabilitar `#endereco`, `#municipio`, `#estado` durante `buscarCep`.

### Req 7 — Bug #33: Navbar ausente na tela de Cadastros

**Causa raiz identificada:** O `<div id="app-navbar"></div>` existe em `cadastros.html`. O `main.js` chama `NavbarController.init("cadastros")`. O `NavbarController` usa `window.AuthService` e `window.ConfigController`.

O bug ocorre quando `config.js` ou `auth.js` não está carregado antes de `navbar.js`. A ordem atual nos scripts é:

```html
config.js → auth.js → utils.js → storage.js → api.js → ui.js → theme.js → navbar.js → forms.js → ...
```

Isso está correto. **Possível causa:** Se `ConfigController` não está exposto em `window` antes de `NavbarController.init()`. Verificar se `config.js` exporta `window.ConfigController`.

### Issue #35 — Navbar padronizado em todas as telas

**Situação atual:** `navbar.js` e `NavbarController` já existem. O problema é que telas como `crm.html`, `financeiro.html`, `agenda.html`, `propostas.html` podem não incluir o script `navbar.js` ou não chamar `NavbarController.init()`.

**Solução:** Auditar todos os HTMLs de módulos e páginas para garantir inclusão correta de `navbar.js`, `theme.js` e chamada de `NavbarController.init()` com o id correto do módulo.

### Issue #36 — Sincronização do Dark Mode entre todas as telas

**Situação atual:** `theme.js` já centraliza o Dark Mode com `localStorage`. O `ThemeController.init()` lê `SCTEC_THEME` e aplica ao body. Qualquer tela que carregue `theme.js` e chame `ThemeController.init()` terá o estado sincronizado.

**Problema:** Telas que usam lógica inline de dark mode em `ui.js` (`initDarkMode()`) em vez de `ThemeController` — as duas lógicas coexistem e podem conflitar.

**Solução:** Remover `initDarkMode()` de `UIController` e delegar exclusivamente ao `ThemeController`. Garantir que todas as telas chamem `ThemeController.init()`.

---

## Contratos das APIs Externas

### BrasilAPI — CNPJ

```
GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}
```

Campos utilizados:
- `razao_social` → `#nome`
- `nome_fantasia` → observações
- `data_inicio_atividade` → observações
- `descricao_situacao_cadastral` → observações (campo `situacao`)
- `cnae_fiscal_descricao` → observações (`sugestaoSetor`)
- `cep`, `logradouro`, `numero`, `municipio`, `uf` → endereço
- `qsa[]` → sócios (nome_socio, qualificacao_socio, data_entrada_sociedade)

### ViaCEP

```
GET https://viacep.com.br/ws/{cep}/json/
```

Campos utilizados: `logradouro`, `bairro`, `localidade`, `uf`

---

## Estratégia de Testes

Testes unitários em `tests/` usando Vitest (conforme `package.json` existente).

- `tests/utils.test.js` — validar CNPJ, CPF, máscaras
- `tests/forms.test.js` — tipoPessoa, montarObservacoesExtras, feedback visual ViaCEP
- `tests/api.test.js` — mock de fetch para BrasilAPI e ViaCEP
- `tests/ui.test.js` — remoção do initDarkMode duplicado
- `tests/navbar.test.js` — renderização do navbar nas telas

---

## Plano de Implementação (Ordem de Execução)

1. **Fix `tipoPessoa`** — 1 linha em `forms.js` (Req 2)
2. **Fix feedback ViaCEP** — adicionar disable/enable em `initInputs` (Req 6)
3. **Fix Dark Mode duplicado** — remover `initDarkMode` de `ui.js` (Issue #36)
4. **Fix Navbar nas telas** — auditar e corrigir todos os HTMLs (Issue #35 + Bug #33)
5. **Verificar config.js** — garantir `window.ConfigController` exposto
6. **Documentação** — `docs/product.md` e `docs/technical.md` (Req 7)
7. **Testes** — escrever/atualizar suite de testes automatizados
