import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as svgCaptcha from 'svg-captcha';

// Codigo CAPTCHA propio: el servidor genera una imagen SVG con letras
// deformadas (dibujadas como trazos, no como texto, para que un bot no pueda
// leerlas del codigo) y guarda la respuesta en memoria por unos minutos.
//
// Un codigo resuelto sirve para DOS envios: al registrar un local sin cuenta
// se crea primero la cuenta y luego el local, con el mismo codigo. Si la
// respuesta es incorrecta, el codigo se descarta y hay que pedir otro.
//
// Se guarda en memoria porque el backend corre en un solo proceso; con varios
// servidores habria que guardarlo en la base de datos o en Redis.

const DURACION_MS = 10 * 60 * 1000;
const USOS_MAXIMOS = 2;
const MAXIMO_PENDIENTES = 5000;

type Pendiente = { respuesta: string; expira: number; usos: number };

@Injectable()
export class CaptchaService {
  private pendientes = new Map<string, Pendiente>();

  generar() {
    this.limpiarVencidos();
    const { data, text } = svgCaptcha.create({
      size: 5,
      // Sin caracteres que se confunden entre si (0/o, 1/l/i).
      ignoreChars: '0oO1lIi',
      noise: 3,
      // Letras gris oscuro sobre el fondo blanco de la pagina: con colores la
      // libreria elegia tonos muy claros (p. ej. verde #83e183) dificiles de
      // leer. Sin "background", porque con fondo la libreria vuelve a colorear.
      color: false,
      width: 160,
      height: 56,
      fontSize: 52,
    });
    const id = randomUUID();
    this.pendientes.set(id, { respuesta: text.toLowerCase(), expira: Date.now() + DURACION_MS, usos: 0 });
    return { id, svg: data };
  }

  // Lanza un error 400 si el codigo no es valido; no distingue mayusculas.
  verificar(id: string | undefined, respuesta: string | undefined) {
    const pendiente = id ? this.pendientes.get(id) : undefined;
    if (!pendiente || pendiente.expira < Date.now()) {
      if (id) this.pendientes.delete(id);
      throw new BadRequestException('El código de verificación venció. Pide uno nuevo e inténtalo otra vez.');
    }
    if ((respuesta ?? '').trim().toLowerCase() !== pendiente.respuesta) {
      this.pendientes.delete(id!);
      throw new BadRequestException('El código de verificación no es correcto. Escribe el nuevo código.');
    }
    pendiente.usos += 1;
    if (pendiente.usos >= USOS_MAXIMOS) this.pendientes.delete(id!);
  }

  private limpiarVencidos() {
    const ahora = Date.now();
    for (const [id, p] of this.pendientes) if (p.expira < ahora) this.pendientes.delete(id);
    // Tope de memoria ante alguien que pida codigos sin parar: se descartan los mas viejos.
    while (this.pendientes.size >= MAXIMO_PENDIENTES) {
      const masViejo = this.pendientes.keys().next().value as string;
      this.pendientes.delete(masViejo);
    }
  }
}
