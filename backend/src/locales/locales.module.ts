import { Module } from '@nestjs/common';
import { LocalesService } from './locales.service';
import { LocalesController } from './locales.controller';
import { EventosController } from './eventos.controller';
import { EventosProgramadosService } from './eventos-programados.service';
import { ResenasModule } from '../resenas/resenas.module';

@Module({
  imports: [ResenasModule],
  controllers: [LocalesController, EventosController],
  providers: [LocalesService, EventosProgramadosService],
  exports: [LocalesService],
})
export class LocalesModule {}
