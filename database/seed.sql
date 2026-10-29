-- =====================================================================
-- Datos iniciales. Ejecutar DESPUES de schema.sql.
-- Fuente de las 14 zonas: elalto.gob.bo/subalcaldias/ (consultado 2026-09-24).
-- Los locales turisticos (Local Iroman, etc.) son datos de EJEMPLO/ficticios:
-- GAMEA no publica un directorio de negocios privados, solo oficinas de
-- subalcaldia. Reemplazalos cuando tengas datos reales o cuando los
-- anfitriones se registren desde la app.
-- =====================================================================

INSERT INTO zonas (distrito_numero, nombre_zona_principal, direccion_subalcaldia, responsable_subalcaldia, latitud, longitud) VALUES
(1,  'Zona Santa Rosa (La Ceja)',                    'Avenida Civica Calle 6, Zona Santa Rosa (altura piscina semi olimpica)',                        'Nadir Geraldine Palombo Aparicio', -16.5027, -68.1716),
(2,  'Urbanizacion Pedro Domingo Murillo (Sud)',     'Calle Jose Ignacio Sanjines, S/N, Urbanizacion Pedro Domingo Murillo (Sud)',                    'Irene Silvia Cusi Pachaguaya',      NULL,      NULL),
(3,  'Zona Villa Caluyo',                            'Zona Villa Caluyo, Avenida IV S/N Lado Cancha Multiple Caluyo',                                 'Guillermo Mamani Segura',           -16.538988, -68.165077),
(4,  'Plaza Pedro Domingo Murillo',                  'Av. Juan Misael Saracho y Av. 23 de Marzo, frente a la plaza Pedro Domingo Murillo',            'Franz Grover Contreras Siñani',     NULL,      NULL),
(5,  'Zona Puerto Mejillones (Puente Rio Seco)',     'Av. Prolongacion Julian Apaza, Zona Puerto Mejillones (altura puente Rio Seco)',                'Victor Jose Bernal Cala',           NULL,      NULL),
(6,  'Zona Alto Lima (cercania Puente Vela)',        'Entre Avenida Litoral y Manco Kapac, Zona Alto Lima',                                           'Freddy Tarqui Ticona',              NULL,      NULL),
(7,  'Zona San Roque',                               'Carretera Copacabana entre Centro de Salud y U.E. San Roque, Zona San Roque',                   'Edgar Condori Limachi',             NULL,      NULL),
(8,  'Zona Tocorpuri',                               'Calle Tocorpuri esquina Calle Pissis Huandoy',                                                  'Simon Valentin Quispe Pati',        NULL,      NULL),
(9,  'Comunidad Originaria Villandrani',             'Plaza Principal Comunidad Originaria Villandrani',                                              'Miguel Santos Maquera Chura',       NULL,      NULL),
(10, 'Comunidad Amachuma',                           'Comunidad de Amachuma, cerca de las antenas Tupac Katari',                                      'Miguel Mamani Condori',             NULL,      NULL),
(11, 'Comunidad Tacachira',                          'Camino Laja Comunidad Tacachira, plaza principal de Tacachira',                                 'Daniel Condori Lopez',              NULL,      NULL),
(12, 'Zona San Pedro',                               'Av. San Pedro, entre calle Gabriel Burgoa Cruz',                                                'Miriam Condori Chavez',             NULL,      NULL),
(13, 'Comunidad El Ingenio',                         'Comunidad El Ingenio, lado Unidad Educativa El Ingenio',                                        'German Mamani Silva',               NULL,      NULL),
(14, 'Zona Rodriguez Pardo',                         'Av. Luis Rodriguez Pardo entre Av. Abel Iturralde',                                             'Edwin Crispin Casas Llante',        NULL,      NULL);

-- Usuarios base. Clave de todos: "CambiarEstaClave123!" (cambiar apenas puedas iniciar sesion).
INSERT INTO usuarios (id, nombre, apellido_paterno, apellido_materno, correo, password_hash, rol) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin', 'Sistema',  NULL,        'admin@turismoelalto.bo',        crypt('CambiarEstaClave123!', gen_salt('bf', 10)), 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'Maria', 'Quispe',   'Flores',    'operador@turismoelalto.bo',     crypt('CambiarEstaClave123!', gen_salt('bf', 10)), 'OPERADOR');

INSERT INTO usuarios (id, nombre, apellido_paterno, apellido_materno, correo, ci, password_hash, rol) VALUES
('33333333-3333-3333-3333-333333333333', 'Juan', 'Iroman', 'Choque', 'duenio.iroman@example.com', '7654321 LP', crypt('CambiarEstaClave123!', gen_salt('bf', 10)), 'ANFITRION');

-- Local de ejemplo (ficticio) en la zona de La Ceja (distrito 1)
INSERT INTO locales (id, nombre, descripcion, categoria, direccion, latitud, longitud, zona_id, anfitrion_id, estado, horario_funcionamiento)
SELECT
    '44444444-4444-4444-4444-444444444444',
    'Local Iroman',
    'Local de eventos y comida tipica en la zona de La Ceja, punto de referencia conocido en el Distrito 1 de El Alto. (Descripcion de ejemplo: reemplazar con datos reales verificados por el anfitrion).',
    'Salon de eventos / Cholet',
    'La Ceja, Distrito 1, El Alto',
    -16.5027, -68.1716,
    z.id,
    '33333333-3333-3333-3333-333333333333',
    'APROBADO',
    'Vie-Dom 10:00 - 23:00'
FROM zonas z WHERE z.distrito_numero = 1;

INSERT INTO fotos_local (local_id, url, es_portada) VALUES
('44444444-4444-4444-4444-444444444444', 'https://placehold.co/800x600?text=Local+Iroman+1', true),
('44444444-4444-4444-4444-444444444444', 'https://placehold.co/800x600?text=Local+Iroman+2', false);

INSERT INTO eventos (local_id, titulo, descripcion, fecha_inicio, fecha_fin) VALUES
('44444444-4444-4444-4444-444444444444', 'Feria gastronomica de aniversario', 'Evento anual con comida tipica y musica en vivo.', '2026-10-16 10:00:00-04', '2026-10-16 22:00:00-04');

INSERT INTO verificaciones_local (local_id, operador_id, estado, comentario) VALUES
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'APROBADO', 'Documentacion y CI verificados. Local aprobado.');
