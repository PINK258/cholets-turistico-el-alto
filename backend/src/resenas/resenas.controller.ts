import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { ResenasService } from './resenas.service';
import { GuardarResenaDto } from './dto/guardar-resena.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class ResenasController {
  constructor(private resenas: ResenasService) {}

  // Publico: cualquiera ve las calificaciones y comentarios de un local.
  @Get('locales/:id/resenas')
  listar(@Param('id') id: string) {
    return this.resenas.listar(id);
  }

  // PUT porque cada usuario tiene una sola reseña por local: crea o reemplaza.
  @Put('locales/:id/resenas')
  @UseGuards(JwtAuthGuard)
  guardar(@Req() req: any, @Param('id') id: string, @Body() dto: GuardarResenaDto) {
    return this.resenas.guardar(id, req.user.id, dto);
  }

  @Delete('locales/:id/resenas')
  @UseGuards(JwtAuthGuard)
  borrarPropia(@Req() req: any, @Param('id') id: string) {
    return this.resenas.borrarPropia(id, req.user.id);
  }

  @Get('resenas/mias')
  @UseGuards(JwtAuthGuard)
  mias(@Req() req: any) {
    return this.resenas.mias(req.user.id);
  }

  @Delete('operador/resenas/:resenaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.OPERADOR, Rol.ADMIN)
  borrarComoOperador(@Param('resenaId') resenaId: string) {
    return this.resenas.borrarComoOperador(resenaId);
  }
}
