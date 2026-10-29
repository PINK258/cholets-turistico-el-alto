'use client';

import { useState } from 'react';

const RUTA_ESTRELLA =
  'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

export const TEXTO_CALIFICACION = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

function Estrella({ relleno, tamano }: { relleno: number; tamano: number }) {
  // relleno de 0 a 1: la parte dorada se recorta con un rectangulo (3.5 => media estrella).
  const id = `e${Math.round(relleno * 100)}`;
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={24 * relleno} height="24" />
        </clipPath>
      </defs>
      <path d={RUTA_ESTRELLA} fill="#ece0fa" />
      <path d={RUTA_ESTRELLA} fill="#f0b429" clipPath={`url(#${id})`} />
    </svg>
  );
}

// Solo muestra: acepta decimales (promedio 4.5).
export function Estrellas({ valor, tamano = 16 }: { valor: number; tamano?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${valor} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Estrella key={n} relleno={Math.max(0, Math.min(1, valor - (n - 1)))} tamano={tamano} />
      ))}
    </span>
  );
}

// Para elegir la calificacion: al pasar el mouse se ilumina hasta esa estrella.
export function SelectorEstrellas({
  valor,
  onCambiar,
  tamano = 30,
}: {
  valor: number;
  onCambiar: (valor: number) => void;
  tamano?: number;
}) {
  const [encima, setEncima] = useState(0);
  const mostrado = encima || valor;
  return (
    <div className="flex items-center gap-2">
      <div className="flex" role="radiogroup" aria-label="Tu calificación" onMouseLeave={() => setEncima(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} estrella${n > 1 ? 's' : ''}: ${TEXTO_CALIFICACION[n]}`}
            onClick={() => onCambiar(n)}
            onMouseEnter={() => setEncima(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Estrella relleno={n <= mostrado ? 1 : 0} tamano={tamano} />
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-dorado-600 min-w-[5rem]">{TEXTO_CALIFICACION[mostrado]}</span>
    </div>
  );
}

// "★ 4.5 (12)" compacto para tarjetas.
export function CalificacionCorta({ promedio, total }: { promedio: number | null; total: number }) {
  if (!total || promedio === null) {
    return <span className="text-[11px] text-morado-400">Sin reseñas</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-morado-900">
      <Estrella relleno={1} tamano={13} />
      {promedio.toFixed(1)}
      <span className="font-normal text-morado-500">({total})</span>
    </span>
  );
}
