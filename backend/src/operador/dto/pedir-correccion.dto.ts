import { ArrayMinSize, IsArray, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { SECCIONES_CORRECCION } from '../../locales/secciones';

// El operador pide al dueño corregir algunas secciones de su local.
export class PedirCorreccionDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Marca al menos una sección que el dueño debe corregir.' })
  @IsIn(SECCIONES_CORRECCION, { each: true, message: 'Sección no válida.' })
  secciones: string[];

  @IsString()
  @MinLength(5, { message: 'Escribe qué debe corregir (al menos 5 caracteres).' })
  @MaxLength(500, { message: 'El mensaje puede tener como máximo 500 caracteres.' })
  mensaje: string;
}
