// Secciones de un local que el Operador G.A.M.E.A. puede pedir corregir.
export const SECCIONES_CORRECCION = ['informacion', 'categorias', 'fotos', 'licencia'] as const;
export type SeccionCorreccion = (typeof SECCIONES_CORRECCION)[number];

export const NOMBRE_SECCION: Record<SeccionCorreccion, string> = {
  informacion: 'Información (tipo, descripción y horario)',
  categorias: 'Categorías de eventos',
  fotos: 'Fotos',
  licencia: 'Licencia de funcionamiento',
};
