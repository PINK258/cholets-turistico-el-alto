-- Imagen horizontal (opcional) de cada evento, para el carrusel de la portada.
-- El afiche (afiche_url) es la imagen vertical de la cartelera.
-- Idempotente. Orden en una base nueva: ... -> historia_cholet.sql -> banner_eventos.sql
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS banner_url TEXT;
