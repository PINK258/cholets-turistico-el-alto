-- =====================================================================
-- Horario estructurado (dias + hora de apertura/cierre) para los locales.
-- Ejecutar DESPUES de tipos_local.sql. Se puede correr varias veces.
--
-- horario_funcionamiento (texto) se mantiene: el backend lo arma a partir de
-- los dias y horas (ej. "Lunes a domingo, de 18:00 a 00:00") y es lo que leen
-- la pagina y el chatbot. Los textos viejos no se modifican.
-- (La foto de perfil del dueño usa la columna usuarios.avatar_url, que ya existe.)
-- =====================================================================

ALTER TABLE locales ADD COLUMN IF NOT EXISTS dias_funcionamiento TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE locales ADD COLUMN IF NOT EXISTS hora_apertura VARCHAR(5);
ALTER TABLE locales ADD COLUMN IF NOT EXISTS hora_cierre VARCHAR(5);

-- Horas: toma el primer "HH[:MM] a/A/-/hasta HH[:MM]" del texto viejo.
UPDATE locales l
SET hora_apertura = lpad(x.m[1], 2, '0') || ':' || coalesce(x.m[2], '00'),
    hora_cierre   = lpad(x.m[3], 2, '0') || ':' || coalesce(x.m[4], '00')
FROM (
  SELECT id, regexp_match(horario_funcionamiento,
         '(\d{1,2})(?::(\d{2}))?\s*(?:a|A|-|–|hasta)\s*(\d{1,2})(?::(\d{2}))?') AS m
  FROM locales
) x
WHERE x.id = l.id AND x.m IS NOT NULL AND l.hora_apertura IS NULL
  AND x.m[1]::int <= 24 AND x.m[3]::int <= 24;

-- Dias: rangos tipo "Vie-Dom" o "lunes a viernes" del texto viejo.
WITH dias(n, nombre, abrev) AS (
  VALUES (1, 'Lunes', 'lun'), (2, 'Martes', 'mar'), (3, 'Miércoles', 'mie'), (4, 'Jueves', 'jue'),
         (5, 'Viernes', 'vie'), (6, 'Sábado', 'sab'), (7, 'Domingo', 'dom')
),
rangos AS (
  SELECT l.id, d1.n AS desde, d2.n AS hasta
  FROM locales l
  CROSS JOIN LATERAL regexp_match(
    translate(lower(coalesce(l.horario_funcionamiento, '')), 'áéíóú', 'aeiou'),
    '(lun|mar|mie|jue|vie|sab|dom)[a-z]*\s*(?:-|a|al)\s*(lun|mar|mie|jue|vie|sab|dom)'
  ) AS m
  JOIN dias d1 ON d1.abrev = m[1]
  JOIN dias d2 ON d2.abrev = m[2]
)
UPDATE locales l
SET dias_funcionamiento = ARRAY(SELECT d.nombre FROM dias d WHERE d.n BETWEEN r.desde AND r.hasta ORDER BY d.n)
FROM rangos r
WHERE r.id = l.id AND r.desde <= r.hasta AND l.dias_funcionamiento = '{}';
