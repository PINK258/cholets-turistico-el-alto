import { BadRequestException, Injectable } from '@nestjs/common';
import { EstadoVerificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Fila de un conteo: PostgreSQL devuelve COUNT como bigint; se pasa a number.
type Fila = Record<string, unknown>;
const aNumeros = (filas: Fila[]) =>
  filas.map((f) =>
    Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])),
  );

// Rangos de edad usados en todos los reportes.
const RANGO_EDAD = Prisma.sql`
  CASE
    WHEN u.fecha_nacimiento IS NULL THEN 'Sin dato'
    WHEN date_part('year', age(u.fecha_nacimiento)) < 18 THEN 'Menor de 18'
    WHEN date_part('year', age(u.fecha_nacimiento)) <= 25 THEN '18 a 25'
    WHEN date_part('year', age(u.fecha_nacimiento)) <= 35 THEN '26 a 35'
    WHEN date_part('year', age(u.fecha_nacimiento)) <= 45 THEN '36 a 45'
    WHEN date_part('year', age(u.fecha_nacimiento)) <= 60 THEN '46 a 60'
    ELSE 'Mayor de 60'
  END`;

const GENERO = Prisma.sql`COALESCE(u.genero, 'SIN_DATO')`;
const POR_PAGINA = 50;

export type Periodo = { desde: Date; hasta: Date };

// Reportes del Operador G.A.M.E.A.: totales, distribuciones y CRUCES (tablas de
// doble entrada) entre usuarios, locales, eventos y movimientos, para un periodo.
@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // Periodo del reporte: por defecto, los ultimos 12 meses hasta hoy.
  periodo(desde?: string, hasta?: string): Periodo {
    const fin = hasta ? new Date(`${hasta}T23:59:59.999`) : new Date();
    const inicio = desde ? new Date(`${desde}T00:00:00`) : new Date(fin.getTime() - 365 * 24 * 3600 * 1000);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      throw new BadRequestException('Las fechas del reporte no son válidas.');
    }
    if (inicio > fin) throw new BadRequestException('La fecha "desde" debe ser anterior a "hasta".');
    return { desde: inicio, hasta: fin };
  }

  private consulta(sql: Prisma.Sql) {
    return this.prisma.$queryRaw<Fila[]>(sql).then(aNumeros);
  }

  async general({ desde, hasta }: Periodo) {
    const enPeriodo = (col: Prisma.Sql) => Prisma.sql`${col} BETWEEN ${desde} AND ${hasta}`;
    const [
      resumen,
      genero,
      edad,
      generoEdad,
      registrosMes,
      paises,
      ciudades,
      localesEstado,
      distritoTipo,
      localesCategoria,
      eventosMesCategoria,
      calificacionDistrito,
      favoritosTop,
      movimientosModuloMes,
      movimientosDia,
      usuariosActivos,
      accionesFrecuentes,
    ] = await Promise.all([
      this.consulta(Prisma.sql`
        SELECT
          (SELECT COUNT(*) FROM usuarios u WHERE u.rol = 'TURISTA' AND ${enPeriodo(Prisma.sql`u.creado_en`)}) AS turistas,
          (SELECT COUNT(*) FROM usuarios u WHERE u.rol = 'ANFITRION' AND ${enPeriodo(Prisma.sql`u.creado_en`)}) AS anfitriones,
          (SELECT COUNT(*) FROM locales l WHERE l.estado = 'APROBADO' AND ${enPeriodo(Prisma.sql`l.creado_en`)}) AS "localesAprobados",
          (SELECT COUNT(*) FROM locales l WHERE l.estado IN ('PENDIENTE', 'CORRECCION') AND ${enPeriodo(Prisma.sql`l.creado_en`)}) AS "localesEnRevision",
          (SELECT COUNT(*) FROM locales l WHERE l.estado = 'RECHAZADO' AND ${enPeriodo(Prisma.sql`l.creado_en`)}) AS "localesRechazados",
          (SELECT COUNT(*) FROM eventos e WHERE ${enPeriodo(Prisma.sql`e.creado_en`)}) AS eventos,
          (SELECT COUNT(*) FROM resenas r WHERE ${enPeriodo(Prisma.sql`r.creado_en`)}) AS resenas,
          (SELECT COUNT(*) FROM favoritos f WHERE ${enPeriodo(Prisma.sql`f.creado_en`)}) AS favoritos,
          (SELECT COUNT(*) FROM bitacora b WHERE ${enPeriodo(Prisma.sql`b.creado_en`)}) AS movimientos,
          (SELECT COUNT(*) FROM mensajes_chat m WHERE m.rol = 'user' AND ${enPeriodo(Prisma.sql`m.creado_en`)}) AS "consultasChatbot"`),

      // ---- Usuarios (visitantes y dueños) registrados en el periodo ----
      this.consulta(Prisma.sql`
        SELECT ${GENERO} AS genero, COUNT(*) AS total FROM usuarios u
        WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1 ORDER BY 2 DESC`),
      this.consulta(Prisma.sql`
        SELECT ${RANGO_EDAD} AS rango, COUNT(*) AS total FROM usuarios u
        WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1`),
      // CRUCE 1: genero x rango de edad
      this.consulta(Prisma.sql`
        SELECT ${GENERO} AS fila, ${RANGO_EDAD} AS columna, COUNT(*) AS total FROM usuarios u
        WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1, 2`),
      // Registros por mes y tipo de cuenta (linea de tiempo)
      this.consulta(Prisma.sql`
        SELECT to_char(date_trunc('month', u.creado_en), 'YYYY-MM') AS mes, u.rol::text AS rol, COUNT(*) AS total
        FROM usuarios u WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1, 2 ORDER BY 1`),
      this.consulta(Prisma.sql`
        SELECT COALESCE(NULLIF(u.pais, ''), 'Sin dato') AS pais, COUNT(*) AS total FROM usuarios u
        WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),
      this.consulta(Prisma.sql`
        SELECT COALESCE(NULLIF(u.ciudad, ''), 'Sin dato') AS ciudad, COUNT(*) AS total FROM usuarios u
        WHERE u.rol IN ('TURISTA', 'ANFITRION') AND ${enPeriodo(Prisma.sql`u.creado_en`)}
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10`),

      // ---- Locales registrados en el periodo ----
      this.consulta(Prisma.sql`
        SELECT l.estado::text AS estado, COUNT(*) AS total FROM locales l
        WHERE ${enPeriodo(Prisma.sql`l.creado_en`)} GROUP BY 1`),
      // CRUCE 2: distrito x tipo de local (un local puede tener varios tipos)
      this.consulta(Prisma.sql`
        SELECT 'D' || z.distrito_numero AS fila, COALESCE(t.tipo, 'Sin tipo') AS columna, COUNT(*) AS total
        FROM locales l JOIN zonas z ON z.id = l.zona_id
        LEFT JOIN LATERAL unnest(CASE WHEN cardinality(l.tipos_local) = 0 THEN ARRAY[NULL]::text[] ELSE l.tipos_local END) AS t(tipo) ON true
        WHERE l.estado <> 'RECHAZADO' AND ${enPeriodo(Prisma.sql`l.creado_en`)}
        GROUP BY z.distrito_numero, 2 ORDER BY z.distrito_numero`),
      // Locales por categoria de eventos que realizan
      this.consulta(Prisma.sql`
        SELECT c.grupo, c.nombre AS categoria, COUNT(lc.local_id) AS total
        FROM categorias_evento c
        LEFT JOIN locales_categorias lc ON lc.categoria_id = c.id
        LEFT JOIN locales l ON l.id = lc.local_id AND l.estado <> 'RECHAZADO' AND ${enPeriodo(Prisma.sql`l.creado_en`)}
        WHERE l.id IS NOT NULL OR lc.local_id IS NULL
        GROUP BY c.grupo, c.nombre, c.orden ORDER BY 3 DESC, c.orden LIMIT 15`),

      // ---- Cartelera ----
      // CRUCE 3: mes x categoria del evento
      this.consulta(Prisma.sql`
        SELECT to_char(date_trunc('month', e.fecha_inicio), 'YYYY-MM') AS fila, COALESCE(c.nombre, 'Sin categoría') AS columna, COUNT(*) AS total
        FROM eventos e LEFT JOIN categorias_evento c ON c.id = e.categoria_id
        WHERE ${enPeriodo(Prisma.sql`e.creado_en`)}
        GROUP BY 1, 2 ORDER BY 1`),

      // ---- Opinion de los visitantes ----
      this.consulta(Prisma.sql`
        SELECT 'D' || z.distrito_numero AS distrito, ROUND(AVG(r.calificacion)::numeric, 2)::float AS promedio, COUNT(*) AS resenas
        FROM resenas r JOIN locales l ON l.id = r.local_id JOIN zonas z ON z.id = l.zona_id
        WHERE ${enPeriodo(Prisma.sql`r.creado_en`)}
        GROUP BY z.distrito_numero ORDER BY z.distrito_numero`),
      this.consulta(Prisma.sql`
        SELECT l.nombre AS local, COUNT(*) AS total FROM favoritos f JOIN locales l ON l.id = f.local_id
        WHERE ${enPeriodo(Prisma.sql`f.creado_en`)}
        GROUP BY l.id, l.nombre ORDER BY 2 DESC LIMIT 10`),

      // ---- Movimientos (bitacora) ----
      // CRUCE 4: modulo x mes
      this.consulta(Prisma.sql`
        SELECT b.modulo AS fila, to_char(date_trunc('month', b.creado_en), 'YYYY-MM') AS columna, COUNT(*) AS total
        FROM bitacora b WHERE ${enPeriodo(Prisma.sql`b.creado_en`)}
        GROUP BY 1, 2 ORDER BY 2`),
      this.consulta(Prisma.sql`
        SELECT to_char(date_trunc('day', b.creado_en), 'YYYY-MM-DD') AS dia, COUNT(*) AS total,
               COUNT(*) FILTER (WHERE NOT b.exito) AS fallidos
        FROM bitacora b WHERE ${enPeriodo(Prisma.sql`b.creado_en`)} AND b.creado_en >= ${hasta}::timestamptz - interval '30 days'
        GROUP BY 1 ORDER BY 1`),
      this.consulta(Prisma.sql`
        SELECT COALESCE(b.usuario_nombre, b.usuario_correo, 'Visitante sin cuenta') AS usuario, b.rol, COUNT(*) AS total
        FROM bitacora b WHERE ${enPeriodo(Prisma.sql`b.creado_en`)}
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`),
      this.consulta(Prisma.sql`
        SELECT b.accion, b.modulo, COUNT(*) AS total
        FROM bitacora b WHERE ${enPeriodo(Prisma.sql`b.creado_en`)}
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`),
    ]);

    return {
      periodo: { desde, hasta },
      generadoEn: new Date(),
      resumen: resumen[0],
      usuarios: { genero, edad, registrosMes, paises, ciudades },
      locales: { estado: localesEstado, categorias: localesCategoria, calificacionDistrito, favoritosTop },
      movimientos: { porDia: movimientosDia, usuariosActivos, accionesFrecuentes },
      cruces: {
        generoEdad,
        distritoTipo,
        eventosMesCategoria,
        movimientosModuloMes,
      },
    };
  }

  // ---- Busqueda avanzada de locales (como el buscador de SICOES) ----
  async buscarLocales(f: {
    texto?: string;
    distritos: number[];
    estados: string[];
    tipos: string[];
    categorias: string[];
    servicios: string[];
    aforoMin?: number;
    licencia?: 'si' | 'no';
    desde?: Date;
    hasta?: Date;
    orden: 'reciente' | 'antiguo' | 'nombre';
    pagina: number;
  }) {
    const POR_PAGINA_LOCALES = 25;
    const where: Prisma.LocalWhereInput = {
      AND: [
        f.texto
          ? {
              OR: [
                { nombre: { contains: f.texto, mode: 'insensitive' } },
                { direccion: { contains: f.texto, mode: 'insensitive' } },
                { descripcion: { contains: f.texto, mode: 'insensitive' } },
                { anfitrion: { nombre: { contains: f.texto, mode: 'insensitive' } } },
                { anfitrion: { apellidoPaterno: { contains: f.texto, mode: 'insensitive' } } },
                { anfitrion: { correo: { contains: f.texto, mode: 'insensitive' } } },
                { anfitrion: { ci: { contains: f.texto } } },
              ],
            }
          : {},
        f.distritos.length ? { zona: { distritoNumero: { in: f.distritos } } } : {},
        f.estados.length ? { estado: { in: f.estados as EstadoVerificacion[] } } : {},
        f.tipos.length ? { tiposLocal: { hasSome: f.tipos } } : {},
        f.categorias.length ? { categorias: { some: { categoriaId: { in: f.categorias } } } } : {},
        f.servicios.length ? { servicios: { hasEvery: f.servicios } } : {},
        f.aforoMin ? { aforo: { gte: f.aforoMin } } : {},
        f.licencia === 'si' ? { documentoFuncionamientoUrl: { not: null } } : f.licencia === 'no' ? { documentoFuncionamientoUrl: null } : {},
        f.desde || f.hasta ? { creadoEn: { ...(f.desde && { gte: f.desde }), ...(f.hasta && { lte: f.hasta }) } } : {},
      ],
    };
    const orderBy: Prisma.LocalOrderByWithRelationInput =
      f.orden === 'nombre' ? { nombre: 'asc' } : { creadoEn: f.orden === 'antiguo' ? 'asc' : 'desc' };
    const [total, filas] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        orderBy,
        skip: (Math.max(1, f.pagina) - 1) * POR_PAGINA_LOCALES,
        take: POR_PAGINA_LOCALES,
        select: {
          id: true,
          nombre: true,
          direccion: true,
          estado: true,
          creadoEn: true,
          tiposLocal: true,
          aforo: true,
          servicios: true,
          documentoFuncionamientoUrl: true,
          foto360Url: true,
          videoUrl: true,
          zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
          anfitrion: { select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, correo: true, ci: true, telefono: true, rol: true } },
          categorias: { select: { categoria: { select: { nombre: true } } } },
          _count: { select: { fotos: true, eventos: true, resenas: true, favoritos: true, denuncias: { where: { estado: 'PENDIENTE' } } } },
        },
      }),
    ]);
    // Calificacion promedio de cada local de la pagina.
    const notas = filas.length
      ? await this.prisma.resena.groupBy({ by: ['localId'], where: { localId: { in: filas.map((l) => l.id) } }, _avg: { calificacion: true } })
      : [];
    return {
      total,
      pagina: Math.max(1, f.pagina),
      porPagina: POR_PAGINA_LOCALES,
      filas: filas.map((l) => ({
        ...l,
        calificacion: notas.find((n) => n.localId === l.id)?._avg.calificacion ?? null,
      })),
    };
  }

  // ---- Bitacora: quien hizo que (con filtros y paginas) ----
  async bitacora(f: { pagina?: number; modulo?: string; texto?: string; soloFallidos?: boolean } & Periodo) {
    const pagina = Math.max(1, f.pagina ?? 1);
    const where: Prisma.BitacoraWhereInput = {
      creadoEn: { gte: f.desde, lte: f.hasta },
      ...(f.modulo && { modulo: f.modulo }),
      ...(f.soloFallidos && { exito: false }),
      ...(f.texto && {
        OR: ['accion', 'usuarioNombre', 'usuarioCorreo', 'detalle'].map((campo) => ({
          [campo]: { contains: f.texto, mode: 'insensitive' as const },
        })),
      }),
    };
    const [total, filas, modulos] = await Promise.all([
      this.prisma.bitacora.count({ where }),
      this.prisma.bitacora.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
      }),
      this.prisma.bitacora.findMany({ distinct: ['modulo'], select: { modulo: true }, orderBy: { modulo: 'asc' } }),
    ]);
    return { total, pagina, porPagina: POR_PAGINA, modulos: modulos.map((m) => m.modulo), filas };
  }

  // ---- Auditoria de la base de datos (disparadores) ----
  // "Autor probable": el movimiento de la bitacora sobre el mismo registro en
  // los 5 segundos alrededor del cambio. Si no hay, el cambio se hizo fuera de
  // la aplicacion (directamente en la base de datos).
  async auditoriaBd(f: { pagina?: number; tabla?: string; operacion?: string } & Periodo) {
    const pagina = Math.max(1, f.pagina ?? 1);
    const filtros = Prisma.sql`
      a.creado_en BETWEEN ${f.desde} AND ${f.hasta}
      ${f.tabla ? Prisma.sql`AND a.tabla = ${f.tabla}` : Prisma.empty}
      ${f.operacion ? Prisma.sql`AND a.operacion = ${f.operacion}` : Prisma.empty}`;
    const [conteo, filas, tablas] = await Promise.all([
      this.consulta(Prisma.sql`SELECT COUNT(*) AS total FROM auditoria_bd a WHERE ${filtros}`),
      this.consulta(Prisma.sql`
        SELECT a.id::text AS id, a.tabla, a.operacion, a.registro_id AS "registroId", a.datos_antes AS "datosAntes",
               a.datos_despues AS "datosDespues", a.campos_cambiados AS "camposCambiados", a.usuario_bd AS "usuarioBd",
               a.creado_en AS "creadoEn", autor.usuario_nombre AS "autorNombre", autor.rol AS "autorRol", autor.accion AS "autorAccion"
        FROM auditoria_bd a
        LEFT JOIN LATERAL (
          SELECT b.usuario_nombre, b.rol, b.accion FROM bitacora b
          WHERE b.creado_en BETWEEN a.creado_en - interval '5 seconds' AND a.creado_en + interval '5 seconds'
            AND (b.entidad_id = a.registro_id OR b.usuario_id::text = a.registro_id)
          ORDER BY abs(extract(epoch FROM b.creado_en - a.creado_en)) LIMIT 1
        ) autor ON true
        WHERE ${filtros}
        ORDER BY a.creado_en DESC, a.id DESC
        LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`),
      this.consulta(Prisma.sql`SELECT DISTINCT tabla FROM auditoria_bd ORDER BY 1`),
    ]);
    return {
      total: Number(conteo[0]?.total ?? 0),
      pagina,
      porPagina: POR_PAGINA,
      tablas: tablas.map((t) => t.tabla as string),
      filas,
    };
  }
}
