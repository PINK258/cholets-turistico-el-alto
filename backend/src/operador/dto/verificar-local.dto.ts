import { IsIn, IsOptional, IsString } from 'class-validator';
import { EstadoVerificacion } from '@prisma/client';

export class VerificarLocalDto {
  // Para pedir correcciones esta POST /operador/locales/:id/correccion.
  @IsIn([EstadoVerificacion.APROBADO, EstadoVerificacion.RECHAZADO], { message: 'estado debe ser APROBADO o RECHAZADO' })
  estado: EstadoVerificacion;

  @IsOptional()
  @IsString()
  comentario?: string;
}
