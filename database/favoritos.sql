-- Favoritos: cada usuario guarda los locales que le gustan (corazon).
-- Un local se guarda una sola vez por usuario (clave primaria compuesta).
-- Si se borra el usuario o el local, sus favoritos se borran solos.
-- Idempotente. Orden en una base nueva: ... -> verificacion_unica.sql -> favoritos.sql
CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    local_id    UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, local_id)
);

CREATE INDEX IF NOT EXISTS idx_favoritos_local ON favoritos (local_id);
