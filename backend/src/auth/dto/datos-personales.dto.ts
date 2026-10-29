import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const GENEROS = ['MASCULINO', 'FEMENINO', 'OTRO', 'PREFIERO_NO_DECIR'] as const;

const aTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Datos de la persona para los reportes del Operador G.A.M.E.A.: genero, edad
// (por la fecha de nacimiento) y procedencia.
export class DatosPersonalesDto {
  @IsOptional()
  @IsIn(GENEROS, { message: 'Elige un género válido.' })
  genero?: string;

  // "AAAA-MM-DD"
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'Escribe una fecha de nacimiento válida.' })
  fechaNacimiento?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(60)
  pais?: string;

  @IsOptional()
  @Transform(aTexto)
  @IsString()
  @MaxLength(80)
  ciudad?: string;
}

export class ActualizarPerfilDto extends DatosPersonalesDto {
  @IsOptional()
  @Transform(aTexto)
  @Matches(/^[0-9+\s-]{6,20}$/, { message: 'Escribe un teléfono válido.' })
  telefono?: string;
}

// Revisa la edad (10 a 110 años) y, si se pide, que esten todos los datos.
// Devuelve los datos listos para guardar en la base.
export function datosPersonalesParaGuardar(dto: DatosPersonalesDto, obligatorios: boolean) {
  if (obligatorios) {
    const faltan = [
      !dto.genero && 'género',
      !dto.fechaNacimiento && 'fecha de nacimiento',
      !dto.pais && 'país',
      !dto.ciudad && 'ciudad',
    ].filter(Boolean);
    if (faltan.length > 0) throw new BadRequestException(`Completa: ${faltan.join(', ')}.`);
  }
  let fechaNacimiento: Date | undefined;
  if (dto.fechaNacimiento) {
    fechaNacimiento = new Date(`${dto.fechaNacimiento}T00:00:00Z`);
    const edad = (Date.now() - fechaNacimiento.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (edad < 10 || edad > 110) throw new BadRequestException('Revisa tu fecha de nacimiento.');
  }
  return {
    ...(dto.genero !== undefined && { genero: dto.genero }),
    ...(fechaNacimiento && { fechaNacimiento }),
    ...(dto.pais !== undefined && { pais: dto.pais || null }),
    ...(dto.ciudad !== undefined && { ciudad: dto.ciudad || null }),
  };
}
