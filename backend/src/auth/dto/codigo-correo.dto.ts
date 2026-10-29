import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { aCorreoNormalizado } from './register.dto';
import { DatosPersonalesDto } from './datos-personales.dto';

const aTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class EnviarCodigoDto {
  @Transform(aCorreoNormalizado)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  correo: string;

  // true = viene del formulario "Regístrate Usuario Turístico": el correo no
  // debe tener cuenta todavia.
  @IsOptional()
  @IsBoolean()
  registro?: boolean;
}

// Hereda genero, fecha de nacimiento, pais y ciudad (obligatorios al crear la cuenta).
export class VerificarCodigoDto extends DatosPersonalesDto {
  @Transform(aCorreoNormalizado)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  correo: string;

  @Transform(aTexto)
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 números.' })
  codigo: string;

  // Solo la primera vez (cuenta nueva): nombre y apellido.
  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MinLength(2, { message: 'Escribe tu nombre.' })
  @MaxLength(60)
  nombre?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(60)
  apellidoPaterno?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(60)
  apellidoMaterno?: string;

  @IsOptional()
  @IsBoolean()
  registro?: boolean;
}
