import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  HttpStatus,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CAMPO_FOTO_PERFIL, configuracionMulterFotos } from '../common/multer.config';
import { LimpiarArchivosSiFallaInterceptor } from '../common/limpiar-archivos.interceptor';
import { CaptchaService } from '../captcha/captcha.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EnviarCodigoDto, VerificarCodigoDto } from './dto/codigo-correo.dto';
import { CodigoCorreoService } from './codigo-correo.service';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { ActualizarPerfilDto } from './dto/datos-personales.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private captcha: CaptchaService,
    private codigoCorreo: CodigoCorreoService,
  ) {}

  // ---- "Continuar con correo": codigo de 6 digitos enviado al correo ----
  @Post('correo/enviar')
  @HttpCode(HttpStatus.OK)
  enviarCodigo(@Body() dto: EnviarCodigoDto) {
    return this.codigoCorreo.enviar(dto.correo, dto.registro);
  }

  // Devuelve la sesion; o { nuevo: true } si el correo no tiene cuenta y
  // falta el nombre (se vuelve a llamar con el mismo codigo y el nombre).
  @Post('correo/verificar')
  @HttpCode(HttpStatus.OK)
  verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.codigoCorreo.verificar(dto);
  }

  // Crear o cambiar la contraseña con el permiso que da el codigo del correo.
  @Post('contrasena/restablecer')
  @HttpCode(HttpStatus.OK)
  restablecerContrasena(@Body() dto: RestablecerContrasenaDto) {
    return this.authService.restablecerContrasena(dto.permiso, dto.password);
  }

  @Post('registro')
  registrar(@Body() dto: RegisterDto) {
    this.captcha.verificar(dto.captchaId, dto.captchaRespuesta);
    return this.authService.registrar(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  perfil(@Req() req: any) {
    return this.authService.perfil(req.user.id);
  }

  // Completar o cambiar genero, fecha de nacimiento, procedencia y telefono.
  @Patch('perfil')
  @UseGuards(JwtAuthGuard)
  actualizarPerfil(@Req() req: any, @Body() dto: ActualizarPerfilDto) {
    return this.authService.actualizarPerfil(req.user.id, dto);
  }

  // Foto de perfil del dueño (multipart, campo "fotoPerfil").
  @Post('perfil/foto')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: CAMPO_FOTO_PERFIL, maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  cambiarFotoPerfil(@Req() req: any, @UploadedFiles() archivos: { fotoPerfil?: Express.Multer.File[] }) {
    const archivo = archivos?.fotoPerfil?.[0];
    if (!archivo) throw new BadRequestException('Elige una imagen para tu foto de perfil.');
    return this.authService.cambiarFotoPerfil(req.user.id, `/uploads/perfiles/${archivo.filename}`);
  }
}
