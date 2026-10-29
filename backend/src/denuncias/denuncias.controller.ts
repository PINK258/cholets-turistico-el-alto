import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { DenunciasService } from './denuncias.service';
import { CrearDenunciaDto, RevisarDenunciaDto } from './denuncias.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
export class DenunciasController {
  constructor(private denuncias: DenunciasService) {}

  // Cualquier persona con cuenta puede denunciar un local.
  @Post('locales/:id/denuncias')
  @UseGuards(JwtAuthGuard)
  crear(@Req() req: any, @Param('id') id: string, @Body() dto: CrearDenunciaDto) {
    return this.denuncias.crear(id, req.user.id, dto);
  }

  // Bandeja del Operador G.A.M.E.A.
  @Get('operador/denuncias')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.OPERADOR, Rol.ADMIN)
  listar(@Query('estado') estado?: string) {
    return this.denuncias.listar(['PENDIENTE', 'REVISADA', 'DESCARTADA'].includes(estado ?? '') ? estado : undefined);
  }

  @Patch('operador/denuncias/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.OPERADOR, Rol.ADMIN)
  revisar(@Req() req: any, @Param('id') id: string, @Body() dto: RevisarDenunciaDto) {
    return this.denuncias.revisar(id, req.user.id, dto);
  }
}
