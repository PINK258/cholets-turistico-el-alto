import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Envia los correos del sistema con Gmail (gratis). En .env:
//   CORREO_USUARIO="tucuenta@gmail.com"
//   CORREO_CLAVE_APP="la contraseña de aplicacion de 16 letras"
// (Cuenta de Google > Seguridad > Verificacion en 2 pasos > Contraseñas de aplicaciones).
// Sin esas variables, en desarrollo el codigo se muestra en la consola del
// backend para poder probar; en produccion se rechaza el envio.
// Ojo: el .env se lee al arrancar; tras cambiarlo hay que reiniciar el backend.
@Injectable()
export class EnvioCorreoService {
  private readonly logger = new Logger('Correo');
  private readonly transporte: nodemailer.Transporter | null;
  private readonly remitente: string | undefined;

  constructor(private config: ConfigService) {
    this.remitente = config.get<string>('CORREO_USUARIO')?.trim() || undefined;
    const clave = config.get<string>('CORREO_CLAVE_APP')?.replace(/\s+/g, '');
    this.transporte =
      this.remitente && clave
        ? nodemailer.createTransport({ service: 'gmail', auth: { user: this.remitente, pass: clave } })
        : null;
  }

  // true si los correos salen de verdad (hay cuenta de Gmail configurada).
  get configurado() {
    return this.transporte !== null;
  }

  async enviarCodigo(correo: string, codigo: string): Promise<{ modoPrueba: boolean }> {
    if (!this.transporte) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('El envío de correos no está configurado. Avisa al administrador.');
      }
      this.logger.warn(`[MODO PRUEBA, sin Gmail configurado] Código para ${correo}: ${codigo}`);
      return { modoPrueba: true };
    }
    await this.transporte.sendMail({
      from: `"Cholets Turístico El Alto" <${this.remitente}>`,
      to: correo,
      subject: `${codigo} es tu código de acceso`,
      text:
        `Tu código para entrar a Cholets Turístico El Alto es: ${codigo}\n\n` +
        'Vence en 10 minutos. Si no lo pediste, ignora este correo: nadie podrá entrar sin el código.',
      html: plantillaCodigo(codigo),
    });
    return { modoPrueba: false };
  }
}

// Correo sencillo con estilos en linea (los clientes de correo ignoran <style>).
function plantillaCodigo(codigo: string) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f5f3ff;font-family:Arial,Helvetica,sans-serif;color:#2e1065">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #ede9fe">
    <tr><td style="padding:24px 28px;background:#5b21b6;border-radius:16px 16px 0 0;color:#ffffff">
      <div style="font-size:18px;font-weight:bold">Cholets Turístico El Alto</div>
      <div style="font-size:12px;color:#fcd34d;letter-spacing:1px">EL ALTO · BOLIVIA</div>
    </td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 12px;font-size:15px">Usa este código para entrar:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;padding:16px;background:#f5f3ff;border-radius:12px;color:#4c1d95">${codigo}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#6d28d9">Vence en <b>10 minutos</b>.</p>
      <p style="margin:12px 0 0;font-size:12px;color:#7c6aa8">Si no lo pediste, ignora este correo: nadie podrá entrar a tu cuenta sin el código.</p>
    </td></tr>
  </table>
</body></html>`;
}
