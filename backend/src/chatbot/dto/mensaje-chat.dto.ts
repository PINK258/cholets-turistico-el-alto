import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class MensajeChatDto {
  @IsString()
  @MaxLength(1000)
  mensaje: string;

  // Identifica la conversacion (ej. un uuid generado en el navegador) para
  // poder recuperar el historial. No requiere login: el chatbot es publico.
  @IsString()
  sesionId: string;

  // Local que el usuario esta viendo, para que "¿cual es la direccion?" se
  // responda sobre ese cholet. Se valida solo la forma general de un UUID
  // (@IsUUID exige la variante RFC y rechazaria ids del seed como 4444...).
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  localId?: string;
}
