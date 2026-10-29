import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  listar() {
    return this.prisma.categoriaEvento.findMany({
      orderBy: { orden: 'asc' },
      select: { id: true, grupo: true, nombre: true, descripcion: true, orden: true },
    });
  }
}
