import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { FORMA_UUID } from './create-local.dto';
import { TIPOS_LOCAL } from '../tipos-local';
import { DIAS_SEMANA, FORMATO_HORA } from '../horario';
import { FichaLocalDto } from '../servicios';

// Usado por el panel del anfitrion (requisito 6): editar descripcion,
// horario, tipos de local, categorias de eventos, etc. Las fotos se
// agregan/eliminan con endpoints separados.
export class ActualizarLocalDto extends FichaLocalDto {
  @IsOptional()
  @IsString()
  descripcion?: string;

  // Historia del cholet (opcional). Vacia ("") = se quita.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(3000, { message: 'La historia puede tener como máximo 3000 caracteres.' })
  historia?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos un tipo de local.' })
  @IsIn(TIPOS_LOCAL, { each: true, message: 'Tipo de local no válido.' })
  tiposLocal?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos un día de funcionamiento.' })
  @IsIn(DIAS_SEMANA, { each: true, message: 'Día no válido.' })
  diasFuncionamiento?: string[];

  @IsOptional()
  @Matches(FORMATO_HORA, { message: 'La hora de apertura debe tener el formato HH:MM.' })
  horaApertura?: string;

  @IsOptional()
  @Matches(FORMATO_HORA, { message: 'La hora de cierre debe tener el formato HH:MM.' })
  horaCierre?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos una categoría de eventos que realiza tu local.' })
  @Matches(FORMA_UUID, { each: true, message: 'Categoría no válida.' })
  categoriaIds?: string[];
}
