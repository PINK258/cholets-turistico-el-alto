import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoVerificacion, Rol } from '@prisma/client';
import { VerificarLocalDto } from './dto/verificar-local.dto';
import { VerificarDatosDto } from './dto/verificar-datos.dto';
import { FORMA_UUID } from '../locales/dto/create-local.dto';
import { ActualizarEventoOperadorDto, CrearEventoOperadorDto } from './dto/evento-operador.dto';
import { borrarArchivoSubido } from '../common/archivos';
import { PedirCorreccionDto } from './dto/pedir-correccion.dto';
import { NOMBRE_SECCION, SeccionCorreccion } from '../locales/secciones';

const INCLUIR_EVENTO = {
  local: { select: { id: true, nombre: true, zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } } } },
  categoria: { select: { id: true, nombre: true, grupo: true } },
  autor: { select: { nombre: true, apellidoPaterno: true } },
};

type DatosEvento = {
  localId: string | null;
  lugar: string | null;
  fechaInicio: Date;
  fechaFin: Date | null;
  publicarDesde: Date | null;
  publicarHasta: Date | null;
};

// En la edicion: undefined = no cambia; "" = quitar; texto = nueva fecha.
function fechaEditada(valor: string | undefined, campo: string): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor.trim() === '') return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new BadRequestException(`La fecha ${campo} no es válida.`);
  return fecha;
}
import { INCLUIR_CATEGORIAS } from '../locales/locales.service';

@Injectable()
export class OperadorService {
  constructor(private prisma: PrismaService) {}

  // Requisito 5: bandeja de locales pendientes de verificar.
  localesPendientes() {
    return this.prisma.local.findMany({
      where: { estado: EstadoVerificacion.PENDIENTE },
      include: {
        zona: true,
        fotos: true,
        anfitrion: {
          select: {
            id: true,
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            ci: true,
            correo: true,
            avatarUrl: true,
          },
        },
        categorias: INCLUIR_CATEGORIAS,
      },
      orderBy: { creadoEn: 'asc' },
    });
  }

  // Requisito 5: usuarios registrados, separados en visitantes (turistas) y
  // dueños de locales (anfitriones), con su foto de perfil.
  async usuariosRegistrados() {
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol: { in: [Rol.TURISTA, Rol.ANFITRION] } },
      select: {
        id: true,
        nombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        correo: true,
        ci: true,
        rol: true,
        proveedorAuth: true,
        avatarUrl: true,
        telefono: true,
        genero: true,
        fechaNacimiento: true,
        pais: true,
        ciudad: true,
        creadoEn: true,
        datosVerificadosEn: true,
        verificacionCompleta: true,
        notaVerificacion: true,
        verificadoPor: { select: { nombre: true, apellidoPaterno: true } },
        _count: { select: { resenas: true } },
        locales: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            direccion: true,
            latitud: true,
            longitud: true,
            horarioFuncionamiento: true,
            documentoFuncionamientoUrl: true,
            creadoEn: true,
            zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
          },
          orderBy: { creadoEn: 'desc' },
        },
      },
      orderBy: { creadoEn: 'desc' },
      take: 500,
    });
    return {
      turistas: usuarios.filter((u) => u.rol === Rol.TURISTA),
      anfitriones: usuarios.filter((u) => u.rol === Rol.ANFITRION),
    };
  }

  // Requisito 5: boton aprobar/rechazar + notificacion automatica al anfitrion.
  async verificarLocal(localId: string, operadorId: string, dto: VerificarLocalDto) {
    const local = FORMA_UUID.test(localId) ? await this.prisma.local.findUnique({ where: { id: localId } }) : null;
    if (!local) throw new NotFoundException('Local no encontrado.');
    // Un local se aprueba o rechaza UNA sola vez (evita dobles clics y que otro
    // operador cambie una decision ya tomada).
    if (local.estado !== EstadoVerificacion.PENDIENTE) {
      throw new ConflictException(
        local.estado === EstadoVerificacion.CORRECCION
          ? 'El dueño todavía está corrigiendo este local: podrás revisarlo cuando lo vuelva a enviar.'
          : `Este local ya fue ${local.estado === EstadoVerificacion.APROBADO ? 'aprobado' : 'rechazado'}.`,
      );
    }

    const [localActualizado] = await this.prisma.$transaction([
      this.prisma.local.update({
        where: { id: localId },
        data: { estado: dto.estado, correccionSecciones: [], correccionMensaje: null },
      }),
      this.prisma.verificacionLocal.create({
        data: { localId, operadorId, estado: dto.estado, comentario: dto.comentario },
      }),
      this.prisma.notificacion.create({
        data: {
          usuarioId: local.anfitrionId,
          titulo:
            dto.estado === EstadoVerificacion.APROBADO
              ? 'Tu local fue aprobado'
              : 'Tu local fue rechazado',
          mensaje:
            dto.estado === EstadoVerificacion.APROBADO
              ? `Felicidades, "${local.nombre}" ya es visible publicamente en Cholets Turístico El Alto.`
              : `Tu local "${local.nombre}" fue rechazado. Motivo: ${dto.comentario || 'No especificado'}.`,
        },
      }),
    ]);

    return localActualizado;
  }

  // El operador revisa un local en revision y pide al dueño corregir algunas
  // secciones con un mensaje. El dueño ve el aviso en su panel, corrige solo
  // esas secciones y lo vuelve a mandar a revision.
  async pedirCorreccion(localId: string, operadorId: string, dto: PedirCorreccionDto) {
    const local = FORMA_UUID.test(localId) ? await this.prisma.local.findUnique({ where: { id: localId } }) : null;
    if (!local) throw new NotFoundException('Local no encontrado.');
    if (local.estado !== EstadoVerificacion.PENDIENTE) {
      throw new ConflictException('Solo se piden correcciones a locales que están en revisión.');
    }
    const secciones = [...new Set(dto.secciones)];
    const mensaje = dto.mensaje.trim();
    const nombres = secciones.map((s) => NOMBRE_SECCION[s as SeccionCorreccion]).join(', ');
    const [actualizado] = await this.prisma.$transaction([
      this.prisma.local.update({
        where: { id: localId },
        data: { estado: EstadoVerificacion.CORRECCION, correccionSecciones: secciones, correccionMensaje: mensaje },
      }),
      this.prisma.verificacionLocal.create({
        data: { localId, operadorId, estado: EstadoVerificacion.CORRECCION, comentario: `Corregir: ${nombres}. ${mensaje}` },
      }),
      this.prisma.notificacion.create({
        data: {
          usuarioId: local.anfitrionId,
          titulo: 'Tu local necesita correcciones',
          mensaje: `El Operador G.A.M.E.A. pide corregir en "${local.nombre}": ${nombres}. ${mensaje}`,
        },
      }),
    ]);
    return actualizado;
  }

  // El operador confirma que reviso los datos del dueño (CI, correo, licencia de
  // funcionamiento, ubicacion de sus locales...). Se confirma UNA sola vez: solo
  // se puede volver a confirmar si en esa ocasion faltaba alguna licencia, o si
  // despues el dueño subio una licencia o registro otro local.
  async verificarDatosDuenio(usuarioId: string, operadorId: string, dto: VerificarDatosDto) {
    const usuario = FORMA_UUID.test(usuarioId)
      ? await this.prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: {
            id: true,
            rol: true,
            datosVerificadosEn: true,
            verificacionCompleta: true,
            locales: { select: { documentoFuncionamientoUrl: true } },
          },
        })
      : null;
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (usuario.rol !== Rol.ANFITRION) {
      throw new BadRequestException('Solo se verifican los datos de dueños de locales (anfitriones).');
    }
    if (!dto.verificado) {
      throw new BadRequestException('La verificación no se puede quitar: se confirma una sola vez.');
    }
    if (usuario.datosVerificadosEn && usuario.verificacionCompleta) {
      throw new ConflictException(
        'Los datos de este dueño ya fueron confirmados con su licencia de funcionamiento; no se confirman dos veces.',
      );
    }
    const conTodasLasLicencias =
      usuario.locales.length > 0 && usuario.locales.every((l) => !!l.documentoFuncionamientoUrl);
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        datosVerificadosEn: new Date(),
        datosVerificadosPor: operadorId,
        notaVerificacion: dto.nota?.trim() || null,
        verificacionCompleta: conTodasLasLicencias,
      },
      select: {
        id: true,
        datosVerificadosEn: true,
        verificacionCompleta: true,
        notaVerificacion: true,
        verificadoPor: { select: { nombre: true, apellidoPaterno: true } },
      },
    });
  }

  // Elimina la cuenta de un visitante o de un Administrador Turístico (cuentas
  // falsas o spam). Con ella se borran sus locales (fotos, eventos, reseñas que
  // recibieron), sus reseñas y notificaciones, y los archivos que subio. Los
  // operadores y administradores no se pueden borrar desde aqui.
  async eliminarUsuario(usuarioId: string) {
    const usuario = FORMA_UUID.test(usuarioId)
      ? await this.prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: {
            rol: true,
            avatarUrl: true,
            locales: {
              select: {
                documentoFuncionamientoUrl: true,
                foto360Url: true,
                fotos: { select: { url: true } },
                eventos: { select: { aficheUrl: true, bannerUrl: true } },
              },
            },
          },
        })
      : null;
    if (!usuario) throw new NotFoundException('Usuario no encontrado (quizá ya se eliminó).');
    if (usuario.rol !== Rol.TURISTA && usuario.rol !== Rol.ANFITRION) {
      throw new BadRequestException('Solo se pueden eliminar cuentas de visitantes o de administradores turísticos.');
    }
    await this.prisma.$transaction([
      // Los locales no se borran en cascada con el usuario: primero ellos
      // (sus fotos, eventos, categorias, verificaciones y reseñas si caen en cascada).
      this.prisma.local.deleteMany({ where: { anfitrionId: usuarioId } }),
      this.prisma.usuario.delete({ where: { id: usuarioId } }),
    ]);
    for (const url of [
      usuario.avatarUrl,
      ...usuario.locales.flatMap((l) => [
        l.documentoFuncionamientoUrl,
        l.foto360Url,
        ...l.fotos.map((f) => f.url),
        ...l.eventos.flatMap((e) => [e.aficheUrl, e.bannerUrl]),
      ]),
    ]) {
      await borrarArchivoSubido(url);
    }
    return { eliminado: true, localesEliminados: usuario.locales.length };
  }

  // Todos los locales (cualquier estado) con su ubicacion, para el mapa de distritos.
  localesParaMapa() {
    return this.prisma.local.findMany({
      select: {
        id: true,
        nombre: true,
        estado: true,
        direccion: true,
        latitud: true,
        longitud: true,
        zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
        anfitrion: { select: { nombre: true, apellidoPaterno: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  // ---------- Eventos de la cartelera (los publica y edita el operador) ----------

  listarEventos() {
    return this.prisma.evento.findMany({ include: INCLUIR_EVENTO, orderBy: { fechaInicio: 'asc' } });
  }

  private async validarEvento(d: DatosEvento) {
    if (!d.localId && !d.lugar?.trim()) {
      throw new BadRequestException('Elige un local o escribe el lugar donde será el evento.');
    }
    if (d.localId) {
      const local = await this.prisma.local.findUnique({ where: { id: d.localId }, select: { estado: true } });
      if (!local || local.estado !== EstadoVerificacion.APROBADO) {
        throw new BadRequestException('El local elegido no existe o todavía no está aprobado.');
      }
    }
    if (d.fechaFin && d.fechaFin <= d.fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio.');
    }
    if (d.publicarDesde && d.publicarHasta && d.publicarHasta <= d.publicarDesde) {
      throw new BadRequestException('La fecha en que desaparece debe ser posterior a la fecha en que aparece.');
    }
    if (d.publicarHasta && d.publicarHasta <= new Date()) {
      throw new BadRequestException('La fecha en que desaparece ya pasó: elige una fecha futura (al llegar, el evento se borra solo).');
    }
  }

  private async validarCategoria(categoriaId?: string) {
    if (!categoriaId) return;
    const existe = await this.prisma.categoriaEvento.count({ where: { id: categoriaId } });
    if (!existe) throw new BadRequestException('La categoría del evento no existe.');
  }

  async crearEvento(dto: CrearEventoOperadorDto, operadorId: string, aficheUrl?: string, bannerUrl?: string) {
    const datos: DatosEvento = {
      localId: dto.localId ?? null,
      lugar: dto.lugar?.trim() || null,
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
      publicarDesde: dto.publicarDesde ? new Date(dto.publicarDesde) : null,
      publicarHasta: dto.publicarHasta ? new Date(dto.publicarHasta) : null,
    };
    await this.validarEvento(datos);
    await this.validarCategoria(dto.categoriaId);
    return this.prisma.evento.create({
      data: { ...datos, categoriaId: dto.categoriaId || null, titulo: dto.titulo.trim(), descripcion: dto.descripcion.trim(), aficheUrl, bannerUrl, creadoPor: operadorId },
      include: INCLUIR_EVENTO,
    });
  }

  private async eventoExistente(id: string) {
    const evento = FORMA_UUID.test(id) ? await this.prisma.evento.findUnique({ where: { id } }) : null;
    if (!evento) throw new NotFoundException('Evento no encontrado (quizá ya se borró automáticamente).');
    return evento;
  }

  // Se puede editar cuantas veces se quiera, mientras el evento exista.
  async actualizarEvento(id: string, dto: ActualizarEventoOperadorDto, aficheNuevo?: string, bannerNuevo?: string) {
    const actual = await this.eventoExistente(id);
    const valor = <T>(nuevo: T | undefined, anterior: T) => (nuevo === undefined ? anterior : nuevo);
    const localId = dto.localId === undefined ? actual.localId : dto.localId.trim() || null;
    if (localId && !FORMA_UUID.test(localId)) throw new BadRequestException('El local elegido no es válido.');
    const datos: DatosEvento = {
      localId,
      lugar: dto.lugar === undefined ? actual.lugar : dto.lugar.trim() || null,
      fechaInicio: valor(fechaEditada(dto.fechaInicio, 'de inicio') ?? undefined, actual.fechaInicio),
      fechaFin: valor(fechaEditada(dto.fechaFin, 'de fin'), actual.fechaFin),
      publicarDesde: valor(fechaEditada(dto.publicarDesde, 'en que aparece'), actual.publicarDesde),
      publicarHasta: valor(fechaEditada(dto.publicarHasta, 'en que desaparece'), actual.publicarHasta),
    };
    await this.validarEvento(datos);
    if (dto.categoriaId) await this.validarCategoria(dto.categoriaId);
    const quitar = dto.quitarAfiche === 'true';
    const quitarBanner = dto.quitarBanner === 'true';
    const actualizado = await this.prisma.evento.update({
      where: { id },
      data: {
        ...datos,
        ...(dto.categoriaId !== undefined && { categoriaId: dto.categoriaId || null }),
        ...(dto.titulo ? { titulo: dto.titulo.trim() } : {}),
        ...(dto.descripcion ? { descripcion: dto.descripcion.trim() } : {}),
        ...(aficheNuevo ? { aficheUrl: aficheNuevo } : quitar ? { aficheUrl: null } : {}),
        ...(bannerNuevo ? { bannerUrl: bannerNuevo } : quitarBanner ? { bannerUrl: null } : {}),
      },
      include: INCLUIR_EVENTO,
    });
    if (aficheNuevo || quitar) await borrarArchivoSubido(actual.aficheUrl);
    if (bannerNuevo || quitarBanner) await borrarArchivoSubido(actual.bannerUrl);
    return actualizado;
  }

  async eliminarEvento(id: string) {
    const evento = await this.eventoExistente(id);
    await this.prisma.evento.delete({ where: { id } });
    await borrarArchivoSubido(evento.aficheUrl);
    await borrarArchivoSubido(evento.bannerUrl);
    return { eliminado: true };
  }
}
