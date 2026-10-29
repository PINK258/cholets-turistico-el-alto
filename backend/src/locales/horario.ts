// Dias de la semana en orden. Deben coincidir con frontend/src/lib/horario.ts.
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function ordenarDias(dias: string[]) {
  return DIAS_SEMANA.filter((d) => dias.includes(d));
}

// "Lunes a domingo", "Viernes a domingo", "Lunes, miércoles y viernes".
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

// Texto que se guarda en horario_funcionamiento y que leen la pagina y el chatbot.
// Al ser explicito ("Lunes a domingo, de 18:00 a 00:00") el modelo ya no inventa dias.
export function componerHorario(dias: string[], apertura?: string | null, cierre?: string | null) {
  const parteDias = textoDias(dias);
  const parteHoras = apertura && cierre ? `de ${apertura} a ${cierre}` : '';
  if (parteDias && parteHoras) return `${parteDias}, ${parteHoras}`;
  return parteDias || parteHoras || null;
}
