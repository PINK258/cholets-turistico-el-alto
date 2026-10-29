// Que se anota en la bitacora por cada ruta que cambia datos. La clave es
// "METODO /ruta" tal como la registra Nest (con los :parametros).
// Las rutas que no estan aqui (ej. mensajes del chatbot) no se anotan.
type Datos = { body: any; params: Record<string, string>; respuesta: any };

export type DefinicionAccion = {
  accion: string;
  modulo: string;
  // Parametro de la ruta con el id del registro afectado (si no, el id de la respuesta).
  idParam?: string;
  detalle?: (d: Datos) => string | undefined;
};

const texto = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

export const ACCIONES: Record<string, DefinicionAccion> = {
  // ---- Cuentas ----
  'POST /auth/login': { accion: 'Inició sesión', modulo: 'Cuentas' },
  'POST /auth/registro': { accion: 'Creó su cuenta (formulario)', modulo: 'Cuentas' },
  'POST /auth/correo/enviar': {
    accion: 'Pidió un código a su correo',
    modulo: 'Cuentas',
    detalle: ({ body }) => texto(body?.correo),
  },
  'POST /auth/correo/verificar': {
    accion: 'Verificó su correo con código',
    modulo: 'Cuentas',
    detalle: ({ respuesta }) => (respuesta?.nuevo ? 'Correo verificado (falta completar datos)' : undefined),
  },
  'POST /auth/contrasena/restablecer': { accion: 'Creó o cambió su contraseña', modulo: 'Cuentas' },
  'POST /auth/perfil/foto': { accion: 'Cambió su foto de perfil', modulo: 'Cuentas' },
  'PATCH /auth/perfil': { accion: 'Actualizó sus datos personales', modulo: 'Cuentas' },

  // ---- Locales (Administrador Turístico) ----
  'POST /locales': {
    accion: 'Registró un local (enviado a revisión)',
    modulo: 'Locales',
    detalle: ({ body }) => texto(body?.nombreLocal),
  },
  'PATCH /locales/:id': { accion: 'Editó los datos de su local', modulo: 'Locales', idParam: 'id' },
  'POST /locales/:id/fotos': { accion: 'Agregó fotos a su local', modulo: 'Locales', idParam: 'id' },
  'DELETE /locales/:id/fotos/:fotoId': { accion: 'Eliminó una foto de su local', modulo: 'Locales', idParam: 'id' },
  'POST /locales/:id/documento': { accion: 'Subió su licencia de funcionamiento', modulo: 'Locales', idParam: 'id' },
  'POST /locales/:id/reenviar': { accion: 'Reenvió su local a revisión', modulo: 'Locales', idParam: 'id' },
  'POST /locales/:id/foto360': { accion: 'Subió la foto 360° de su local', modulo: 'Locales', idParam: 'id' },
  'DELETE /locales/:id/foto360': { accion: 'Quitó la foto 360° de su local', modulo: 'Locales', idParam: 'id' },

  // ---- Denuncias ----
  'POST /locales/:id/denuncias': {
    accion: 'Denunció un local',
    modulo: 'Denuncias',
    idParam: 'id',
    detalle: ({ body }) => texto(body?.motivo),
  },
  'PATCH /operador/denuncias/:id': {
    accion: 'Atendió una denuncia',
    modulo: 'Denuncias',
    idParam: 'id',
    detalle: ({ body }) => (body?.estado === 'REVISADA' ? 'Revisada' : body?.estado === 'DESCARTADA' ? 'Descartada' : undefined),
  },

  // ---- Cartelera ----
  'POST /locales/:id/eventos': {
    accion: 'Publicó un evento en la cartelera',
    modulo: 'Cartelera',
    detalle: ({ body }) => texto(body?.titulo),
  },
  'POST /locales/:id/eventos/:eventoId/afiche': { accion: 'Subió el afiche de un evento', modulo: 'Cartelera', idParam: 'eventoId' },
  'POST /locales/:id/eventos/:eventoId/banner': { accion: 'Subió la imagen horizontal de un evento', modulo: 'Cartelera', idParam: 'eventoId' },
  'DELETE /locales/:id/eventos/:eventoId': { accion: 'Eliminó un evento de la cartelera', modulo: 'Cartelera', idParam: 'eventoId' },
  'POST /operador/eventos': {
    accion: 'Publicó un evento (G.A.M.E.A.)',
    modulo: 'Cartelera',
    detalle: ({ body }) => texto(body?.titulo),
  },
  'PATCH /operador/eventos/:id': { accion: 'Editó un evento (G.A.M.E.A.)', modulo: 'Cartelera', idParam: 'id' },
  'DELETE /operador/eventos/:id': { accion: 'Eliminó un evento (G.A.M.E.A.)', modulo: 'Cartelera', idParam: 'id' },

  // ---- Verificacion (Operador G.A.M.E.A.) ----
  'POST /operador/locales/:id/verificar': {
    accion: 'Revisó un local',
    modulo: 'Verificación',
    idParam: 'id',
    detalle: ({ body }) =>
      body?.estado === 'APROBADO' ? 'Aprobado' : body?.estado === 'RECHAZADO' ? `Rechazado. ${texto(body?.comentario) ?? ''}`.trim() : undefined,
  },
  'POST /operador/locales/:id/correccion': {
    accion: 'Pidió correcciones a un local',
    modulo: 'Verificación',
    idParam: 'id',
    detalle: ({ body }) => (Array.isArray(body?.secciones) ? `Secciones: ${body.secciones.join(', ')}` : undefined),
  },
  'POST /operador/usuarios/:id/verificacion': { accion: 'Confirmó los datos de un dueño', modulo: 'Verificación', idParam: 'id' },
  'DELETE /operador/usuarios/:id': { accion: 'Eliminó una cuenta', modulo: 'Cuentas', idParam: 'id' },

  // ---- Edificios del G.A.M.E.A. ----
  'POST /operador/edificios': {
    accion: 'Publicó un edificio municipal',
    modulo: 'Locales',
    detalle: ({ body }) => texto(body?.nombreLocal),
  },
  'PUT /operador/edificios/:id': { accion: 'Editó un edificio municipal', modulo: 'Locales', idParam: 'id' },
  'DELETE /operador/edificios/:id': { accion: 'Eliminó un edificio municipal', modulo: 'Locales', idParam: 'id' },

  // ---- Reseñas ----
  'PUT /locales/:id/resenas': {
    accion: 'Calificó un local',
    modulo: 'Reseñas',
    idParam: 'id',
    detalle: ({ body }) => (body?.calificacion ? `${body.calificacion} estrella(s)` : undefined),
  },
  'DELETE /locales/:id/resenas': { accion: 'Eliminó su reseña', modulo: 'Reseñas', idParam: 'id' },
  'DELETE /operador/resenas/:resenaId': { accion: 'Eliminó una reseña (moderación)', modulo: 'Reseñas', idParam: 'resenaId' },

  // ---- Favoritos ----
  'POST /favoritos/:localId': { accion: 'Guardó un local en favoritos', modulo: 'Favoritos', idParam: 'localId' },
  'DELETE /favoritos/:localId': { accion: 'Quitó un local de favoritos', modulo: 'Favoritos', idParam: 'localId' },
};
