# Guia de Contribuição — SCTEC

## Fluxo Rápido

1. Escolha uma Issue aberta no [GitHub](https://github.com/prbretas/SCTEC-Gestao_de_Empresas/issues)
2. `bash scripts/start_issue.sh` — cria a branch no padrão correto
3. Implemente a alteração
4. `npm test` — todos os testes devem passar
5. `npm run lint` — zero erros e zero warnings
6. `bash scripts/open_pr.sh` — abre o PR com template preenchido
7. Aguarde review e merge
8. Delete a branch após o merge

## Convenção de Commits

```
feat: implementa funcionalidade X
fix: corrige bug Y no modulo Z
docs: atualiza documentacao
chore: ajusta configuracao
test: adiciona testes
refactor: reorganiza codigo
```

## Boas Práticas

- Um PR por Issue
- Descreva o que foi feito e como testar no corpo do PR
- Não commitar `node_modules/`, `coverage/` ou arquivos de ambiente
- Remover `console.log` de debug antes do PR
