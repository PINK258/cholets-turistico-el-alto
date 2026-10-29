import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { LocalesService } from './locales.service';
import { CreateLocalDto } from './dto/create-local.dto';
import { ActualizarLocalDto } from './dto/actualizar-local.dto';
import { CreateEventoDto } from './dto/create-evento.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CAMPO_FOTO_PERFIL, configuracionMulter360, configuracionMulterFotos } from '../common/multer.config';
import { LimpiarArchivosSiFallaInterceptor } from '../common/limpiar-archivos.interceptor';
import { CaptchaService } from '../captcha/captcha.service';

@Controller('locales')
export class LocalesController {
  constructor(
    private locales: LocalesService,
    private captcha: CaptchaService,
  ) {}

  @Get()
  listarPublicos(@Query('zonaId') zonaId?: string) {
    return this.locales.listarPublicos(zonaId);
  }

  @Get('mios')
  @UseGuards(JwtAuthGuard)
  misLocales(@Req() req: any) {
    return this.locales.misLocales(req.user.id);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.locales.obtenerDetalle(id);
  }

  // Requisito 4: boton "Registra tu local". multipart/form-data con campos del
  // DTO + archivos "fotos" (varias) y "documentoFuncionamiento" (opcional, 1).
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fotos', maxCount: 10 },
        { name: 'documentoFuncionamiento', maxCount: 1 },
        { name: CAMPO_FOTO_PERFIL, maxCount: 1 },
      ],
      configuracionMulterFotos,
    ),
    LimpiarArchivosSiFallaInterceptor,
  )
  // async: si el codigo es incorrecto, el error llega al interceptor como
  // promesa rechazada y este borra las fotos que ya se subieron.
  async registrar(
    @Req() req: any,
    @Body() dto: CreateLocalDto,
    @UploadedFiles()
    archivos: {
      fotos?: Express.Multer.File[];
      documentoFuncionamiento?: Express.Multer.File[];
      fotoPerfil?: Express.Multer.File[];
    },
  ) {
    this.captcha.verificar(dto.captchaId, dto.captchaRespuesta);
    const urlsFotos = (archivos.fotos || []).map((f) => `/uploads/locales/${f.filename}`);
    const urlDocumento = archivos.documentoFuncionamiento?.[0]
      ? `/uploads/locales/${archivos.documentoFuncionamiento[0].filename}`
      : undefined;
    const urlFotoPerfil = archivos.fotoPerfil?.[0]
      ? `/uploads/perfiles/${archivos.fotoPerfil[0].filename}`
      : undefined;
    return this.locales.registrar(req.user.id, dto, urlsFotos, urlDocumento, urlFotoPerfil);
  }

  // Requisito 6: panel del anfitrion.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  actualizar(@Req() req: any, @Param('id') id: string, @Body() dto: ActualizarLocalDto) {
    return this.locales.actualizar(id, req.user.id, req.user.rol, dto);
  }

  @Post(':id/fotos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'fotos', maxCount: 10 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  agregarFotos(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() archivos: { fotos?: Express.Multer.File[] },
  ) {
    const urls = (archivos.fotos || []).map((f) => `/uploads/locales/${f.filename}`);
    return this.locales.agregarFotos(id, req.user.id, req.user.rol, urls);
  }

  // "Paseo por el edificio": foto panoramica 360 (imagen, campo "foto360").
  @Post(':id/foto360')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'foto360', maxCount: 1 }], configuracionMulter360), LimpiarArchivosSiFallaInterceptor)
  async subirFoto360(@Req() req: any, @Param('id') id: string, @UploadedFiles() archivos: { foto360?: Express.Multer.File[] }) {
    const archivo = archivos?.foto360?.[0];
    if (!archivo) throw new BadRequestException('Elige la foto panorámica 360°.');
    return this.locales.cambiarFoto360(id, req.user.id, req.user.rol, `/uploads/locales/${archivo.filename}`);
  }

  @Delete(':id/foto360')
  @UseGuards(JwtAuthGuard)
  quitarFoto360(@Req() req: any, @Param('id') id: string) {
    return this.locales.cambiarFoto360(id, req.user.id, req.user.rol, null);
  }

  // El dueño termino las correcciones pedidas por el operador.
  @Post(':id/reenviar')
  @UseGuards(JwtAuthGuard)
  reenviar(@Req() req: any, @Param('id') id: string) {
    return this.locales.reenviarARevision(id, req.user.id, req.user.rol);
  }

  // Licencia de funcionamiento (imagen o PDF, campo "documentoFuncionamiento").
  @Post(':id/documento')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'documentoFuncionamiento', maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  async subirDocumento(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() archivos: { documentoFuncionamiento?: Express.Multer.File[] },
  ) {
    const archivo = archivos?.documentoFuncionamiento?.[0];
    if (!archivo) throw new BadRequestException('Elige la imagen o el PDF de la licencia de funcionamiento.');
    return this.locales.subirDocumento(id, req.user.id, req.user.rol, `/uploads/locales/${archivo.filename}`);
  }

  @Delete(':id/fotos/:fotoId')
  @UseGuards(JwtAuthGuard)
  eliminarFoto(@Req() req: any, @Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.locales.eliminarFoto(id, fotoId, req.user.id, req.user.rol);
  }

  // Imagen horizontal del evento para el carrusel de la portada (campo "banner").
  @Post(':id/eventos/:eventoId/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'banner', maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  async subirBanner(
    @Req() req: any,
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
    @UploadedFiles() archivos: { banner?: Express.Multer.File[] },
  ) {
    const archivo = archivos?.banner?.[0];
    if (!archivo) throw new BadRequestException('Elige la imagen horizontal.');
    return this.locales.subirAfiche(id, eventoId, req.user.id, req.user.rol, `/uploads/locales/${archivo.filename}`, 'banner');
  }

  // Afiche del evento (imagen vertical jpg/png/webp, campo "afiche").
  @Post(':id/eventos/:eventoId/afiche')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'afiche', maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  async subirAfiche(
    @Req() req: any,
    @Param('id') id: string,
    @Param('eventoId') eventoId: string,
    @UploadedFiles() archivos: { afiche?: Express.Multer.File[] },
  ) {
    const archivo = archivos?.afiche?.[0];
    if (!archivo) throw new BadRequestException('Elige la imagen del afiche.');
    return this.locales.subirAfiche(id, eventoId, req.user.id, req.user.rol, `/uploads/locales/${archivo.filename}`);
  }

  @Delete(':id/eventos/:eventoId')
  @UseGuards(JwtAuthGuard)
  eliminarEvento(@Req() req: any, @Param('id') id: string, @Param('eventoId') eventoId: string) {
    return this.locales.eliminarEvento(id, eventoId, req.user.id, req.user.rol);
  }

  @Post(':id/eventos')
  @UseGuards(JwtAuthGuard)
  crearEvento(@Req() req: any, @Param('id') id: string, @Body() dto: CreateEventoDto) {
    return this.locales.crearEvento(id, req.user.id, req.user.rol, dto);
  }
}
