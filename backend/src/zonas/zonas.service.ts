import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonasService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.zona.findMany({ orderBy: { distritoNumero: 'asc' } });
  }

  obtener(id: string) {
    return this.prisma.zona.findUnique({
      where: { id },
      include: { locales: { where: { estado: 'APROBADO' } } },
    });
  }
}
