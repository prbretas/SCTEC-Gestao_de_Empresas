# 📜 SCTEC — Histórico de Desenvolvimento

> Registro de todas as funcionalidades implementadas, com data, arquivos alterados e referência de commit.
> Itens concluídos são movidos do `newpromptupdates.md` para cá.

---

### [Junho/2026] — BUG-01: Campo tipoPessoa não persistido
- Adicionado `name="tipoPessoa"` no `<select>` em `index.html`
- **Commit:** `368cb9a`

---

### [Junho/2026] — BUG-02: Campo SITUAÇÃO exibia undefined
- Corrigido para usar `dados.situacao` em `forms.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — BUG-03: Máscara de telefone com regex incorreta
- Função `aplicarMascaraTelefone` reescrita em `utils.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — BUG-04: Referência a #qtd-sc inexistente
- Declaração `elSC` removida de `ui.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — BUG-05: Mensagem de validação com nome do dev exposto
- Mensagem genérica e profissional em `forms.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — REFACTOR-01/02/03: Funções mortas removidas
- `validarFormulario()`, `preencherForm()`, `renderizarComOrdem()` removidas de `forms.js` e `ui.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-01: QSA — Quadro de Sócios
- Cards visuais de sócios com avatar, badge e persistência em `forms.js`
- Dados `qsa` mapeados em `api.js`
- **Arquivos:** `js/api.js`, `js/forms.js`, `index.html`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-02: Feedback visual durante consulta CNPJ
- `inputReg.disabled` + placeholder "Consultando CNPJ..." em `forms.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-03: Validação de dígitos CNPJ/CPF
- `validarCNPJ()` e `validarCPF()` implementados em `utils.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-04: Paginação da tabela
- Paginação com 10/25/50/100 itens por página em `ui.js` + `index.html`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-05: Backup e Restore JSON
- `backupJSON()` e `restaurarJSON()` em `utils.js`
- Botões Backup e Restore em `index.html`
- **Commit:** `368cb9a`

---

### [Junho/2026] — FEATURE-06: Confirmação ao fechar modal
- `confirmarSaidaSemSalvar()` com listener `hide.bs.modal` em `forms.js`
- **Commit:** `368cb9a`

---

### [Junho/2026] — Dashboard com cores das configurações
- Script inline no `<head>` de `dashboard.html` aplica CSS variables antes do render
- `ConfigController.aplicar()` executado após DOM carregar
- **Arquivos:** `dashboard.html`
- **Commit:** `75e51fc`

---

### [Junho/2026] — Preenchimento automático de Estado no CEP e CNPJ
- Busca de CEP (ViaCEP) e CNPJ (BrasilAPI) agora preenchem `#estado`
- **Arquivos:** `js/forms.js`
- **Commit:** `75e51fc`

---

### [Junho/2026] — Logo maior (20MB) e tamanho padrão no navbar
- Limite de upload aumentado para 20MB em `settings.html`
- Logo exibida com `height:48px` no navbar via `config.js`
- **Arquivos:** `js/config.js`, `settings.html`
- **Commit:** `75e51fc`

---

### [Junho/2026] — Sistema de Autenticação completo
- `login.html`, `register.html`, `home.html` criados
- `js/auth.js` — hash SHA-256, sessão em sessionStorage, guard de rota
- `js/storage.js` — dados isolados por usuário `SCTEC_DATA_{id}`
- Backup JSON assinado com hash do exportador; importação de outro usuário exige senha
- **Arquivos:** `login.html`, `register.html`, `home.html`, `js/auth.js`, `js/storage.js`, `js/utils.js`
- **Commit:** `75e51fc`

---

### [Junho/2026] — T1: Logout por inatividade (10 minutos)
- `js/inactivity.js` criado — timer 10min, toast de aviso 60s antes, contador regressivo
- Adicionado em `index.html`, `dashboard.html`, `home.html`, `settings.html`
- **Commit:** `8d484b0`

---

### [Junho/2026] — T3: Separação CSS/JS dos HTMLs (login, register, home)
- `js/login.js`, `js/register.js`, `js/home.js` criados
- `css/home.css` criado
- HTMLs sem blocos `<script>` ou `<style>` inline
- **Commit:** `8d484b0`

---

### [Junho/2026] — Item 1: Nickname + ID como identidade
- Validação de nickname: letras/números/underline, 3-20 chars em `auth.js`
- Sessão armazena `identidade: nickname#ID`
- Navbar e home exibem `nickname#ID`
- **Arquivos:** `js/auth.js`, `js/home.js`, `index.html`
- **Commit:** `e5f0799`

---

### [Junho/2026] — T2: Renomear index.html → cadastros.html
- `cadastros.html` criado (cópia do `index.html`)
- Links internos atualizados em todos os HTMLs e JS
- **Commit:** `e5f0799`

---

### [Junho/2026] — T3 restante: settings.js extraído
- `js/settings.js` criado com toda lógica de `settings.html`
- `settings.html` sem nenhum `<script>` inline
- **Commit:** `e5f0799`

---

### [Junho/2026] — Item 8: Perfis de acesso Admin / Usuário Padrão
- Campo `role: "admin" | "user"` em cada usuário em `auth.js`
- `requireAuth(true)` restringe rotas ao Admin
- Card de Configurações oculto para Usuário Padrão
- `settings.js` com guard `requireAuth(true)`
- **Arquivos:** `js/auth.js`, `js/home.js`, `js/settings.js`, `home.html`
- **Commit:** `0cc48f1`

---

### [Junho/2026] — Item 9: Organização com código de convite
- Sem código → cria org automaticamente e vira Admin
- Com código → vincula à org existente como Usuário Padrão
- Storage compartilhado: `SCTEC_DATA_ORG_{orgId}`
- Admin vê o código de convite na home
- **Arquivos:** `js/auth.js`, `js/register.js`, `register.html`, `js/home.js`
- **Commit:** `0cc48f1`

---

### [Junho/2026] — Item 2: Configurações visuais por Organização
- `config.js` reescrito com chave dinâmica `SCTEC_CONFIG_{orgId}`
- Login usa identidade neutra (sem branding de org)
- Cada organização tem suas próprias cores, logo e nome do sistema
- **Arquivos:** `js/config.js`
- **Commit:** pendente neste sprint

---

### [Junho/2026] — Item 3: Exportar / Importar Configurações
- `ConfigController.exportarConfiguracoes()` — gera JSON para download
- `ConfigController.importarConfiguracoes()` — lê JSON e aplica à org atual
- Botões "📤 Exportar Config" e "📥 Importar Config" adicionados em `settings.html`
- **Arquivos:** `js/config.js`, `js/settings.js`, `settings.html`
- **Commit:** pendente neste sprint

---

### [Junho/2026] — Item 10: Painel de Controle do Admin
- `admin.html` + `js/admin.js` criados
- Lista todos os membros da organização com nickname#ID, perfil, data e status
- Ações: ativar/desativar acesso, promover/rebaixar perfil, remover da org
- Proteção: não permite remover o único Admin
- Card "Gerenciar Usuários" visível na home apenas para Admin
- **Arquivos:** `admin.html`, `js/admin.js`, `home.html`, `js/home.js`
- **Commit:** pendente neste sprint

---

### [Junho/2026] — Item 7: Arquitetura Modular — Ativação por Segmento
- `js/modules.js` criado com catálogo de módulos e `ModulesController`
- Estado salvo por organização em `SCTEC_MODULES_{orgId}`
- `home.js` renderiza cards dinamicamente com base nos módulos ativos
- `home.html` usa grids dinâmicos `#cards-grid` e `#cards-grid-admin`
- Seção "🧩 Módulos do Sistema" adicionada em `settings.html` com toggles por rotina
- `settings.js` renderiza e persiste alterações de módulos
- **Arquivos:** `js/modules.js`, `js/home.js`, `js/settings.js`, `home.html`, `settings.html`
- **Commit:** pendente neste sprint
