// Deben coincidir con backend/src/locales/horario.ts.
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const HORA_APERTURA_DEFECTO = '18:00';
export const HORA_CIERRE_DEFECTO = '00:00';

export function ordenarDias(dias: string[]) {
  return DIAS_SEMANA.filter((d) => dias.includes(d));
}

function textoDias(dias: string[]) {
  const indices = ordenarDias(dias).map((d) => DIAS_SEMANA.indexOf(d));
  if (indices.length === 0) return '';
  const nombres = indices.map((i) => DIAS_SEMANA[i]);
  const seguidos = indices.every((i, k) => k === 0 || i === indices[k - 1] + 1);
  if (seguidos && indices.length >= 3) {
    return `${nombres[0]} a ${nombres[nombres.length - 1].toLowerCase()}`;
  }
  const minus = nombres.map((n, k) => (k === 0 ? n : n.toLowerCase()));
  return minus.length === 1 ? minus[0] : `${minus.slice(0, -1).join(', ')} y ${minus[minus.length - 1]}`;
}

// Misma salida que guarda el backend, para mostrar la vista previa en el formulario.
export function componerHorario(dias: string[], apertura?: string | null, cierre?: string | null) {
  const parteDias = textoDias(dias);
  const parteHoras = apertura && cierre ? `de ${apertura} a ${cierre}` : '';
  if (parteDias && parteHoras) return `${parteDias}, ${parteHoras}`;
  return parteDias || parteHoras || '';
}
