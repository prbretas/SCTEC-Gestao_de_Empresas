# Instruções para Documentação — SCTEC

## Padrão de Documentação

Toda documentação do projeto SCTEC deve seguir estes princípios:

- **Idioma:** Português (pt-BR)
- **Tom:** Técnico e direto, sem floreios
- **Formato:** Markdown com tabelas, listas e blocos de código quando apropriado

---

## Documentos do Projeto

| Arquivo | Propósito |
|---------|-----------|
| `README.md` | Visão geral do projeto, como executar, tecnologias |
| `CONTRIBUTING.md` | Fluxo de desenvolvimento, convenções, boas práticas |
| `docs/product.md` | Visão do produto, público-alvo, funcionalidades principais |
| `docs/backlog.md` | Épicos e stories do produto (sincronizado com GitHub Issues) |
| `docs/meeting-notes.md` | Atas de reunião e decisões de produto |
| `src/SCTEC-Gestao_de_Empresas/docs/PRODUCT_SPEC.md` | Especificação técnica detalhada |
| `src/SCTEC-Gestao_de_Empresas/docs/HISTORICO_DESENVOLVIMENTO.md` | Histórico de funcionalidades implementadas |

---

## Ao Gerar Documentação Técnica

### Para funções e métodos JS:
```javascript
/**
 * Descrição do que a função faz.
 * @param {string} parametro - Descrição do parâmetro
 * @returns {Promise<{ok: boolean, erro?: string}>} Resultado da operação
 */
```

### Para novos módulos:
- Descrever a responsabilidade do módulo no cabeçalho do arquivo
- Listar a chave de localStorage usada (se aplicável)
- Documentar o formato do objeto armazenado

### Para novas telas HTML:
- Adicionar o arquivo na tabela de estrutura do `README.md`
- Descrever os scripts carregados e sua ordem no cabeçalho do HTML

---

## Ao Atualizar o Backlog

O arquivo `docs/backlog.md` deve espelhar o estado das issues no GitHub:
- Issues abertas → status `In Progress` ou `Backlog`
- Issues fechadas → remover ou marcar como `Done`
- Sincronizar com o Kanban do projeto GitHub (Project #7)

---

## Histórico de Desenvolvimento

Ao concluir uma funcionalidade:
1. Mover o item de `newpromptupdates.md` para `docs/HISTORICO_DESENVOLVIMENTO.md`
2. Registrar: data, o que foi implementado, arquivos alterados, número do commit/PR
