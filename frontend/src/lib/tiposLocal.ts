// Opciones de "Tipo de local". Deben coincidir con backend/src/locales/tipos-local.ts.
export const TIPOS_LOCAL = [
  'Cholet',
  'Salón de eventos',
  'Restaurante / Comida típica',
  'Hotel / Alojamiento',
  'Discoteca o karaoke',
];

export function textoTiposLocal(tipos: string[] | undefined, delGamea = false) {
  if (tipos && tipos.length > 0) return tipos.join(' · ');
  // Los edificios que sube el Operador G.A.M.E.A. no llevan tipo de local.
  return delGamea ? 'Edificio municipal (G.A.M.E.A.)' : 'Tipo de local no especificado';
}
