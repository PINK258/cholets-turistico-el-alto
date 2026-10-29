-- ============================================================================
-- Auditoria, datos demograficos y categoria de eventos (para los reportes del
-- Operador G.A.M.E.A.).  Idempotente.
-- Orden en una base nueva: ... -> banner_eventos.sql -> auditoria_y_reportes.sql
-- ============================================================================

-- 1) Datos del usuario para los reportes: genero, fecha de nacimiento (edad) y
--    procedencia. Se piden al registrarse; las cuentas antiguas los completan
--    desde "Mi perfil".
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS genero TEXT
  CHECK (genero IN ('MASCULINO', 'FEMENINO', 'OTRO', 'PREFIERO_NO_DECIR'));
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pais TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ciudad TEXT;

-- 2) Categoria de cada evento de la cartelera (boda, graduacion, folklore...).
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS categoria_id UUID
  REFERENCES categorias_evento(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_categoria ON eventos (categoria_id);

-- 3) BITACORA DEL SISTEMA: quien hizo que dentro de la aplicacion.
--    La llena el backend (NestJS) en cada accion: inicios de sesion, registros,
--    locales, aprobaciones, eventos, cuentas eliminadas, etc.
CREATE TABLE IF NOT EXISTS bitacora (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre  TEXT,          -- copia del nombre: queda aunque se borre la cuenta
    usuario_correo  TEXT,
    rol             TEXT,
    accion          TEXT NOT NULL, -- ej. "Aprobó un local"
    modulo          TEXT NOT NULL, -- ej. "Locales", "Cuentas", "Cartelera"
    entidad_id      TEXT,          -- id del registro afectado (si hay)
    detalle         TEXT,
    metodo          TEXT,          -- POST / PATCH / PUT / DELETE
    ruta            TEXT,
    exito           BOOLEAN NOT NULL DEFAULT true,
    ip              TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON bitacora (usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo ON bitacora (modulo);

-- 4) AUDITORIA DE LA BASE DE DATOS: cada INSERT / UPDATE / DELETE de las tablas
--    importantes, con los datos ANTES y DESPUES. La llenan disparadores
--    (triggers), asi que registra tambien los cambios hechos directamente en la
--    base (pgAdmin, psql), sin pasar por la aplicacion.
--    "usuario_app" es quien hizo el cambio desde la aplicacion (el backend lo
--    indica con set_config('app.usuario_id', ...)); si esta vacio, el cambio se
--    hizo fuera de la aplicacion y queda "usuario_bd" (usuario de PostgreSQL).
CREATE TABLE IF NOT EXISTS auditoria_bd (
    id              BIGSERIAL PRIMARY KEY,
    tabla           TEXT NOT NULL,
    operacion       TEXT NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id     TEXT,
    datos_antes     JSONB,
    datos_despues   JSONB,
    campos_cambiados TEXT[],
    usuario_bd      TEXT NOT NULL DEFAULT current_user,
    usuario_app     TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_bd_fecha ON auditoria_bd (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_bd_tabla ON auditoria_bd (tabla);

CREATE OR REPLACE FUNCTION registrar_auditoria() RETURNS trigger AS $$
DECLARE
    antes   JSONB;
    despues JSONB;
    cambios TEXT[];
BEGIN
    -- Nunca se copian datos secretos (hash de contraseña, codigos).
    IF TG_OP <> 'INSERT' THEN antes := to_jsonb(OLD) - 'password_hash' - 'codigo_hash'; END IF;
    IF TG_OP <> 'DELETE' THEN despues := to_jsonb(NEW) - 'password_hash' - 'codigo_hash'; END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(k) INTO cambios
        FROM jsonb_object_keys(despues) AS k
        WHERE despues -> k IS DISTINCT FROM antes -> k AND k NOT IN ('actualizado_en');
        -- Si solo cambio la fecha de actualizacion (o un dato secreto), no se registra.
        IF cambios IS NULL THEN RETURN NEW; END IF;
    END IF;

    INSERT INTO auditoria_bd (tabla, operacion, registro_id, datos_antes, datos_despues, campos_cambiados, usuario_app)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(despues ->> 'id', antes ->> 'id'),
        antes,
        despues,
        cambios,
        NULLIF(current_setting('app.usuario_id', true), '')
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['usuarios', 'locales', 'eventos', 'resenas', 'verificaciones_local', 'zonas', 'categorias_evento']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_auditoria ON %I', t);
        EXECUTE format(
            'CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION registrar_auditoria()', t);
    END LOOP;
END $$;
