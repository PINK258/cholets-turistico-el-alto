import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GuardarResenaDto {
  @IsInt({ message: 'Elige una calificación de 1 a 5 estrellas.' })
  @Min(1, { message: 'Elige una calificación de 1 a 5 estrellas.' })
  @Max(5, { message: 'Elige una calificación de 1 a 5 estrellas.' })
  calificacion: number;

  // Opcional: se puede calificar solo con estrellas. Los espacios sobrantes se
  // quitan y un comentario vacio se guarda como null.
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @MaxLength(500, { message: 'El comentario puede tener como máximo 500 caracteres.' })
  comentario?: string;

  // Calificacion por criterios (opcionales, 1 a 5 estrellas cada uno).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  atencion?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  limpieza?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ubicacion?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  precio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ambiente?: number;
}
