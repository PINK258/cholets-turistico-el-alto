--
-- PostgreSQL database dump
--

\restrict UR5Kv0QbRsGwbdWFXUVGJsPrfDyCVRGCcvtXO4qV1gIx7kaZDWsVdwgybg8zh8W

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: categorias_evento; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categorias_evento VALUES ('06b62c0b-0e20-4af2-b0ea-3be2d7b7d478', 'Eventos Académicos e Institucionales', 'Fiestas de Promoción (Bachilleres)', 'Cenas de gala, brindis, vals de graduados y baile para promociones de colegios fiscales y particulares.', 'promocion promociones promo bachiller bachilleres colegio graduados vals gala', 1);
INSERT INTO public.categorias_evento VALUES ('38327792-5909-47eb-b1b5-8ff9a54bffca', 'Eventos Académicos e Institucionales', 'Graduaciones Universitarias y de Institutos', 'Colaciones de grado, festejos de titulación técnica y profesional, licenciaturas y posgrados.', 'graduacion graduaciones titulacion colacion universidad universitaria instituto licenciatura posgrado egresados', 2);
INSERT INTO public.categorias_evento VALUES ('3429a0cf-705e-489c-9b7b-bf79ef86dd69', 'Eventos Académicos e Institucionales', 'Licenciamiento Militar (Soldados y Premilitares)', 'Recepciones y almuerzos de gala organizados por las familias para celebrar la conclusión del servicio militar obligatorio o premilitar, con entrega de presentes a los licenciados.', 'licenciamiento licenciados militar soldado soldados premilitar premilitares cuartel servicio', 3);
INSERT INTO public.categorias_evento VALUES ('12daf2cf-543a-4884-a1ea-39e4bccc5505', 'Eventos Académicos e Institucionales', 'Aniversarios de Unidades Educativas y Facultades', 'Almuerzos de confraternización entre docentes, administrativos y centros de estudiantes.', 'aniversario unidad educativa colegio facultad docentes profesores administrativos estudiantes confraternizacion', 4);
INSERT INTO public.categorias_evento VALUES ('39f37adc-bebf-4fbb-9316-6087263edcd9', 'Acontecimientos Sociales y Familiares', 'Matrimonios', 'Grandes recepciones nupciales que incluyen vals, cena, música en vivo y la tradición del prendido de billetes o entrega de regalos de gran valor.', 'matrimonio matrimonios boda bodas casamiento nupcial novios prendido', 5);
INSERT INTO public.categorias_evento VALUES ('2c6152b3-d707-4cef-b71d-e9306d86e1ec', 'Acontecimientos Sociales y Familiares', 'Quinceañeros', 'Fiestas juveniles con coreografías de damas y caballeros, desfile por pasarelas del salón y shows de luces.', 'quinceanero quinceaneros quinceanera quince xv damas caballeros', 6);
INSERT INTO public.categorias_evento VALUES ('b0ec1852-e4bb-42a9-a36f-591f4c091955', 'Acontecimientos Sociales y Familiares', 'Bautizos y Primeras Comuniones', 'Almuerzos familiares con presencia de padrinos, compadres e invitados.', 'bautizo bautizos comunion comuniones padrinos compadres', 7);
INSERT INTO public.categorias_evento VALUES ('04fdd549-a26a-40c0-b33c-0f1fd64fbf89', 'Acontecimientos Sociales y Familiares', 'Cumpleaños y Fiestas de Aniversario', 'Celebraciones de décadas (18, 30, 50 años), aniversarios de bodas (plata y oro) o agasajos a personas mayores.', 'cumpleanos cumple aniversario aniversarios plata oro agasajo', 8);
INSERT INTO public.categorias_evento VALUES ('a72f8946-82ed-41ea-8e25-1bf5c260b553', 'Fiestas Folclóricas y Patronales (Prestes)', 'Recepción Social de Pasantes / Prestes', 'Fiestas centrales en honor a santos patronos (Señor Jesús del Gran Poder, Virgen del Carmen, etc.) a cargo de los pasantes de fraternidades de Morenada, Caporales, Tobas, etc.', 'preste prestes pasante pasantes fraternidad fraternidades morenada caporales tobas patron patronal santo gran poder virgen carmen', 9);
INSERT INTO public.categorias_evento VALUES ('1cc5b89c-605b-4d01-91a2-17b3c19b305d', 'Fiestas Folclóricas y Patronales (Prestes)', 'Lanzamientos de Trajes y Ensayos Generales', 'Presentación de la indumentaria oficial, bandas invitadas y juramento de bloques de las comparsas.', 'lanzamiento lanzamientos trajes ensayo ensayos comparsa comparsas bloque bloques indumentaria', 10);
INSERT INTO public.categorias_evento VALUES ('1c39b6f6-4a97-4360-9df5-4ca41abff326', 'Fiestas Folclóricas y Patronales (Prestes)', 'Diana y Recibimiento de Bandas', 'Actos matutinos o vespertinos con bandas de bronce de renombre tocando en el escenario del cholet.', 'diana recibimiento banda bandas bronce', 11);
INSERT INTO public.categorias_evento VALUES ('1c58070a-bb08-4f47-a052-6b7d542e53a3', 'Costumbres y Ritos Andinos', 'Rutuchiku (Primer corte de pelo)', 'Tradición familiar donde padrinos e invitados cortan mechones a los niños a cambio de dinero o regalos significativos.', 'rutuchiku rutucha corte pelo cabello mechones', 12);
INSERT INTO public.categorias_evento VALUES ('36740af8-0e2e-4930-86ad-c95bcff0d657', 'Costumbres y Ritos Andinos', 'Ch''alla y Carnavales', 'Ritos de bendición, sahumerio y agradecimiento a la Pachamama por nuevos bienes, vehículos o negocios, acompañados de fiesta con música autóctona o de banda.', 'challa chaalla carnaval carnavales pachamama sahumerio bendicion', 13);
INSERT INTO public.categorias_evento VALUES ('412ef1b4-6164-4b40-8cbd-2b90e9374054', 'Eventos Gremiales, Corporativos y Comerciales', 'Aniversarios de Gremios y Sindicatos', 'Fiestas de asociaciones de comerciantes, federaciones de transporte, artesanos y juntas vecinales.', 'gremio gremios sindicato sindicatos asociacion comerciantes federacion transporte artesanos junta vecinal vecinos', 14);
INSERT INTO public.categorias_evento VALUES ('a435ac7a-ad37-401c-960d-a8fa8679496f', 'Eventos Gremiales, Corporativos y Comerciales', 'Desfiles de Moda y Pasarelas de Chola Paceña', 'Presentación de nuevas colecciones de mantas, polleras, sombreros y joyas confeccionadas por diseñadores locales.', 'desfile desfiles moda pasarela pasarelas chola cholita pollera polleras mantas sombreros joyas', 15);
INSERT INTO public.categorias_evento VALUES ('23b454c8-8504-4f9c-90d4-a8d4ac350205', 'Eventos Gremiales, Corporativos y Comerciales', 'Cenas de Fin de Año de Empresas', 'Agasajos corporativos, premiaciones laborales y fiestas navideñas para el personal.', 'empresa empresas corporativo corporativa fin ano navidad navidena premiacion personal trabajadores', 16);
INSERT INTO public.categorias_evento VALUES ('2fc9a6ba-cc45-443b-8a24-775f14a1ac83', 'Conciertos y Espectáculos Públicos', 'Presentaciones de Grupos Musicales', 'Conciertos en vivo de agrupaciones folclóricas consagradas, cumbia nacional, cumbia sureña y orquestas de renombre.', 'concierto conciertos grupo grupos musical musicales cumbia orquesta orquestas folclorico folclorica', 17);
INSERT INTO public.categorias_evento VALUES ('1d9fa4a0-99e6-49dd-96d1-f8ada0f33f6e', 'Conciertos y Espectáculos Públicos', 'Retretas de Bandas de Bronce', 'Encuentros musicales y duelos de interpretación de grandes bandas folclóricas.', 'retreta retretas banda bandas bronce duelo', 18);


--
-- Data for Name: zonas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.zonas VALUES ('f6a76a79-5cd4-472d-85b8-68a38b3c9827', 1, 'Zona Santa Rosa (La Ceja)', 'Avenida Civica Calle 6, Zona Santa Rosa (altura piscina semi olimpica)', 'Nadir Geraldine Palombo Aparicio', -16.5027, -68.1716);
INSERT INTO public.zonas VALUES ('7b836612-1ead-4f90-b3dc-f1ee5650ccda', 2, 'Urbanizacion Pedro Domingo Murillo (Sud)', 'Calle Jose Ignacio Sanjines, S/N, Urbanizacion Pedro Domingo Murillo (Sud)', 'Irene Silvia Cusi Pachaguaya', NULL, NULL);
INSERT INTO public.zonas VALUES ('e7230f55-1d6b-4592-ab49-6fa5eaca5010', 3, 'Zona Villa Caluyo', 'Zona Villa Caluyo, Avenida IV S/N Lado Cancha Multiple Caluyo', 'Guillermo Mamani Segura', -16.538988, -68.165077);
INSERT INTO public.zonas VALUES ('feba1e5e-fe56-4ac6-bda2-4247106bac43', 4, 'Plaza Pedro Domingo Murillo', 'Av. Juan Misael Saracho y Av. 23 de Marzo, frente a la plaza Pedro Domingo Murillo', 'Franz Grover Contreras Siñani', NULL, NULL);
INSERT INTO public.zonas VALUES ('67561e55-e278-4f27-812c-710383345d99', 5, 'Zona Puerto Mejillones (Puente Rio Seco)', 'Av. Prolongacion Julian Apaza, Zona Puerto Mejillones (altura puente Rio Seco)', 'Victor Jose Bernal Cala', NULL, NULL);
INSERT INTO public.zonas VALUES ('eb800d01-e200-499b-9de1-1fb74cf9e848', 6, 'Zona Alto Lima (cercania Puente Vela)', 'Entre Avenida Litoral y Manco Kapac, Zona Alto Lima', 'Freddy Tarqui Ticona', NULL, NULL);
INSERT INTO public.zonas VALUES ('17d5789d-cdc3-4cd3-81b6-56e7998220e8', 7, 'Zona San Roque', 'Carretera Copacabana entre Centro de Salud y U.E. San Roque, Zona San Roque', 'Edgar Condori Limachi', NULL, NULL);
INSERT INTO public.zonas VALUES ('62684146-e3e2-42f6-bbbe-a3fe8d7fc919', 8, 'Zona Tocorpuri', 'Calle Tocorpuri esquina Calle Pissis Huandoy', 'Simon Valentin Quispe Pati', NULL, NULL);
INSERT INTO public.zonas VALUES ('a285d29d-69af-4a38-86e3-18eb305e6092', 9, 'Comunidad Originaria Villandrani', 'Plaza Principal Comunidad Originaria Villandrani', 'Miguel Santos Maquera Chura', NULL, NULL);
INSERT INTO public.zonas VALUES ('ab715e36-05a5-4e3b-9e0a-90c0d380bab2', 10, 'Comunidad Amachuma', 'Comunidad de Amachuma, cerca de las antenas Tupac Katari', 'Miguel Mamani Condori', NULL, NULL);
INSERT INTO public.zonas VALUES ('1dd41647-a3ff-4a33-a492-70f3981c19cc', 11, 'Comunidad Tacachira', 'Camino Laja Comunidad Tacachira, plaza principal de Tacachira', 'Daniel Condori Lopez', NULL, NULL);
INSERT INTO public.zonas VALUES ('0f8a24b1-ad73-493f-96c9-ddaa8afe0423', 12, 'Zona San Pedro', 'Av. San Pedro, entre calle Gabriel Burgoa Cruz', 'Miriam Condori Chavez', NULL, NULL);
INSERT INTO public.zonas VALUES ('4538a9cf-9cfe-41a5-953a-3235a0d2d089', 13, 'Comunidad El Ingenio', 'Comunidad El Ingenio, lado Unidad Educativa El Ingenio', 'German Mamani Silva', NULL, NULL);
INSERT INTO public.zonas VALUES ('3db65638-2861-4ffc-a996-0a538aab7469', 14, 'Zona Rodriguez Pardo', 'Av. Luis Rodriguez Pardo entre Av. Abel Iturralde', 'Edwin Crispin Casas Llante', NULL, NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict UR5Kv0QbRsGwbdWFXUVGJsPrfDyCVRGCcvtXO4qV1gIx7kaZDWsVdwgybg8zh8W

