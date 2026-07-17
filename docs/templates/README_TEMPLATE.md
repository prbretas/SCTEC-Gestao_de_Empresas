# 🏭 SCTEC — {NOME_DO_MODULO}

> Breve descrição do módulo ou funcionalidade.

## Sobre

Descreva o propósito deste módulo dentro do sistema SCTEC.

## Funcionalidades

- Funcionalidade 1
- Funcionalidade 2

## Estrutura de Arquivos

```
src/js/{pasta}/
  └── {modulo}.js     # Descrição
{tela}.html           # Tela correspondente
```

## Modelo de Dados

```json
{
  "id": "timestamp-string",
  "criadoPor": "nickname#id",
  "criadoEm": "ISO-8601",
  "atualizadoPor": "nickname#id",
  "atualizadoEm": "ISO-8601"
}
```

**Chave no localStorage:** `SCTEC_{MODULO}_{orgId|userId}`

## Como Testar

```bash
npm test -- --testPathPattern="{modulo}"
```

## Contribuindo

Leia o [CONTRIBUTING.md](../../CONTRIBUTING.md).
