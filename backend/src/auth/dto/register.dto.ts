import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { CamposCaptcha } from '../../captcha/captcha.dto';

// Correo sin espacios y en minusculas: "Juan@Gmail.com" y "juan@gmail.com"
// son la misma cuenta.
export const aCorreoNormalizado = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Politica de contraseñas: 8 a 72 caracteres (bcrypt solo usa los primeros 72
// bytes) con al menos una letra y un numero.
export const CONTRASENA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚÑáéíóúñ])(?=.*\d).{8,72}$/;
export const MENSAJE_CONTRASENA = 'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.';

// Hereda captchaId y captchaRespuesta: crear cuenta exige el codigo de verificacion.
export class RegisterDto extends CamposCaptcha {
  @IsString()
  nombre: string;

  @IsString()
  apellidoPaterno: string;

  @IsOptional()
  @IsString()
  apellidoMaterno?: string;

  @Transform(aCorreoNormalizado)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  correo: string;

  @Matches(CONTRASENA_SEGURA, { message: MENSAJE_CONTRASENA })
  password: string;

  @IsOptional()
  @IsString()
  ci?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
