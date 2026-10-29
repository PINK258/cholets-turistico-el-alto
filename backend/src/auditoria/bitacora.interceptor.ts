import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ACCIONES } from './acciones';
import { BitacoraService } from './bitacora.service';

// Anota en la bitacora cada accion que cambia datos (POST/PUT/PATCH/DELETE)
// de la lista de acciones.ts, con quien la hizo, cuando y desde que IP.
// Si falla, se anota solo cuando importa para la seguridad: inicios de sesion
// fallidos e intentos sin permiso (401/403).
@Injectable()
export class BitacoraInterceptor implements NestInterceptor {
  constructor(private bitacora: BitacoraService) {}

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    if (contexto.getType() !== 'http') return siguiente.handle();
    const req = contexto.switchToHttp().getRequest();
    const metodo: string = req.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) return siguiente.handle();

    const ruta: string = req.route?.path ?? req.path;
    const definicion = ACCIONES[`${metodo} ${ruta}`];
    if (!definicion) return siguiente.handle();

    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || null;
    const params: Record<string, string> = req.params ?? {};

    const anotar = (exito: boolean, respuesta: any) => {
      // Quien: el usuario con sesion o, en login/registro, el de la respuesta.
      const usuario = req.user ?? respuesta?.usuario ?? null;
      void this.bitacora.registrar({
        usuarioId: usuario?.id ?? null,
        usuarioNombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellidoPaterno ?? ''}`.trim() : null,
        usuarioCorreo: usuario?.correo ?? (typeof req.body?.correo === 'string' ? req.body.correo : null),
        rol: usuario?.rol ?? null,
        accion: exito ? definicion.accion : `Intento fallido: ${definicion.accion.toLowerCase()}`,
        modulo: definicion.modulo,
        entidadId: (definicion.idParam ? params[definicion.idParam] : undefined) ?? respuesta?.id ?? null,
        detalle: exito ? definicion.detalle?.({ body: req.body, params, respuesta }) ?? null : null,
        metodo,
        ruta: req.originalUrl?.split('?')[0] ?? ruta,
        exito,
        ip,
      });
    };

    return siguiente.handle().pipe(
      tap((respuesta) => anotar(true, respuesta)),
      catchError((error) => {
        const estado = error instanceof HttpException ? error.getStatus() : 500;
        // 429 = demasiados intentos de inicio de sesion (bloqueo temporal).
        if (estado === 401 || estado === 403 || estado === 429) anotar(false, null);
        return throwError(() => error);
      }),
    );
  }
}
