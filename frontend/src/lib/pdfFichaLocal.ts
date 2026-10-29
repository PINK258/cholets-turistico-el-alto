// PDF de la busqueda avanzada del Operador G.A.M.E.A.:
//  - "Ver ficha": ficha tecnica completa de un local.
//  - Lista de resultados de la busqueda.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { encabezado, MORADO, pieDePagina } from '@/lib/pdfOperador';
import { servicio } from '@/lib/servicios';
import type { Local } from '@/lib/types';

export type FilaBusqueda = {
  id: string;
  nombre: string;
  direccion: string;
  estado: string;
  creadoEn: string;
  tiposLocal: string[];
  aforo: number | null;
  servicios: string[];
  documentoFuncionamientoUrl: string | null;
  foto360Url: string | null;
  videoUrl: string | null;
  calificacion: number | null;
  zona: { distritoNumero: number; nombreZonaPrincipal: string };
  anfitrion: { nombre: string; apellidoPaterno: string; apellidoMaterno: string | null; correo: string; ci: string | null; telefono: string | null; rol: string };
  categorias: { categoria: { nombre: string } }[];
  _count: { fotos: number; eventos: number; resenas: number; favoritos: number; denuncias: number };
};

const ESTADO: Record<string, string> = { APROBADO: 'Aprobado', PENDIENTE: 'En revisión', CORRECCION: 'En corrección', RECHAZADO: 'Rechazado' };
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const nombreArchivo = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Ficha tecnica de un local (datos de la fila + detalle publico del local).
export function pdfFichaLocal(fila: FilaBusqueda, detalle: Local | null) {
  const doc = new jsPDF();
  encabezado(doc, `Ficha del local: ${fila.nombre}`, `Registrado el ${fecha(fila.creadoEn)} · Estado: ${ESTADO[fila.estado] ?? fila.estado}`);
  const duenio = [fila.anfitrion.nombre, fila.anfitrion.apellidoPaterno, fila.anfitrion.apellidoMaterno].filter(Boolean).join(' ');
  const filas: [string, string][] = [
    ['Nombre', fila.nombre],
    ['Estado', ESTADO[fila.estado] ?? fila.estado],
    ['Dirección', fila.direccion],
    ['Distrito y zona', `Distrito ${fila.zona.distritoNumero} · ${fila.zona.nombreZonaPrincipal}`],
    ['Coordenadas GPS', detalle ? `${detalle.latitud.toFixed(6)}, ${detalle.longitud.toFixed(6)}` : '—'],
    ['Tipo de local', fila.tiposLocal.join(', ') || '—'],
    ['Categorías de eventos', fila.categorias.map((c) => c.categoria.nombre).join(', ') || '—'],
    ['Horario', detalle?.horarioFuncionamiento || '—'],
    ['Capacidad (aforo)', fila.aforo ? `${fila.aforo} personas` : '—'],
    ['Servicios', fila.servicios.map((s) => servicio(s)?.nombre ?? s).join(', ') || '—'],
    ['WhatsApp', detalle?.whatsapp || '—'],
    ['Reglas', detalle?.reglas || '—'],
    ['Licencia de funcionamiento', fila.documentoFuncionamientoUrl ? 'Sí, subida' : 'No subida'],
    ['Foto 360° / Video', `${fila.foto360Url ? 'Sí' : 'No'} / ${fila.videoUrl ? 'Sí' : 'No'}`],
    ['Fotos · Eventos', `${fila._count.fotos} fotos · ${fila._count.eventos} eventos`],
    ['Calificación', fila.calificacion ? `${fila.calificacion.toFixed(1)} de 5 (${fila._count.resenas} reseñas)` : 'Sin reseñas'],
    ['Favoritos', String(fila._count.favoritos)],
    ['Denuncias pendientes', String(fila._count.denuncias)],
    ['Dueño', fila.anfitrion.rol === 'OPERADOR' || fila.anfitrion.rol === 'ADMIN' ? 'G.A.M.E.A.' : duenio],
    ['CI del dueño', fila.anfitrion.ci || '—'],
    ['Correo / teléfono', `${fila.anfitrion.correo} / ${fila.anfitrion.telefono || '—'}`],
  ];
  autoTable(doc, {
    startY: 50,
    body: filas,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: MORADO, cellWidth: 55 } },
  });
  if (detalle?.descripcion) {
    autoTable(doc, { body: [[detalle.descripcion]], head: [['Descripción']], theme: 'plain', headStyles: { textColor: MORADO }, styles: { fontSize: 9 } });
  }
  if (detalle?.historia) {
    autoTable(doc, { body: [[detalle.historia]], head: [['Historia del cholet']], theme: 'plain', headStyles: { textColor: MORADO }, styles: { fontSize: 9 } });
  }
  pieDePagina(doc);
  doc.save(`ficha-${nombreArchivo(fila.nombre)}.pdf`);
}

// Lista de resultados de la busqueda (con los filtros usados).
export function pdfResultadosBusqueda(filas: FilaBusqueda[], filtros: string, total: number) {
  const doc = new jsPDF({ orientation: 'landscape' });
  encabezado(doc, 'Búsqueda avanzada de locales', `${total} resultado(s) · Filtros: ${filtros || 'ninguno'}`);
  autoTable(doc, {
    startY: 50,
    head: [['N°', 'Local', 'Distrito', 'Tipo', 'Aforo', 'Estado', 'Registro', 'Licencia', 'Nota', 'Dueño']],
    body: filas.map((f, i) => [
      i + 1,
      f.nombre,
      `D${f.zona.distritoNumero}`,
      f.tiposLocal.join(', ') || '—',
      f.aforo ?? '—',
      ESTADO[f.estado] ?? f.estado,
      fecha(f.creadoEn),
      f.documentoFuncionamientoUrl ? 'Sí' : 'No',
      f.calificacion ? f.calificacion.toFixed(1) : '—',
      `${f.anfitrion.nombre} ${f.anfitrion.apellidoPaterno}`,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: MORADO, textColor: 255 },
  });
  pieDePagina(doc);
  doc.save('busqueda-de-locales.pdf');
}
