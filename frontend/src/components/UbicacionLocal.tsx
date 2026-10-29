'use client';

import dynamic from 'next/dynamic';
import { Zona } from '@/lib/types';

const MapaComoLlegar = dynamic(() => import('@/components/MapaComoLlegar'), { ssr: false });

// Seccion "Ubicación" de la ficha del local: un solo mapa (Leaflet) con
// "Cómo llegar" y guía paso a paso.
export default function UbicacionLocal({
  lat,
  lng,
  nombre,
  direccion,
  zona,
  foto,
}: {
  lat: number;
  lng: number;
  nombre: string;
  direccion: string;
  zona: Zona;
  /** URL completa de la foto de portada: se muestra en el pin del mapa. */
  foto?: string | null;
}) {
  return (
    <section id="ubicacion" className="scroll-mt-24">
      <h2 className="text-lg font-bold text-morado-900">Ubicación</h2>
      <p className="text-sm text-morado-700 mb-3">
        {direccion} · Distrito {zona.distritoNumero}, {zona.nombreZonaPrincipal}
      </p>
      <MapaComoLlegar lat={lat} lng={lng} nombre={nombre} foto={foto} />
    </section>
  );
}
