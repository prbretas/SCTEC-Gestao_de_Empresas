# 🏗️ Portal de Gestão de Empreendimentos - SCTEC (Santa Catarina)

O **Portal SCTEC** é uma aplicação avançada para o gerenciamento de ativos logísticos e empreendimentos corporativos no estado de Santa Catarina. Desenvolvido para a trilha "IA para DEVs", o projeto simula um cenário real de governança de dados para o setor de **Supply Chain**, unindo automação inteligente via APIs a regras rigorosas de integridade de dados.

---

## 🎨 Diferenciais de UX/UI (Experiência do Usuário)

O foco do SCTEC foi criar uma ferramenta que minimize o esforço cognitivo do operador e maximize a precisão dos dados:

* **🌗 Modo Escuro (Dark Mode):** Implementação de alternância dinâmica de temas via variáveis CSS. O sistema preserva a escolha do usuário e ajusta o contraste para reduzir a fadiga visual em jornadas longas.
* **🔍 Filtros e Ordenação Inteligente:**
    * **Busca em Tempo Real:** Filtro dinâmico que atua sobre Nome, Registro (CNPJ/CPF) ou Município de forma instantânea.
    * **Organização Alfanumérica:** Listagem organizada que permite localizar rapidamente ativos e parceiros em grandes bases de dados.
* **⚠️ Feedback Transacional Seguro:**
    * **Diálogos de Confirmação:** Ações críticas como **Excluir** ou **Editar** exigem confirmação explícita para prevenir erros acidentais.
    * **Alertas de Validação:** Uso de feedbacks visuais (Bootstrap `is-invalid`) para sinalizar campos obrigatórios pendentes.
* **📊 Inteligência na Importação CSV:** O motor de importação realiza o parse dos dados e exibe um **Resumo Detalhado**:
    * Total de documentos encontrados no arquivo.
    * Contagem de novos registros processados com sucesso.
    * **Filtro de Duplicidade:** Identifica e ignora CNPJs que já constam na base.
    * **Validação de Estrutura:** Alerta sobre possíveis erros de layout ou dados corrompidos.

---

## 🚀 Diferenciais e Robustez Técnica

A arquitetura foi inspirada em padrões de grandes sistemas ERP (como o Protheus), focando em escalabilidade e segurança:

* **⚡ Automação via APIs Externas:** Integração com **BrasilAPI** (CNPJ) e **ViaCEP**. A recuperação automática de Razão Social e Endereço reduz o tempo de digitação em até **80%**, garantindo fidedignidade com a Receita Federal.
* **🛡️ Integridade de Dados (Data Governance):**
    * **Imutabilidade de Chaves:** No modo de edição, campos que funcionam como identificadores únicos (Nome e Registro Fiscal) tornam-se **somente leitura**, impedindo a quebra de vínculos sistêmicos.
    * **Sanitização de Input:** Tratamento de strings para garantir que a comparação de duplicidade ignore caracteres especiais, pontos e traços.
* **🎭 Máscaras em Tempo Real:** Formatação dinâmica de telefones, CEP e documentos, mantendo a padronização visual durante a entrada de dados.
* **💾 Persistência Local:** Uso de `LocalStorage` para persistência de estado. Dados, preferências de tema e filtros permanecem salvos mesmo após fechar o navegador.

---

## 📂 Estrutura do Projeto
O projeto segue uma arquitetura modular com separação clara de responsabilidades:

```plaintext
/
├── css/
│   └── styles.css      # Estilização, temas Dark/Light e definições de UI
├── js/
│   ├── api.js          # Encapsulamento de chamadas assíncronas (Fetch API)
│   ├── forms.js        # Lógica de formulário, máscaras e estados de edição
│   ├── storage.js      # Camada de persistência (CRUD no LocalStorage)
│   ├── ui.js           # Gerenciamento de componentes da DOM e renderização
│   ├── utils.js        # Motor de Importação/Exportação e utilitários
│   └── main.js         # Ponto de entrada (Inicialização da aplicação)
├── index.html          # Estrutura semântica HTML5
└── README.md           # Documentação técnica completa

```
## ⚙️ Funcionalidades Principais
  - Automação de Endereço - Busca automática de Logradouro e Município via API após preenchimento do CEP.
  - Consulta CNPJ - Recuperação de dados cadastrais oficiais via BrasilAPI (Dados da RFB).
  - Gestão de Status - Controle visual de situação (Ativo/Inativo) com badges semânticos.
  - Motor de I/O - Exportação para CSV (UTF-8) e Importação com tratamento de duplicidade.
  - Responsividade - Interface totalmente adaptável para dispositivos móveis e desktops.
---

## 🔌 APIs Utilizadas
  - ViaCEP - Webservice para consulta de CEP.
  - BrasilAPI - Consulta de dados cadastrais de empresas (CNPJ).
---

## 🔧 Como Executar
  - Clone este repositório.
  - Abra o arquivo index.html diretamente em seu navegador.
  - Dica: Para garantir o funcionamento pleno das chamadas de API sem restrições de segurança do navegador, utilize a extensão Live Server do VS Code.
---
Desenvolvido por Philippe Bretas.
