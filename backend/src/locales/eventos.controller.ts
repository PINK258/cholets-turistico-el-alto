import { Controller, Get, Param } from '@nestjs/common';
import { LocalesService } from './locales.service';

// Cartelera de los cholets: eventos proximos de todos los locales aprobados.
@Controller('eventos')
export class EventosController {
  constructor(private locales: LocalesService) {}

  @Get('cartelera')
  cartelera() {
    return this.locales.cartelera();
  }

  @Get(':id')
  detalle(@Param('id') id: string) {
    return this.locales.eventoPublico(id);
  }
}
