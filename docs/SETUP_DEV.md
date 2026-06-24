# Setup do Ambiente de Desenvolvimento — SCTEC

## 1. Instalar dependencias

```bash
npm install
```

## 2. Instalar o pre-commit hook (obrigatorio — uma vez)

```bash
# Linux / Mac
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Windows (PowerShell)
Copy-Item .github\hooks\pre-commit .git\hooks\pre-commit
```

A partir deste ponto, **nenhum commit sera aceito se os testes falharem**.

---

## 3. Executar testes

```bash
# Executar todos os testes
npm test

# Executar com watch (re-executa ao salvar)
npm run test:watch

# Executar com relatorio de cobertura
npm run test:coverage
```

---

## 4. Workflow de trabalho (obrigatorio)

```
1. Pegue a issue no Kanban (ela sera movida para In Progress ao atribuir)
2. Crie uma branch: git checkout -b fix/bug-01-tipo-pessoa
3. Implemente a correcao/feature
4. Execute os testes: npm test
5. Commit (o hook valida os testes automaticamente): git commit -m "fix: corrige campo tipoPessoa no FormData (closes #5)"
6. Push: git push -u origin fix/bug-01-tipo-pessoa
7. Abra um PR referenciando a issue (ex: "closes #5")
8. A issue sera movida para In Review automaticamente
9. Aguarde review e aprovacao
10. Apos merge, a issue e movida para Done automaticamente
```

---

## 5. Convencao de branches

| Tipo | Formato | Exemplo |
|---|---|---|
| Bug fix | `fix/bug-XX-descricao` | `fix/bug-01-tipo-pessoa` |
| Feature | `feature/feat-XX-descricao` | `feature/feat-01-socios-qsa` |
| Refatoracao | `refactor/ref-XX-descricao` | `refactor/ref-01-codigo-morto` |
| Documentacao | `docs/descricao` | `docs/technical-docs` |

---

## 6. Convencao de commits (Conventional Commits)

```
fix: corrige campo tipoPessoa no FormData (closes #5)
feat: exibe socios QSA nas observacoes do CNPJ (closes #10)
refactor: remove codigo morto validarFormulario e preencherForm (closes #8)
docs: adiciona documentacao tecnica e spec de produto
test: adiciona testes unitarios para utils e storage
```

---

## 6. Regras de PR (branch protection em main)

- 1 review e aprovacao obrigatoria
- Todos os checks de CI devem passar (testes + lint)
- Nao e permitido fazer push direto na `main`
- PR deve referenciar pelo menos uma issue com `closes #N`
