import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoVerificacion, Rol } from '@prisma/client';
import { CreateLocalDto, DatosEdificioDto } from './dto/create-local.dto';
import { ActualizarLocalDto } from './dto/actualizar-local.dto';
import { CreateEventoDto } from './dto/create-evento.dto';
import { TIPOS_LOCAL } from './tipos-local';
import { componerHorario, ordenarDias } from './horario';
import { borrarArchivoSubido } from '../common/archivos';
import { ResenasService } from '../resenas/resenas.service';
import { FORMA_UUID } from './dto/create-local.dto';
import { NOMBRE_SECCION, SeccionCorreccion } from './secciones';
import { CAMPOS_FICHA, fichaParaGuardar } from './servicios';

// Sin repetidos y siempre en el orden de la lista (Cholet, Salon, ...).
const ordenarTipos = (tipos: string[]) =>
  TIPOS_LOCAL.filter((t) => tipos.includes(t));

export const INCLUIR_CATEGORIAS = {
  include: {
    categoria: { select: { id: true, grupo: true, nombre: true, descripcion: true, orden: true } },
  },
  orderBy: { categoria: { orden: 'asc' as const } },
};

// Eventos que ya se pueden mostrar: los programados aparecen recien desde su
// "publicar_desde" (los vencidos los borra EventosProgramadosService).
export const eventoYaPublicado = () => ({
  OR: [{ publicarDesde: null }, { publicarDesde: { lte: new Date() } }],
});

// Eventos que aun no terminaron. Un evento termina: en su "publicar_hasta" si
// lo tiene; si no, a su hora de fin; y si tampoco tiene fin, 12 h despues de
// empezar. Los que ya terminaron no se muestran y EventosProgramadosService los
// borra (misma regla en la cartelera, la ficha del local y el borrado).
export const HORAS_SIN_FIN = 12;
export const eventoVigente = () => {
  const ahora = new Date();
  return {
    OR: [
      { publicarHasta: { gte: ahora } },
      { publicarHasta: null, fechaFin: { gte: ahora } },
      { publicarHasta: null, fechaFin: null, fechaInicio: { gte: new Date(ahora.getTime() - HORAS_SIN_FIN * 60 * 60 * 1000) } },
    ],
  };
};

// Lo contrario de eventoVigente, escrito aparte: con NOT, SQL descarta las filas
// con fechas vacias (NULL) y no encontraria nada.
export const eventoTerminado = () => {
  const ahora = new Date();
  return {
    OR: [
      { publicarHasta: { lt: ahora } },
      { publicarHasta: null, fechaFin: { lt: ahora } },
      { publicarHasta: null, fechaFin: null, fechaInicio: { lt: new Date(ahora.getTime() - HORAS_SIN_FIN * 60 * 60 * 1000) } },
    ],
  };
};

// Funcion (no constante) para que la fecha del filtro de eventos sea la actual.
const incluirDetalle = () => ({
  zona: true,
  fotos: { orderBy: { esPortada: 'desc' as const } },
  eventos: { where: { AND: [eventoYaPublicado(), eventoVigente()] }, orderBy: { fechaInicio: 'asc' as const } },
  anfitrion: {
    select: {
      id: true,
      nombre: true,
      apellidoPaterno: true,
      apellidoMaterno: true,
      avatarUrl: true,
      // Para mostrar "Anfitrión verificado" en la ficha publica.
      datosVerificadosEn: true,
      // OPERADOR = local subido por el G.A.M.E.A. ("Subir edificio").
      rol: true,
      // Para la tarjeta del anfitrion: "X años en Cholets Turístico".
      creadoEn: true,
    },
  },
  categorias: INCLUIR_CATEGORIAS,
});

@Injectable()
export class LocalesService {
  constructor(
    private prisma: PrismaService,
    private resenas: ResenasService,
  ) {}

  // Agrega a cada local su calificacion: { promedio (1 decimal o null), total }.
  private async conCalificacion<T extends { id: string }>(locales: T[]) {
    const resumenes = await this.resenas.resumenes(locales.map((l) => l.id));
    return locales.map((l) => ({ ...l, calificacion: resumenes.get(l.id)! }));
  }

  // Feed publico tipo Airbnb (requisito 1 y 3). Solo locales ya aprobados por el operador.
  async listarPublicos(zonaId?: string) {
    const locales = await this.prisma.local.findMany({
      where: {
        estado: EstadoVerificacion.APROBADO,
        ...(zonaId ? { zonaId } : {}),
      },
      include: incluirDetalle(),
      orderBy: { creadoEn: 'desc' },
    });
    return this.conCalificacion(locales);
  }

  // Locales aprobados con estos ids, en el mismo orden (para "Mis favoritos").
  async aprobadosPorIds(ids: string[]) {
    const locales = await this.prisma.local.findMany({
      where: { id: { in: ids }, estado: EstadoVerificacion.APROBADO },
      include: incluirDetalle(),
    });
    const conNota = await this.conCalificacion(locales);
    return ids.map((id) => conNota.find((l) => l.id === id)).filter((l) => l !== undefined);
  }

  async obtenerDetalle(id: string) {
    const local = await this.prisma.local.findUnique({ where: { id }, include: incluirDetalle() });
    if (!local) throw new NotFoundException('Local no encontrado.');
    const [conNota] = await this.conCalificacion([local]);
    return conNota;
  }

  async misLocales(anfitrionId: string) {
    const locales = await this.prisma.local.findMany({
      where: { anfitrionId },
      include: incluirDetalle(),
      orderBy: { creadoEn: 'desc' },
    });
    return this.conCalificacion(locales);
  }

  // Descarta ids repetidos y exige que todos existan en el catalogo.
  private async validarCategorias(ids: string[]) {
    const unicos = [...new Set(ids)];
    const existentes = await this.prisma.categoriaEvento.count({ where: { id: { in: unicos } } });
    if (existentes !== unicos.length) {
      throw new BadRequestException('Alguna de las categorías elegidas no existe.');
    }
    return unicos;
  }

  // Requisito 4: formulario "Registra tu local". Sube al anfitrion a rol ANFITRION
  // (si todavia era TURISTA) y deja el local en PENDIENTE hasta que el operador lo verifique.
  async registrar(
    usuarioId: string,
    dto: CreateLocalDto,
    urlsFotos: string[],
    urlDocumentoFuncionamiento?: string,
    urlFotoPerfil?: string,
  ) {
    const categoriaIds = await this.validarCategorias(dto.categoriaIds);
    // El CI es unico: sin este control, un CI ya usado por otra persona hacia
    // fallar la base de datos y el dueño solo veia "error interno".
    const ciOcupado = await this.prisma.usuario.findFirst({
      where: { ci: dto.ci, id: { not: usuarioId } },
      select: { id: true },
    });
    if (ciOcupado) {
      throw new ConflictException('Ese carnet de identidad (CI) ya está registrado por otra persona.');
    }
    const dias = ordenarDias(dto.diasFuncionamiento);
    let avatarAnterior: string | null = null;

    const local = await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) throw new NotFoundException('Usuario no encontrado.');
      if (urlFotoPerfil) avatarAnterior = usuario.avatarUrl;

      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          apellidoPaterno: dto.apellidoPaterno,
          apellidoMaterno: dto.apellidoMaterno,
          ci: dto.ci ?? usuario.ci,
          rol: usuario.rol === Rol.TURISTA ? Rol.ANFITRION : usuario.rol,
          ...(urlFotoPerfil && { avatarUrl: urlFotoPerfil }),
          // Local nuevo: el operador tiene que poder revisar al dueño otra vez.
          verificacionCompleta: false,
        },
      });

      return tx.local.create({
        data: {
          nombre: dto.nombreLocal,
          descripcion: dto.descripcion,
          historia: dto.historia || null,
          ...fichaParaGuardar(dto),
          tiposLocal: ordenarTipos(dto.tiposLocal),
          direccion: dto.direccion,
          latitud: dto.latitud,
          longitud: dto.longitud,
          zonaId: dto.zonaId,
          anfitrionId: usuarioId,
          diasFuncionamiento: dias,
          horaApertura: dto.horaApertura,
          horaCierre: dto.horaCierre,
          horarioFuncionamiento: componerHorario(dias, dto.horaApertura, dto.horaCierre),
          documentoFuncionamientoUrl: urlDocumentoFuncionamiento,
          estado: EstadoVerificacion.PENDIENTE,
          fotos: {
            create: urlsFotos.map((url, i) => ({ url, esPortada: i === 0 })),
          },
          categorias: {
            create: categoriaIds.map((categoriaId) => ({ categoriaId })),
          },
        },
        include: incluirDetalle(),
      });
    });

    // La foto de perfil anterior ya no la usa nadie.
    await borrarArchivoSubido(avatarAnterior);
    return local;
  }

  // Que se puede modificar segun el estado del local:
  //  - PENDIENTE (en revision): nada, hasta que el operador responda.
  //  - RECHAZADO: nada.
  //  - CORRECCION: solo las secciones que el operador pidio corregir.
  //  - APROBADO: todo.
  private asegurarEditable(
    local: { estado: EstadoVerificacion; correccionSecciones: string[] },
    seccion: SeccionCorreccion,
  ) {
    if (local.estado === EstadoVerificacion.PENDIENTE) {
      throw new ConflictException(
        'Tu local está en revisión por el Operador G.A.M.E.A.: no se puede modificar hasta que responda.',
      );
    }
    if (local.estado === EstadoVerificacion.RECHAZADO) {
      throw new ConflictException('Este local fue rechazado y ya no se puede modificar.');
    }
    if (local.estado === EstadoVerificacion.CORRECCION && !local.correccionSecciones.includes(seccion)) {
      const pedidas = local.correccionSecciones.map((s) => NOMBRE_SECCION[s as SeccionCorreccion] ?? s).join(', ');
      throw new ConflictException(
        `El Operador G.A.M.E.A. solo pidió corregir: ${pedidas}. "${NOMBRE_SECCION[seccion]}" no se puede cambiar ahora.`,
      );
    }
  }

  // Solo los locales aprobados publican eventos en la cartelera.
  private asegurarAprobado(local: { estado: EstadoVerificacion }) {
    if (local.estado !== EstadoVerificacion.APROBADO) {
      throw new ConflictException('Solo los locales aprobados por el Operador G.A.M.E.A. pueden publicar en la cartelera.');
    }
  }

  // El dueño termino las correcciones y vuelve a mandar el local a revision.
  async reenviarARevision(localId: string, usuarioId: string, rolUsuario: Rol) {
    const local = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    if (local.estado !== EstadoVerificacion.CORRECCION) {
      throw new ConflictException('Solo se reenvía a revisión un local al que el operador le pidió correcciones.');
    }
    await this.prisma.local.update({
      where: { id: localId },
      data: { estado: EstadoVerificacion.PENDIENTE, correccionSecciones: [], correccionMensaje: null },
    });
    return this.obtenerDetalle(localId);
  }

  private async verificarPropietario(localId: string, usuarioId: string, rolUsuario: Rol) {
    const local = await this.prisma.local.findUnique({ where: { id: localId } });
    if (!local) throw new NotFoundException('Local no encontrado.');
    if (local.anfitrionId !== usuarioId && rolUsuario !== Rol.ADMIN) {
      throw new ForbiddenException('No eres el anfitrion de este local.');
    }
    return local;
  }

  // Requisito 6: panel del anfitrion.
  async actualizar(localId: string, usuarioId: string, rolUsuario: Rol, dto: ActualizarLocalDto) {
    const actual = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    const { categoriaIds, tiposLocal, diasFuncionamiento, horaApertura, horaCierre, historia, aforo, servicios, whatsapp, reglas, videoUrl, ...datos } = dto;
    const ficha = fichaParaGuardar({ aforo, servicios, whatsapp, reglas, videoUrl });
    const tocaInformacion =
      datos.descripcion !== undefined ||
      historia !== undefined ||
      CAMPOS_FICHA.some((c) => dto[c] !== undefined) ||
      tiposLocal ||
      diasFuncionamiento ||
      horaApertura ||
      horaCierre;
    if (tocaInformacion) this.asegurarEditable(actual, 'informacion');
    if (categoriaIds) this.asegurarEditable(actual, 'categorias');
    const nuevasCategorias = categoriaIds ? await this.validarCategorias(categoriaIds) : undefined;

    // Si cambia cualquier parte del horario se recompone el texto, usando lo ya
    // guardado para las partes que no vinieron.
    const cambiaHorario = diasFuncionamiento || horaApertura || horaCierre;
    const dias = diasFuncionamiento ? ordenarDias(diasFuncionamiento) : actual.diasFuncionamiento;
    const apertura = horaApertura ?? actual.horaApertura;
    const cierre = horaCierre ?? actual.horaCierre;

    return this.prisma.local.update({
      where: { id: localId },
      data: {
        ...datos,
        ...(historia !== undefined && { historia: historia || null }),
        ...ficha,
        ...(tiposLocal && { tiposLocal: ordenarTipos(tiposLocal) }),
        ...(cambiaHorario && {
          diasFuncionamiento: dias,
          horaApertura: apertura,
          horaCierre: cierre,
          horarioFuncionamiento: componerHorario(dias, apertura, cierre),
        }),
        ...(nuevasCategorias && {
          categorias: {
            deleteMany: {},
            create: nuevasCategorias.map((categoriaId) => ({ categoriaId })),
          },
        }),
      },
      include: incluirDetalle(),
    });
  }

  // Foto 360 del local: se sube, se cambia (url) o se quita (null).
  async cambiarFoto360(localId: string, usuarioId: string, rolUsuario: Rol, url: string | null) {
    const local = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    this.asegurarEditable(local, 'fotos');
    await this.prisma.local.update({ where: { id: localId }, data: { foto360Url: url } });
    await borrarArchivoSubido(local.foto360Url);
    return this.obtenerDetalle(localId);
  }

  // El dueño sube (o cambia) la licencia de funcionamiento despues de registrar
  // el local. Como hay un documento nuevo, el operador puede volver a confirmar
  // sus datos.
  async subirDocumento(localId: string, usuarioId: string, rolUsuario: Rol, url: string) {
    const local = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    this.asegurarEditable(local, 'licencia');
    await this.prisma.$transaction([
      this.prisma.local.update({ where: { id: localId }, data: { documentoFuncionamientoUrl: url } }),
      this.prisma.usuario.update({ where: { id: local.anfitrionId }, data: { verificacionCompleta: false } }),
    ]);
    await borrarArchivoSubido(local.documentoFuncionamientoUrl);
    return this.obtenerDetalle(localId);
  }

  async agregarFotos(localId: string, usuarioId: string, rolUsuario: Rol, urls: string[]) {
    const local = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    this.asegurarEditable(local, 'fotos');
    await this.prisma.fotoLocal.createMany({
      data: urls.map((url) => ({ localId, url })),
    });
    return this.obtenerDetalle(localId);
  }

  async eliminarFoto(localId: string, fotoId: string, usuarioId: string, rolUsuario: Rol) {
    const local = await this.verificarPropietario(localId, usuarioId, rolUsuario);
    this.asegurarEditable(local, 'fotos');
    // La foto tiene que ser de ESTE local: si no, un anfitrion podria borrar
    // fotos de otros locales conociendo su id.
    const foto = FORMA_UUID.test(fotoId)
      ? await this.prisma.fotoLocal.findFirst({ where: { id: fotoId, localId } })
      : null;
    if (!foto) throw new NotFoundException('Foto no encontrada en este local.');
    await this.prisma.fotoLocal.delete({ where: { id: foto.id } });
    await borrarArchivoSubido(foto.url);
    return this.obtenerDetalle(localId);
  }

  // La categoria elegida para un evento tiene que existir.
  async asegurarCategoriaEvento(categoriaId?: string | null) {
    if (!categoriaId) return;
    const existe = await this.prisma.categoriaEvento.count({ where: { id: categoriaId } });
    if (!existe) throw new BadRequestException('La categoría del evento no existe.');
  }

  // El dueño borra un evento de su local (con sus imagenes). Se permite en
  // cualquier estado del local: borrar no publica nada.
  async eliminarEvento(localId: string, eventoId: string, usuarioId: string, rolUsuario: Rol) {
    await this.verificarPropietario(localId, usuarioId, rolUsuario);
    // El evento tiene que ser de ESTE local (si no, se podrian borrar eventos ajenos).
    const evento = FORMA_UUID.test(eventoId)
      ? await this.prisma.evento.findFirst({ where: { id: eventoId, localId } })
      : null;
    if (!evento) throw new NotFoundException('Evento no encontrado en este local (quizá ya se borró).');
    await this.prisma.evento.delete({ where: { id: evento.id } });
    await borrarArchivoSubido(evento.aficheUrl);
    await borrarArchivoSubido(evento.bannerUrl);
    return { eliminado: true };
  }

  async crearEvento(localId: string, usuarioId: string, rolUsuario: Rol, dto: CreateEventoDto) {
    this.asegurarAprobado(await this.verificarPropietario(localId, usuarioId, rolUsuario));
    if (dto.fechaFin && new Date(dto.fechaFin) <= new Date(dto.fechaInicio)) {
      throw new BadRequestException('La fecha de fin del evento debe ser posterior a la de inicio.');
    }
    await this.asegurarCategoriaEvento(dto.categoriaId);
    return this.prisma.evento.create({
      data: {
        localId,
        categoriaId: dto.categoriaId || null,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
      },
    });
  }

  // Afiche (imagen) de un evento, para la cartelera. Reemplaza al anterior.
  // Imagenes del evento: "afiche" (vertical, para la cartelera) o "banner"
  // (horizontal, para el carrusel de la portada). Reemplaza la anterior.
  async subirAfiche(
    localId: string,
    eventoId: string,
    usuarioId: string,
    rolUsuario: Rol,
    url: string,
    tipo: 'afiche' | 'banner' = 'afiche',
  ) {
    this.asegurarAprobado(await this.verificarPropietario(localId, usuarioId, rolUsuario));
    const evento = FORMA_UUID.test(eventoId)
      ? await this.prisma.evento.findFirst({ where: { id: eventoId, localId } })
      : null;
    if (!evento) throw new NotFoundException('Evento no encontrado en este local.');
    const campo = tipo === 'banner' ? 'bannerUrl' : 'aficheUrl';
    const actualizado = await this.prisma.evento.update({ where: { id: evento.id }, data: { [campo]: url } });
    await borrarArchivoSubido(evento[campo]);
    return actualizado;
  }

  // Cartelera publica: eventos ya publicados que aun no terminaron (eventoVigente),
  // de locales aprobados o sin local (los publica el operador con un "lugar").
  cartelera() {
    return this.prisma.evento.findMany({
      where: {
        AND: [
          eventoYaPublicado(),
          { OR: [{ localId: null }, { local: { estado: EstadoVerificacion.APROBADO } }] },
          eventoVigente(),
        ],
      },
      include: {
        categoria: { select: { id: true, nombre: true, grupo: true } },
        local: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
            fotos: { orderBy: { esPortada: 'desc' }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { fechaInicio: 'asc' },
      take: 120,
    });
  }

  // Ficha publica de un evento de la cartelera (solo si ya se publico).
  async eventoPublico(id: string) {
    const evento = FORMA_UUID.test(id)
      ? await this.prisma.evento.findFirst({
          where: {
            id,
            AND: [eventoYaPublicado(), { OR: [{ localId: null }, { local: { estado: EstadoVerificacion.APROBADO } }] }],
          },
          include: {
            categoria: { select: { id: true, nombre: true, grupo: true } },
            local: {
              select: {
                id: true,
                nombre: true,
                descripcion: true,
                direccion: true,
                latitud: true,
                longitud: true,
                horarioFuncionamiento: true,
                tiposLocal: true,
                zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
                fotos: { orderBy: { esPortada: 'desc' }, take: 4, select: { id: true, url: true } },
                anfitrion: { select: { nombre: true, apellidoPaterno: true, avatarUrl: true } },
              },
            },
          },
        })
      : null;
    if (!evento) throw new NotFoundException('Este evento ya no está disponible.');
    return evento;
  }

  // ---------- "Subir edificio": locales que carga el Operador G.A.M.E.A. ----------
  // Quedan APROBADOS de una vez (el operador es quien verifica) y a su nombre.

  private datosDeLocal(dto: DatosEdificioDto) {
    const dias = ordenarDias(dto.diasFuncionamiento);
    return {
      nombre: dto.nombreLocal.trim(),
      descripcion: dto.descripcion.trim(),
      historia: dto.historia || null,
      ...fichaParaGuardar(dto),
      tiposLocal: ordenarTipos(dto.tiposLocal),
      direccion: dto.direccion.trim(),
      latitud: dto.latitud,
      longitud: dto.longitud,
      zonaId: dto.zonaId,
      diasFuncionamiento: dias,
      horaApertura: dto.horaApertura,
      horaCierre: dto.horaCierre,
      horarioFuncionamiento: componerHorario(dias, dto.horaApertura, dto.horaCierre),
    };
  }

  async crearEdificio(operadorId: string, dto: DatosEdificioDto, urlsFotos: string[]) {
    if (urlsFotos.length === 0) throw new BadRequestException('Sube al menos una foto del edificio.');
    const categoriaIds = await this.validarCategorias(dto.categoriaIds);
    return this.prisma.local.create({
      data: {
        ...this.datosDeLocal(dto),
        anfitrionId: operadorId,
        estado: EstadoVerificacion.APROBADO,
        fotos: { create: urlsFotos.map((url, i) => ({ url, esPortada: i === 0 })) },
        categorias: { create: categoriaIds.map((categoriaId) => ({ categoriaId })) },
      },
      include: incluirDetalle(),
    });
  }

  private async edificioDelOperador(id: string, operadorId: string) {
    const local = FORMA_UUID.test(id) ? await this.prisma.local.findUnique({ where: { id } }) : null;
    if (!local) throw new NotFoundException('Edificio no encontrado.');
    if (local.anfitrionId !== operadorId) {
      throw new ForbiddenException('Solo puedes editar los edificios que subiste tú.');
    }
    return local;
  }

  async actualizarEdificio(id: string, operadorId: string, dto: DatosEdificioDto, urlsFotosNuevas: string[]) {
    await this.edificioDelOperador(id, operadorId);
    const categoriaIds = await this.validarCategorias(dto.categoriaIds);
    const yaTieneFotos = await this.prisma.fotoLocal.count({ where: { localId: id } });
    return this.prisma.local.update({
      where: { id },
      data: {
        ...this.datosDeLocal(dto),
        fotos: { create: urlsFotosNuevas.map((url, i) => ({ url, esPortada: yaTieneFotos === 0 && i === 0 })) },
        categorias: { deleteMany: {}, create: categoriaIds.map((categoriaId) => ({ categoriaId })) },
      },
      include: incluirDetalle(),
    });
  }

  async eliminarEdificio(id: string, operadorId: string) {
    await this.edificioDelOperador(id, operadorId);
    const archivos = await this.prisma.local.findUnique({
      where: { id },
      select: {
        documentoFuncionamientoUrl: true,
        foto360Url: true,
        fotos: { select: { url: true } },
        eventos: { select: { aficheUrl: true, bannerUrl: true } },
      },
    });
    await this.prisma.local.delete({ where: { id } });
    // Fotos, documento y afiches ya no los usa nadie.
    for (const url of [
      archivos?.documentoFuncionamientoUrl,
      archivos?.foto360Url,
      ...(archivos?.fotos.map((f) => f.url) ?? []),
      ...(archivos?.eventos.flatMap((e) => [e.aficheUrl, e.bannerUrl]) ?? []),
    ]) {
      await borrarArchivoSubido(url ?? null);
    }
    return { eliminado: true };
  }
}
