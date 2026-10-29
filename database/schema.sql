-- =====================================================================
-- Cholets Turistico El Alto - Esquema PostgreSQL (equivalente 1:1 al prisma/schema.prisma)
-- Ejecutar UNA sola vez sobre una base de datos vacia.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- da gen_random_uuid() y crypt()/bcrypt

-- ---------- Tipos enumerados ----------
CREATE TYPE rol AS ENUM ('TURISTA', 'ANFITRION', 'OPERADOR', 'ADMIN');
CREATE TYPE proveedor_auth AS ENUM ('LOCAL', 'GOOGLE');
CREATE TYPE estado_verificacion AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- ---------- usuarios ----------
CREATE TABLE usuarios (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre             VARCHAR(120) NOT NULL,
    apellido_paterno   VARCHAR(120) NOT NULL,
    apellido_materno   VARCHAR(120),
    correo             VARCHAR(160) NOT NULL UNIQUE,
    password_hash      VARCHAR(200),
    proveedor_auth     proveedor_auth NOT NULL DEFAULT 'LOCAL',
    google_id          VARCHAR(120) UNIQUE,
    ci                 VARCHAR(30) UNIQUE,
    telefono           VARCHAR(30),
    rol                rol NOT NULL DEFAULT 'TURISTA',
    avatar_url         TEXT,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- zonas (14 subalcaldias reales de GAMEA) ----------
CREATE TABLE zonas (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distrito_numero          INT NOT NULL UNIQUE,
    nombre_zona_principal    VARCHAR(160) NOT NULL,
    direccion_subalcaldia    TEXT NOT NULL,
    responsable_subalcaldia  VARCHAR(160) NOT NULL,
    latitud                  DOUBLE PRECISION,
    longitud                 DOUBLE PRECISION
);

-- ---------- locales ----------
CREATE TABLE locales (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                         VARCHAR(160) NOT NULL,
    descripcion                    TEXT NOT NULL,
    categoria                      VARCHAR(80) NOT NULL,
    direccion                      TEXT NOT NULL,
    latitud                        DOUBLE PRECISION NOT NULL,
    longitud                       DOUBLE PRECISION NOT NULL,
    zona_id                        UUID NOT NULL REFERENCES zonas(id),
    anfitrion_id                   UUID NOT NULL REFERENCES usuarios(id),
    estado                         estado_verificacion NOT NULL DEFAULT 'PENDIENTE',
    horario_funcionamiento         VARCHAR(160),
    documento_funcionamiento_url   TEXT,
    creado_en                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locales_zona ON locales(zona_id);
CREATE INDEX idx_locales_anfitrion ON locales(anfitrion_id);
CREATE INDEX idx_locales_estado ON locales(estado);

-- ---------- fotos_local ----------
CREATE TABLE fotos_local (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id    UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    es_portada  BOOLEAN NOT NULL DEFAULT false,
    subida_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fotos_local_local ON fotos_local(local_id);

-- ---------- eventos ----------
CREATE TABLE eventos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id     UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    titulo       VARCHAR(160) NOT NULL,
    descripcion  TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin    TIMESTAMPTZ,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eventos_local ON eventos(local_id);

-- ---------- verificaciones_local ----------
CREATE TABLE verificaciones_local (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id     UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    operador_id  UUID NOT NULL REFERENCES usuarios(id),
    estado       estado_verificacion NOT NULL,
    comentario   TEXT,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verificaciones_local ON verificaciones_local(local_id);

-- ---------- notificaciones ----------
CREATE TABLE notificaciones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo      VARCHAR(160) NOT NULL,
    mensaje     TEXT NOT NULL,
    leida       BOOLEAN NOT NULL DEFAULT false,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);

-- ---------- mensajes_chat ----------
CREATE TABLE mensajes_chat (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    sesion_id   VARCHAR(80) NOT NULL,
    rol         VARCHAR(20) NOT NULL,
    contenido   TEXT NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_chat_sesion ON mensajes_chat(sesion_id);
