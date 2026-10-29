// Tipos y textos de los reportes del Operador G.A.M.E.A. (GET /operador/reportes).
import type { Cruce } from '@/components/operador/Graficos';

export type Conteo = Record<string, string | number | null>;

export interface ReporteGeneral {
  periodo: { desde: string; hasta: string };
  generadoEn: string;
  resumen: {
    turistas: number;
    anfitriones: number;
    localesAprobados: number;
    localesEnRevision: number;
    localesRechazados: number;
    eventos: number;
    resenas: number;
    favoritos: number;
    movimientos: number;
    consultasChatbot: number;
  };
  usuarios: {
    genero: { genero: string; total: number }[];
    edad: { rango: string; total: number }[];
    registrosMes: { mes: string; rol: string; total: number }[];
    paises: { pais: string; total: number }[];
    ciudades: { ciudad: string; total: number }[];
  };
  locales: {
    estado: { estado: string; total: number }[];
    categorias: { grupo: string; categoria: string; total: number }[];
    calificacionDistrito: { distrito: string; promedio: number; resenas: number }[];
    favoritosTop: { local: string; total: number }[];
  };
  movimientos: {
    porDia: { dia: string; total: number; fallidos: number }[];
    usuariosActivos: { usuario: string; rol: string | null; total: number }[];
    accionesFrecuentes: { accion: string; modulo: string; total: number }[];
  };
  cruces: {
    generoEdad: Cruce;
    distritoTipo: Cruce;
    eventosMesCategoria: Cruce;
    movimientosModuloMes: Cruce;
  };
}

export const NOMBRE_GENERO: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro',
  PREFIERO_NO_DECIR: 'Prefiere no decir',
  SIN_DATO: 'Sin dato',
};

export const NOMBRE_ESTADO: Record<string, string> = {
  APROBADO: 'Aprobados',
  PENDIENTE: 'En revisión',
  CORRECCION: 'En corrección',
  RECHAZADO: 'Rechazados',
};

export const NOMBRE_ROL: Record<string, string> = {
  TURISTA: 'Usuario Turístico',
  ANFITRION: 'Administrador Turístico',
  OPERADOR: 'Operador G.A.M.E.A.',
  ADMIN: 'Administrador',
};

export const RANGOS_EDAD = ['Menor de 18', '18 a 25', '26 a 35', '36 a 45', '46 a 60', 'Mayor de 60', 'Sin dato'];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
// "2026-10" -> "oct 2026"
export const nombreMes = (s: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : s;
};
export const traducir = (s: string) => NOMBRE_GENERO[s] ?? nombreMes(s);
