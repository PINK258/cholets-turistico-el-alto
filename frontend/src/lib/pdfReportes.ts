// PDF del reporte general del Operador G.A.M.E.A.: indicadores, distribuciones
// y las tablas CRUZADAS (doble entrada) con sus totales.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { encabezado, MORADO, pieDePagina } from '@/lib/pdfOperador';
import type { Cruce } from '@/components/operador/Graficos';
import { NOMBRE_ESTADO, NOMBRE_GENERO, RANGOS_EDAD, ReporteGeneral, traducir } from '@/lib/reportes';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/La_Paz' });

function siguienteY(doc: jsPDF) {
  return ((doc as any).lastAutoTable?.finalY ?? 50) + 10;
}

function titulo(doc: jsPDF, texto: string) {
  let y = siguienteY(doc);
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MORADO);
  doc.text(texto, 14, y);
  return y + 3;
}

function tabla(doc: jsPDF, nombre: string, cabecera: string[], filas: (string | number)[][]) {
  const y = titulo(doc, nombre);
  autoTable(doc, {
    startY: y,
    head: [cabecera],
    body: filas.length > 0 ? filas : [['Sin datos en este periodo', ...cabecera.slice(1).map(() => '')]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: MORADO, textColor: 255 },
    columnStyles: Object.fromEntries(cabecera.slice(1).map((_, i) => [i + 1, { halign: 'right' }])),
  });
}

function tablaCruzada(doc: jsPDF, nombre: string, datos: Cruce, esquina: string, ordenColumnas?: string[]) {
  const filas = [...new Set(datos.map((d) => d.fila))];
  let columnas = [...new Set(datos.map((d) => d.columna))].sort();
  if (ordenColumnas) columnas = [...ordenColumnas.filter((c) => columnas.includes(c)), ...columnas.filter((c) => !ordenColumnas.includes(c))];
  const valor = (f: string, c: string) => datos.find((d) => d.fila === f && d.columna === c)?.total ?? 0;
  const cuerpo = filas.map((f) => {
    const valores = columnas.map((c) => valor(f, c));
    return [traducir(f), ...valores, valores.reduce((a, b) => a + b, 0)];
  });
  const totales = columnas.map((c) => filas.reduce((s, f) => s + valor(f, c), 0));
  cuerpo.push(['Total', ...totales, totales.reduce((a, b) => a + b, 0)]);
  tabla(doc, nombre, [esquina, ...columnas.map(traducir), 'Total'], datos.length ? cuerpo : []);
}

export function pdfReporteGeneral(r: ReporteGeneral) {
  const doc = new jsPDF();
  encabezado(doc, 'Reporte general del sistema', `Periodo: del ${fecha(r.periodo.desde)} al ${fecha(r.periodo.hasta)}`);
  (doc as any).lastAutoTable = { finalY: 44 };

  const s = r.resumen;
  tabla(doc, '1. Indicadores del periodo', ['Indicador', 'Cantidad'], [
    ['Usuarios Turísticos registrados', s.turistas],
    ['Administradores Turísticos registrados', s.anfitriones],
    ['Locales aprobados', s.localesAprobados],
    ['Locales en revisión o corrección', s.localesEnRevision],
    ['Locales rechazados', s.localesRechazados],
    ['Eventos publicados', s.eventos],
    ['Reseñas', s.resenas],
    ['Locales guardados en favoritos', s.favoritos],
    ['Movimientos en el sistema (bitácora)', s.movimientos],
    ['Consultas al chatbot', s.consultasChatbot],
  ]);

  tabla(doc, '2. Usuarios por género', ['Género', 'Usuarios'], r.usuarios.genero.map((g) => [NOMBRE_GENERO[g.genero] ?? g.genero, g.total]));
  tabla(
    doc,
    '3. Usuarios por rango de edad',
    ['Rango de edad', 'Usuarios'],
    RANGOS_EDAD.map((rango) => [rango, r.usuarios.edad.find((e) => e.rango === rango)?.total ?? 0]),
  );
  tablaCruzada(doc, '4. Cruce: género × rango de edad', r.cruces.generoEdad, 'Género / Edad', RANGOS_EDAD);
  tabla(doc, '5. Procedencia: países', ['País', 'Usuarios'], r.usuarios.paises.map((p) => [p.pais, p.total]));
  tabla(doc, '6. Procedencia: ciudades', ['Ciudad', 'Usuarios'], r.usuarios.ciudades.map((c) => [c.ciudad, c.total]));

  tabla(doc, '7. Locales por estado', ['Estado', 'Locales'], r.locales.estado.map((e) => [NOMBRE_ESTADO[e.estado] ?? e.estado, e.total]));
  tablaCruzada(doc, '8. Cruce: distrito × tipo de local', r.cruces.distritoTipo, 'Distrito / Tipo');
  tabla(doc, '9. Locales por categoría de eventos', ['Categoría', 'Locales'], r.locales.categorias.map((c) => [c.categoria, c.total]));
  tabla(
    doc,
    '10. Calificación promedio por distrito',
    ['Distrito', 'Promedio (1 a 5)', 'Reseñas'],
    r.locales.calificacionDistrito.map((c) => [c.distrito, c.promedio.toFixed(2), c.resenas]),
  );
  tabla(doc, '11. Locales más guardados en favoritos', ['Local', 'Favoritos'], r.locales.favoritosTop.map((f) => [f.local, f.total]));

  tablaCruzada(doc, '12. Cruce: mes × categoría de evento', r.cruces.eventosMesCategoria, 'Mes / Categoría');
  tablaCruzada(doc, '13. Cruce: módulo × mes (movimientos)', r.cruces.movimientosModuloMes, 'Módulo / Mes');
  tabla(doc, '14. Acciones más frecuentes', ['Acción', 'Módulo', 'Veces'], r.movimientos.accionesFrecuentes.map((a) => [a.accion, a.modulo, a.total]));
  tabla(doc, '15. Usuarios con más movimientos', ['Usuario', 'Movimientos'], r.movimientos.usuariosActivos.map((u) => [u.usuario, u.total]));
  tabla(doc, '16. Movimientos por día (últimos 30 días)', ['Día', 'Movimientos', 'Fallidos'], r.movimientos.porDia.map((d) => [d.dia, d.total, d.fallidos]));

  pieDePagina(doc);
  doc.save(`reporte-general-${r.periodo.desde.slice(0, 10)}-a-${r.periodo.hasta.slice(0, 10)}.pdf`);
}

