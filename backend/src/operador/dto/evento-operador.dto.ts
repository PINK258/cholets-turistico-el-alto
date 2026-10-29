import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { FORMA_UUID } from '../../locales/dto/create-local.dto';

// Llega como multipart (texto + foto opcional): un campo vacio cuenta como "no enviado".
const vacioAUndefined = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

// Evento que publica el operador en la cartelera.
export class CrearEventoOperadorDto {
  @Length(3, 160, { message: 'El título debe tener entre 3 y 160 caracteres.' })
  titulo: string;

  @Length(3, 3000, { message: 'Escribe una descripción (mínimo 3 caracteres).' })
  descripcion: string;

  @IsDateString({}, { message: 'Indica la fecha y hora de inicio del evento.' })
  fechaInicio: string;

  @vacioAUndefined()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es válida.' })
  fechaFin?: string;

  // Si el evento es en un local registrado; si no, se escribe el lugar.
  @vacioAUndefined()
  @IsOptional()
  @Matches(FORMA_UUID, { message: 'El local elegido no es válido.' })
  localId?: string;

  @vacioAUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El lugar puede tener como máximo 200 caracteres.' })
  lugar?: string;

  // Programacion: desde cuando aparece y cuando desaparece (y se borra).
  @vacioAUndefined()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha en que aparece no es válida.' })
  publicarDesde?: string;

  @vacioAUndefined()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha en que desaparece no es válida.' })
  publicarHasta?: string;

  // Categoria del evento (tabla categorias_evento). En la edicion, "" = quitarla.
  @IsOptional()
  @Matches(/^$|^[0-9a-fA-F-]{36}$/, { message: 'Categoría no válida.' })
  categoriaId?: string;
}

// Edicion: todo es opcional; "quitarAfiche" = "true" borra la foto actual.
export class ActualizarEventoOperadorDto {
  @vacioAUndefined()
  @IsOptional()
  @Length(3, 160, { message: 'El título debe tener entre 3 y 160 caracteres.' })
  titulo?: string;

  @vacioAUndefined()
  @IsOptional()
  @Length(3, 3000, { message: 'Escribe una descripción (mínimo 3 caracteres).' })
  descripcion?: string;

  @vacioAUndefined()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es válida.' })
  fechaInicio?: string;

  // En la edicion, un campo enviado vacio significa "quitar" (fin, local, fechas).
  @IsOptional()
  @IsString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  localId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El lugar puede tener como máximo 200 caracteres.' })
  lugar?: string;

  @IsOptional()
  @IsString()
  publicarDesde?: string;

  @IsOptional()
  @IsString()
  publicarHasta?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  quitarAfiche?: string;

  // "true" borra la imagen horizontal (banner) actual.
  @IsOptional()
  @IsIn(['true', 'false'])
  quitarBanner?: string;

  // Categoria del evento (tabla categorias_evento). En la edicion, "" = quitarla.
  @IsOptional()
  @Matches(/^$|^[0-9a-fA-F-]{36}$/, { message: 'Categoría no válida.' })
  categoriaId?: string;
}
