# 🏗️ Portal de Gestão de Empreendimentos - SCTEC (Santa Catarina)
O Portal SCTEC é uma aplicação focada no gerenciamento de empreendimentos e ativos logísticos no estado de Santa Catarina. Desenvolvido para a trilha IA para DEVs, o projeto simula um cenário real de controle de cadastros, utilizando automação via APIs e regras de integridade de dados voltadas ao setor de Supply Chain.

## 🚀 Diferenciais Técnicos
A aplicação destaca-se pela sua arquitetura modular e pela automação no preenchimento de dados:

- Consumo de APIs Externas: Integração com serviços de busca de CNPJ e CEP para autopreenenchimento e validação cadastral.

- Arquitetura Modular: Separação clara de responsabilidades (UI, API, Storage, Utils) para facilitar a manutenção.

- Regras de Negócio Logístico: Bloqueio de duplicidade de registros e proteção de campos chaves durante a edição.

## 📂 Estrutura do Projeto
A organização dos arquivos no diretório segue uma estrutura lógica e limpa:

Plaintext
/
├── css/
│   └── styles.css      # Estilização customizada da interface
├── js/
│   ├── api.js          # Consumo de APIs externas (CEP/CNPJ)
│   ├── forms.js        # Gerenciamento de submissão e máscaras
│   ├── storage.js      # Persistência de dados no LocalStorage
│   ├── ui.js           # Manipulação da DOM e renderização da interface
│   ├── utils.js        # Funções utilitárias e validações genéricas
│   └── main.js         # Arquivo principal (Ponto de entrada do JS)
├── index.html          # Estrutura principal da aplicação (HTML5)
└── README.md           # Documentação técnica

## ⚙️ Funcionalidades Principais
- Automação via API: Ao digitar um CEP ou CNPJ válido, o sistema busca e preenche automaticamente os campos de endereço e razão social.

- CRUD Completo: Cadastro, consulta, edição e exclusão de empreendimentos.

- Persistência Local: Utilização de LocalStorage para manter os dados gravados mesmo após fechar o navegador.

- Máscaras em Tempo Real: Formatação automática de campos sensíveis (Telefones e Documentos).

- Validações Inteligentes: Impede a inclusão de CNPJs duplicados e restringe a alteração de identificadores únicos no modo de edição.

## 🔌 APIs Utilizadas
- ViaCEP / BrasilAPI: Utilizadas para garantir a precisão dos dados geográficos e cadastrais informados pelo usuário.

## 🔧 Como Executar
- Clone este repositório.
- Abra o arquivo index.html diretamente em seu navegador.
- Dica: Para uma experiência sem restrições de segurança do navegador em chamadas de API, utilize a extensão Live Server do VS Code.

- Também é possível executar diretamente pelo link:
https://prbretas.github.io/SCTEC-Gestao_de_Empresas/


Desenvolvido por Philippe Bretas
