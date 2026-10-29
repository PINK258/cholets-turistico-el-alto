import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Movimiento = {
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  usuarioCorreo?: string | null;
  rol?: string | null;
  accion: string;
  modulo: string;
  entidadId?: string | null;
  detalle?: string | null;
  metodo?: string;
  ruta?: string;
  exito?: boolean;
  ip?: string | null;
};

// Anota los movimientos en la bitacora. Nunca hace fallar la accion del
// usuario: si no se puede guardar, solo queda el aviso en la consola.
@Injectable()
export class BitacoraService {
  private readonly logger = new Logger('Bitacora');

  constructor(private prisma: PrismaService) {}

  async registrar(m: Movimiento) {
    try {
      await this.prisma.bitacora.create({
        data: {
          usuarioId: m.usuarioId ?? null,
          usuarioNombre: m.usuarioNombre ?? null,
          usuarioCorreo: m.usuarioCorreo ?? null,
          rol: m.rol ?? null,
          accion: m.accion,
          modulo: m.modulo,
          entidadId: m.entidadId ?? null,
          detalle: m.detalle ?? null,
          metodo: m.metodo,
          ruta: m.ruta,
          exito: m.exito ?? true,
          ip: m.ip ?? null,
        },
      });
    } catch (e) {
      this.logger.warn(`No se pudo anotar en la bitácora: ${(e as Error).message}`);
    }
  }
}
