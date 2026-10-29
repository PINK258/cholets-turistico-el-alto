import { Controller, Get, Param } from '@nestjs/common';
import { ZonasService } from './zonas.service';

@Controller('zonas')
export class ZonasController {
  constructor(private zonasService: ZonasService) {}

  @Get()
  listar() {
    return this.zonasService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.zonasService.obtener(id);
  }
}
