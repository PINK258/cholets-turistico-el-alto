import { nombreServicio } from './consultas';

// Ficha de un local tal como la lee el modelo. La usan chatbot.service.ts (con
// los locales de la BD) y scripts/generar-dataset.ts (ejemplos del fine-tuning),
// para que el modelo afinado vea exactamente el mismo formato.

// Solo los campos que usa la ficha: un Local de Prisma con sus relaciones cumple
// este tipo, y el generador del dataset puede armar locales de ejemplo.
export type LocalParaFicha = {
  nombre: string;
  tiposLocal: string[];
  categorias: { categoria: { nombre: string } }[];
  zona: { distritoNumero: number; nombreZonaPrincipal: string };
  direccion: string;
  horarioFuncionamiento: string | null;
  anfitrion: { nombre: string; apellidoPaterno: string; apellidoMaterno: string | null; rol: string };
  resenas: { calificacion: number }[];
  aforo: number | null;
  servicios: string[];
  whatsapp: string | null;
  reglas: string | null;
  descripcion: string;
  historia: string | null;
  eventos: { titulo: string; descripcion: string; fechaInicio: Date; fechaFin: Date | null }[];
};

// Descripcion en una sola linea y corta: algunas tenian saltos de linea y
// texto suelto que el modelo copiaba entero.
export const resumen = (texto: string, max = 100) => {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > max ? `${limpio.slice(0, max)}…` : limpio;
};

// "4.5 de 5 estrellas (3 reseñas)" o "sin reseñas todavia".
export function textoCalificacion(resenas: { calificacion: number }[]) {
  if (resenas.length === 0) return 'sin reseñas todavia';
  const promedio = resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length;
  return `${(Math.round(promedio * 10) / 10).toString()} de 5 estrellas (${resenas.length} reseña${resenas.length > 1 ? 's' : ''})`;
}

export function formatearFecha(fecha: Date) {
  return fecha.toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function describirLocal(local: LocalParaFicha, ahora: Date) {
  const duenio = [local.anfitrion.nombre, local.anfitrion.apellidoPaterno, local.anfitrion.apellidoMaterno]
    .filter(Boolean)
    .join(' ');

  // Solo los eventos que aun no terminaron: con los pasados el modelo los
  // ofrecia como si fueran proximos.
  const vigentes = local.eventos.filter((e) =>
    e.fechaFin && e.fechaFin > e.fechaInicio ? e.fechaFin >= ahora : e.fechaInicio.getTime() >= ahora.getTime() - 12 * 3600000,
  );
  const eventos =
    vigentes.length === 0
      ? '  (sin eventos proximos)'
      : vigentes
          .map((e) => {
            const estado = e.fechaInicio >= ahora ? 'proximo' : 'pasado';
            const fin = e.fechaFin ? ` a ${formatearFecha(e.fechaFin)}` : '';
            return `  * ${e.titulo} (${estado}), ${formatearFecha(e.fechaInicio)}${fin}: ${e.descripcion}`;
          })
          .join('\n');

  return [
    `LOCAL: ${local.nombre}`,
    `- Tipo de local: ${local.tiposLocal.length > 0 ? local.tiposLocal.join(', ') : 'no especificado'}`,
    `- Tipos de eventos que realiza: ${
      local.categorias.length > 0 ? local.categorias.map((c) => c.categoria.nombre).join(', ') : 'no especificados'
    }`,
    `- Zona: Distrito ${local.zona.distritoNumero}, ${local.zona.nombreZonaPrincipal}`,
    `- Direccion: ${local.direccion}`,
    `- Horario: ${local.horarioFuncionamiento || 'no especificado'}`,
    local.anfitrion.rol === 'OPERADOR' || local.anfitrion.rol === 'ADMIN'
      ? '- Publicado por: el G.A.M.E.A. (Gobierno Autonomo Municipal de El Alto)'
      : `- Dueño (anfitrion): ${duenio}`,
    `- Calificacion de los visitantes: ${textoCalificacion(local.resenas)}`,
    `- Capacidad: ${local.aforo ? `${local.aforo} personas` : 'no indicada'}`,
    `- Servicios: ${local.servicios.length > 0 ? local.servicios.map(nombreServicio).join(', ') : 'no indicados'}`,
    ...(local.whatsapp ? [`- WhatsApp del dueño para consultas: ${local.whatsapp}`] : []),
    ...(local.reglas ? [`- Reglas del local: ${resumen(local.reglas, 300)}`] : []),
    `- Descripcion: ${local.descripcion}`,
    ...(local.historia ? [`- Historia del cholet (contada por su dueño): ${resumen(local.historia, 600)}`] : []),
    `- Eventos:\n${eventos}`,
  ].join('\n');
}
