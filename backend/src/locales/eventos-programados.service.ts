import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { borrarArchivoSubido } from '../common/archivos';
import { eventoTerminado } from './locales.service';

// Revisa cada minuto los eventos y BORRA los que ya terminaron (ver
// eventoTerminado: su "publicar_hasta", su hora de fin o 12 h despues de empezar),
// junto con sus imagenes.
// Tambien corre al arrancar el backend, por si estuvo apagado.
const CADA_MS = 60 * 1000;

@Injectable()
export class EventosProgramadosService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventosProgramadosService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    void this.borrarVencidos();
    this.temporizador = setInterval(() => void this.borrarVencidos(), CADA_MS);
  }

  onModuleDestroy() {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  async borrarVencidos() {
    try {
      const vencidos = await this.prisma.evento.findMany({
        where: eventoTerminado(),
        select: { id: true, titulo: true, aficheUrl: true, bannerUrl: true },
      });
      if (vencidos.length === 0) return 0;
      await this.prisma.evento.deleteMany({ where: { id: { in: vencidos.map((e) => e.id) } } });
      for (const e of vencidos) {
        await borrarArchivoSubido(e.aficheUrl);
        await borrarArchivoSubido(e.bannerUrl);
      }
      this.logger.log(`Eventos vencidos borrados automáticamente: ${vencidos.map((e) => `"${e.titulo}"`).join(', ')}`);
      return vencidos.length;
    } catch (error) {
      this.logger.warn(`No se pudieron borrar los eventos vencidos: ${(error as Error).message}`);
      return 0;
    }
  }
}
