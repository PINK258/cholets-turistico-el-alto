import { Controller, Get, Header } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
  constructor(private captcha: CaptchaService) {}

  // Cada llamada da un codigo nuevo: nunca se debe guardar en cache.
  @Get()
  @Header('Cache-Control', 'no-store')
  nuevo() {
    return this.captcha.generar();
  }
}
