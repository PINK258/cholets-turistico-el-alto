import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoVerificacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocalesService } from '../locales/locales.service';
import { FORMA_UUID } from '../locales/dto/create-local.dto';

// Favoritos de cada usuario: guardar y quitar locales con el corazon.
@Injectable()
export class FavoritosService {
  constructor(
    private prisma: PrismaService,
    private locales: LocalesService,
  ) {}

  // Solo los ids: el frontend los usa para pintar los corazones en las tarjetas.
  async ids(usuarioId: string) {
    const favoritos = await this.prisma.favorito.findMany({
      where: { usuarioId },
      select: { localId: true },
    });
    return favoritos.map((f) => f.localId);
  }

  // "Mis favoritos": los locales completos, el ultimo guardado primero. Un
  // local que dejo de estar aprobado no se muestra (pero sigue guardado).
  async listar(usuarioId: string) {
    const favoritos = await this.prisma.favorito.findMany({
      where: { usuarioId },
      select: { localId: true },
      orderBy: { creadoEn: 'desc' },
    });
    return this.locales.aprobadosPorIds(favoritos.map((f) => f.localId));
  }

  async agregar(usuarioId: string, localId: string) {
    const local = FORMA_UUID.test(localId)
      ? await this.prisma.local.findUnique({ where: { id: localId }, select: { estado: true } })
      : null;
    if (!local || local.estado !== EstadoVerificacion.APROBADO) {
      throw new NotFoundException('Local no encontrado.');
    }
    // upsert: guardar dos veces el mismo local no da error ni lo duplica.
    await this.prisma.favorito.upsert({
      where: { usuarioId_localId: { usuarioId, localId } },
      create: { usuarioId, localId },
      update: {},
    });
    return { favorito: true };
  }

  async quitar(usuarioId: string, localId: string) {
    if (FORMA_UUID.test(localId)) {
      await this.prisma.favorito.deleteMany({ where: { usuarioId, localId } });
    }
    return { favorito: false };
  }
}
