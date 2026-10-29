import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoVerificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FORMA_UUID } from '../locales/dto/create-local.dto';
import { GuardarResenaDto } from './dto/guardar-resena.dto';

const AUTOR = { select: { id: true, nombre: true, apellidoPaterno: true, avatarUrl: true } };

export type ResumenCalificacion = { promedio: number | null; total: number };

// Criterios de calificacion (como Airbnb), ademas de la nota general.
export const CRITERIOS = ['atencion', 'limpieza', 'ubicacion', 'precio', 'ambiente'] as const;

@Injectable()
export class ResenasService {
  constructor(private prisma: PrismaService) {}

  // Un id mal formado haria fallar la consulta con un error 500; se responde 404.
  private async localPublico(localId: string) {
    const local = FORMA_UUID.test(localId)
      ? await this.prisma.local.findUnique({ where: { id: localId }, select: { id: true, estado: true, anfitrionId: true } })
      : null;
    if (!local || local.estado !== EstadoVerificacion.APROBADO) {
      throw new NotFoundException('Local no encontrado.');
    }
    return local;
  }

  // Promedio y cantidad de reseñas por local, para tarjetas y fichas.
  async resumenes(localIds: string[]): Promise<Map<string, ResumenCalificacion>> {
    const grupos = localIds.length
      ? await this.prisma.resena.groupBy({
          by: ['localId'],
          where: { localId: { in: localIds } },
          _avg: { calificacion: true },
          _count: { _all: true },
        })
      : [];
    const mapa = new Map<string, ResumenCalificacion>();
    for (const id of localIds) mapa.set(id, { promedio: null, total: 0 });
    for (const g of grupos) {
      const promedio = g._avg.calificacion;
      mapa.set(g.localId, {
        promedio: promedio === null ? null : Math.round(promedio * 10) / 10,
        total: g._count._all,
      });
    }
    return mapa;
  }

  async listar(localId: string) {
    await this.localPublico(localId);
    const resenas = await this.prisma.resena.findMany({
      where: { localId },
      include: { usuario: AUTOR },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
    const resumen = (await this.resumenes([localId])).get(localId)!;
    // Cuantas reseñas hay de cada estrella (5 a 1), para las barras.
    const conteo = await this.prisma.resena.groupBy({
      by: ['calificacion'],
      where: { localId },
      _count: { _all: true },
    });
    const distribucion = [5, 4, 3, 2, 1].map((estrellas) => ({
      estrellas,
      cantidad: conteo.find((c) => c.calificacion === estrellas)?._count._all ?? 0,
    }));
    // Promedio de cada criterio (solo de quienes lo calificaron).
    const promedios = await this.prisma.resena.aggregate({
      where: { localId },
      _avg: { atencion: true, limpieza: true, ubicacion: true, precio: true, ambiente: true },
      _count: { atencion: true, limpieza: true, ubicacion: true, precio: true, ambiente: true },
    });
    const criterios = CRITERIOS.map((c) => ({
      criterio: c,
      promedio: promedios._avg[c] === null ? null : Math.round(promedios._avg[c]! * 10) / 10,
      votos: promedios._count[c],
    }));
    return { ...resumen, distribucion, criterios, resenas };
  }

  // Crea la reseña del usuario o la actualiza si ya tenia una.
  async guardar(localId: string, usuarioId: string, dto: GuardarResenaDto) {
    const local = await this.localPublico(localId);
    if (local.anfitrionId === usuarioId) {
      throw new ForbiddenException('No puedes calificar tu propio local.');
    }
    const datos = {
      calificacion: dto.calificacion,
      comentario: dto.comentario ?? null,
      ...Object.fromEntries(CRITERIOS.map((c) => [c, dto[c] ?? null])),
    };
    return this.prisma.resena.upsert({
      where: { localId_usuarioId: { localId, usuarioId } },
      create: { localId, usuarioId, ...datos },
      update: datos,
      include: { usuario: AUTOR },
    });
  }

  async borrarPropia(localId: string, usuarioId: string) {
    await this.localPublico(localId);
    const { count } = await this.prisma.resena.deleteMany({ where: { localId, usuarioId } });
    if (count === 0) throw new NotFoundException('No tienes una reseña en este local.');
    return { eliminada: true };
  }

  // Moderacion: el operador puede quitar reseñas ofensivas o falsas.
  async borrarComoOperador(resenaId: string) {
    const { count } = FORMA_UUID.test(resenaId)
      ? await this.prisma.resena.deleteMany({ where: { id: resenaId } })
      : { count: 0 };
    if (count === 0) throw new NotFoundException('Reseña no encontrada.');
    return { eliminada: true };
  }

  // Reseñas que escribio el usuario, para su pagina de perfil.
  mias(usuarioId: string) {
    return this.prisma.resena.findMany({
      where: { usuarioId },
      include: { local: { select: { id: true, nombre: true } } },
      orderBy: { actualizadoEn: 'desc' },
    });
  }
}
