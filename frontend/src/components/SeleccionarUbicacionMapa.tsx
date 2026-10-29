'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLOR_DISTRITO, DISTRITOS_EL_ALTO } from '@/lib/distritosElAlto';
import { agregarCapasBase, iconoPin } from '@/lib/mapaBase';

// Partes de la direccion que devuelve OpenStreetMap para el punto del pin.
export type DetalleDireccion = {
  texto: string | null;
  calle: string | null;
  barrio: string | null;
  ciudad: string | null;
};


// Direccion legible a partir de lat/lng con Nominatim (OpenStreetMap, el mismo
// proveedor del mapa). Su politica de uso pide maximo 1 consulta por segundo:
// por eso solo se consulta cuando el pin deja de moverse.
async function buscarDireccion(lat: number, lng: number, senal: AbortSignal): Promise<DetalleDireccion> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1` +
    `&accept-language=es&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal: senal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const a = data.address ?? {};
  const calle = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(' ');
  const zona = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district;
  const ciudad = a.city ?? a.town ?? a.village;
  const partes = [calle, zona, ciudad].filter(Boolean);
  return {
    texto: partes.length > 0 ? partes.join(', ') : (data.display_name as string | undefined) ?? null,
    calle: calle || null,
    barrio: zona ?? null,
    ciudad: ciudad ?? null,
  };
}

// Implementacion manual con Leaflet (sin react-leaflet): su MapContainer no es
// idempotente con el "reappear" de rutas de React 19/Next 16 y lanzaba "Map
// container is already initialized". Un useEffect con limpieza propia si lo es.
export default function SeleccionarUbicacionMapa({
  lat,
  lng,
  onCambiar,
  onDireccion,
  onDetalle,
  enfoque = 0,
  alto = 380,
  precision = null,
}: {
  lat: number;
  lng: number;
  onCambiar: (lat: number, lng: number) => void;
  onDireccion?: (direccion: string | null) => void;
  onDetalle?: (detalle: DetalleDireccion | null) => void;
  // Cada vez que cambia, el mapa se acerca al pin (p. ej. tras "usar mi ubicacion").
  enfoque?: number;
  alto?: number;
  // Precision del GPS en metros: se dibuja un circulo alrededor del pin.
  precision?: number | null;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const marcadorRef = useRef<L.Marker | null>(null);
  const circuloRef = useRef<L.Circle | null>(null);
  const etiquetaRef = useRef<HTMLDivElement | null>(null);
  const onCambiarRef = useRef(onCambiar);
  onCambiarRef.current = onCambiar;
  const onDireccionRef = useRef(onDireccion);
  onDireccionRef.current = onDireccion;
  const onDetalleRef = useRef(onDetalle);
  onDetalleRef.current = onDetalle;

  // Se crea una sola vez.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || (el as any)._leaflet_id) return;

    const mapa = L.map(el).setView([lat, lng], 15);
    mapaRef.current = mapa;

    agregarCapasBase(mapa);

    // Distritos como referencia: limite oficial (linea continua) o area
    // aproximada (punteada).
    for (const d of DISTRITOS_EL_ALTO) {
      const anillos = d.limite ? [d.limite] : d.area ?? [];
      if (anillos.length === 0) continue;
      L.polygon(
        anillos.map((anillo) => anillo.map(([x, y]) => [y, x] as [number, number])),
        {
          color: COLOR_DISTRITO[d.numero],
          weight: d.limite ? 2 : 1.2,
          dashArray: d.limite ? undefined : '6 4',
          fillOpacity: 0.06,
          interactive: false,
        },
      )
        .bindTooltip(`Distrito ${d.numero}`, { permanent: true, direction: 'center', className: 'etiqueta-distrito' })
        .addTo(mapa);
    }

    // La etiqueta es un elemento DOM con textContent (no HTML): la direccion
    // viene de un servicio externo y no debe poder inyectar codigo.
    const etiqueta = document.createElement('div');
    // max-content evita que el tooltip (posicion absoluta) se encoja a una columna angosta.
    etiqueta.style.width = 'max-content';
    etiqueta.style.maxWidth = '220px';
    etiqueta.style.whiteSpace = 'normal';
    etiqueta.textContent = '📍 Buscando dirección…';
    etiquetaRef.current = etiqueta;

    const marcador = L.marker([lat, lng], { icon: iconoPin(), draggable: true }).addTo(mapa);
    marcador.bindTooltip(etiqueta, { permanent: true, direction: 'top', opacity: 0.95 });
    marcador.on('dragend', () => {
      const p = marcador.getLatLng();
      onCambiarRef.current(p.lat, p.lng);
    });
    marcadorRef.current = marcador;

    mapa.on('click', (e: L.LeafletMouseEvent) => {
      onCambiarRef.current(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      marcadorRef.current = null;
      circuloRef.current = null;
      etiquetaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mueve el pin y, cuando se queda quieto, busca la direccion para la etiqueta.
  useEffect(() => {
    marcadorRef.current?.setLatLng([lat, lng]);
    const etiqueta = etiquetaRef.current;
    if (etiqueta) etiqueta.textContent = '📍 Buscando dirección…';
    onDireccionRef.current?.(null);
    onDetalleRef.current?.(null);

    const controlador = new AbortController();
    const espera = setTimeout(() => {
      buscarDireccion(lat, lng, controlador.signal)
        .then((detalle) => {
          if (etiquetaRef.current) {
            etiquetaRef.current.textContent = `📍 ${detalle.texto ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`}`;
          }
          marcadorRef.current?.getTooltip()?.update();
          onDireccionRef.current?.(detalle.texto);
          onDetalleRef.current?.(detalle);
        })
        .catch((e) => {
          if (e.name === 'AbortError') return;
          if (etiquetaRef.current) {
            etiquetaRef.current.textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }
          marcadorRef.current?.getTooltip()?.update();
        });
    }, 700);

    return () => {
      clearTimeout(espera);
      controlador.abort();
    };
  }, [lat, lng]);

  // Circulo de precision del GPS (se quita cuando el pin se mueve a mano).
  useEffect(() => {
    const mapa = mapaRef.current;
    circuloRef.current?.remove();
    circuloRef.current = null;
    if (!mapa || !precision) return;
    circuloRef.current = L.circle([lat, lng], {
      radius: precision,
      color: '#7c3aed',
      weight: 1.5,
      fillColor: '#a78bfa',
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(mapa);
    // Que el circulo entero se vea (si es grande, el mapa se aleja).
    if (precision > 60) mapa.fitBounds(circuloRef.current.getBounds(), { padding: [20, 20], maxZoom: 17 });
  }, [lat, lng, precision]);

  // Acercar el mapa al pin cuando el formulario lo pide.
  useEffect(() => {
    if (enfoque > 0) mapaRef.current?.setView([lat, lng], 17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfoque]);

  return <div ref={contenedorRef} style={{ height: alto, borderRadius: '1rem' }} />;
}
