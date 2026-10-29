// Seed de datos reales de las 14 Subalcaldias de El Alto (fuente: elalto.gob.bo/subalcaldias/)
// consultado el 2026-09-24. Los locales turisticos (Local Iroman, etc.) SI son ficticios
// de ejemplo: la web de GAMEA no publica un directorio de negocios/locales privados,
// solo direcciones de oficinas de subalcaldia. Reemplaza estos locales con datos reales
// (relevamiento propio, Google Maps, Facebook de los negocios, etc.) antes de producir.

import { PrismaClient, Rol, EstadoVerificacion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ZONAS = [
  { distritoNumero: 1, nombreZonaPrincipal: 'Zona Santa Rosa (La Ceja)', direccionSubalcaldia: 'Avenida Civica Calle 6, Zona Santa Rosa (altura piscina semi olimpica)', responsableSubalcaldia: 'Nadir Geraldine Palombo Aparicio', latitud: -16.5027, longitud: -68.1716 },
  { distritoNumero: 2, nombreZonaPrincipal: 'Urbanizacion Pedro Domingo Murillo (Sud)', direccionSubalcaldia: 'Calle Jose Ignacio Sanjines, S/N, Urbanizacion Pedro Domingo Murillo (Sud)', responsableSubalcaldia: 'Irene Silvia Cusi Pachaguaya', latitud: null, longitud: null },
  { distritoNumero: 3, nombreZonaPrincipal: 'Zona Villa Caluyo', direccionSubalcaldia: 'Zona Villa Caluyo, Avenida IV S/N Lado Cancha Multiple Caluyo', responsableSubalcaldia: 'Guillermo Mamani Segura', latitud: -16.538988150917, longitud: -68.165076767413 },
  { distritoNumero: 4, nombreZonaPrincipal: 'Plaza Pedro Domingo Murillo', direccionSubalcaldia: 'Av. Juan Misael Saracho y Av. 23 de Marzo, frente a la plaza Pedro Domingo Murillo', responsableSubalcaldia: 'Franz Grover Contreras Siñani', latitud: null, longitud: null },
  { distritoNumero: 5, nombreZonaPrincipal: 'Zona Puerto Mejillones (Puente Rio Seco)', direccionSubalcaldia: 'Av. Prolongacion Julian Apaza, Zona Puerto Mejillones (altura puente Rio Seco)', responsableSubalcaldia: 'Victor Jose Bernal Cala', latitud: null, longitud: null },
  { distritoNumero: 6, nombreZonaPrincipal: 'Zona Alto Lima (Puente Vela)', direccionSubalcaldia: 'Entre Avenida Litoral y Manco Kapac, Zona Alto Lima', responsableSubalcaldia: 'Freddy Tarqui Ticona', latitud: null, longitud: null },
  { distritoNumero: 7, nombreZonaPrincipal: 'Zona San Roque', direccionSubalcaldia: 'Carretera Copacabana entre Centro de Salud y U.E. San Roque, Zona San Roque', responsableSubalcaldia: 'Edgar Condori Limachi', latitud: null, longitud: null },
  { distritoNumero: 8, nombreZonaPrincipal: 'Zona Tocorpuri', direccionSubalcaldia: 'Calle Tocorpuri esquina Calle Pissis Huandoy', responsableSubalcaldia: 'Simon Valentin Quispe Pati', latitud: null, longitud: null },
  { distritoNumero: 9, nombreZonaPrincipal: 'Comunidad Originaria Villandrani', direccionSubalcaldia: 'Plaza Principal Comunidad Originaria Villandrani', responsableSubalcaldia: 'Miguel Santos Maquera Chura', latitud: null, longitud: null },
  { distritoNumero: 10, nombreZonaPrincipal: 'Comunidad Amachuma', direccionSubalcaldia: 'Comunidad de Amachuma, cerca de las antenas Tupac Katari', responsableSubalcaldia: 'Miguel Mamani Condori', latitud: null, longitud: null },
  { distritoNumero: 11, nombreZonaPrincipal: 'Comunidad Tacachira', direccionSubalcaldia: 'Camino Laja Comunidad Tacachira, plaza principal de Tacachira', responsableSubalcaldia: 'Daniel Condori Lopez', latitud: null, longitud: null },
  { distritoNumero: 12, nombreZonaPrincipal: 'Zona San Pedro', direccionSubalcaldia: 'Av. San Pedro, entre calle Gabriel Burgoa Cruz', responsableSubalcaldia: 'Miriam Condori Chavez', latitud: null, longitud: null },
  { distritoNumero: 13, nombreZonaPrincipal: 'Comunidad El Ingenio', direccionSubalcaldia: 'Comunidad El Ingenio, lado Unidad Educativa El Ingenio', responsableSubalcaldia: 'German Mamani Silva', latitud: null, longitud: null },
  { distritoNumero: 14, nombreZonaPrincipal: 'Zona Rodriguez Pardo', direccionSubalcaldia: 'Av. Luis Rodriguez Pardo entre Av. Abel Iturralde', responsableSubalcaldia: 'Edwin Crispin Casas Llante', latitud: null, longitud: null },
];

async function main() {
  console.log('Creando zonas (subalcaldias reales de GAMEA)...');
  const zonaMap = new Map<number, string>();
  for (const z of ZONAS) {
    const zona = await prisma.zona.upsert({
      where: { distritoNumero: z.distritoNumero },
      update: z,
      create: z,
    });
    zonaMap.set(z.distritoNumero, zona.id);
  }

  console.log('Creando usuarios base (admin, operador, anfitrion de ejemplo)...');
  const passwordHash = await bcrypt.hash('CambiarEstaClave123!', 10);

  const admin = await prisma.usuario.upsert({
    where: { correo: 'admin@turismoelalto.bo' },
    update: {},
    create: {
      nombre: 'Admin',
      apellidoPaterno: 'Sistema',
      correo: 'admin@turismoelalto.bo',
      passwordHash,
      rol: Rol.ADMIN,
    },
  });

  const operador = await prisma.usuario.upsert({
    where: { correo: 'operador@turismoelalto.bo' },
    update: {},
    create: {
      nombre: 'Maria',
      apellidoPaterno: 'Quispe',
      apellidoMaterno: 'Flores',
      correo: 'operador@turismoelalto.bo',
      passwordHash,
      rol: Rol.OPERADOR,
    },
  });

  const anfitrion = await prisma.usuario.upsert({
    where: { correo: 'duenio.iroman@example.com' },
    update: {},
    create: {
      nombre: 'Juan',
      apellidoPaterno: 'Iroman',
      apellidoMaterno: 'Choque',
      correo: 'duenio.iroman@example.com',
      ci: '7654321 LP',
      passwordHash,
      rol: Rol.ANFITRION,
    },
  });

  console.log('Creando locales de EJEMPLO (ficticios, reemplazar con datos reales)...');
  const iroman = await prisma.local.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Local Iroman',
      descripcion: 'Local de eventos y comida tipica en la zona de La Ceja, punto de referencia conocido en el Distrito 1 de El Alto. (Descripcion de ejemplo, reemplazar con datos reales verificados por el anfitrion).',
      tiposLocal: ['Cholet', 'Salón de eventos'],
      direccion: 'La Ceja, Distrito 1, El Alto',
      latitud: -16.5027,
      longitud: -68.1716,
      zonaId: zonaMap.get(1)!,
      anfitrionId: anfitrion.id,
      estado: EstadoVerificacion.APROBADO,
      horarioFuncionamiento: 'Vie-Dom 10:00 - 23:00',
      fotos: {
        create: [
          { url: 'https://placehold.co/800x600?text=Local+Iroman+1', esPortada: true },
          { url: 'https://placehold.co/800x600?text=Local+Iroman+2' },
        ],
      },
      eventos: {
        create: [
          {
            titulo: 'Feria gastronomica de aniversario',
            descripcion: 'Evento anual con comida tipica y musica en vivo.',
            fechaInicio: new Date('2026-10-16T10:00:00'),
            fechaFin: new Date('2026-10-16T22:00:00'),
          },
        ],
      },
    },
  });

  await prisma.verificacionLocal.create({
    data: {
      localId: iroman.id,
      operadorId: operador.id,
      estado: EstadoVerificacion.APROBADO,
      comentario: 'Documentacion y CI verificados. Local aprobado.',
    },
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
