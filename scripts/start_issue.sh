#!/bin/bash
# start_issue.sh — Inicia o trabalho em uma issue do SCTEC
# Uso: bash scripts/start_issue.sh
# Requer: GitHub CLI (gh) autenticado

set -e

REPO="prbretas/SCTEC-Gestao_de_Empresas"

echo ""
echo "🏭 SCTEC — Iniciar Issue"
echo "========================"
echo ""

# Lista issues abertas
echo "Issues abertas:"
gh issue list --repo "$REPO" --state open --limit 30 \
  --json number,title,labels \
  --template '{{range .}}  #{{.number}} — {{.title}}{{"\n"}}{{end}}'

echo ""
read -p "Número da issue: " ISSUE_NUMBER

if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Nenhum número informado. Abortando."
  exit 1
fi

# Busca título da issue
ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title --jq '.title')
echo ""
echo "Issue selecionada: #$ISSUE_NUMBER — $ISSUE_TITLE"
echo ""

# Gera slug da branch a partir do título
SLUG=$(echo "$ISSUE_TITLE" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/\[bug\] */fix\//g' \
  | sed 's/\[feature\] */feature\//g' \
  | sed 's/\[enhancement\] */feature\//g' \
  | sed 's/[^a-z0-9/]/-/g' \
  | sed 's/--*/-/g' \
  | sed 's/^-//;s/-$//' \
  | cut -c1-50)

# Se não detectou prefixo, pergunta o tipo
if [[ "$SLUG" != feature/* && "$SLUG" != fix/* && "$SLUG" != docs/* ]]; then
  echo "Tipo da branch:"
  echo "  1) feature"
  echo "  2) fix"
  echo "  3) docs"
  echo "  4) refactor"
  read -p "Escolha (1-4): " TIPO_NUM
  case $TIPO_NUM in
    2) TIPO="fix" ;;
    3) TIPO="docs" ;;
    4) TIPO="refactor" ;;
    *) TIPO="feature" ;;
  esac
  BRANCH_NAME="${TIPO}/${ISSUE_NUMBER}-${SLUG}"
else
  BRANCH_NAME="${SLUG%-*}/${ISSUE_NUMBER}-${SLUG##*/}"
fi

echo ""
echo "Branch: $BRANCH_NAME"
read -p "Confirmar? (Enter para confirmar, Ctrl+C para cancelar) " _CONFIRM

# Garante que está no master atualizado
git checkout master
git pull origin master

# Cria e faz checkout da branch
git checkout -b "$BRANCH_NAME"
git push -u origin "$BRANCH_NAME"

echo ""
echo "✅ Branch '$BRANCH_NAME' criada e publicada."
echo "   Agora implemente as alterações e use 'bash scripts/open_pr.sh' para abrir o PR."
echo ""
