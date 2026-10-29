-- ============================================================================
-- Ficha completa del local (ideas de Airbnb y de cholets.elalto.gob.bo):
-- servicios y aforo, foto 360 y video, contacto y reglas, calificacion por
-- criterios y denuncias de los visitantes.  Idempotente.
-- Orden en una base nueva: ... -> auditoria_y_reportes.sql -> ficha_completa_local.sql
-- ============================================================================

-- 1) "Lo que este lugar ofrece": capacidad de personas y servicios (lista fija,
--    ver backend src/locales/servicios.ts).
ALTER TABLE locales ADD COLUMN IF NOT EXISTS aforo INTEGER CHECK (aforo IS NULL OR aforo BETWEEN 1 AND 20000);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS servicios TEXT[] NOT NULL DEFAULT '{}';

-- 2) "Paseo por el edificio": foto panoramica 360 y video (YouTube / TikTok).
ALTER TABLE locales ADD COLUMN IF NOT EXISTS foto_360_url TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 3) Contacto y "Lo que debes saber".
ALTER TABLE locales ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE locales ADD COLUMN IF NOT EXISTS reglas TEXT;

-- 4) Calificacion por criterios (opcionales, 1 a 5) ademas de la general.
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS atencion SMALLINT CHECK (atencion BETWEEN 1 AND 5);
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS limpieza SMALLINT CHECK (limpieza BETWEEN 1 AND 5);
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS ubicacion SMALLINT CHECK (ubicacion BETWEEN 1 AND 5);
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS precio SMALLINT CHECK (precio BETWEEN 1 AND 5);
ALTER TABLE resenas ADD COLUMN IF NOT EXISTS ambiente SMALLINT CHECK (ambiente BETWEEN 1 AND 5);

-- 5) Denuncias de locales (falsos, informacion enganosa, contenido inapropiado...).
--    Llegan a la bandeja del Operador G.A.M.E.A., que las revisa o descarta.
CREATE TABLE IF NOT EXISTS denuncias (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id       UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    usuario_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo         TEXT NOT NULL CHECK (motivo IN ('FALSO', 'INFORMACION_ENGANOSA', 'CONTENIDO_INAPROPIADO', 'FRAUDE', 'CERRADO', 'OTRO')),
    detalle        TEXT CHECK (char_length(detalle) <= 1000),
    estado         TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'REVISADA', 'DESCARTADA')),
    revisado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nota_revision  TEXT,
    revisado_en    TIMESTAMPTZ,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_denuncias_estado ON denuncias (estado, creado_en DESC);
-- Una denuncia pendiente por persona y local (evita denuncias repetidas).
CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_pendiente ON denuncias (local_id, usuario_id) WHERE estado = 'PENDIENTE';

-- La auditoria de la base de datos tambien registra las denuncias.
DROP TRIGGER IF EXISTS trg_auditoria ON denuncias;
CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON denuncias
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();
