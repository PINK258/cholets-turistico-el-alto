import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  correo: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  // Se comprueba que la cuenta siga existiendo: si el Operador G.A.M.E.A. la
  // elimino (cuenta falsa o spam), su token deja de servir al instante.
  async validate(payload: JwtPayload & { proposito?: string }) {
    // Un permiso de uso especial (ej. cambiar la contraseña) no es una sesion.
    if (payload.proposito) throw new UnauthorizedException('Token no válido para iniciar sesión.');
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      // nombre y apellido: para anotar en la bitacora quien hizo cada accion.
      select: { id: true, correo: true, rol: true, nombre: true, apellidoPaterno: true },
    });
    if (!usuario) throw new UnauthorizedException('Tu cuenta ya no existe.');
    return usuario;
  }
}
