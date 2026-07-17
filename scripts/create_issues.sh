#!/bin/bash
# create_issues.sh — Cria issues em lote no repositório SCTEC
# Uso: bash scripts/create_issues.sh
# Requer: GitHub CLI (gh) autenticado com permissão de escrita

set -e

REPO="prbretas/SCTEC-Gestao_de_Empresas"

echo ""
echo "🏭 SCTEC — Criar Issues em Lote"
echo "================================"
echo ""

# ─── Função auxiliar ──────────────────────────────────────────────────────────
create_issue() {
  local TITLE="$1"
  local BODY="$2"
  local LABELS="$3"

  echo "Criando: $TITLE"
  gh issue create \
    --repo "$REPO" \
    --title "$TITLE" \
    --body "$BODY" \
    --label "$LABELS"
  echo ""
}

# ─── Garantir que as labels existem ───────────────────────────────────────────
echo "Verificando labels..."
gh label create "bug"              --color "#d73a4a" --description "Algo não está funcionando" --repo "$REPO" 2>/dev/null || true
gh label create "enhancement"     --color "#a2eeef" --description "Nova funcionalidade ou melhoria" --repo "$REPO" 2>/dev/null || true
gh label create "priority:high"   --color "#e11d48" --description "Alta prioridade" --repo "$REPO" 2>/dev/null || true
gh label create "priority:medium" --color "#f97316" --description "Média prioridade" --repo "$REPO" 2>/dev/null || true
gh label create "priority:low"    --color "#22c55e" --description "Baixa prioridade" --repo "$REPO" 2>/dev/null || true
gh label create "frontend"        --color "#06b6d4" --description "Frontend / UI" --repo "$REPO" 2>/dev/null || true
gh label create "security"        --color "#8b5cf6" --description "Segurança e autenticação" --repo "$REPO" 2>/dev/null || true
gh label create "tests"           --color "#f59e0b" --description "Testes automatizados" --repo "$REPO" 2>/dev/null || true
echo "Labels verificadas."
echo ""

# ─── Edite abaixo para criar novas issues em lote ─────────────────────────────
# Descomente e ajuste os blocos abaixo para criar as issues desejadas

# Exemplo de uso:
# create_issue \
#   "[FEATURE] Titulo da funcionalidade" \
#   "## Descricao\n\nDescreva o que deve ser implementado.\n\n## Criterios de Aceitacao\n\n- [ ] Criterio 1\n- [ ] Criterio 2" \
#   "enhancement,priority:medium"

echo "✅ Script concluído."
echo "   Para adicionar issues ao Kanban, execute:"
echo "   gh project item-add 7 --owner prbretas --url <url-da-issue>"
