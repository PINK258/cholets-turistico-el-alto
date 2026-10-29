'use client';

import { TIPOS_LOCAL } from '@/lib/tiposLocal';
import { ConIconos } from '@/components/Icono';

// Seleccion multiple de "Tipo de local" como botones que se marcan/desmarcan.
export default function SelectorTiposLocal({
  seleccionados,
  onCambiar,
}: {
  seleccionados: string[];
  onCambiar: (nuevos: string[]) => void;
}) {
  const alternar = (tipo: string) => {
    const nuevos = seleccionados.includes(tipo)
      ? seleccionados.filter((t) => t !== tipo)
      : [...seleccionados, tipo];
    // Siempre en el orden de la lista.
    onCambiar(TIPOS_LOCAL.filter((t) => nuevos.includes(t)));
  };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de local">
      {TIPOS_LOCAL.map((tipo) => {
        const marcado = seleccionados.includes(tipo);
        return (
          <button
            key={tipo}
            type="button"
            aria-pressed={marcado}
            onClick={() => alternar(tipo)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              marcado
                ? 'bg-morado-700 border-morado-700 text-white'
                : 'bg-white border-morado-200 text-morado-700 hover:border-morado-400'
            }`}
          >
            <ConIconos texto={marcado ? '✓ ' : ''} />
            {tipo}
          </button>
        );
      })}
    </div>
  );
}
