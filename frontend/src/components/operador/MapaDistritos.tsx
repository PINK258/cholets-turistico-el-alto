'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocalEnMapa } from '@/lib/types';
import { COLOR_DISTRITO, DISTRITOS_EL_ALTO, detectarDistrito, textoDeteccion } from '@/lib/distritosElAlto';
import { agregarCapasBase } from '@/lib/mapaBase';

const COLOR_ESTADO = { APROBADO: '#15803d', PENDIENTE: '#d97706', RECHAZADO: '#dc2626', CORRECCION: '#ea580c' } as const;
const CENTRO_EL_ALTO: [number, number] = [-16.515, -68.205];

// Contenido del popup armado con nodos de texto: nombre, direccion y dueño los
// escribe la gente y no deben interpretarse como HTML.
function popupLocal(l: LocalEnMapa) {
  const caja = document.createElement('div');
  const linea = (texto: string, negrita = false) => {
    const p = document.createElement('div');
    p.textContent = texto;
    if (negrita) p.style.fontWeight = '700';
    caja.appendChild(p);
  };
  const d = detectarDistrito(l.latitud, l.longitud);
  linea(l.nombre, true);
  linea(`Estado: ${l.estado.toLowerCase()}`);
  linea(`Dueño: ${l.anfitrion.nombre} ${l.anfitrion.apellidoPaterno}`);
  linea(`Zona registrada: D${l.zona.distritoNumero} · ${l.zona.nombreZonaPrincipal}`);
  linea(`GPS: ${textoDeteccion(d)}`);
  linea(d && d.numero !== l.zona.distritoNumero ? '⚠ La zona registrada no coincide con el GPS' : d ? '✔ Coincide con el GPS' : '');
  return caja;
}

export default function MapaDistritos({
  locales,
  enfoque,
  alto = 'h-[34rem]',
  ajustarALocales = false,
}: {
  locales: LocalEnMapa[];
  // Distrito o local a enfocar: { distrito } o { lat, lng }.
  enfoque: { distrito?: number; lat?: number; lng?: number; vez: number } | null;
  // Clase de Tailwind con el alto del mapa (p. ej. 'h-72' en la ventana del dueño).
  alto?: string;
  // true: en vez de todo El Alto, encuadra los locales recibidos (revision de un dueño).
  ajustarALocales?: boolean;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaLocalesRef = useRef<L.LayerGroup | null>(null);
  const poligonosRef = useRef(new Map<number, L.Polygon>());
  const capaDistritosRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || (el as any)._leaflet_id) return;
    const mapa = L.map(el).setView(CENTRO_EL_ALTO, 12);
    mapaRef.current = mapa;
    agregarCapasBase(mapa);

    // Los 14 distritos pintados: linea continua = limite oficial; linea
    // punteada = area aproximada (ver lib/distritosElAlto.ts).
    const capaDistritos = L.featureGroup().addTo(mapa);
    capaDistritosRef.current = capaDistritos;
    for (const d of DISTRITOS_EL_ALTO) {
      const anillos = d.limite ? [d.limite] : d.area ?? [];
      if (anillos.length > 0) {
        const poligono = L.polygon(
          anillos.map((anillo) => anillo.map(([x, y]) => [y, x] as [number, number])),
          {
            color: COLOR_DISTRITO[d.numero],
            weight: d.limite ? 2.5 : 1.5,
            dashArray: d.limite ? undefined : '6 4',
            fillColor: COLOR_DISTRITO[d.numero],
            fillOpacity: 0.18,
          },
        )
          .bindTooltip(`Distrito ${d.numero}${d.limite ? ' (límite oficial)' : ' (área aproximada)'}`, { sticky: true })
          .addTo(capaDistritos);
        poligonosRef.current.set(d.numero, poligono);
      }
      if (d.centro) {
        // Etiqueta "D1".."D14" en el centro de referencia de cada distrito.
        L.marker(d.centro, {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: `<span style="display:inline-block;transform:translate(-50%,-50%);background:${COLOR_DISTRITO[d.numero]};color:#fff;font:700 11px sans-serif;padding:2px 7px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap">D${d.numero}</span>`,
          }),
        }).addTo(mapa);
      }
    }
    capaLocalesRef.current = L.layerGroup().addTo(mapa);
    // Encuadra todo El Alto.
    if (capaDistritos.getLayers().length > 0) mapa.fitBounds(capaDistritos.getBounds(), { padding: [10, 10] });

    return () => {
      mapa.remove();
      mapaRef.current = null;
      poligonosRef.current.clear();
    };
  }, []);

  // Locales: circulo con el color de su estado.
  useEffect(() => {
    const capa = capaLocalesRef.current;
    if (!capa) return;
    capa.clearLayers();
    for (const l of locales) {
      L.circleMarker([l.latitud, l.longitud], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: COLOR_ESTADO[l.estado],
        fillOpacity: 0.95,
      })
        .bindPopup(popupLocal(l))
        .addTo(capa);
    }
    const mapa = mapaRef.current;
    if (ajustarALocales && mapa && locales.length > 0) {
      mapa.fitBounds(L.latLngBounds(locales.map((l) => [l.latitud, l.longitud] as [number, number])), {
        padding: [30, 30],
        maxZoom: 16,
      });
    }
  }, [locales, ajustarALocales]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !enfoque) return;
    if (enfoque.lat !== undefined && enfoque.lng !== undefined) {
      mapa.flyTo([enfoque.lat, enfoque.lng], 17);
      return;
    }
    const d = DISTRITOS_EL_ALTO.find((x) => x.numero === enfoque.distrito);
    const poligono = d ? poligonosRef.current.get(d.numero) : undefined;
    if (poligono) mapa.flyToBounds(poligono.getBounds(), { padding: [20, 20] });
    else if (d?.centro) mapa.flyTo(d.centro, 14);
  }, [enfoque]);

  // El alto va en un contenedor: globals.css le da height: 100% a .leaflet-container.
  return (
    <div className={`${alto} w-full rounded-2xl overflow-hidden border border-morado-100`}>
      <div ref={contenedorRef} className="h-full w-full" />
    </div>
  );
}
