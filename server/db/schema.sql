-- schema.sql — Esquema inicial do SCTEC (#144 Fase 2, piloto Pedido de Venda).
-- Multi-tenant por org_id. Alinhado ao ESTUDO_MODELO_DADOS_144.md.

CREATE TABLE IF NOT EXISTS orgs (
  id             BIGSERIAL PRIMARY KEY,
  nome           TEXT NOT NULL,
  codigo_convite TEXT UNIQUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  senha_hash  TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_unico UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_usuarios_org ON usuarios (org_id);

-- Pedido de Venda (antigo "propostas")
CREATE TABLE IF NOT EXISTS pedidos_venda (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  numero        TEXT,
  titulo        TEXT NOT NULL,
  empresa_id    BIGINT,
  status        TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','enviada','aceita','recusada')),
  total         NUMERIC(14,2) NOT NULL DEFAULT 0,
  validade      DATE,
  obs           TEXT,
  criado_por_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pedidos_org ON pedidos_venda (org_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_org_status ON pedidos_venda (org_id, status);

-- Itens do pedido (1:N)
CREATE TABLE IF NOT EXISTS pedido_itens (
  id          BIGSERIAL PRIMARY KEY,
  pedido_id   BIGINT NOT NULL REFERENCES pedidos_venda(id) ON DELETE CASCADE,
  produto_id  BIGINT,
  descricao   TEXT,
  qtd         NUMERIC(12,3) NOT NULL DEFAULT 1,
  valor_unit  NUMERIC(14,2) NOT NULL DEFAULT 0,
  CHECK (produto_id IS NOT NULL OR descricao IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens (pedido_id);
