import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const MOTIVOS_DENUNCIA = ['FALSO', 'INFORMACION_ENGANOSA', 'CONTENIDO_INAPROPIADO', 'FRAUDE', 'CERRADO', 'OTRO'] as const;

const texto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CrearDenunciaDto {
  @IsIn(MOTIVOS_DENUNCIA, { message: 'Elige el motivo de la denuncia.' })
  motivo: string;

  @IsOptional()
  @Transform(texto)
  @IsString()
  @MaxLength(1000, { message: 'El detalle puede tener como máximo 1000 caracteres.' })
  detalle?: string;
}

export class RevisarDenunciaDto {
  @IsIn(['REVISADA', 'DESCARTADA'], { message: 'Indica si la denuncia queda revisada o descartada.' })
  estado: string;

  @IsOptional()
  @Transform(texto)
  @IsString()
  @MaxLength(500)
  nota?: string;
}
