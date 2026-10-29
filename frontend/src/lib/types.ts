export type Rol = 'TURISTA' | 'ANFITRION' | 'OPERADOR' | 'ADMIN';
// CORRECCION: el Operador G.A.M.E.A. pidio corregir algunas secciones.
export type EstadoVerificacion = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CORRECCION';

export interface Usuario {
  // Datos para los reportes (pueden faltar en cuentas antiguas o de Google).
  genero?: string | null;
  fechaNacimiento?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  ci: string | null;
  telefono: string | null;
  rol: Rol;
  avatarUrl: string | null;
  proveedorAuth: 'LOCAL' | 'GOOGLE';
}

export interface Zona {
  id: string;
  distritoNumero: number;
  nombreZonaPrincipal: string;
  direccionSubalcaldia: string;
  responsableSubalcaldia: string;
  latitud: number | null;
  longitud: number | null;
}

export interface FotoLocal {
  id: string;
  url: string;
  esPortada: boolean;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
  aficheUrl?: string | null;
  // Imagen horizontal (opcional) para el carrusel de la portada.
  bannerUrl?: string | null;
}

export interface CategoriaEvento {
  id: string;
  grupo: string;
  nombre: string;
  descripcion: string;
  orden: number;
}

export interface Local {
  id: string;
  nombre: string;
  descripcion: string;
  // Historia del cholet contada por su dueño (opcional).
  historia?: string | null;
  tiposLocal: string[];
  direccion: string;
  latitud: number;
  longitud: number;
  estado: EstadoVerificacion;
  horarioFuncionamiento: string | null;
  diasFuncionamiento: string[];
  horaApertura: string | null;
  horaCierre: string | null;
  documentoFuncionamientoUrl: string | null;
  // Correccion pedida por el operador (solo con estado CORRECCION).
  correccionSecciones?: string[];
  correccionMensaje?: string | null;
  zona: Zona;
  fotos: FotoLocal[];
  eventos: Evento[];
  categorias: { categoria: CategoriaEvento }[];
  anfitrion: {
    id: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    avatarUrl?: string | null;
    ci?: string;
    correo?: string;
    datosVerificadosEn?: string | null;
    rol?: Rol;
    creadoEn?: string;
  };
  // Ficha completa: "Lo que este lugar ofrece", paseo 360, video, contacto y reglas.
  aforo?: number | null;
  servicios?: string[];
  foto360Url?: string | null;
  videoUrl?: string | null;
  whatsapp?: string | null;
  reglas?: string | null;
  // Promedio de estrellas (1 decimal, null sin reseñas) y cantidad de reseñas.
  calificacion?: { promedio: number | null; total: number };
}

export interface Resena {
  id: string;
  calificacion: number;
  comentario: string | null;
  // Criterios opcionales (1 a 5).
  atencion?: number | null;
  limpieza?: number | null;
  ubicacion?: number | null;
  precio?: number | null;
  ambiente?: number | null;
  creadoEn: string;
  actualizadoEn: string;
  usuario: { id: string; nombre: string; apellidoPaterno: string; avatarUrl: string | null };
}

export interface ResenasDeLocal {
  promedio: number | null;
  total: number;
  distribucion: { estrellas: number; cantidad: number }[];
  // Promedio de cada criterio (como Airbnb).
  criterios?: { criterio: string; promedio: number | null; votos: number }[];
  resenas: Resena[];
}

// Usuario tal como lo ve el operador en su panel.
export interface UsuarioRegistrado {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  ci: string | null;
  rol: Rol;
  proveedorAuth: 'LOCAL' | 'GOOGLE';
  avatarUrl: string | null;
  telefono: string | null;
  creadoEn: string;
  // Verificacion de datos hecha por un operador (solo dueños).
  datosVerificadosEn: string | null;
  // true = se confirmo con todas las licencias subidas: ya no se confirma otra vez.
  verificacionCompleta: boolean;
  notaVerificacion: string | null;
  verificadoPor: { nombre: string; apellidoPaterno: string } | null;
  _count: { resenas: number };
  genero?: string | null;
  fechaNacimiento?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  locales: LocalDeDuenio[];
}

export interface LocalDeDuenio {
  id: string;
  nombre: string;
  estado: EstadoVerificacion;
  direccion: string;
  latitud: number;
  longitud: number;
  horarioFuncionamiento: string | null;
  documentoFuncionamientoUrl: string | null;
  creadoEn: string;
  zona: { distritoNumero: number; nombreZonaPrincipal: string };
}

// Local en el mapa de distritos del operador.
export interface LocalEnMapa {
  id: string;
  nombre: string;
  estado: EstadoVerificacion;
  direccion: string;
  latitud: number;
  longitud: number;
  zona: { distritoNumero: number; nombreZonaPrincipal: string };
  anfitrion: { nombre: string; apellidoPaterno: string };
}

// Acciones que el chatbot propone sobre la pagina (ver backend chatbot/acciones.ts).
export type AccionChat =
  | { tipo: 'abrir_zona'; zonaId: string; etiqueta: string }
  | { tipo: 'abrir_local'; localId: string; etiqueta: string }
  | { tipo: 'ir'; ruta: string; etiqueta: string }
  | { tipo: 'como_llegar'; localId: string; etiqueta: string };

export interface RespuestaChatbot {
  respuesta: string;
  fuente: 'ia' | 'base_de_datos' | 'accion';
  acciones?: AccionChat[];
  navegar?: AccionChat;
  // Preguntas de seguimiento que se muestran como botones.
  sugerencias?: string[];
}

export interface MensajeChat {
  id: string;
  rol: 'user' | 'assistant';
  contenido: string;
  creadoEn: string;
}
