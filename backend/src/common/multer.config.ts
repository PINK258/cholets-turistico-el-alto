import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';

const IMAGEN = /\.(jpg|jpeg|png|webp)$/i;
const IMAGEN_O_PDF = /\.(jpg|jpeg|png|webp|pdf)$/i;

// Ancla siempre a process.cwd() (no a __dirname/dist) para que coincida con
// la ruta que sirve app.useStaticAssets en main.ts.
export const CARPETA_FOTOS = join(process.cwd(), 'uploads', 'locales');
export const CARPETA_PERFILES = join(process.cwd(), 'uploads', 'perfiles');
mkdirSync(CARPETA_PERFILES, { recursive: true });

export const CAMPO_FOTO_PERFIL = 'fotoPerfil';

export const configuracionMulterFotos = {
  storage: diskStorage({
    // La foto de perfil del dueño va a su propia carpeta.
    destination: (_req, file, cb) =>
      cb(null, file.fieldname === CAMPO_FOTO_PERFIL ? CARPETA_PERFILES : CARPETA_FOTOS),
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  // Solo el registro de funcionamiento puede ser PDF; fotos y perfil, solo imagenes.
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const esDocumento = file.fieldname === 'documentoFuncionamiento';
    const permitido = (esDocumento ? IMAGEN_O_PDF : IMAGEN).test(extname(file.originalname));
    if (!permitido) {
      return cb(
        new BadRequestException(
          esDocumento
            ? 'El registro de funcionamiento debe ser una imagen (jpg, png, webp) o un PDF.'
            : 'Las fotos deben ser imágenes jpg, png o webp.',
        ),
        false,
      );
    }
    cb(null, true);
  },
  limits: { fileSize: 8 * 1024 * 1024 },
};

// Foto panoramica 360 del local (campo "foto360"): suelen ser imagenes grandes.
export const configuracionMulter360 = { ...configuracionMulterFotos, limits: { fileSize: 20 * 1024 * 1024 } };
