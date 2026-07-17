#!/bin/bash
# open_pr.sh — Abre um Pull Request vinculado à issue atual no SCTEC
# Uso: bash scripts/open_pr.sh
# Requer: GitHub CLI (gh) autenticado, estar em uma branch de feature/fix

set -e

REPO="prbretas/SCTEC-Gestao_de_Empresas"
BASE_BRANCH="master"

echo ""
echo "🏭 SCTEC — Abrir Pull Request"
echo "============================="
echo ""

# Detecta branch atual
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch atual: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  echo "❌ Você está na branch $BASE_BRANCH. Mude para a branch da sua feature/fix."
  exit 1
fi

# Tenta extrair o número da issue da branch (ex: feature/31-descricao → 31)
ISSUE_NUMBER=$(echo "$CURRENT_BRANCH" | grep -oE '[0-9]+' | head -1)

if [ -z "$ISSUE_NUMBER" ]; then
  read -p "Número da issue relacionada: " ISSUE_NUMBER
fi

echo "Issue: #$ISSUE_NUMBER"

# Busca título da issue para sugerir título do PR
ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title' 2>/dev/null || echo "")

# Detecta tipo de commit para prefixo Conventional
if [[ "$CURRENT_BRANCH" == fix/* ]]; then
  PREFIX="fix"
elif [[ "$CURRENT_BRANCH" == docs/* ]]; then
  PREFIX="docs"
elif [[ "$CURRENT_BRANCH" == refactor/* ]]; then
  PREFIX="refactor"
else
  PREFIX="feat"
fi

SUGGESTED_TITLE="${PREFIX}: ${ISSUE_TITLE}"

echo ""
echo "Título sugerido: $SUGGESTED_TITLE"
read -p "Título do PR (Enter para usar o sugerido): " PR_TITLE
PR_TITLE="${PR_TITLE:-$SUGGESTED_TITLE}"

# Garante que a branch está publicada
git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true

echo ""
echo "Abrindo PR..."
gh pr create \
  --repo "$REPO" \
  --base "$BASE_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "$PR_TITLE" \
  --body "## Descrição

> Descreva o que foi alterado e por que.

## Issue relacionada

Closes #${ISSUE_NUMBER}

## Checklist

### Testes
- [ ] \`npm test\` passou localmente
- [ ] Nenhum teste existente foi quebrado

### Código
- [ ] \`npm run lint\` com 0 erros e 0 warnings
- [ ] Sem \`console.log\` de debug

### Validação Manual
- [ ] Testado em modo Light e Dark
- [ ] Módulos afetados testados manualmente

## Como Testar

1.
2.
3." \
  --web

echo ""
echo "✅ PR aberto com sucesso!"
