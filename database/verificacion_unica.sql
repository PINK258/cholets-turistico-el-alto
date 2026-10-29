-- Verificacion de los datos del dueño UNA sola vez.
-- verificacion_completa = true cuando el operador verifico al dueño y TODOS sus
-- locales tenian la licencia de funcionamiento subida: entonces ya no se puede
-- volver a verificar. Si faltaba alguna licencia (o el dueño sube una licencia
-- o un local nuevo despues), queda en false y el operador puede revisarlo otra vez.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS verificacion_completa BOOLEAN NOT NULL DEFAULT false;

UPDATE usuarios u SET verificacion_completa = true
WHERE u.datos_verificados_en IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM locales l WHERE l.anfitrion_id = u.id AND l.documento_funcionamiento_url IS NULL
  );
