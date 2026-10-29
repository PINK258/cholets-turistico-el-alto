'use client';

import { urlArchivo } from '@/lib/api';
import Icono from '@/components/Icono';

// Muestra dentro del panel la licencia de funcionamiento que subio el dueño:
// la imagen (clic para verla en grande) o el PDF incrustado.
export default function VistaLicencia({ url, alto = 'h-64' }: { url: string | null | undefined; alto?: string }) {
  if (!url) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <Icono nombre="triangle-alert" /> No subió la licencia de funcionamiento.
      </p>
    );
  }
  const completa = urlArchivo(url);
  const esPdf = /\.pdf$/i.test(url);
  return (
    <figure className="rounded-xl border border-morado-100 bg-morado-50/40 p-2">
      <figcaption className="flex items-center justify-between text-xs text-morado-700 mb-1.5">
        <span className="font-semibold"><Icono nombre="file-text" /> Licencia de funcionamiento</span>
        <a href={completa} target="_blank" rel="noopener noreferrer" className="boton-texto">
          Abrir en grande <Icono nombre="external-link" />
        </a>
      </figcaption>
      {esPdf ? (
        <iframe src={completa} title="Licencia de funcionamiento (PDF)" className={`w-full ${alto} rounded-lg bg-white`} />
      ) : (
        <a href={completa} target="_blank" rel="noopener noreferrer" title="Ver la licencia en grande">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={completa} alt="Licencia de funcionamiento" className={`w-full ${alto} object-contain rounded-lg bg-white`} />
        </a>
      )}
    </figure>
  );
}
