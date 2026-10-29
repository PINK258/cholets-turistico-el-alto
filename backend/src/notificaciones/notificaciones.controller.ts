import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private notificaciones: NotificacionesService) {}

  @Get()
  mias(@Req() req: any) {
    return this.notificaciones.mias(req.user.id);
  }

  @Patch(':id/leida')
  marcarLeida(@Req() req: any, @Param('id') id: string) {
    return this.notificaciones.marcarLeida(id, req.user.id);
  }
}
