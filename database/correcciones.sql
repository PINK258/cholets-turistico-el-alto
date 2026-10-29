-- Correcciones pedidas por el Operador G.A.M.E.A.
-- Estado nuevo CORRECCION: el operador revisó el local y pide corregir algunas
-- secciones (informacion, categorias, fotos, licencia) con un mensaje. El dueño
-- corrige SOLO esas secciones y lo vuelve a mandar a revisión (PENDIENTE).
-- Mientras esta en revisión (PENDIENTE) el dueño no puede editar nada.
-- Idempotente. Orden en una base nueva: ... -> favoritos.sql -> correcciones.sql
ALTER TYPE estado_verificacion ADD VALUE IF NOT EXISTS 'CORRECCION';

ALTER TABLE locales ADD COLUMN IF NOT EXISTS correccion_secciones TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE locales ADD COLUMN IF NOT EXISTS correccion_mensaje TEXT;
