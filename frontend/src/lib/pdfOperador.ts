// Reportes PDF del panel del operador (se generan en el navegador con jsPDF).
// - Dueños: datos completos, verificacion y sus locales (uno o todos).
// - Usuarios (visitantes): SOLO nombre y correo, como pide el requisito.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UsuarioRegistrado } from '@/lib/types';
import { urlArchivo } from '@/lib/api';
import { detectarDistrito } from '@/lib/distritosElAlto';

export const MORADO: [number, number, number] = [79, 20, 137];
const DORADO: [number, number, number] = [209, 147, 15];
const GRIS: [number, number, number] = [110, 90, 140];

const ahora = () =>
  new Date().toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/La_Paz' });
const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const nombreCompleto = (u: UsuarioRegistrado) => [u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ');
const nombreArchivo = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ESTADO: Record<string, string> = {
  APROBADO: 'Aprobado',
  PENDIENTE: 'Pendiente',
  RECHAZADO: 'Rechazado',
  CORRECCION: 'En corrección',
};

export function encabezado(doc: jsPDF, titulo: string, subtitulo: string) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(...MORADO);
  doc.rect(0, 0, ancho, 26, 'F');
  doc.setFillColor(...DORADO);
  doc.rect(0, 26, ancho, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Cholets Turístico El Alto', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Operador G.A.M.E.A. · Reporte generado el ' + ahora(), 14, 19);
  doc.setTextColor(...MORADO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titulo, 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(subtitulo, 14, 44);
}

export function pieDePagina(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(
      `Documento de uso interno · Página ${i} de ${total}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }
}

// Foto de perfil como JPEG (jsPDF no lee webp): se dibuja en un canvas.
async function fotoComoJpeg(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(urlArchivo(url));
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const lado = 240;
    const lienzo = document.createElement('canvas');
    lienzo.width = lado;
    lienzo.height = lado;
    const ctx = lienzo.getContext('2d')!;
    const escala = Math.max(lado / bitmap.width, lado / bitmap.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lado, lado);
    ctx.drawImage(bitmap, (lado - bitmap.width * escala) / 2, (lado - bitmap.height * escala) / 2, bitmap.width * escala, bitmap.height * escala);
    return lienzo.toDataURL('image/jpeg', 0.85);
  } catch {
    return null; // sin foto el reporte sigue siendo valido
  }
}

const textoVerificacion = (u: UsuarioRegistrado) =>
  u.datosVerificadosEn
    ? `Sí, el ${fecha(u.datosVerificadosEn)}${u.verificadoPor ? ` por ${u.verificadoPor.nombre} ${u.verificadoPor.apellidoPaterno}` : ''}`
    : 'No (pendiente de verificación)';

// Comparacion entre la zona registrada y el distrito que indica el GPS.
function textoGps(l: UsuarioRegistrado['locales'][number]) {
  const d = detectarDistrito(l.latitud, l.longitud);
  if (!d) return 'Sin datos del distrito';
  const coincide = d.numero === l.zona.distritoNumero;
  return `D${d.numero} ${d.precision === 'exacta' ? '(límite oficial)' : '(aprox.)'} ${coincide ? '· coincide' : '· NO coincide'}`;
}

export async function pdfDuenio(u: UsuarioRegistrado) {
  const doc = new jsPDF();
  encabezado(doc, 'Ficha del dueño de local', nombreCompleto(u));

  const foto = await fotoComoJpeg(u.avatarUrl);
  let x = 14;
  if (foto) {
    doc.addImage(foto, 'JPEG', 14, 50, 34, 34);
    x = 54;
  }
  autoTable(doc, {
    startY: 50,
    margin: { left: x },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.4 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: MORADO, cellWidth: 42 } },
    body: [
      ['Nombre completo', nombreCompleto(u)],
      ['Carnet de identidad', u.ci || '—'],
      ['Correo', u.correo],
      ['Teléfono', u.telefono || '—'],
      ['Inicia sesión con', u.proveedorAuth === 'GOOGLE' ? 'Google' : 'Correo y contraseña'],
      ['Registrado el', fecha(u.creadoEn)],
      ['Datos verificados', textoVerificacion(u)],
      ...(u.notaVerificacion ? [['Nota del operador', u.notaVerificacion]] : []),
    ],
  });

  let y = Math.max((doc as any).lastAutoTable.finalY, foto ? 88 : 0) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MORADO);
  doc.text(`Locales registrados (${u.locales.length})`, 14, y);
  autoTable(doc, {
    startY: y + 3,
    headStyles: { fillColor: MORADO },
    styles: { fontSize: 8.5 },
    head: [['Local', 'Estado', 'Zona registrada', 'Dirección', 'Horario', 'Distrito según GPS', 'Registro de func.']],
    body: u.locales.length
      ? u.locales.map((l) => [
          l.nombre,
          ESTADO[l.estado] ?? l.estado,
          `D${l.zona.distritoNumero} · ${l.zona.nombreZonaPrincipal}`,
          l.direccion,
          l.horarioFuncionamiento || '—',
          textoGps(l),
          l.documentoFuncionamientoUrl ? 'Adjuntado' : 'No',
        ])
      : [['Sin locales', '', '', '', '', '', '']],
  });

  y = (doc as any).lastAutoTable.finalY + 14;
  doc.setDrawColor(...GRIS);
  doc.line(14, y, 84, y);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('Firma del operador', 14, y + 4);
  pieDePagina(doc);
  doc.save(`dueno-${nombreArchivo(nombreCompleto(u))}.pdf`);
}

export function pdfDuenios(lista: UsuarioRegistrado[]) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const verificados = lista.filter((u) => u.datosVerificadosEn).length;
  encabezado(doc, 'Dueños de locales (anfitriones)', `${lista.length} dueños · ${verificados} con datos verificados`);
  autoTable(doc, {
    startY: 50,
    headStyles: { fillColor: MORADO },
    styles: { fontSize: 8.5 },
    head: [['#', 'Nombre completo', 'CI', 'Correo', 'Teléfono', 'Registrado', 'Locales', 'Datos verificados']],
    body: lista.map((u, i) => [
      String(i + 1),
      nombreCompleto(u),
      u.ci || '—',
      u.correo,
      u.telefono || '—',
      fecha(u.creadoEn),
      u.locales.map((l) => `${l.nombre} (${ESTADO[l.estado] ?? l.estado}, D${l.zona.distritoNumero})`).join('\n') || '—',
      u.datosVerificadosEn ? `Sí · ${fecha(u.datosVerificadosEn)}` : 'No',
    ]),
  });
  pieDePagina(doc);
  doc.save(`duenos-de-locales-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Visitantes: solo nombre y correo.
export function pdfUsuario(u: UsuarioRegistrado) {
  const doc = new jsPDF();
  encabezado(doc, 'Datos del usuario', 'Usuario registrado (visitante)');
  autoTable(doc, {
    startY: 50,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', textColor: MORADO, cellWidth: 40 } },
    body: [
      ['Nombre', nombreCompleto(u)],
      ['Correo', u.correo],
    ],
  });
  pieDePagina(doc);
  doc.save(`usuario-${nombreArchivo(nombreCompleto(u))}.pdf`);
}

export function pdfUsuarios(lista: UsuarioRegistrado[]) {
  const doc = new jsPDF();
  encabezado(doc, 'Usuarios registrados (visitantes)', `${lista.length} usuarios · solo nombre y correo`);
  autoTable(doc, {
    startY: 50,
    headStyles: { fillColor: MORADO },
    styles: { fontSize: 9.5 },
    head: [['#', 'Nombre', 'Correo']],
    body: lista.map((u, i) => [String(i + 1), nombreCompleto(u), u.correo]),
  });
  pieDePagina(doc);
  doc.save(`usuarios-${new Date().toISOString().slice(0, 10)}.pdf`);
}
