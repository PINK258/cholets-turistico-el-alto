// "Cómo llegar": rutas a pie o en auto con OSRM (servidores gratuitos de
// routing.openstreetmap.de, los mismos que usa openstreetmap.org) e
// indicaciones paso a paso en español.

import type { NombreIcono } from '@/components/Icono';

export type ModoRuta = 'pie' | 'auto';

export type PasoRuta = {
  texto: string;
  distancia: number; // metros hasta la siguiente maniobra
  ubicacion: [number, number]; // [lat, lng] donde se hace la maniobra
  icono: NombreIcono;
};

export type Ruta = {
  distancia: number; // metros
  duracion: number; // segundos
  linea: [number, number][]; // [lat, lng]
  pasos: PasoRuta[];
};

const PERFIL: Record<ModoRuta, string> = { pie: 'routed-foot', auto: 'routed-car' };

const LADO: Record<string, string> = {
  left: 'a la izquierda',
  right: 'a la derecha',
  'slight left': 'levemente a la izquierda',
  'slight right': 'levemente a la derecha',
  'sharp left': 'fuerte a la izquierda',
  'sharp right': 'fuerte a la derecha',
  straight: 'derecho',
  uturn: 'en U',
};

const ICONO: Record<string, NombreIcono> = {
  left: 'arrow-left',
  right: 'arrow-right',
  'slight left': 'arrow-up-left',
  'slight right': 'arrow-up-right',
  'sharp left': 'corner-up-left',
  'sharp right': 'corner-up-right',
  straight: 'arrow-up',
  uturn: 'corner-up-left',
};

type ManiobraOsrm = { type: string; modifier?: string; exit?: number; location: [number, number] };
type PasoOsrm = { maneuver: ManiobraOsrm; name: string; distance: number };

function instruccion(p: PasoOsrm): { texto: string; icono: NombreIcono } {
  const m = p.maneuver;
  const lado = LADO[m.modifier ?? ''] ?? '';
  const calle = p.name ? ` por ${p.name}` : '';
  const enCalle = p.name ? ` en ${p.name}` : '';
  const icono = ICONO[m.modifier ?? ''] ?? 'arrow-up';
  switch (m.type) {
    case 'depart':
      return { texto: `Sal${calle || ' por la calle'}`, icono: 'flag' };
    case 'arrive':
      return { texto: 'Llegaste al local', icono: 'map-pin' };
    case 'turn':
      return m.modifier === 'straight'
        ? { texto: `Sigue derecho${calle}`, icono }
        : m.modifier === 'uturn'
          ? { texto: `Da la vuelta en U${calle}`, icono }
          : { texto: `Gira ${lado}${enCalle}`, icono };
    case 'end of road':
      return { texto: `Al final de la calle, gira ${lado}${enCalle}`, icono };
    case 'fork':
      return { texto: `En la bifurcación, mantente ${lado}${calle}`, icono };
    case 'merge':
      return { texto: `Incorpórate ${lado}${calle}`, icono };
    case 'roundabout':
    case 'rotary':
      return {
        texto: `En la rotonda, toma la ${m.exit ? `${m.exit}.ª ` : ''}salida${calle}`,
        icono: 'rotate-cw',
      };
    case 'new name':
    case 'continue':
      return { texto: `Continúa${calle || ' derecho'}`, icono };
    default:
      return { texto: lado ? `Ve ${lado}${calle}` : `Continúa${calle}`, icono };
  }
}

export async function calcularRuta(
  origen: [number, number],
  destino: [number, number],
  modo: ModoRuta,
  senal?: AbortSignal,
): Promise<Ruta> {
  const url =
    `https://routing.openstreetmap.de/${PERFIL[modo]}/route/v1/driving/` +
    `${origen[1]},${origen[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal: senal });
  if (!res.ok) throw new Error('El servicio de rutas no respondió. Intenta de nuevo en un momento.');
  const datos = await res.json();
  const ruta = datos.routes?.[0];
  if (datos.code !== 'Ok' || !ruta) throw new Error('No se encontró un camino hasta el local desde ese punto.');
  return {
    distancia: ruta.distance,
    duracion: ruta.duration,
    linea: (ruta.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    pasos: (ruta.legs[0].steps as PasoOsrm[]).map((p) => ({
      ...instruccion(p),
      distancia: p.distance,
      ubicacion: [p.maneuver.location[1], p.maneuver.location[0]],
    })),
  };
}

export const textoDistancia = (m: number) =>
  m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

export const textoDuracion = (s: number) => {
  const min = Math.max(1, Math.round(s / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};

// Distancia en metros entre dos puntos [lat, lng].
export function metrosEntre(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}
