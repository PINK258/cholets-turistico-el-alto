-- =====================================================================
-- "Tipo de local" con seleccion multiple (Cholet, Salon de eventos, ...).
-- Ejecutar DESPUES de schema.sql, seed.sql y categorias_evento.sql. Se puede
-- correr varias veces sin duplicar nada.
--
-- Reemplaza el texto libre de la columna "categoria" por una lista de
-- opciones fijas. La columna vieja NO se borra (queda opcional y con su texto
-- original) para no perder datos; la aplicacion ya no la usa.
-- =====================================================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS tipos_local TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE locales ALTER COLUMN categoria DROP NOT NULL;

-- Pasa lo que el dueno habia escrito a las opciones nuevas, solo en locales
-- que todavia no tienen tipos (no pisa lo que ya se haya elegido).
UPDATE locales SET tipos_local = ARRAY(
  SELECT opcion FROM (VALUES
    (1, 'Cholet',                      categoria ILIKE '%cholet%'),
    (2, 'Salón de eventos',            categoria ILIKE '%sal_n%' OR categoria ILIKE '%evento%'),
    (3, 'Restaurante / Comida típica', categoria ILIKE '%restaurant%' OR categoria ILIKE '%comida%'),
    (4, 'Hotel / Alojamiento',         categoria ILIKE '%hotel%' OR categoria ILIKE '%alojamiento%' OR categoria ILIKE '%hostal%'),
    (5, 'Discoteca o karaoke',         categoria ILIKE '%discoteca%' OR categoria ILIKE '%karaoke%' OR categoria ILIKE '%boliche%')
  ) AS t(orden, opcion, coincide)
  WHERE coincide
  ORDER BY orden
)
WHERE tipos_local = '{}' AND categoria IS NOT NULL;
