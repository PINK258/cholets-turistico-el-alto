--
-- PostgreSQL database dump
--

\restrict bs39qDDXgV1t7EIhpOfGSNM4It9DKHUsFD0SFAdLrvR1SHpihsfQMf2dHgHMVgt

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: estado_verificacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_verificacion AS ENUM (
    'PENDIENTE',
    'APROBADO',
    'RECHAZADO',
    'CORRECCION'
);


--
-- Name: proveedor_auth; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proveedor_auth AS ENUM (
    'LOCAL',
    'GOOGLE'
);


--
-- Name: rol; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol AS ENUM (
    'TURISTA',
    'ANFITRION',
    'OPERADOR',
    'ADMIN'
);


--
-- Name: registrar_auditoria(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria_bd; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_bd (
    id bigint NOT NULL,
    tabla text NOT NULL,
    operacion text NOT NULL,
    registro_id text,
    datos_antes jsonb,
    datos_despues jsonb,
    campos_cambiados text[],
    usuario_bd text DEFAULT CURRENT_USER NOT NULL,
    usuario_app text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auditoria_bd_operacion_check CHECK ((operacion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: auditoria_bd_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_bd_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_bd_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_bd_id_seq OWNED BY public.auditoria_bd.id;


--
-- Name: bitacora; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    usuario_nombre text,
    usuario_correo text,
    rol text,
    accion text NOT NULL,
    modulo text NOT NULL,
    entidad_id text,
    detalle text,
    metodo text,
    ruta text,
    exito boolean DEFAULT true NOT NULL,
    ip text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categorias_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias_evento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo character varying(120) NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion text NOT NULL,
    palabras_clave text DEFAULT ''::text NOT NULL,
    orden integer NOT NULL
);


--
-- Name: codigos_correo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codigos_correo (
    correo text NOT NULL,
    codigo_hash text NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    intentos smallint DEFAULT 0 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: denuncias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.denuncias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    usuario_id uuid,
    motivo text NOT NULL,
    detalle text,
    estado text DEFAULT 'PENDIENTE'::text NOT NULL,
    revisado_por uuid,
    nota_revision text,
    revisado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT denuncias_detalle_check CHECK ((char_length(detalle) <= 1000)),
    CONSTRAINT denuncias_estado_check CHECK ((estado = ANY (ARRAY['PENDIENTE'::text, 'REVISADA'::text, 'DESCARTADA'::text]))),
    CONSTRAINT denuncias_motivo_check CHECK ((motivo = ANY (ARRAY['FALSO'::text, 'INFORMACION_ENGANOSA'::text, 'CONTENIDO_INAPROPIADO'::text, 'FRAUDE'::text, 'CERRADO'::text, 'OTRO'::text])))
);


--
-- Name: eventos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid,
    titulo character varying(160) NOT NULL,
    descripcion text NOT NULL,
    fecha_inicio timestamp with time zone NOT NULL,
    fecha_fin timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    afiche_url character varying(255),
    lugar character varying(200),
    publicar_desde timestamp with time zone,
    publicar_hasta timestamp with time zone,
    creado_por uuid,
    banner_url text,
    categoria_id uuid,
    CONSTRAINT eventos_local_o_lugar CHECK (((local_id IS NOT NULL) OR (lugar IS NOT NULL))),
    CONSTRAINT eventos_publicacion_valida CHECK (((publicar_desde IS NULL) OR (publicar_hasta IS NULL) OR (publicar_hasta > publicar_desde)))
);


--
-- Name: favoritos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favoritos (
    usuario_id uuid NOT NULL,
    local_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fotos_local; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fotos_local (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    url text NOT NULL,
    es_portada boolean DEFAULT false NOT NULL,
    subida_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion text NOT NULL,
    categoria character varying(80),
    direccion text NOT NULL,
    latitud double precision NOT NULL,
    longitud double precision NOT NULL,
    zona_id uuid NOT NULL,
    anfitrion_id uuid NOT NULL,
    estado public.estado_verificacion DEFAULT 'PENDIENTE'::public.estado_verificacion NOT NULL,
    horario_funcionamiento character varying(160),
    documento_funcionamiento_url text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    tipos_local text[] DEFAULT '{}'::text[] NOT NULL,
    dias_funcionamiento text[] DEFAULT '{}'::text[] NOT NULL,
    hora_apertura character varying(5),
    hora_cierre character varying(5),
    correccion_secciones text[] DEFAULT '{}'::text[] NOT NULL,
    correccion_mensaje text,
    historia text,
    aforo integer,
    servicios text[] DEFAULT '{}'::text[] NOT NULL,
    foto_360_url text,
    video_url text,
    whatsapp text,
    reglas text,
    CONSTRAINT locales_aforo_check CHECK (((aforo IS NULL) OR ((aforo >= 1) AND (aforo <= 20000))))
);


--
-- Name: locales_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locales_categorias (
    local_id uuid NOT NULL,
    categoria_id uuid NOT NULL
);


--
-- Name: mensajes_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mensajes_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    sesion_id character varying(80) NOT NULL,
    rol character varying(20) NOT NULL,
    contenido text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    titulo character varying(160) NOT NULL,
    mensaje text NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resenas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resenas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    calificacion smallint NOT NULL,
    comentario text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    atencion smallint,
    limpieza smallint,
    ubicacion smallint,
    precio smallint,
    ambiente smallint,
    CONSTRAINT resenas_ambiente_check CHECK (((ambiente >= 1) AND (ambiente <= 5))),
    CONSTRAINT resenas_atencion_check CHECK (((atencion >= 1) AND (atencion <= 5))),
    CONSTRAINT resenas_calificacion_check CHECK (((calificacion >= 1) AND (calificacion <= 5))),
    CONSTRAINT resenas_comentario_check CHECK ((char_length(comentario) <= 500)),
    CONSTRAINT resenas_limpieza_check CHECK (((limpieza >= 1) AND (limpieza <= 5))),
    CONSTRAINT resenas_precio_check CHECK (((precio >= 1) AND (precio <= 5))),
    CONSTRAINT resenas_ubicacion_check CHECK (((ubicacion >= 1) AND (ubicacion <= 5)))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(120) NOT NULL,
    apellido_paterno character varying(120) NOT NULL,
    apellido_materno character varying(120),
    correo character varying(160) NOT NULL,
    password_hash character varying(200),
    proveedor_auth public.proveedor_auth DEFAULT 'LOCAL'::public.proveedor_auth NOT NULL,
    google_id character varying(120),
    ci character varying(30),
    telefono character varying(30),
    rol public.rol DEFAULT 'TURISTA'::public.rol NOT NULL,
    avatar_url text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    datos_verificados_en timestamp with time zone,
    datos_verificados_por uuid,
    nota_verificacion text,
    verificacion_completa boolean DEFAULT false NOT NULL,
    genero text,
    fecha_nacimiento date,
    pais text,
    ciudad text,
    CONSTRAINT usuarios_genero_check CHECK ((genero = ANY (ARRAY['MASCULINO'::text, 'FEMENINO'::text, 'OTRO'::text, 'PREFIERO_NO_DECIR'::text]))),
    CONSTRAINT usuarios_nota_verificacion_check CHECK ((char_length(nota_verificacion) <= 500))
);


--
-- Name: verificaciones_local; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verificaciones_local (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_id uuid NOT NULL,
    operador_id uuid NOT NULL,
    estado public.estado_verificacion NOT NULL,
    comentario text,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: zonas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zonas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distrito_numero integer NOT NULL,
    nombre_zona_principal character varying(160) NOT NULL,
    direccion_subalcaldia text NOT NULL,
    responsable_subalcaldia character varying(160) NOT NULL,
    latitud double precision,
    longitud double precision
);


--
-- Name: auditoria_bd id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_bd ALTER COLUMN id SET DEFAULT nextval('public.auditoria_bd_id_seq'::regclass);


--
-- Name: auditoria_bd auditoria_bd_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_bd
    ADD CONSTRAINT auditoria_bd_pkey PRIMARY KEY (id);


--
-- Name: bitacora bitacora_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_pkey PRIMARY KEY (id);


--
-- Name: categorias_evento categorias_evento_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_evento
    ADD CONSTRAINT categorias_evento_nombre_key UNIQUE (nombre);


--
-- Name: categorias_evento categorias_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias_evento
    ADD CONSTRAINT categorias_evento_pkey PRIMARY KEY (id);


--
-- Name: codigos_correo codigos_correo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codigos_correo
    ADD CONSTRAINT codigos_correo_pkey PRIMARY KEY (correo);


--
-- Name: denuncias denuncias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncias
    ADD CONSTRAINT denuncias_pkey PRIMARY KEY (id);


--
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id);


--
-- Name: favoritos favoritos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_pkey PRIMARY KEY (usuario_id, local_id);


--
-- Name: fotos_local fotos_local_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_local
    ADD CONSTRAINT fotos_local_pkey PRIMARY KEY (id);


--
-- Name: locales_categorias locales_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales_categorias
    ADD CONSTRAINT locales_categorias_pkey PRIMARY KEY (local_id, categoria_id);


--
-- Name: locales locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales
    ADD CONSTRAINT locales_pkey PRIMARY KEY (id);


--
-- Name: mensajes_chat mensajes_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajes_chat
    ADD CONSTRAINT mensajes_chat_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: resenas resenas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_pkey PRIMARY KEY (id);


--
-- Name: resenas resenas_una_por_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_una_por_usuario UNIQUE (local_id, usuario_id);


--
-- Name: usuarios usuarios_ci_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_ci_key UNIQUE (ci);


--
-- Name: usuarios usuarios_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);


--
-- Name: usuarios usuarios_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_google_id_key UNIQUE (google_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: verificaciones_local verificaciones_local_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_local
    ADD CONSTRAINT verificaciones_local_pkey PRIMARY KEY (id);


--
-- Name: zonas zonas_distrito_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas
    ADD CONSTRAINT zonas_distrito_numero_key UNIQUE (distrito_numero);


--
-- Name: zonas zonas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zonas
    ADD CONSTRAINT zonas_pkey PRIMARY KEY (id);


--
-- Name: idx_auditoria_bd_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_bd_fecha ON public.auditoria_bd USING btree (creado_en DESC);


--
-- Name: idx_auditoria_bd_tabla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_bd_tabla ON public.auditoria_bd USING btree (tabla);


--
-- Name: idx_bitacora_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_fecha ON public.bitacora USING btree (creado_en DESC);


--
-- Name: idx_bitacora_modulo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_modulo ON public.bitacora USING btree (modulo);


--
-- Name: idx_bitacora_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_usuario ON public.bitacora USING btree (usuario_id);


--
-- Name: idx_denuncias_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_denuncias_estado ON public.denuncias USING btree (estado, creado_en DESC);


--
-- Name: idx_eventos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_categoria ON public.eventos USING btree (categoria_id);


--
-- Name: idx_eventos_fecha_inicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_fecha_inicio ON public.eventos USING btree (fecha_inicio);


--
-- Name: idx_eventos_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_local ON public.eventos USING btree (local_id);


--
-- Name: idx_eventos_publicar_hasta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eventos_publicar_hasta ON public.eventos USING btree (publicar_hasta) WHERE (publicar_hasta IS NOT NULL);


--
-- Name: idx_favoritos_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favoritos_local ON public.favoritos USING btree (local_id);


--
-- Name: idx_fotos_local_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fotos_local_local ON public.fotos_local USING btree (local_id);


--
-- Name: idx_locales_anfitrion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locales_anfitrion ON public.locales USING btree (anfitrion_id);


--
-- Name: idx_locales_categorias_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locales_categorias_categoria ON public.locales_categorias USING btree (categoria_id);


--
-- Name: idx_locales_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locales_estado ON public.locales USING btree (estado);


--
-- Name: idx_locales_zona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locales_zona ON public.locales USING btree (zona_id);


--
-- Name: idx_mensajes_chat_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mensajes_chat_sesion ON public.mensajes_chat USING btree (sesion_id);


--
-- Name: idx_notificaciones_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_usuario ON public.notificaciones USING btree (usuario_id);


--
-- Name: idx_resenas_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resenas_local ON public.resenas USING btree (local_id, creado_en DESC);


--
-- Name: idx_verificaciones_local; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verificaciones_local ON public.verificaciones_local USING btree (local_id);


--
-- Name: uq_denuncia_pendiente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_denuncia_pendiente ON public.denuncias USING btree (local_id, usuario_id) WHERE (estado = 'PENDIENTE'::text);


--
-- Name: categorias_evento trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.categorias_evento FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: denuncias trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.denuncias FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: eventos trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: locales trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.locales FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: resenas trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.resenas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: usuarios trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: verificaciones_local trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.verificaciones_local FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: zonas trg_auditoria; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria AFTER INSERT OR DELETE OR UPDATE ON public.zonas FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();


--
-- Name: bitacora bitacora_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora
    ADD CONSTRAINT bitacora_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: denuncias denuncias_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncias
    ADD CONSTRAINT denuncias_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: denuncias denuncias_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncias
    ADD CONSTRAINT denuncias_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: denuncias denuncias_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncias
    ADD CONSTRAINT denuncias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: eventos eventos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_evento(id) ON DELETE SET NULL;


--
-- Name: eventos eventos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: eventos eventos_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eventos
    ADD CONSTRAINT eventos_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: favoritos favoritos_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: favoritos favoritos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favoritos
    ADD CONSTRAINT favoritos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: fotos_local fotos_local_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_local
    ADD CONSTRAINT fotos_local_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: locales locales_anfitrion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales
    ADD CONSTRAINT locales_anfitrion_id_fkey FOREIGN KEY (anfitrion_id) REFERENCES public.usuarios(id);


--
-- Name: locales_categorias locales_categorias_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales_categorias
    ADD CONSTRAINT locales_categorias_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_evento(id) ON DELETE CASCADE;


--
-- Name: locales_categorias locales_categorias_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales_categorias
    ADD CONSTRAINT locales_categorias_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: locales locales_zona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locales
    ADD CONSTRAINT locales_zona_id_fkey FOREIGN KEY (zona_id) REFERENCES public.zonas(id);


--
-- Name: mensajes_chat mensajes_chat_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mensajes_chat
    ADD CONSTRAINT mensajes_chat_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: resenas resenas_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: resenas resenas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resenas
    ADD CONSTRAINT resenas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_datos_verificados_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_datos_verificados_por_fkey FOREIGN KEY (datos_verificados_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: verificaciones_local verificaciones_local_local_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_local
    ADD CONSTRAINT verificaciones_local_local_id_fkey FOREIGN KEY (local_id) REFERENCES public.locales(id) ON DELETE CASCADE;


--
-- Name: verificaciones_local verificaciones_local_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_local
    ADD CONSTRAINT verificaciones_local_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES public.usuarios(id);


--
-- PostgreSQL database dump complete
--

\unrestrict bs39qDDXgV1t7EIhpOfGSNM4It9DKHUsFD0SFAdLrvR1SHpihsfQMf2dHgHMVgt

