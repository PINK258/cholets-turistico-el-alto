-- Reseñas de los visitantes: calificacion de 1 a 5 estrellas y un comentario.
-- Cada usuario tiene UNA reseña por local (si vuelve a calificar, se actualiza).
-- Idempotente: se puede ejecutar varias veces.
-- Orden en una base nueva: schema.sql -> seed.sql -> categorias_evento.sql ->
-- tipos_local.sql -> horario_y_perfil.sql -> resenas.sql

CREATE TABLE IF NOT EXISTS resenas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id        UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    calificacion    SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario      TEXT CHECK (char_length(comentario) <= 500),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT resenas_una_por_usuario UNIQUE (local_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_resenas_local ON resenas (local_id, creado_en DESC);
