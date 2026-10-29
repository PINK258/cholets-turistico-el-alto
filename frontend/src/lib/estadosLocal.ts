import { EstadoVerificacion } from '@/lib/types';

// Secciones que el Operador G.A.M.E.A. puede pedir corregir (igual que el
// backend, src/locales/secciones.ts).
export const SECCIONES_CORRECCION = [
  { id: 'informacion', nombre: 'Información', detalle: 'tipo, descripción y horario', icono: '📝' },
  { id: 'categorias', nombre: 'Categorías', detalle: 'eventos que realiza', icono: '🏷️' },
  { id: 'fotos', nombre: 'Fotos', detalle: 'fotos del local', icono: '📷' },
  { id: 'licencia', nombre: 'Licencia', detalle: 'licencia de funcionamiento', icono: '📄' },
] as const;
export type SeccionCorreccion = (typeof SECCIONES_CORRECCION)[number]['id'];

export const nombreSeccion = (id: string) => SECCIONES_CORRECCION.find((s) => s.id === id)?.nombre ?? id;

// Como se le muestra el estado al dueño.
export const ESTADO_LOCAL: Record<EstadoVerificacion, { texto: string; clase: string }> = {
  PENDIENTE: { texto: '⏳ En revisión', clase: 'bg-yellow-100 text-yellow-800' },
  APROBADO: { texto: '✔ Aprobado', clase: 'bg-green-100 text-green-800' },
  RECHAZADO: { texto: '✕ Rechazado', clase: 'bg-red-100 text-red-800' },
  CORRECCION: { texto: '✏️ Corregir', clase: 'bg-orange-100 text-orange-800' },
};
