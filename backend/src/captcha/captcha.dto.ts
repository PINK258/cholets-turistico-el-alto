import { Length } from 'class-validator';

// Campos del codigo de verificacion que mandan los formularios de registro.
// Un solo validador por campo (Length tambien falla si falta o no es texto),
// asi el usuario ve un unico mensaje claro.
export class CamposCaptcha {
  @Length(1, 64, { message: 'Falta el código de verificación. Pide uno nuevo e inténtalo otra vez.' })
  captchaId: string;

  @Length(1, 20, { message: 'Escribe el código de verificación.' })
  captchaRespuesta: string;
}
