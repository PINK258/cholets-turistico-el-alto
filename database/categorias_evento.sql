-- =====================================================================
-- Categorias de eventos que puede realizar un local/cholet.
-- Ejecutar DESPUES de schema.sql y seed.sql. Se puede correr varias veces:
-- no duplica tablas ni filas (IF NOT EXISTS / ON CONFLICT).
--
-- palabras_clave: sinonimos que usa el chatbot para entender preguntas como
-- "¿donde hago mi boda?" (-> Matrimonios) o "¿quien hace prestes?".
-- =====================================================================

CREATE TABLE IF NOT EXISTS categorias_evento (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo           VARCHAR(120) NOT NULL,
    nombre          VARCHAR(160) NOT NULL UNIQUE,
    descripcion     TEXT NOT NULL,
    palabras_clave  TEXT NOT NULL DEFAULT '',
    orden           INT NOT NULL
);

CREATE TABLE IF NOT EXISTS locales_categorias (
    local_id      UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
    categoria_id  UUID NOT NULL REFERENCES categorias_evento(id) ON DELETE CASCADE,
    PRIMARY KEY (local_id, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_locales_categorias_categoria ON locales_categorias(categoria_id);

INSERT INTO categorias_evento (orden, grupo, nombre, descripcion, palabras_clave) VALUES
-- 1. Eventos Académicos e Institucionales
(1,  'Eventos Académicos e Institucionales', 'Fiestas de Promoción (Bachilleres)',
     'Cenas de gala, brindis, vals de graduados y baile para promociones de colegios fiscales y particulares.',
     'promocion promociones promo bachiller bachilleres colegio graduados vals gala'),
(2,  'Eventos Académicos e Institucionales', 'Graduaciones Universitarias y de Institutos',
     'Colaciones de grado, festejos de titulación técnica y profesional, licenciaturas y posgrados.',
     'graduacion graduaciones titulacion colacion universidad universitaria instituto licenciatura posgrado egresados'),
(3,  'Eventos Académicos e Institucionales', 'Licenciamiento Militar (Soldados y Premilitares)',
     'Recepciones y almuerzos de gala organizados por las familias para celebrar la conclusión del servicio militar obligatorio o premilitar, con entrega de presentes a los licenciados.',
     'licenciamiento licenciados militar soldado soldados premilitar premilitares cuartel servicio'),
(4,  'Eventos Académicos e Institucionales', 'Aniversarios de Unidades Educativas y Facultades',
     'Almuerzos de confraternización entre docentes, administrativos y centros de estudiantes.',
     'aniversario unidad educativa colegio facultad docentes profesores administrativos estudiantes confraternizacion'),
-- 2. Acontecimientos Sociales y Familiares
(5,  'Acontecimientos Sociales y Familiares', 'Matrimonios',
     'Grandes recepciones nupciales que incluyen vals, cena, música en vivo y la tradición del prendido de billetes o entrega de regalos de gran valor.',
     'matrimonio matrimonios boda bodas casamiento nupcial novios prendido'),
(6,  'Acontecimientos Sociales y Familiares', 'Quinceañeros',
     'Fiestas juveniles con coreografías de damas y caballeros, desfile por pasarelas del salón y shows de luces.',
     'quinceanero quinceaneros quinceanera quince xv damas caballeros'),
(7,  'Acontecimientos Sociales y Familiares', 'Bautizos y Primeras Comuniones',
     'Almuerzos familiares con presencia de padrinos, compadres e invitados.',
     'bautizo bautizos comunion comuniones padrinos compadres'),
(8,  'Acontecimientos Sociales y Familiares', 'Cumpleaños y Fiestas de Aniversario',
     'Celebraciones de décadas (18, 30, 50 años), aniversarios de bodas (plata y oro) o agasajos a personas mayores.',
     'cumpleanos cumple aniversario aniversarios plata oro agasajo'),
-- 3. Fiestas Folclóricas y Patronales (Prestes)
(9,  'Fiestas Folclóricas y Patronales (Prestes)', 'Recepción Social de Pasantes / Prestes',
     'Fiestas centrales en honor a santos patronos (Señor Jesús del Gran Poder, Virgen del Carmen, etc.) a cargo de los pasantes de fraternidades de Morenada, Caporales, Tobas, etc.',
     'preste prestes pasante pasantes fraternidad fraternidades morenada caporales tobas patron patronal santo gran poder virgen carmen'),
(10, 'Fiestas Folclóricas y Patronales (Prestes)', 'Lanzamientos de Trajes y Ensayos Generales',
     'Presentación de la indumentaria oficial, bandas invitadas y juramento de bloques de las comparsas.',
     'lanzamiento lanzamientos trajes ensayo ensayos comparsa comparsas bloque bloques indumentaria'),
(11, 'Fiestas Folclóricas y Patronales (Prestes)', 'Diana y Recibimiento de Bandas',
     'Actos matutinos o vespertinos con bandas de bronce de renombre tocando en el escenario del cholet.',
     'diana recibimiento banda bandas bronce'),
-- 4. Costumbres y Ritos Andinos
(12, 'Costumbres y Ritos Andinos', 'Rutuchiku (Primer corte de pelo)',
     'Tradición familiar donde padrinos e invitados cortan mechones a los niños a cambio de dinero o regalos significativos.',
     'rutuchiku rutucha corte pelo cabello mechones'),
(13, 'Costumbres y Ritos Andinos', 'Ch''alla y Carnavales',
     'Ritos de bendición, sahumerio y agradecimiento a la Pachamama por nuevos bienes, vehículos o negocios, acompañados de fiesta con música autóctona o de banda.',
     'challa chaalla carnaval carnavales pachamama sahumerio bendicion'),
-- 5. Eventos Gremiales, Corporativos y Comerciales
(14, 'Eventos Gremiales, Corporativos y Comerciales', 'Aniversarios de Gremios y Sindicatos',
     'Fiestas de asociaciones de comerciantes, federaciones de transporte, artesanos y juntas vecinales.',
     'gremio gremios sindicato sindicatos asociacion comerciantes federacion transporte artesanos junta vecinal vecinos'),
(15, 'Eventos Gremiales, Corporativos y Comerciales', 'Desfiles de Moda y Pasarelas de Chola Paceña',
     'Presentación de nuevas colecciones de mantas, polleras, sombreros y joyas confeccionadas por diseñadores locales.',
     'desfile desfiles moda pasarela pasarelas chola cholita pollera polleras mantas sombreros joyas'),
(16, 'Eventos Gremiales, Corporativos y Comerciales', 'Cenas de Fin de Año de Empresas',
     'Agasajos corporativos, premiaciones laborales y fiestas navideñas para el personal.',
     'empresa empresas corporativo corporativa fin ano navidad navidena premiacion personal trabajadores'),
-- 6. Conciertos y Espectáculos Públicos
(17, 'Conciertos y Espectáculos Públicos', 'Presentaciones de Grupos Musicales',
     'Conciertos en vivo de agrupaciones folclóricas consagradas, cumbia nacional, cumbia sureña y orquestas de renombre.',
     'concierto conciertos grupo grupos musical musicales cumbia orquesta orquestas folclorico folclorica'),
(18, 'Conciertos y Espectáculos Públicos', 'Retretas de Bandas de Bronce',
     'Encuentros musicales y duelos de interpretación de grandes bandas folclóricas.',
     'retreta retretas banda bandas bronce duelo')
ON CONFLICT (nombre) DO UPDATE SET
    grupo = EXCLUDED.grupo,
    descripcion = EXCLUDED.descripcion,
    palabras_clave = EXCLUDED.palabras_clave,
    orden = EXCLUDED.orden;
