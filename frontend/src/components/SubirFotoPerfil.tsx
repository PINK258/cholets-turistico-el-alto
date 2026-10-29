'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { urlArchivo } from '@/lib/api';
import RecortarFoto from '@/components/RecortarFoto';

// Foto de perfil del dueño: circulo con vista previa y boton para elegir.
// Muestra la foto nueva elegida o, si no hay, la que ya tiene guardada.
export default function SubirFotoPerfil({
  archivo,
  urlActual,
  onElegir,
  tamano = 'w-24 h-24',
}: {
  archivo: File | null;
  urlActual?: string | null;
  onElegir: (archivo: File | null) => void;
  tamano?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [porRecortar, setPorRecortar] = useState<File | null>(null);
  const cerrarRecorte = useCallback(() => setPorRecortar(null), []);
  // Se crea y libera en el mismo efecto (compatible con el doble montaje de Strict Mode).
  const [urlNueva, setUrlNueva] = useState<string | null>(null);
  useEffect(() => {
    if (!archivo) return setUrlNueva(null);
    const url = URL.createObjectURL(archivo);
    setUrlNueva(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const src = urlNueva ?? (urlActual ? urlArchivo(urlActual) : null);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${tamano} shrink-0 rounded-full overflow-hidden border-2 border-morado-200 bg-morado-50 flex items-center justify-center hover:border-morado-400 transition-colors`}
        aria-label="Elegir foto de perfil"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Foto de perfil" className="w-full h-full object-cover" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cb9dff" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        )}
      </button>
      <div className="space-y-1">
        <button type="button" onClick={() => inputRef.current?.click()} className="boton-secundario-sm">
          {src ? 'Cambiar foto' : 'Subir foto de perfil'}
        </button>
        {archivo && (
          <button type="button" onClick={() => onElegir(null)} className="block text-xs text-red-600 hover:underline">
            Quitar
          </button>
        )}
        <p className="text-[11px] text-morado-500">JPG, PNG o WEBP. Podrás encuadrarla antes de guardarla.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          // Primero se abre la ventana para ajustar; solo la foto recortada sale de aqui.
          setPorRecortar(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {porRecortar && (
        <RecortarFoto
          archivo={porRecortar}
          onCancelar={cerrarRecorte}
          onListo={(recortada) => {
            setPorRecortar(null);
            onElegir(recortada);
          }}
        />
      )}
    </div>
  );
}
