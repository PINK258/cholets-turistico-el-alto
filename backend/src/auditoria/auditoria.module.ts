import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BitacoraService } from './bitacora.service';
import { BitacoraInterceptor } from './bitacora.interceptor';

// Auditoria del sistema: la bitacora (quien hizo que en la aplicacion) se llena
// sola con el interceptor global. Los cambios en la base de datos los registran
// disparadores de PostgreSQL (database/auditoria_y_reportes.sql).
@Global()
@Module({
  providers: [BitacoraService, { provide: APP_INTERCEPTOR, useClass: BitacoraInterceptor }],
  exports: [BitacoraService],
})
export class AuditoriaModule {}
