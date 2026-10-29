'use client';

import { useEffect, useMemo, useState } from 'react';
import Icono from '@/components/Icono';

// URLs temporales (blob:) para ver los archivos elegidos antes de subirlos.
// Se crean y se liberan dentro del mismo efecto: asi funciona tambien con el
// doble montaje de React en modo desarrollo (Strict Mode).
function useUrlsTemporales(archivos: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const nuevas = archivos.map((a) => URL.createObjectURL(a));
    setUrls(nuevas);
    return () => nuevas.forEach((u) => URL.revokeObjectURL(u));
  }, [archivos]);
  return urls;
}

export function VistaPreviaFotos({
  fotos,
  onQuitar,
}: {
  fotos: File[];
  onQuitar: (indice: number) => void;
}) {
  const urls = useUrlsTemporales(fotos);

  if (fotos.length === 0) {
    return (
      <div className="h-full min-h-48 rounded-xl border-2 border-dashed border-morado-200 bg-morado-50/40 flex items-center justify-center text-center text-xs text-morado-400 p-4">
        Aquí verás tus fotos en grande apenas las elijas.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* La primera foto es la portada del local: se muestra mas grande. */}
      <div className="relative rounded-xl overflow-hidden border border-morado-200 bg-morado-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="Portada" className="w-full h-56 object-cover" />
        <span className="absolute top-2 left-2 text-[11px] font-semibold bg-morado-700 text-white px-2 py-0.5 rounded-full">
          Portada
        </span>
        <button
          type="button"
          onClick={() => onQuitar(0)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 text-white text-sm hover:bg-black/75"
          aria-label="Quitar foto de portada"
        >
          <Icono nombre="x" />
        </button>
      </div>
      {fotos.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.slice(1).map((url, i) => (
            <div key={url} className="relative rounded-lg overflow-hidden border border-morado-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 2}`} className="w-full h-24 object-cover" />
              <button
                type="button"
                onClick={() => onQuitar(i + 1)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-xs hover:bg-black/75"
                aria-label={`Quitar foto ${i + 2}`}
              >
                <Icono nombre="x" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-morado-500">
        {fotos.length} foto(s). La primera será la portada; quita y vuelve a elegir para cambiarla.
      </p>
    </div>
  );
}

export function VistaPreviaDocumento({ documento, onQuitar }: { documento: File; onQuitar: () => void }) {
  const [url] = useUrlsTemporales(useMemo(() => [documento], [documento]));
  const esPdf = documento.type === 'application/pdf' || documento.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="relative rounded-xl overflow-hidden border border-morado-200 bg-white">
      {esPdf ? (
        <iframe src={url} title="Registro de funcionamiento" className="w-full h-64" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Registro de funcionamiento" className="w-full h-64 object-contain bg-morado-50" />
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-morado-100 text-xs">
        <span className="truncate text-morado-700"><Icono nombre="file-text" /> {documento.name}</span>
        <span className="flex gap-3 shrink-0">
          <a href={url} target="_blank" rel="noreferrer" className="boton-texto">
            Ver completo
          </a>
          <button type="button" onClick={onQuitar} className="text-red-600 hover:underline">
            Quitar
          </button>
        </span>
      </div>
    </div>
  );
}
