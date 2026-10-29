import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { ProveedorAuth, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { EnvioCorreoService } from './envio-correo.service';
import { VerificarCodigoDto } from './dto/codigo-correo.dto';
import { datosPersonalesParaGuardar } from './dto/datos-personales.dto';

const VIGENCIA_MS = 10 * 60 * 1000; // el codigo vence a los 10 minutos
const ESPERA_REENVIO_MS = 30 * 1000; // un correo cada 30 segundos como maximo
const INTENTOS_MAXIMOS = 5;

// "Continuar con correo" (como ChatGPT): se manda un codigo de 6 digitos al
// correo; quien lo escribe demuestra que el correo es suyo y entra. Si no
// tenia cuenta, se crea como Usuario Turístico con su nombre.
@Injectable()
export class CodigoCorreoService {
  private readonly logger = new Logger('CodigoCorreo');

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private auth: AuthService,
    private envio: EnvioCorreoService,
  ) {}

  // Se guarda solo el HMAC del codigo (con la clave del servidor): quien vea la
  // base de datos no puede saber el codigo.
  private huella(correo: string, codigo: string) {
    return createHmac('sha256', this.config.get<string>('JWT_SECRET') ?? 'clave')
      .update(`${correo}:${codigo}`)
      .digest('hex');
  }

  async enviar(correo: string, registro = false) {
    const previo = await this.prisma.codigoCorreo.findUnique({ where: { correo } });
    if (previo && Date.now() - previo.creadoEn.getTime() < ESPERA_REENVIO_MS) {
      const segundos = Math.ceil((ESPERA_REENVIO_MS - (Date.now() - previo.creadoEn.getTime())) / 1000);
      throw new HttpException(`Ya te enviamos un código. Espera ${segundos} s para pedir otro.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    // Las cuentas del G.A.M.E.A. entran solo con contraseña: no se les manda
    // codigo, pero se responde igual para no revelar que correos son suyos.
    const cuenta = await this.prisma.usuario.findUnique({ where: { correo }, select: { rol: true } });
    if (registro && cuenta) {
      throw new ConflictException('Ese correo ya tiene una cuenta. Inicia sesión.');
    }
    if (cuenta && (cuenta.rol === Rol.OPERADOR || cuenta.rol === Rol.ADMIN)) {
      return { enviado: true, modoPrueba: !this.envio.configurado };
    }
    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const datos = {
      codigoHash: this.huella(correo, codigo),
      expiraEn: new Date(Date.now() + VIGENCIA_MS),
      intentos: 0,
      creadoEn: new Date(),
    };
    await this.prisma.codigoCorreo.upsert({ where: { correo }, create: { correo, ...datos }, update: datos });
    try {
      const { modoPrueba } = await this.envio.enviarCodigo(correo, codigo);
      // No se dice si el correo ya tiene cuenta: eso se sabe recien con el codigo.
      return { enviado: true, modoPrueba };
    } catch (e: any) {
      await this.prisma.codigoCorreo.delete({ where: { correo } }).catch(() => undefined);
      if (e instanceof HttpException) throw e;
      this.logger.error(`No se pudo enviar el correo: ${e?.message}`);
      throw new BadGatewayException('No se pudo enviar el correo. Revisa la dirección o inténtalo en unos minutos.');
    }
  }

  async verificar(dto: VerificarCodigoDto) {
    const registro = await this.prisma.codigoCorreo.findUnique({ where: { correo: dto.correo } });
    if (!registro || registro.expiraEn.getTime() < Date.now()) {
      throw new BadRequestException('El código venció o no existe. Pide uno nuevo.');
    }
    if (registro.intentos >= INTENTOS_MAXIMOS) {
      await this.prisma.codigoCorreo.delete({ where: { correo: dto.correo } });
      throw new HttpException('Demasiados intentos con este código. Pide uno nuevo.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const esperado = Buffer.from(registro.codigoHash, 'hex');
    const recibido = Buffer.from(this.huella(dto.correo, dto.codigo), 'hex');
    if (!timingSafeEqual(esperado, recibido)) {
      const intentos = registro.intentos + 1;
      await this.prisma.codigoCorreo.update({ where: { correo: dto.correo }, data: { intentos } });
      const quedan = INTENTOS_MAXIMOS - intentos;
      throw new BadRequestException(
        quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intento(s).` : 'Código incorrecto. Pide un código nuevo.',
      );
    }

    let usuario = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    if (dto.registro && usuario) {
      throw new ConflictException('Ese correo ya tiene una cuenta. Inicia sesión.');
    }
    if (usuario && (usuario.rol === Rol.OPERADOR || usuario.rol === Rol.ADMIN)) {
      // Las cuentas del G.A.M.E.A. entran solo con su contraseña.
      throw new ForbiddenException('Esta cuenta entra con su contraseña, no con código.');
    }
    if (!usuario) {
      // Cuenta nueva: primero se piden nombre y apellido (el codigo sigue valido).
      if (!dto.nombre) return { nuevo: true };
      // Genero, fecha de nacimiento, pais y ciudad: obligatorios en cuentas nuevas.
      const personales = datosPersonalesParaGuardar(dto, true);
      usuario = await this.prisma.usuario.create({
        data: {
          ...personales,
          correo: dto.correo,
          nombre: dto.nombre,
          apellidoPaterno: dto.apellidoPaterno || 'N/A',
          apellidoMaterno: dto.apellidoMaterno || null,
          proveedorAuth: ProveedorAuth.LOCAL,
          // Registro por correo: siempre Usuario Turístico (el Administrador
          // Turístico se crea solo desde "Registra tu local").
          rol: Rol.TURISTA,
        },
      });
    }
    await this.prisma.codigoCorreo.delete({ where: { correo: dto.correo } });
    // Ademas de la sesion, un permiso corto para crear una contraseña nueva.
    return { ...this.auth.sesionPara(usuario), permisoContrasena: this.auth.permisoCambiarContrasena(usuario.id) };
  }
}
