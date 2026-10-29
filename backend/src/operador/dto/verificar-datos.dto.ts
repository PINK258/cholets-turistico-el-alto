import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class VerificarDatosDto {
  // true = el operador reviso y confirma los datos del dueño; false = quita la verificacion.
  @IsBoolean({ message: 'Indica si los datos quedan verificados (true) o no (false).' })
  verificado: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La nota puede tener como máximo 500 caracteres.' })
  nota?: string;
}
