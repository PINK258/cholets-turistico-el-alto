'use client';

import type { CategoriaEvento } from '@/lib/types';

// Categoria de un evento de la cartelera (boda, graduacion, folklore...),
// agrupada como en la tabla categorias_evento. Es opcional.
export default function SelectorCategoriaEvento({
  categorias,
  valor,
  onCambiar,
}: {
  categorias: CategoriaEvento[];
  valor: string;
  onCambiar: (id: string) => void;
}) {
  const grupos = [...new Set(categorias.map((c) => c.grupo))];
  return (
    <select className="input-campo" value={valor} onChange={(e) => onCambiar(e.target.value)}>
      <option value="">Sin categoría</option>
      {grupos.map((g) => (
        <optgroup key={g} label={g}>
          {categorias
            .filter((c) => c.grupo === g)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
