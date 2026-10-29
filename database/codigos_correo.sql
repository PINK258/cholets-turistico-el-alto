-- "Continuar con correo": codigo de 6 digitos enviado al correo (como ChatGPT).
-- Se guarda solo el HASH del codigo (nunca el codigo), vence a los 10 minutos
-- y se anula tras 5 intentos fallidos. Un codigo vigente por correo.
-- Idempotente. Orden en una base nueva: ... -> correcciones.sql -> codigos_correo.sql
CREATE TABLE IF NOT EXISTS codigos_correo (
    correo       TEXT PRIMARY KEY,
    codigo_hash  TEXT NOT NULL,
    expira_en    TIMESTAMPTZ NOT NULL,
    intentos     SMALLINT NOT NULL DEFAULT 0,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
