import { CategoriaEvento } from '@/lib/types';
import { agruparCategorias } from '@/components/SelectorCategorias';

export default function CategoriasLocal({
  categorias,
  agrupadas = true,
}: {
  categorias: { categoria: CategoriaEvento }[];
  agrupadas?: boolean;
}) {
  const lista = categorias.map((c) => c.categoria);
  if (lista.length === 0) {
    return <p className="text-sm text-morado-500">Este local todavía no indicó qué eventos realiza.</p>;
  }

  const etiqueta = (c: CategoriaEvento) => (
    <span
      key={c.id}
      title={c.descripcion}
      className="text-xs px-2.5 py-1 rounded-full bg-morado-50 border border-morado-200 text-morado-800"
    >
      {c.nombre}
    </span>
  );

  if (!agrupadas) {
    return <div className="flex flex-wrap gap-1.5">{lista.map(etiqueta)}</div>;
  }

  return (
    <div className="space-y-2.5">
      {agruparCategorias(lista).map(([grupo, items]) => (
        <div key={grupo}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-dorado-600 mb-1">{grupo}</p>
          <div className="flex flex-wrap gap-1.5">{items.map(etiqueta)}</div>
        </div>
      ))}
    </div>
  );
}
