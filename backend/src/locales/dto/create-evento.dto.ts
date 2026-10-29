import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { FORMA_UUID } from './create-local.dto';

export class CreateEventoDto {
  @IsString()
  titulo: string;

  @IsString()
  descripcion: string;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  // Categoria del evento (tabla categorias_evento), opcional.
  @IsOptional()
  @Matches(FORMA_UUID, { message: 'Categoría no válida.' })
  categoriaId?: string;
}
