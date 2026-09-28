# 🔐 Estudo Técnico — Segurança de Dados e LGPD (Issue #144)

> **Status:** Estudo / Análise (não implementado)
> **Objetivo:** Analisar o tratamento de dados pessoais conforme a **LGPD (Lei 13.709/2018)** e as **camadas de segurança** necessárias ao migrar o SCTEC de `localStorage` para um banco de dados com backend.
> **Complementa:** `ESTUDO_PERSISTENCIA_BANCO_144.md` e `ESTUDO_MODELO_DADOS_144.md`.
> **Escopo:** classificação de dados, princípios/bases legais da LGPD, direitos do titular, camadas de segurança técnica. **Nenhum código é alterado.** Este documento não é parecer jurídico.

---

## 1. Situação Atual (diagnóstico de segurança)

| Aspecto | Hoje (localStorage) | Risco |
|---|---|---|
| Local dos dados | Navegador do usuário | Sem controle central; perda ao limpar cache |
| Credenciais | Senha em **SHA-256 sem salt** (`auth.js`) | Vulnerável a *rainbow tables* |
| Sessão | `sessionStorage` (`SCTEC_SESSION`) | Sem expiração server-side; sem revogação |
| Transporte | Arquivos locais / HTTP | Sem TLS obrigatório |
| Isolamento | Prefixo de chave `{orgId}` | Lógico apenas; qualquer script no navegador lê tudo |
| Dados pessoais | Nomes, CNPJ/CPF, contatos, anexos | Sem classificação nem política de retenção |
| Auditoria | `criadoPor/atualizadoPor` por registro | Não centralizada, não imutável |

> ⚠️ A migração para banco **é uma oportunidade** de corrigir todos esses pontos de uma vez.

---

## 2. Classificação dos Dados (o que é dado pessoal na base)

A LGPD se aplica a **dados pessoais** (identificam ou podem identificar uma pessoa natural). Levantamento no SCTEC:

| Dado | Onde aparece | Classificação LGPD |
|---|---|---|
| Nome/nickname de usuário | `usuarios` | Pessoal |
| Senha (hash) | `usuarios.senha_hash` | Pessoal sensível (credencial) |
| CPF | cadastros PF (empreendimentos/contatos) | **Pessoal — atenção especial** |
| CNPJ | empresas | Dado de PJ (não é pessoal, mas do sócio pode ser) |
| Nome/telefone/e-mail de contatos | `contatos` | Pessoal |
| Sócios/QSA | cadastros | Pessoal |
| Anexos (documentos) | `anexos` | Pode conter pessoal/sensível |
| Endereço | cadastros | Pessoal (quando de PF) |
| Logs de auditoria (quem fez o quê) | tabelas de auditoria | Pessoal |

> **Não há**, aparentemente, dados **sensíveis** especiais (saúde, biometria, origem racial, etc.). Se vierem a existir, exigem proteção reforçada (art. 11 LGPD).

---

## 3. Princípios da LGPD aplicados ao SCTEC (art. 6º)

| Princípio | Aplicação prática recomendada |
|---|---|
| **Finalidade** | Documentar por que cada dado é coletado (gestão comercial/estoque/financeiro) |
| **Adequação/Necessidade** | Coletar só o necessário; evitar CPF quando não for essencial (minimização) |
| **Livre acesso** | Titular pode consultar seus dados (endpoint/relatório) |
| **Qualidade** | Permitir correção de dados (já há edição de cadastros) |
| **Transparência** | Aviso de privacidade acessível no sistema |
| **Segurança** | Camadas técnicas do §5 |
| **Prevenção** | Backup, testes, hardening |
| **Responsabilização** | Registro das operações de tratamento (logs de auditoria) |

---

## 4. Bases Legais e Direitos do Titular

### 4.1 Base legal do tratamento (art. 7º)
Para um ERP B2B, as bases mais prováveis:
- **Execução de contrato** (dados de clientes/fornecedores para operar o negócio).
- **Legítimo interesse** (gestão interna), com teste de proporcionalidade documentado.
- **Cumprimento de obrigação legal** (dados fiscais/financeiros).
- **Consentimento** quando aplicável (ex.: comunicações de marketing).

### 4.2 Direitos do titular (art. 18) — o que o sistema deve permitir
- [ ] **Confirmação e acesso** aos dados → exportar dados de um titular.
- [ ] **Correção** → edição já existente nos cadastros.
- [ ] **Anonimização/eliminação** → rotina para apagar/anonimizar sob solicitação.
- [ ] **Portabilidade** → exportação em formato interoperável (CSV/JSON — já há exportação).
- [ ] **Informação sobre compartilhamento** → registrar integrações externas (ViaCEP, BrasilAPI já usadas).
- [ ] **Revogação de consentimento** (quando a base for consentimento).

> **Direito ao esquecimento vs. obrigação fiscal:** dados com retenção legal (financeiro/fiscal) **não** podem ser apagados no prazo legal — nesse caso, **anonimizar** o vínculo pessoal e manter o dado contábil.

---

## 5. Camadas de Segurança Técnica (defesa em profundidade)

### 5.1 Autenticação
- Migrar hash de senha de **SHA-256 puro** para **bcrypt/Argon2** (com salt e custo configurável).
- Política de senha forte + limite de tentativas (proteção contra *brute force*).
- **MFA** (2FA) para perfis Admin (recomendado).
- Sessão via **token assinado (JWT)** com expiração curta + *refresh token* revogável.

### 5.2 Autorização
- Reaproveitar **papéis/níveis (#142)** e **filiais (#143)** como base de RBAC no backend.
- **Autorização no servidor** (nunca confiar no front): toda query filtrada por `org_id` + escopo do usuário.
- Princípio do **menor privilégio** (usuário do banco da aplicação sem `SUPERUSER`).

### 5.3 Criptografia
- **Em trânsito:** TLS/HTTPS obrigatório (backend atrás de proxy com certificado).
- **Em repouso:** criptografia de disco/volume do PostgreSQL; considerar cifrar colunas sensíveis (ex.: CPF) com `pgcrypto`.
- **Segredos:** credenciais em variáveis de ambiente / *secrets manager*, **nunca** no front nem no git.

### 5.4 Proteção da aplicação
- **SQL Injection:** usar sempre *prepared statements*/queries parametrizadas.
- **XSS:** o front monta HTML por template string — sanitizar/escapar dados de usuário ao renderizar (auditar `innerHTML`).
- **CSRF:** tokens anti-CSRF nos endpoints de escrita.
- **CORS:** restringir origens permitidas na API.
- **Cabeçalhos de segurança:** CSP, X-Content-Type-Options, etc.

### 5.5 Auditoria e Rastreabilidade
- Tabela **`audit_log`** central e imutável: quem, o quê, quando, de onde (IP), valor antes/depois.
- Reaproveitar os campos `criado_por/atualizado_por` já existentes.
- Retenção dos logs conforme política; proteção contra adulteração.

### 5.6 Backup e Continuidade
- Backup automatizado do PostgreSQL (dump agendado) + teste de restauração.
- Backups **criptografados** e com retenção definida.
- Plano de recuperação de desastre (RPO/RTO documentados).

### 5.7 Hardening de Infraestrutura (Podman/PostgreSQL)
- PostgreSQL **não exposto publicamente** (só a API acessa; rede interna).
- Contêiner sem privilégios (`--userns`, usuário não-root).
- Atualizações regulares da imagem base.
- `pg_hba.conf` restritivo; conexões só da API.

---

## 6. Governança e Documentação Exigidas

| Artefato | Descrição |
|---|---|
| **Registro de Operações de Tratamento (ROPA)** | Mapear quais dados, finalidade, base legal, retenção, compartilhamento |
| **Aviso de Privacidade** | Texto acessível aos titulares |
| **Política de Retenção** | Prazo de guarda por tipo de dado (respeitando obrigações fiscais) |
| **Plano de Resposta a Incidentes** | Fluxo de notificação à ANPD e aos titulares em vazamento |
| **DPO / Encarregado** | Indicar responsável pelo tratamento (art. 41) |

---

## 7. Tabela de Apoio: retenção e tratamento por dado

| Dado | Base legal provável | Retenção sugerida | Ao "excluir" |
|---|---|---|---|
| Usuário/credencial | Execução de contrato | Enquanto ativo + prazo legal | Desativar → anonimizar |
| Contato (nome/tel/e-mail) | Legítimo interesse/contrato | Enquanto relação comercial | Anonimizar |
| CPF | Obrigação legal (se fiscal) | Prazo fiscal | Anonimizar após prazo |
| Lançamento financeiro | Obrigação legal | 5+ anos (fiscal) | **Não apagar** — anonimizar vínculo pessoal |
| Anexos | Depende do conteúdo | Conforme finalidade | Excluir do storage de objetos |
| Log de auditoria | Responsabilização | Definir (ex.: 1–5 anos) | Imutável no período |

---

## 8. Roadmap de Segurança (faseado)

1. **Fase 1 — Fundamentos** (junto da introdução do backend): bcrypt/Argon2, TLS, queries parametrizadas, `org_id` server-side.
2. **Fase 2 — LGPD operacional**: exportação/anonimização por titular, aviso de privacidade, ROPA.
3. **Fase 3 — Auditoria & backup**: `audit_log`, backups cifrados e testados.
4. **Fase 4 — Hardening & MFA**: 2FA para Admin, CSP, hardening de contêineres, resposta a incidentes.

---

## 9. Perguntas em Aberto (para decisão técnica/jurídica)

- [ ] Qual a **base legal** predominante do tratamento no SCTEC?
- [ ] Haverá **DPO/Encarregado** designado?
- [ ] Cifrar **CPF** em coluna (pgcrypto) desde já?
- [ ] Migrar hash de senha **retroativamente** (forçar reset) ou *rehash* no próximo login?
- [ ] Retenção de **logs de auditoria**: qual prazo?
- [ ] Anexos com dado sensível: manter no banco ou em storage de objetos cifrado?

---

## 10. Conclusão

A migração para banco deve vir acompanhada de um **salto de segurança**: credenciais com hashing forte, autorização no servidor por `org_id`/papel/filial, criptografia em trânsito e repouso, auditoria imutável e backups cifrados. No eixo **LGPD**, o essencial é **classificar os dados pessoais** (nomes, CPF, contatos, anexos), definir **base legal e retenção**, e **operacionalizar os direitos do titular** (acesso, correção, anonimização, portabilidade), com atenção ao conflito entre "direito ao esquecimento" e a **retenção fiscal obrigatória** (resolver por anonimização). Estes estudos, junto com o de modelagem e o de persistência, dão base para a decisão técnica da #144. **Nenhum código foi alterado. Este documento não constitui parecer jurídico.**
