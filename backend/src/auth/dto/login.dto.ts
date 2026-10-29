import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { aCorreoNormalizado } from './register.dto';

export class LoginDto {
  @Transform(aCorreoNormalizado)
  @IsEmail({}, { message: 'Escribe un correo válido.' })
  correo: string;

  @IsString()
  @MaxLength(200)
  password: string;
}
