-- 1) Verificacion de los datos del dueño (anfitrion) por el operador: cuando y
--    quien los verifico, y una nota opcional. NULL = sin verificar.
-- 2) Afiche (imagen) de cada evento, para la cartelera de los cholets.
-- Idempotente. Orden en una base nueva: ... -> resenas.sql -> verificacion_y_afiches.sql

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS datos_verificados_en TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS datos_verificados_por UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nota_verificacion TEXT CHECK (char_length(nota_verificacion) <= 500);

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS afiche_url VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_eventos_fecha_inicio ON eventos (fecha_inicio);
