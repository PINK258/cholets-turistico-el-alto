'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Local, Zona } from '@/lib/types';
import ContadorAnimado from '@/components/ui/ContadorAnimado';

// Cifras reales de la plataforma (de la API), en grande y sin cajas.
// Si algo no carga o es 0, no se muestra.
export default function Contadores({ locales, zonas }: { locales: Local[] | null; zonas: Zona[] }) {
  const [eventos, setEventos] = useState<number | null>(null);

  useEffect(() => {
    api<unknown[]>('/eventos/cartelera')
      .then((e) => setEventos(e.length))
      .catch(() => {});
  }, []);

  const cifras = [
    { valor: locales ? locales.length : null, texto: 'locales verificados' },
    { valor: zonas.length ? new Set(zonas.map((z) => z.distritoNumero)).size : null, texto: 'distritos de El Alto' },
    { valor: eventos, texto: 'eventos en cartelera' },
  ].filter((c) => c.valor);
  if (cifras.length === 0) return null;

  return (
    <dl className="flex flex-wrap gap-x-12 gap-y-6">
      {cifras.map((c) => (
        <div key={c.texto}>
          <dt className="sr-only">{c.texto}</dt>
          <dd className="font-titulo text-5xl sm:text-6xl font-extrabold tracking-tight text-morado-900 leading-none">
            <ContadorAnimado valor={c.valor!} />
          </dd>
          <dd className="mt-2 text-sm text-morado-600">{c.texto}</dd>
        </div>
      ))}
    </dl>
  );
}
