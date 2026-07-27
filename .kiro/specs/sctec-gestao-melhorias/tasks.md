# Tasks: SCTEC Gestão de Empreendimentos — Melhorias e Documentação

## Task Dependency Graph

```
T1 (Fix tipoPessoa) ──────────────────────────────────┐
T2 (Fix feedback ViaCEP) ─────────────────────────────┤
T3 (Fix crm.js duplicado) ────────────────────────────┤──► T8 (Testes)
T4 (Fix Dark Mode duplicado) ────────────────────────┐│
T5 (Fix Navbar cadastros #33) ────────────────────────┤┤
T6 (Navbar todas as telas #35) ──────── depende T5 ──┘│
T7 (Documentação produto/técnica) ───────────────────┘
```

---

## Tasks

- [ ] **T1: Corrigir persistência do campo `tipoPessoa` no handleSave**

  **Arquivo:** `src/js/shared/forms.js`  
  **Requisito:** Req 2 — tipoPessoa não capturado corretamente

  Em `handleSave`, após `const tipoPessoa = dados.tipoPessoa || "PJ";`, inserir a linha que persiste o valor de volta no objeto `dados` antes de chamar `EmpreendimentoStorage.adicionar(dados)` ou `atualizar()`:

  ```js
  dados.tipoPessoa = tipoPessoa;
  ```

  Isso garante que o campo seja salvo corretamente no LocalStorage e apareça na exportação CSV/Excel.

  Também corrigir `carregarDadosNoForm` para restaurar o valor do dropdown ao abrir edição/visualização:

  ```js
  const selectTipo = document.querySelector("#tipo-pessoa");
  if (selectTipo) selectTipo.value = emp.tipoPessoa || "PJ";
  ```

  **Critério de aceite:** Salvar um empreendimento PF, exportar CSV e confirmar coluna `TipoPessoa` = "PF".

---

- [ ] **T2: Adicionar feedback visual durante consulta ViaCEP**

  **Arquivo:** `src/js/shared/forms.js`  
  **Requisito:** Req 6 — feedback visual para ViaCEP

  No listener do `inputCep` (evento `blur`), antes de `ApiService.buscarCep(cep)`, desabilitar os campos `#endereco`, `#municipio`, `#estado` e o próprio `#cep`, e restaurá-los após a resposta (em bloco `try/finally`):

  ```js
  inputCep?.addEventListener("blur", async () => {
    const cep = inputCep.value.replace(/\D/g, "");
    if (cep.length === 8) {
      const camposEndereco = [
        document.querySelector("#cep"),
        document.querySelector("#endereco"),
        document.querySelector("#municipio"),
        document.querySelector("#estado"),
      ].filter(Boolean);
      camposEndereco.forEach((c) => { c.disabled = true; });
      try {
        const dados = await ApiService.buscarCep(cep);
        if (dados) {
          document.querySelector("#endereco").value = `${dados.logradouro}, ${dados.bairro}`;
          document.querySelector("#municipio").value = dados.localidade;
          const selectEstado = document.querySelector("#estado");
          if (selectEstado && dados.uf) selectEstado.value = dados.uf;
        }
      } finally {
        camposEndereco.forEach((c) => { c.disabled = false; });
      }
    }
  });
  ```

  **Critério de aceite:** Ao digitar um CEP válido, os campos de endereço ficam desabilitados durante a consulta e voltam habilitados ao concluir.

---

- [ ] **T3: Corrigir declarações duplicadas em `crm.js`**

  **Arquivo:** `src/js/modules/crm.js`  
  **Bug crítico:** O arquivo possui `const CrmStorage`, `const ETAPAS`, e um segundo bloco `document.addEventListener("DOMContentLoaded", ...)` declarados **duas vezes**, causando `SyntaxError` e impedindo o carregamento do módulo CRM.

  Remover o segundo bloco duplicado inteiro (do segundo `const CrmStorage = {` até o final do arquivo). Manter apenas a primeira declaração de `CrmStorage`, `ETAPAS`, e o primeiro `DOMContentLoaded` (que inclui lógica de modo visualização/edição e `visualizarOportunidade`).

  **Critério de aceite:** A tela `crm.html` carrega sem erros de console e o kanban renderiza corretamente.

---

- [ ] **T4: Consolidar Dark Mode — remover `initDarkMode` duplicado de `ui.js`**

  **Arquivo:** `src/js/shared/ui.js`  
  **Issue:** #36 — Sincronização do Dark Mode entre todas as telas

  O método `initDarkMode()` em `UIController` é redundante — duplica a lógica do `ThemeController`. Ao coexistirem, podem sobrescrever o estado um do outro.

  Remover o método `initDarkMode()` de `UIController` e a chamada `this.initDarkMode()` dentro de `UIController.init()`.

  O `ThemeController.init()` já é chamado em `main.js` depois de `UIController.init()`, então o dark mode continuará funcionando corretamente. Também verificar se `UIController.init()` tem alguma referência ao switch `#dark-mode-switch` fora de `initDarkMode` — se houver, mantê-la apenas se não conflitar com `ThemeController`.

  **Critério de aceite:** Dark mode funciona em `cadastros.html` e o estado persiste ao navegar para outras telas.

---

- [ ] **T5: Corrigir Bug #33 — Navbar ausente/não renderizado na tela de Cadastros**

  **Arquivo:** `src/js/shared/main.js` e `cadastros.html`  
  **Issue:** #33 — Bug crítico, priority:high, sprint-1

  **Causa confirmada:** O `NavbarController.init("cadastros")` em `main.js` depende de `window.NavbarController` e `window.ConfigController`. Ambos são declarados com `window.X = X` em seus respectivos arquivos. A ordem de carregamento em `cadastros.html` está correta (`config.js` → `auth.js` → ... → `navbar.js` → `forms.js` → `main.js`).

  **Ação:** Adicionar guard de proteção em `main.js` para garantir que `NavbarController` foi carregado:

  ```js
  document.addEventListener("DOMContentLoaded", () => {
    ConfigController.aplicar();
    if (window.NavbarController) {
      NavbarController.init("cadastros");
    } else {
      console.error("NavbarController não carregado — verificar ordem de scripts em cadastros.html");
    }
    if (window.ThemeController) ThemeController.init();
    UIController.init();
    FormController.init();
    console.log("SCTEC - Sistema Operacional");
  });
  ```

  Verificar também se existe algum erro JS anterior que impeça a execução de `main.js` (como o bug duplicado de `crm.js` — mas crm.js não é carregado em cadastros.html, logo não é causa direta).

  Verificar no HTML se `<div id="app-navbar"></div>` está presente **antes** do `<main>` — confirmado que está.

  **Ação adicional:** Confirmar que `modules.js` não é necessário para `cadastros.html` (CRM e Financeiro carregam `modules.js`, mas `cadastros.html` não o inclui — verificar se `NavbarController` depende de `MODULOS_CATALOGO` de `modules.js`).

  **Critério de aceite:** Navbar renderizado com logo, nome do sistema, identidade do usuário, botão Home e toggle de dark mode ao acessar `cadastros.html`.

---

- [ ] **T6: Garantir Navbar padronizado em todas as telas de módulos**

  **Arquivos:** `agenda.html`, `propostas.html`, e todos os módulos que usam NavbarController  
  **Issue:** #35 — REFINADO, priority:high, sprint-1 — depende de T5

  Auditar e corrigir as seguintes telas para garantir que todas incluem na ordem correta:
  1. `config.js`, `auth.js`, `storage.js`, `theme.js`, `navbar.js` como scripts
  2. `NavbarController.init("<id-modulo>")` chamado no `DOMContentLoaded`
  3. `ThemeController.init()` chamado no `DOMContentLoaded`

  Telas a verificar: `agenda.html`, `propostas.html`, `dashboard.html`, `settings.html`, `admin.html`

  Para cada tela com problema, corrigir o HTML/JS conforme o padrão de `crm.html` e `financeiro.html` (que já estão corretos).

  **Critério de aceite:** Navbar aparece consistentemente em todas as telas de módulos com o mesmo layout visual.

---

- [ ] **T7: Criar documentação de produto e técnica**

  **Arquivos:** `docs/product.md`, `docs/technical.md`  
  **Requisito:** Req 7

  **`docs/product.md`** deve cobrir:
  - Visão do produto e público-alvo
  - Funcionalidades principais (Cadastros, CRM, Financeiro, Agenda, Propostas, Dashboard)
  - Limitações conhecidas (front-end puro, sem backend, dados no localStorage)
  - Roadmap (sprints 1-3 do kanban)

  **`docs/technical.md`** deve cobrir:
  - Arquitetura dos módulos (diagrama em texto/ASCII)
  - Fluxo de dados (LocalStorage, APIs externas)
  - Contratos das APIs externas (BrasilAPI, ViaCEP — campos usados)
  - Estrutura do objeto empreendimento no LocalStorage
  - Instrução de execução (abrir via Live Server ou servidor estático)
  - Convenções de código (nomes de controllers, eventos, escopos globais)

  **Critério de aceite:** Ambos os arquivos existem em `docs/`, têm sumário com links internos e cobrem todos os tópicos listados.

---

- [ ] **T8: Verificar e atualizar suite de testes automatizados**

  **Arquivos:** `tests/`  
  **Requisito:** Issue #37 — priority:high, sprint-2 — depende de T1, T2, T3, T4

  Verificar os testes existentes em `tests/` e adicionar/atualizar cobertura para:

  1. `tipoPessoa` persistido corretamente em `handleSave` (T1)
  2. Feedback visual ViaCEP — campos desabilitados durante consulta (T2)
  3. `crm.js` sem erros de duplicata (T3)
  4. `UIController` sem `initDarkMode` (T4)
  5. `montarObservacoesExtras` — verificar que `situacao` usa `descricao_situacao_cadastral`
  6. `aplicarMascaraTelefone` — 10 e 11 dígitos
  7. `validarCNPJ` e `validarCPF` — casos válidos e inválidos

  Executar a suite com `npm test` (Vitest) e garantir que todos passam antes de fazer commit.

  **Critério de aceite:** `npm test` executa sem erros. Cobertura dos pontos acima presente nos arquivos de teste.
