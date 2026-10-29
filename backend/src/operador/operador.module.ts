import { LocalesModule } from '../locales/locales.module';
import { Module } from '@nestjs/common';
import { OperadorService } from './operador.service';
import { OperadorController } from './operador.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [LocalesModule],
  controllers: [OperadorController],
  providers: [OperadorService, ReportesService],
})
export class OperadorModule {}
