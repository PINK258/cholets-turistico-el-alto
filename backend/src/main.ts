import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // FRONTEND_URL admite varias URLs separadas por coma. Fuera de produccion
  // tambien se acepta el frontend abierto como 127.0.0.1 o con la IP de la red
  // local (ej. 192.168.x.x:3000); si no, el navegador bloquea los datos y la
  // pagina principal aparece vacia.
  const origenesPermitidos = (config.get<string>('FRONTEND_URL') || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  const origenLocalDev = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000$/;
  const esProduccion = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origen, callback) => {
      const permitido =
        !origen || origenesPermitidos.includes(origen) || (!esProduccion && origenLocalDev.test(origen));
      callback(null, permitido);
    },
    credentials: true,
  });

  // Sirve las fotos subidas (backend/uploads/locales/...) en /uploads/...
  // Ruta relativa a process.cwd() (no a __dirname/dist): multer guarda los
  // archivos en "./uploads/locales" tambien relativo al cwd del proceso.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const port = config.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`Backend Cholets Turístico El Alto escuchando en http://localhost:${port}`);
}
bootstrap();
