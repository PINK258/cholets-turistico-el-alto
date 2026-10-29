import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { configuracionMulterFotos } from '../common/multer.config';
import { LimpiarArchivosSiFallaInterceptor } from '../common/limpiar-archivos.interceptor';
import { ActualizarEventoOperadorDto, CrearEventoOperadorDto } from './dto/evento-operador.dto';
import { DatosEdificioDto } from '../locales/dto/create-local.dto';
import { LocalesService } from '../locales/locales.service';
import { Rol } from '@prisma/client';
import { OperadorService } from './operador.service';
import { ReportesService } from './reportes.service';
import { VerificarLocalDto } from './dto/verificar-local.dto';
import { VerificarDatosDto } from './dto/verificar-datos.dto';
import { PedirCorreccionDto } from './dto/pedir-correccion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('operador')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.OPERADOR, Rol.ADMIN)
export class OperadorController {
  constructor(
    private operadorService: OperadorService,
    private reportes: ReportesService,
    private locales: LocalesService,
  ) {}

  // ---- "Subir edificio": locales propios del Operador G.A.M.E.A. ----
  @Get('edificios')
  misEdificios(@Req() req: any) {
    return this.locales.misLocales(req.user.id);
  }

  @Post('edificios')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fotos', maxCount: 10 }], configuracionMulterFotos), LimpiarArchivosSiFallaInterceptor)
  async crearEdificio(
    @Req() req: any,
    @Body() dto: DatosEdificioDto,
    @UploadedFiles() archivos: { fotos?: Express.Multer.File[] },
  ) {
    const urls = (archivos?.fotos ?? []).map((f) => `/uploads/locales/${f.filename}`);
    return this.locales.crearEdificio(req.user.id, dto, urls);
  }

  @Put('edificios/:id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'fotos', maxCount: 10 }], configuracionMulterFotos), LimpiarArchivosSiFallaInterceptor)
  async actualizarEdificio(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: DatosEdificioDto,
    @UploadedFiles() archivos: { fotos?: Express.Multer.File[] },
  ) {
    const urls = (archivos?.fotos ?? []).map((f) => `/uploads/locales/${f.filename}`);
    return this.locales.actualizarEdificio(id, req.user.id, dto, urls);
  }

  @Delete('edificios/:id')
  eliminarEdificio(@Req() req: any, @Param('id') id: string) {
    return this.locales.eliminarEdificio(id, req.user.id);
  }

  @Get('locales/pendientes')
  localesPendientes() {
    return this.operadorService.localesPendientes();
  }

  @Get('usuarios')
  usuariosRegistrados() {
    return this.operadorService.usuariosRegistrados();
  }

  // Eventos de la cartelera: crear, editar (cuantas veces se quiera) y borrar.
  // Imagenes (jpg/png/webp): "afiche" vertical para la cartelera y "banner"
  // horizontal (opcional) para el carrusel de la portada.
  @Get('eventos')
  listarEventos() {
    return this.operadorService.listarEventos();
  }

  @Post('eventos')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'afiche', maxCount: 1 }, { name: 'banner', maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  async crearEvento(
    @Req() req: any,
    @Body() dto: CrearEventoOperadorDto,
    @UploadedFiles() archivos: { afiche?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const foto = archivos?.afiche?.[0];
    const banner = archivos?.banner?.[0];
    return this.operadorService.crearEvento(
      dto,
      req.user.id,
      foto ? `/uploads/locales/${foto.filename}` : undefined,
      banner ? `/uploads/locales/${banner.filename}` : undefined,
    );
  }

  @Patch('eventos/:id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'afiche', maxCount: 1 }, { name: 'banner', maxCount: 1 }], configuracionMulterFotos),
    LimpiarArchivosSiFallaInterceptor,
  )
  async actualizarEvento(
    @Param('id') id: string,
    @Body() dto: ActualizarEventoOperadorDto,
    @UploadedFiles() archivos: { afiche?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const foto = archivos?.afiche?.[0];
    const banner = archivos?.banner?.[0];
    return this.operadorService.actualizarEvento(
      id,
      dto,
      foto ? `/uploads/locales/${foto.filename}` : undefined,
      banner ? `/uploads/locales/${banner.filename}` : undefined,
    );
  }

  @Delete('eventos/:id')
  eliminarEvento(@Param('id') id: string) {
    return this.operadorService.eliminarEvento(id);
  }

  // ---- Reportes (con cruces) y auditoria ----
  // Fechas "AAAA-MM-DD"; por defecto, los ultimos 12 meses.
  @Get('reportes')
  reporteGeneral(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.reportes.general(this.reportes.periodo(desde, hasta));
  }

  // Busqueda avanzada: listas separadas por comas (ej. distritos=1,3&estados=APROBADO).
  @Get('locales/busqueda')
  buscarLocales(@Query() q: Record<string, string | undefined>) {
    const lista = (v?: string) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
    const fecha = (v?: string, fin = false) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${fin ? '23:59:59.999' : '00:00:00'}`) : undefined);
    return this.reportes.buscarLocales({
      texto: q.texto?.trim() || undefined,
      distritos: lista(q.distritos).map(Number).filter((n) => Number.isInteger(n) && n > 0),
      estados: lista(q.estados).filter((e) => ['APROBADO', 'PENDIENTE', 'CORRECCION', 'RECHAZADO'].includes(e)),
      tipos: lista(q.tipos),
      categorias: lista(q.categorias).filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      servicios: lista(q.servicios),
      aforoMin: Number(q.aforoMin) > 0 ? Number(q.aforoMin) : undefined,
      licencia: q.licencia === 'si' || q.licencia === 'no' ? q.licencia : undefined,
      desde: fecha(q.desde),
      hasta: fecha(q.hasta, true),
      orden: q.orden === 'antiguo' || q.orden === 'nombre' ? q.orden : 'reciente',
      pagina: Number(q.pagina) || 1,
    });
  }

  @Get('bitacora')
  bitacora(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina?: string,
    @Query('modulo') modulo?: string,
    @Query('texto') texto?: string,
    @Query('fallidos') fallidos?: string,
  ) {
    return this.reportes.bitacora({
      ...this.reportes.periodo(desde, hasta),
      pagina: Number(pagina) || 1,
      modulo: modulo || undefined,
      texto: texto?.trim() || undefined,
      soloFallidos: fallidos === 'true',
    });
  }

  @Get('auditoria-bd')
  auditoriaBd(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('pagina') pagina?: string,
    @Query('tabla') tabla?: string,
    @Query('operacion') operacion?: string,
  ) {
    return this.reportes.auditoriaBd({
      ...this.reportes.periodo(desde, hasta),
      pagina: Number(pagina) || 1,
      tabla: tabla || undefined,
      operacion: operacion && ['INSERT', 'UPDATE', 'DELETE'].includes(operacion) ? operacion : undefined,
    });
  }

  @Get('locales/mapa')
  localesParaMapa() {
    return this.operadorService.localesParaMapa();
  }

  @Delete('usuarios/:id')
  eliminarUsuario(@Param('id') id: string) {
    return this.operadorService.eliminarUsuario(id);
  }

  @Post('usuarios/:id/verificacion')
  verificarDatosDuenio(@Req() req: any, @Param('id') id: string, @Body() dto: VerificarDatosDto) {
    return this.operadorService.verificarDatosDuenio(id, req.user.id, dto);
  }

  @Post('locales/:id/correccion')
  pedirCorreccion(@Req() req: any, @Param('id') id: string, @Body() dto: PedirCorreccionDto) {
    return this.operadorService.pedirCorreccion(id, req.user.id, dto);
  }

  @Post('locales/:id/verificar')
  verificarLocal(@Req() req: any, @Param('id') id: string, @Body() dto: VerificarLocalDto) {
    return this.operadorService.verificarLocal(id, req.user.id, dto);
  }
}
