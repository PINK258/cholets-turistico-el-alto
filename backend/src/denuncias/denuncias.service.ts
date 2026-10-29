import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoVerificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FORMA_UUID } from '../locales/dto/create-local.dto';
import { CrearDenunciaDto, RevisarDenunciaDto } from './denuncias.dto';

// "Denunciar este local": un visitante con cuenta avisa que un local es falso,
// engañoso, inapropiado, etc. El Operador G.A.M.E.A. lo revisa o lo descarta.
@Injectable()
export class DenunciasService {
  constructor(private prisma: PrismaService) {}

  async crear(localId: string, usuarioId: string, dto: CrearDenunciaDto) {
    const local = FORMA_UUID.test(localId)
      ? await this.prisma.local.findUnique({ where: { id: localId }, select: { estado: true, anfitrionId: true } })
      : null;
    if (!local || local.estado !== EstadoVerificacion.APROBADO) throw new NotFoundException('Local no encontrado.');
    if (local.anfitrionId === usuarioId) throw new ForbiddenException('No puedes denunciar tu propio local.');
    if (dto.motivo === 'OTRO' && !dto.detalle) throw new BadRequestException('Cuéntanos el motivo en el detalle.');
    try {
      const denuncia = await this.prisma.denuncia.create({
        data: { localId, usuarioId, motivo: dto.motivo, detalle: dto.detalle || null },
        select: { id: true, estado: true, creadoEn: true },
      });
      return denuncia;
    } catch (e) {
      // Indice unico: una denuncia pendiente por persona y local.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya denunciaste este local. El Operador G.A.M.E.A. lo está revisando.');
      }
      throw e;
    }
  }

  listar(estado?: string) {
    return this.prisma.denuncia.findMany({
      where: estado ? { estado } : undefined,
      include: {
        local: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            zona: { select: { distritoNumero: true, nombreZonaPrincipal: true } },
            anfitrion: { select: { nombre: true, apellidoPaterno: true, correo: true } },
          },
        },
        usuario: { select: { nombre: true, apellidoPaterno: true, correo: true } },
        revisor: { select: { nombre: true, apellidoPaterno: true } },
      },
      orderBy: [{ estado: 'asc' }, { creadoEn: 'desc' }],
      take: 300,
    });
  }

  async revisar(id: string, operadorId: string, dto: RevisarDenunciaDto) {
    const denuncia = FORMA_UUID.test(id) ? await this.prisma.denuncia.findUnique({ where: { id } }) : null;
    if (!denuncia) throw new NotFoundException('Denuncia no encontrada.');
    if (denuncia.estado !== 'PENDIENTE') throw new ConflictException('Esta denuncia ya fue atendida.');
    return this.prisma.denuncia.update({
      where: { id },
      data: { estado: dto.estado, notaRevision: dto.nota || null, revisadoPor: operadorId, revisadoEn: new Date() },
    });
  }
}
