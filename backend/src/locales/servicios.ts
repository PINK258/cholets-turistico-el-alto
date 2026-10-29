import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

// Campo repetido de multipart -> arreglo (copia de comoArreglo, sin importar
// create-local.dto para no crear una dependencia circular).
const comoArreglo = ({ value }: { value: unknown }) =>
  Array.isArray(value) ? value : value === undefined || value === '' ? [] : [value];

// "Lo que este lugar ofrece": lista fija (el frontend tiene la misma, con
// iconos, en src/lib/servicios.ts).
export const SERVICIOS_LOCAL = [
  'ESTACIONAMIENTO',
  'SONIDO',
  'ILUMINACION',
  'ESCENARIO',
  'PISTA_BAILE',
  'COCINA',
  'CATERING',
  'MOBILIARIO',
  'WIFI',
  'BANOS',
  'ACCESIBILIDAD',
  'SEGURIDAD',
  'CALEFACCION',
  'AREA_INFANTIL',
] as const;

// Enlaces de video aceptados: YouTube o TikTok.
export const VIDEO_PERMITIDO = /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)[\w-]{6,}|youtu\.be\/[\w-]{6,}|tiktok\.com\/@[\w.-]+\/video\/\d+)/i;

const vacioAUndefined = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? undefined : value);
const texto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Campos de la ficha completa del local, comunes a registrar y editar.
// En la edicion, un texto vacio ("") quita el dato (ver locales.service).
export class FichaLocalDto {
  // Capacidad de personas.
  @IsOptional()
  @Transform(vacioAUndefined)
  @Type(() => Number)
  @IsInt({ message: 'El aforo debe ser un número entero de personas.' })
  @Min(1, { message: 'El aforo debe ser de al menos 1 persona.' })
  @Max(20000, { message: 'El aforo no puede pasar de 20000 personas.' })
  aforo?: number;

  @IsOptional()
  @Transform(comoArreglo)
  @IsArray()
  @IsIn(SERVICIOS_LOCAL, { each: true, message: 'Servicio no válido.' })
  servicios?: string[];

  @IsOptional()
  @Transform(texto)
  @Matches(/^$|^\+?[0-9\s-]{7,20}$/, { message: 'Escribe un número de WhatsApp válido (ej. 71234567).' })
  whatsapp?: string;

  // "Lo que debes saber": normas del local.
  @IsOptional()
  @Transform(texto)
  @IsString()
  @MaxLength(1500, { message: 'Las reglas pueden tener como máximo 1500 caracteres.' })
  reglas?: string;

  @IsOptional()
  @Transform(texto)
  @Matches(new RegExp(`^$|${VIDEO_PERMITIDO.source}`, 'i'), { message: 'El video debe ser un enlace de YouTube o TikTok.' })
  videoUrl?: string;
}

// Datos listos para guardar: "" se guarda como null; lo no enviado no cambia.
export function fichaParaGuardar(dto: FichaLocalDto) {
  const limpio = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);
  return {
    ...(dto.aforo !== undefined && { aforo: dto.aforo }),
    ...(dto.servicios !== undefined && { servicios: SERVICIOS_LOCAL.filter((s) => dto.servicios!.includes(s)) }),
    ...(dto.whatsapp !== undefined && { whatsapp: limpio(dto.whatsapp) }),
    ...(dto.reglas !== undefined && { reglas: limpio(dto.reglas) }),
    ...(dto.videoUrl !== undefined && { videoUrl: limpio(dto.videoUrl) }),
  };
}

export const CAMPOS_FICHA: (keyof FichaLocalDto)[] = ['aforo', 'servicios', 'whatsapp', 'reglas', 'videoUrl'];
