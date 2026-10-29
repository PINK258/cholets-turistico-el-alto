-- "Historia del cholet" (opcional): el dueño cuenta como se construyo su local,
-- por que y cual es su tematica. Se muestra en la ficha publica del local.
-- Idempotente. Orden en una base nueva: ... -> codigos_correo.sql -> historia_cholet.sql
ALTER TABLE locales ADD COLUMN IF NOT EXISTS historia TEXT;
