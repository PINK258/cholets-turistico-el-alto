-- Eventos publicados por el operador en la cartelera:
--  - pueden ser de un local (local_id) o de un lugar escrito a mano (lugar);
--  - publicar_desde: desde cuando aparece (NULL = enseguida);
--  - publicar_hasta: cuando desaparece; al pasar esa fecha el backend lo BORRA
--    automaticamente junto con su foto (NULL = sigue el criterio de siempre:
--    se ve hasta que el evento termina).
-- Idempotente. Orden en una base nueva: ... -> verificacion_y_afiches.sql -> eventos_programados.sql

ALTER TABLE eventos ALTER COLUMN local_id DROP NOT NULL;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS lugar VARCHAR(200);
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS publicar_desde TIMESTAMPTZ;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS publicar_hasta TIMESTAMPTZ;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_local_o_lugar') THEN
    ALTER TABLE eventos ADD CONSTRAINT eventos_local_o_lugar CHECK (local_id IS NOT NULL OR lugar IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_publicacion_valida') THEN
    ALTER TABLE eventos ADD CONSTRAINT eventos_publicacion_valida
      CHECK (publicar_desde IS NULL OR publicar_hasta IS NULL OR publicar_hasta > publicar_desde);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eventos_publicar_hasta ON eventos (publicar_hasta) WHERE publicar_hasta IS NOT NULL;
