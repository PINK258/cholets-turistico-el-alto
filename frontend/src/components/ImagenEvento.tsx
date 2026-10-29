'use client';

import { useEffect, useState } from 'react';
import { ConIconos } from '@/components/Icono';

// Selector de una imagen del evento con vista previa en su forma real:
//  - "vertical": afiche para la cartelera (proporción 4:5, ej. 1080 × 1350).
//  - "horizontal": imagen para el carrusel de la portada (16:9, ej. 1600 × 900).
// urlActual: la imagen ya guardada (al editar). onQuitar es opcional.
export default function ImagenEvento({
  forma,
  archivo,
  urlActual,
  onElegir,
  onQuitar,
}: {
  forma: 'vertical' | 'horizontal';
  archivo: File | null;
  urlActual?: string | null;
  onElegir: (archivo: File | null) => void;
  onQuitar?: () => void;
}) {
  const [vista, setVista] = useState<string | null>(null);

  // La URL temporal se crea y se libera en el mismo efecto (seguro en Strict Mode).
  useEffect(() => {
    if (!archivo) return setVista(null);
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const imagen = vista ?? urlActual ?? null;
  const vertical = forma === 'vertical';

  return (
    <div className="rounded-xl border border-morado-100 bg-white p-3">
      <p className="text-sm font-semibold text-morado-900">
        <ConIconos texto={vertical ? '🖼️ Afiche vertical' : '🌅 Imagen horizontal'} />{' '}
        <span className="text-[11px] font-normal text-morado-500">(opcional)</span>
      </p>
      <p className="text-[11px] text-morado-500 mb-2">
        {vertical
          ? 'Para la Cartelera. Tamaño recomendado: 1080 × 1350 px (parado).'
          : 'Para el carrusel de la página principal. Tamaño recomendado: 1600 × 900 px (echado).'}
      </p>
      <div className="flex items-start gap-3">
        {/* Marco con la forma real: asi se ve como quedara. */}
        <div
          className={`shrink-0 rounded-lg overflow-hidden border border-dashed border-morado-200 bg-morado-50 flex items-center justify-center ${
            vertical ? 'w-20 aspect-[4/5]' : 'w-36 aspect-video'
          }`}
        >
          {imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagen} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-morado-400 text-center px-1">{vertical ? '4:5' : '16:9'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <label className="boton-secundario-sm cursor-pointer inline-flex">
            {imagen ? 'Cambiar imagen' : 'Elegir imagen'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                onElegir(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
          {imagen && onQuitar && (
            <button type="button" className="block text-xs text-red-600 hover:underline" onClick={onQuitar}>
              Quitar imagen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
