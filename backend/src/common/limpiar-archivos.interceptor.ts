import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { open, unlink } from 'fs/promises';
import { extname } from 'path';
import { catchError, from, switchMap, throwError } from 'rxjs';

// Firma (primeros bytes) que debe tener cada tipo de archivo permitido. El
// filtro de multer solo mira la extension del nombre, que cualquiera puede
// cambiar (p. ej. un PDF o un HTML renombrado a "foto.png").
const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  '.jpg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  '.png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  '.pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
};

async function contenidoValido(archivo: Express.Multer.File) {
  const firma = FIRMAS[extname(archivo.originalname).toLowerCase()];
  if (!firma) return false;
  const descriptor = await open(archivo.path, 'r');
  try {
    const { buffer, bytesRead } = await descriptor.read(Buffer.alloc(12), 0, 12, 0);
    return bytesRead >= 4 && firma(buffer);
  } finally {
    await descriptor.close();
  }
}

// Multer guarda los archivos en disco ANTES de validar el formulario. Este
// interceptor:
//  1) comprueba que el contenido de cada archivo corresponda a su extension;
//  2) si la peticion termina en error (contenido invalido, falta un dato, CI
//     repetido, ...) borra los archivos para que no queden huerfanos en uploads/.
// Debe ir DESPUES de FileFieldsInterceptor en @UseInterceptors.
@Injectable()
export class LimpiarArchivosSiFallaInterceptor implements NestInterceptor {
  intercept(contexto: ExecutionContext, siguiente: CallHandler) {
    const req = contexto.switchToHttp().getRequest();
    const archivos = Object.values(req.files ?? {}).flat() as Express.Multer.File[];

    const validar = async () => {
      for (const archivo of archivos) {
        if (!(await contenidoValido(archivo))) {
          throw new BadRequestException(
            `El archivo "${archivo.originalname}" no es válido: su contenido no corresponde a una imagen ` +
              `(jpg, png, webp)${archivo.fieldname === 'documentoFuncionamiento' ? ' o PDF' : ''}.`,
          );
        }
      }
    };

    return from(validar()).pipe(
      switchMap(() => siguiente.handle()),
      catchError((error) => {
        for (const archivo of archivos) {
          unlink(archivo.path).catch(() => undefined);
        }
        return throwError(() => error);
      }),
    );
  }
}
