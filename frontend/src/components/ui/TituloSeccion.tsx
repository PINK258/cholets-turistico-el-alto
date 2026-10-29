import { ReactNode } from 'react';
import Revelar from '@/components/ui/Revelar';

// Titulo de seccion grande con una linea de acento (amarillo a terracota) que se
// dibuja al aparecer. "extra" va a la derecha (p. ej. un enlace "Ver todo").
export default function TituloSeccion({
  etiqueta,
  titulo,
  descripcion,
  extra,
}: {
  etiqueta?: string;
  titulo: string;
  descripcion?: string;
  extra?: ReactNode;
}) {
  return (
    <Revelar className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="max-w-2xl">
        {etiqueta && (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-dorado-600 mb-2">{etiqueta}</p>
        )}
        <h2 className="titulo-seccion">{titulo}</h2>
        <span className="linea-acento" aria-hidden />
        {descripcion && <p className="mt-4 text-morado-700/80 text-base">{descripcion}</p>}
      </div>
      {extra}
    </Revelar>
  );
}
