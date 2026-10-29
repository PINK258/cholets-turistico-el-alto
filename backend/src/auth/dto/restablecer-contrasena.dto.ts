import { IsString, Matches, MaxLength } from 'class-validator';
import { CONTRASENA_SEGURA, MENSAJE_CONTRASENA } from './register.dto';

export class RestablecerContrasenaDto {
  @IsString()
  @MaxLength(2000)
  permiso: string;

  @Matches(CONTRASENA_SEGURA, { message: MENSAJE_CONTRASENA })
  password: string;
}
