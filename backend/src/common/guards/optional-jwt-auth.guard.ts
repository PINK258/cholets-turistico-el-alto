import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Igual que JwtAuthGuard pero nunca lanza 401: si no hay token (o es invalido)
// simplemente req.user queda undefined. Usado en el chatbot, que es publico
// pero se enriquece si el visitante tiene sesion iniciada.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || undefined;
  }
}
