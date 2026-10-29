import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ZonasModule } from './zonas/zonas.module';
import { LocalesModule } from './locales/locales.module';
import { OperadorModule } from './operador/operador.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ResenasModule } from './resenas/resenas.module';
import { CaptchaModule } from './captcha/captcha.module';
import { FavoritosModule } from './favoritos/favoritos.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { DenunciasModule } from './denuncias/denuncias.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditoriaModule,
    AuthModule,
    ZonasModule,
    LocalesModule,
    OperadorModule,
    NotificacionesModule,
    ChatbotModule,
    CategoriasModule,
    ResenasModule,
    CaptchaModule,
    FavoritosModule,
    DenunciasModule,
  ],
})
export class AppModule {}
