'use client';

import { CategoriaEvento } from '@/lib/types';

export function agruparCategorias<T extends { grupo: string; orden: number }>(categorias: T[]) {
  const grupos = new Map<string, T[]>();
  [...categorias]
    .sort((a, b) => a.orden - b.orden)
    .forEach((c) => grupos.set(c.grupo, [...(grupos.get(c.grupo) ?? []), c]));
  return [...grupos.entries()];
}

// Casillas agrupadas para que el dueño marque los tipos de eventos que realiza.
export default function SelectorCategorias({
  categorias,
  seleccionadas,
  onCambiar,
}: {
  categorias: CategoriaEvento[];
  seleccionadas: Set<string>;
  onCambiar: (nuevas: Set<string>) => void;
}) {
  const alternar = (id: string) => {
    const nuevas = new Set(seleccionadas);
    if (nuevas.has(id)) nuevas.delete(id);
    else nuevas.add(id);
    onCambiar(nuevas);
  };

  return (
    <div className="space-y-3">
      {agruparCategorias(categorias).map(([grupo, lista]) => (
        <div key={grupo}>
          <p className="text-xs font-semibold text-morado-800 mb-1.5">{grupo}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {lista.map((c) => {
              const marcada = seleccionadas.has(c.id);
              return (
                <label
                  key={c.id}
                  title={c.descripcion}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                    marcada
                      ? 'border-morado-500 bg-morado-50 text-morado-900'
                      : 'border-morado-100 bg-white text-morado-700 hover:border-morado-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-morado-700"
                    checked={marcada}
                    onChange={() => alternar(c.id)}
                  />
                  <span>
                    <span className="font-medium block">{c.nombre}</span>
                    <span className="text-[11px] text-morado-500 line-clamp-2">{c.descripcion}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
