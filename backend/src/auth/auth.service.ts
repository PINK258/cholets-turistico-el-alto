import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ProveedorAuth, Rol } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActualizarPerfilDto, datosPersonalesParaGuardar } from './dto/datos-personales.dto';
import { borrarArchivoSubido } from '../common/archivos';

// Las contraseñas NUNCA se guardan: se guarda su hash bcrypt (funcion de un
// solo sentido, con "sal" aleatoria por usuario). Costo 12 = 2^12 rondas, unas
// 4 veces mas lento de atacar por fuerza bruta que el 10 de antes; los hashes
// viejos se actualizan solos cuando la persona vuelve a iniciar sesion.
const COSTO_BCRYPT = 12;

// Para un correo que no existe tambien se ejecuta bcrypt contra este hash: asi
// la respuesta tarda lo mismo y no se puede adivinar que correos estan registrados.
const HASH_FICTICIO = bcrypt.hashSync('contrasena-que-no-coincide-con-nada', COSTO_BCRYPT);

// Bloqueo ante intentos repetidos: 5 fallos seguidos bloquean ese correo 15 min.
const FALLOS_MAXIMOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  // En memoria: el backend corre en un solo proceso (con varios, usar Redis).
  private intentosFallidos = new Map<string, { fallos: number; bloqueadoHasta: number }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private firmarToken(usuario: { id: string; correo: string; rol: Rol }) {
    return this.jwt.sign({ sub: usuario.id, correo: usuario.correo, rol: usuario.rol });
  }

  // Respuesta de "sesion iniciada" (la usa tambien "Continuar con correo").
  sesionPara(usuario: { id: string; correo: string; rol: Rol }) {
    return { usuario: this.aSalida(usuario), accessToken: this.firmarToken(usuario) };
  }

  // Nunca se devuelve el hash: solo si la cuenta tiene contraseña o no.
  private aSalida(usuario: any) {
    const { passwordHash, ...resto } = usuario;
    return { ...resto, tieneContrasena: !!passwordHash };
  }

  // Permiso de 10 minutos para crear/cambiar la contraseña, que se entrega solo
  // despues de verificar el codigo enviado al correo (demuestra que es el dueño).
  permisoCambiarContrasena(usuarioId: string) {
    return this.jwt.sign({ sub: usuarioId, proposito: 'cambiar-contrasena' }, { expiresIn: '10m' });
  }

  // Crea o cambia la contraseña con ese permiso (sirve para "olvidé mi contraseña").
  async restablecerContrasena(permiso: string, password: string) {
    let datos: { sub?: string; proposito?: string };
    try {
      datos = this.jwt.verify(permiso);
    } catch {
      throw new UnauthorizedException('El permiso venció. Vuelve a pedir un código a tu correo.');
    }
    if (datos.proposito !== 'cambiar-contrasena' || !datos.sub) {
      throw new UnauthorizedException('Permiso no válido.');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: datos.sub } });
    if (!usuario) throw new UnauthorizedException('Tu cuenta ya no existe.');
    const actualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash: await bcrypt.hash(password, COSTO_BCRYPT) },
    });
    // Con contraseña nueva, se olvidan los intentos fallidos anteriores.
    this.intentosFallidos.delete(usuario.correo);
    return this.sesionPara(actualizado);
  }

  async registrar(dto: RegisterDto) {
    const existente = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    if (existente) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    const passwordHash = await bcrypt.hash(dto.password, COSTO_BCRYPT);
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        correo: dto.correo,
        passwordHash,
        ci: dto.ci,
        telefono: dto.telefono,
        rol: Rol.TURISTA,
        proveedorAuth: ProveedorAuth.LOCAL,
      },
    });

    return {
      usuario: this.aSalida(usuario),
      accessToken: this.firmarToken(usuario),
    };
  }

  async login(dto: LoginDto) {
    const registro = this.intentosFallidos.get(dto.correo);
    if (registro && registro.bloqueadoHasta > Date.now()) {
      const minutos = Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
      throw new HttpException(
        `Demasiados intentos fallidos. Por seguridad, espera ${minutos} minuto(s) e inténtalo otra vez.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    // Siempre se compara (aunque el correo no exista) para tardar lo mismo.
    const claveValida = await bcrypt.compare(dto.password, usuario?.passwordHash ?? HASH_FICTICIO);
    if (!usuario || !usuario.passwordHash || !claveValida) {
      this.registrarFallo(dto.correo);
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    this.intentosFallidos.delete(dto.correo);

    // Hash con costo viejo: se rehace con el costo actual (la persona no nota nada).
    if (bcrypt.getRounds(usuario.passwordHash) < COSTO_BCRYPT) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash: await bcrypt.hash(dto.password, COSTO_BCRYPT) },
      });
    }

    return {
      usuario: this.aSalida(usuario),
      accessToken: this.firmarToken(usuario),
    };
  }

  private registrarFallo(correo: string) {
    const actual = this.intentosFallidos.get(correo);
    const fallos = (actual?.fallos ?? 0) + 1;
    this.intentosFallidos.set(correo, {
      fallos: fallos >= FALLOS_MAXIMOS ? 0 : fallos,
      bloqueadoHasta: fallos >= FALLOS_MAXIMOS ? Date.now() + BLOQUEO_MS : 0,
    });
    // Tope de memoria: se descartan los registros mas viejos.
    if (this.intentosFallidos.size > 10000) {
      this.intentosFallidos.delete(this.intentosFallidos.keys().next().value as string);
    }
  }

  async perfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException();
    return this.aSalida(usuario);
  }

  // La persona completa o cambia sus datos personales (genero, fecha de
  // nacimiento, procedencia, telefono) desde "Mi perfil".
  async actualizarPerfil(usuarioId: string, dto: ActualizarPerfilDto) {
    const actualizado = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...datosPersonalesParaGuardar(dto, false),
        ...(dto.telefono !== undefined && { telefono: dto.telefono || null }),
      },
    });
    return this.aSalida(actualizado);
  }

  async cambiarFotoPerfil(usuarioId: string, urlFoto: string) {
    const anterior = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { avatarUrl: true },
    });
    if (!anterior) throw new UnauthorizedException();
    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { avatarUrl: urlFoto },
    });
    await borrarArchivoSubido(anterior.avatarUrl);
    return this.aSalida(usuario);
  }
}
