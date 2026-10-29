import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { FavoritosService } from './favoritos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Favoritos: solo para el Usuario Turístico (visitante). El Administrador
// Turístico y el Operador G.A.M.E.A. no los usan.
@Controller('favoritos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.TURISTA)
export class FavoritosController {
  constructor(private favoritos: FavoritosService) {}

  @Get()
  listar(@Req() req: any) {
    return this.favoritos.listar(req.user.id);
  }

  @Get('ids')
  ids(@Req() req: any) {
    return this.favoritos.ids(req.user.id);
  }

  @Post(':localId')
  agregar(@Req() req: any, @Param('localId') localId: string) {
    return this.favoritos.agregar(req.user.id, localId);
  }

  @Delete(':localId')
  quitar(@Req() req: any, @Param('localId') localId: string) {
    return this.favoritos.quitar(req.user.id, localId);
  }
}
