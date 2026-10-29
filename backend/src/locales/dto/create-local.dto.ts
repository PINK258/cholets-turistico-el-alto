import { ArrayMinSize, IsArray, IsEmail, IsIn, IsLatitude, IsLongitude, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TIPOS_LOCAL } from '../tipos-local';
import { DIAS_SEMANA, FORMATO_HORA } from '../horario';
import { FichaLocalDto } from '../servicios';

export const FORMA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// En multipart/form-data un campo repetido llega como arreglo, pero si se
// marco una sola categoria llega como texto suelto: se normaliza a arreglo.
export const comoArreglo = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value : value === undefined || value === '' ? [] : [value];

// Datos comunes de un local o edificio (sin tipo ni categorias de eventos).
// Las fotos llegan aparte, como multipart/form-data.
// Hereda aforo, servicios, WhatsApp, reglas y video (todos opcionales).
export class DatosBaseLocalDto extends FichaLocalDto {
  @IsString()
  nombreLocal: string;

  @IsString()
  descripcion: string;

  // Historia del cholet (opcional): como se construyo, por que y su tematica.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(3000, { message: 'La historia puede tener como máximo 3000 caracteres.' })
  historia?: string;

  @IsString()
  direccion: string;

  @Type(() => Number)
  @IsLatitude()
  latitud: number;

  @Type(() => Number)
  @IsLongitude()
  longitud: number;

  // Sin validar la forma, un id mal formado llegaba hasta Postgres y devolvia 500.
  @Matches(FORMA_UUID, { message: 'Zona no válida.' })
  zonaId: string;

  // Horario: dias que abre + hora de apertura y cierre ("HH:MM", 24 h). El texto
  // horario_funcionamiento lo arma el backend (ver horario.ts).
  @Transform(comoArreglo)
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos un día de funcionamiento.' })
  @IsIn(DIAS_SEMANA, { each: true, message: 'Día no válido.' })
  diasFuncionamiento: string[] = [];

  @Matches(FORMATO_HORA, { message: 'La hora de apertura debe tener el formato HH:MM.' })
  horaApertura: string;

  @Matches(FORMATO_HORA, { message: 'La hora de cierre debe tener el formato HH:MM.' })
  horaCierre: string;
}

// Local de un dueño: tipo de local y categorias de eventos son OBLIGATORIOS.
export class DatosLocalDto extends DatosBaseLocalDto {
  // Seleccion multiple: llega como campo repetido en el multipart.
  @Transform(comoArreglo)
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos un tipo de local.' })
  @IsIn(TIPOS_LOCAL, { each: true, message: 'Tipo de local no válido.' })
  tiposLocal: string[] = [];

  // Tipos de eventos que realiza el local (tabla categorias_evento). El valor por
  // defecto [] hace que, si no se envia ninguna, salga un unico mensaje claro en
  // vez de tres errores (uno en ingles).
  @Transform(comoArreglo)
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos una categoría de eventos que realiza tu local.' })
  @Matches(FORMA_UUID, { each: true, message: 'Categoría no válida.' })
  categoriaIds: string[] = [];
}

// Edificio que sube el Operador G.A.M.E.A. ("Subir edificio"): son oficinas o
// espacios municipales, asi que tipo de local y categorias son OPCIONALES.
export class DatosEdificioDto extends DatosBaseLocalDto {
  @Transform(comoArreglo)
  @IsArray()
  @IsIn(TIPOS_LOCAL, { each: true, message: 'Tipo de local no válido.' })
  tiposLocal: string[] = [];

  @Transform(comoArreglo)
  @IsArray()
  @Matches(FORMA_UUID, { each: true, message: 'Categoría no válida.' })
  categoriaIds: string[] = [];
}

// Formulario "Registra tu local": datos del dueño (para verificar identidad,
// requisito 4) + datos del local (requisito 1 y 3) + codigo de verificacion.
export class CreateLocalDto extends DatosLocalDto {
  // --- Datos del anfitrion (dueño) ---
  @IsString()
  nombre: string;

  @IsString()
  apellidoPaterno: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string;

  @IsString()
  ci: string;

  @IsEmail()
  correo: string;

  // --- Codigo de verificacion (CAPTCHA), igual que en captcha.dto.ts ---
  @Length(1, 64, { message: 'Falta el código de verificación. Pide uno nuevo e inténtalo otra vez.' })
  captchaId: string;

  @Length(1, 20, { message: 'Escribe el código de verificación.' })
  captchaRespuesta: string;
}
