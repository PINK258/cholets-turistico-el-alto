'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { agregarCapasBase, iconoFoto, iconoMiUbicacion, iconoPin } from '@/lib/mapaBase';
import { buscarLugar, FiltroGps, obtenerUbicacion, ResultadoBusqueda } from '@/lib/ubicacion';
import { calcularRuta, metrosEntre, ModoRuta, Ruta, textoDistancia, textoDuracion } from '@/lib/rutas';
import Icono, { ConIconos } from '@/components/Icono';

// Mapa del local con "Cómo llegar": ruta dibujada, indicaciones paso a paso y
// un modo guía que sigue tu posición, avisa la siguiente maniobra y la puede
// decir en voz alta. Todo con Leaflet + OSRM (gratis, sin clave de API).

const SE_LLEGA_A_LA_MANIOBRA_M = 25;
const SE_SALIO_DE_LA_RUTA_M = 70;
const LLEGADA_M = 30;

function decir(texto: string, activa: boolean) {
  if (!activa || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-ES';
  window.speechSynthesis.speak(frase);
}

// Ventana al tocar el pin: foto grande, nombre y atajo a "Cómo llegar".
// Se arma con elementos del DOM (no HTML) porque el nombre lo escribe el dueño.
function contenidoPopup(nombre: string, foto: string) {
  const caja = document.createElement('div');
  const img = document.createElement('img');
  img.className = 'popup-local__foto';
  img.src = foto;
  img.alt = `Foto de ${nombre}`;
  img.loading = 'lazy';
  img.onerror = () => img.remove();
  const cuerpo = document.createElement('div');
  cuerpo.className = 'popup-local__cuerpo';
  const titulo = document.createElement('strong');
  titulo.className = 'popup-local__nombre';
  titulo.textContent = nombre;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'popup-local__boton';
  boton.textContent = '🧭 Cómo llegar';
  boton.onclick = () => document.getElementById('como-llegar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  cuerpo.append(titulo, boton);
  caja.append(img, cuerpo);
  return caja;
}

export default function MapaComoLlegar({
  lat,
  lng,
  nombre,
  foto,
}: {
  lat: number;
  lng: number;
  nombre: string;
  /** URL completa de la foto de portada del local; si no hay, se usa el pin morado. */
  foto?: string | null;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const capaRutaRef = useRef<L.LayerGroup | null>(null);
  const marcadorOrigenRef = useRef<L.Marker | null>(null);
  const eligiendoRef = useRef(false);
  const seguimientoRef = useRef<number | null>(null);
  const ultimoRecalculoRef = useRef(0);

  const [modo, setModo] = useState<ModoRuta>('pie');
  const [origen, setOrigen] = useState<[number, number] | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [eligiendo, setEligiendo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [guiando, setGuiando] = useState(false);
  const [pasoActual, setPasoActual] = useState(0);
  const [distanciaManiobra, setDistanciaManiobra] = useState<number | null>(null);
  const [voz, setVoz] = useState(true);
  const [llegaste, setLlegaste] = useState(false);
  // Precision (m) de la posicion filtrada durante la guia y aviso de señal debil.
  const [precisionGuia, setPrecisionGuia] = useState<number | null>(null);
  const [senalDebil, setSenalDebil] = useState(false);
  const destino: [number, number] = [lat, lng];

  // Mapa (una sola vez).
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el || (el as any)._leaflet_id) return;
    const mapa = L.map(el, { zoomControl: true }).setView([lat, lng], 16);
    mapaRef.current = mapa;
    agregarCapasBase(mapa);
    const etiqueta = document.createElement('span');
    etiqueta.textContent = nombre; // texto, no HTML: el nombre lo escribe el dueño
    const marcador = L.marker([lat, lng], {
      icon: foto ? iconoFoto(foto) : iconoPin(),
      title: nombre,
      alt: foto ? `Foto de ${nombre} en el mapa` : nombre,
      riseOnHover: true,
    })
      .addTo(mapa)
      .bindTooltip(etiqueta, { direction: 'top', permanent: true });
    if (foto) {
      marcador.bindPopup(contenidoPopup(nombre, foto), { className: 'popup-local', maxWidth: 260, closeButton: true });
      // Con la ventana abierta se oculta la etiqueta del nombre (ya aparece en la ventana).
      marcador.on('popupopen', () => marcador.closeTooltip());
      marcador.on('popupclose', () => marcador.openTooltip());
    }
    capaRutaRef.current = L.layerGroup().addTo(mapa);
    mapa.on('click', (e: L.LeafletMouseEvent) => {
      if (!eligiendoRef.current) return;
      eligiendoRef.current = false;
      setEligiendo(false);
      setOrigen([e.latlng.lat, e.latlng.lng]);
    });
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcador del punto de partida / posicion actual.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!origen) {
      marcadorOrigenRef.current?.remove();
      marcadorOrigenRef.current = null;
      return;
    }
    if (!marcadorOrigenRef.current) {
      marcadorOrigenRef.current = L.marker(origen, { icon: iconoMiUbicacion, zIndexOffset: 1000 })
        .bindTooltip(guiando ? 'Estás aquí' : 'Partida')
        .addTo(mapa);
    } else {
      marcadorOrigenRef.current.setLatLng(origen);
    }
  }, [origen, guiando]);

  const calcular = useCallback(
    async (desde: [number, number], encuadrar: boolean) => {
      setCargando(true);
      setAviso('');
      try {
        const r = await calcularRuta(desde, destino, modo);
        setRuta(r);
        setPasoActual(0);
        const capa = capaRutaRef.current;
        if (capa && mapaRef.current) {
          capa.clearLayers();
          L.polyline(r.linea, { color: '#ffffff', weight: 9, opacity: 0.9 }).addTo(capa);
          L.polyline(r.linea, { color: '#6117ab', weight: 5 }).addTo(capa);
          if (encuadrar) mapaRef.current.fitBounds(L.latLngBounds(r.linea), { padding: [40, 40] });
        }
      } catch (e: any) {
        setAviso(e.message || 'No se pudo calcular la ruta.');
      } finally {
        setCargando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modo, lat, lng],
  );

  // Recalcular al cambiar el punto de partida o el modo (fuera del modo guia).
  useEffect(() => {
    if (origen && !guiando) calcular(origen, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen, modo]);

  const desdeMiUbicacion = async () => {
    setAviso('');
    setCargando(true);
    try {
      // Punto de partida: hasta 10 s para afinar (o antes, si llega a ±50 m).
      const u = await obtenerUbicacion({ precisionObjetivo: 50, tiempoMax: 10000 });
      setOrigen([u.lat, u.lng]);
    } catch (e: any) {
      setAviso(e.message);
      setCargando(false);
    }
  };

  const elegirEnMapa = () => {
    eligiendoRef.current = true;
    setEligiendo(true);
    setAviso('');
  };

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setAviso('');
    try {
      const r = await buscarLugar(busqueda.trim());
      setResultados(r);
      if (r.length === 0) setAviso('No encontramos esa dirección en El Alto. Prueba con otra referencia.');
    } catch (err: any) {
      setAviso(err.message);
    }
  };

  // ---- Modo guia: sigue la posicion y avisa la siguiente maniobra ----
  const detenerGuia = useCallback(() => {
    if (seguimientoRef.current !== null) navigator.geolocation.clearWatch(seguimientoRef.current);
    seguimientoRef.current = null;
    setGuiando(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => detenerGuia, [detenerGuia]);

  const iniciarGuia = async () => {
    setAviso('');
    setLlegaste(false);
    try {
      // Valida permiso y contexto seguro; la primera lectura que sirva basta.
      const u = await obtenerUbicacion({ precisionObjetivo: 100, tiempoMax: 8000, promediar: false });
      // Cada lectura pasa por el filtro: suaviza saltos y descarta las malas.
      const filtro = new FiltroGps(modo === 'pie' ? 5 : 15);
      filtro.procesar(u);
      setPrecisionGuia(u.precision);
      setOrigen([u.lat, u.lng]);
      await calcular([u.lat, u.lng], false);
      setGuiando(true);
      mapaRef.current?.setView([u.lat, u.lng], 18);
      decir(`Iniciando la guía hacia ${nombre}.`, voz);
      seguimientoRef.current = navigator.geolocation.watchPosition(
        (p) => {
          const lectura = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy };
          const filtrada = filtro.procesar(lectura, p.timestamp);
          setSenalDebil(lectura.precision > 60);
          if (!filtrada) return; // lectura mala descartada
          setPrecisionGuia(filtrada.precision);
          setOrigen([filtrada.lat, filtrada.lng]);
        },
        () => setAviso('Se perdió la señal de ubicación. La guía sigue cuando vuelva.'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    } catch (e: any) {
      setAviso(e.message);
    }
  };

  // Cada nueva posicion durante la guia.
  useEffect(() => {
    if (!guiando || !origen || !ruta) return;
    mapaRef.current?.panTo(origen, { animate: true });

    if (metrosEntre(origen, destino) < LLEGADA_M) {
      setLlegaste(true);
      decir(`Llegaste a ${nombre}.`, voz);
      detenerGuia();
      return;
    }
    // ¿Se salio de la ruta? Se recalcula como mucho cada 15 s.
    const cercaDeLaRuta = ruta.linea.some((punto) => metrosEntre(origen, punto) < SE_SALIO_DE_LA_RUTA_M);
    if (!cercaDeLaRuta && Date.now() - ultimoRecalculoRef.current > 15000) {
      ultimoRecalculoRef.current = Date.now();
      decir('Recalculando la ruta.', voz);
      calcular(origen, false);
      return;
    }
    // Siguiente maniobra: la primera que todavia no se alcanzo.
    let indice = Math.max(pasoActual, 1);
    while (indice < ruta.pasos.length - 1 && metrosEntre(origen, ruta.pasos[indice].ubicacion) < SE_LLEGA_A_LA_MANIOBRA_M) {
      indice++;
    }
    const metros = metrosEntre(origen, ruta.pasos[Math.min(indice, ruta.pasos.length - 1)].ubicacion);
    setDistanciaManiobra(metros);
    if (indice !== pasoActual) {
      setPasoActual(indice);
      const paso = ruta.pasos[indice];
      decir(`En ${textoDistancia(metros)}, ${paso.texto.toLowerCase()}`, voz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen]);

  const verPaso = (indice: number) => {
    const paso = ruta?.pasos[indice];
    if (paso) mapaRef.current?.flyTo(paso.ubicacion, 18);
  };

  const quitarRuta = () => {
    detenerGuia();
    setOrigen(null);
    setRuta(null);
    capaRutaRef.current?.clearLayers();
    mapaRef.current?.setView([lat, lng], 16);
  };

  const proximo = ruta && guiando ? ruta.pasos[Math.min(Math.max(pasoActual, 1), ruta.pasos.length - 1)] : null;

  return (
    <div>
      {/* isolate: el recuadro de la guia (z-1000) queda dentro del mapa y no
          pasa por encima del menu al bajar la pagina. */}
      <div className="relative isolate">
        {/* La clase que cambia va en el envoltorio: si React cambia el className
            del div de Leaflet borra sus clases (leaflet-container...) y los
            mosaicos del mapa quedan con ancho 0. */}
        <div
          className={`h-[28rem] w-full rounded-2xl overflow-hidden border border-morado-100 ${
            eligiendo ? '[&_.leaflet-container]:!cursor-crosshair' : ''
          }`}
        >
          <div ref={contenedorRef} className="h-full w-full" />
        </div>
        {/* Indicacion grande durante la guia */}
        {proximo && (
          <div className="absolute top-3 left-14 right-14 z-[1000] rounded-2xl bg-morado-800/95 text-white shadow-lg px-4 py-3 flex items-center gap-3">
            <Icono nombre={proximo.icono} className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              {distanciaManiobra !== null && <p className="text-xs text-morado-200">En {textoDistancia(distanciaManiobra)}</p>}
              <p className="font-bold leading-tight">{proximo.texto}</p>
              {precisionGuia !== null && (
                <p className={`text-[11px] mt-0.5 ${senalDebil ? 'text-amber-300' : 'text-morado-200'}`}>
                  <ConIconos texto={senalDebil ? '⚠️ Señal GPS débil: ve a un lugar abierto' : `📡 GPS ±${Math.round(precisionGuia)} m`} />
                </p>
              )}
            </div>
          </div>
        )}
        {eligiendo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-white shadow px-4 py-1.5 text-sm font-semibold text-morado-800">
            Toca el mapa donde empieza tu recorrido
          </div>
        )}
      </div>

      <div id="como-llegar" className="scroll-mt-24 mt-3 rounded-2xl border border-morado-100 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-morado-900 mr-auto"><Icono nombre="compass" /> Cómo llegar</h3>
          <div className="inline-flex rounded-full bg-morado-50 p-1 border border-morado-100" role="radiogroup" aria-label="Cómo vas">
            {(
              [
                ['pie', '🚶 A pie'],
                ['auto', '🚗 En auto'],
              ] as const
            ).map(([clave, texto]) => (
              <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={modo === clave}
                disabled={guiando}
                onClick={() => setModo(clave)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${modo === clave ? 'bg-morado-700 text-white' : 'text-morado-700'}`}
              >
                <ConIconos texto={texto} />
              </button>
            ))}
          </div>
        </div>

        {!guiando && (
          <>
            <p className="text-xs text-morado-600 mt-2">¿Desde dónde sales?</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <button type="button" onClick={desdeMiUbicacion} disabled={cargando} className="boton-secundario-sm">
                <Icono nombre="locate-fixed" /> Desde mi ubicación
              </button>
              <button type="button" onClick={elegirEnMapa} className="boton-secundario-sm">
                <Icono nombre="mouse-pointer-click" /> Marcar en el mapa
              </button>
            </div>
            <form onSubmit={buscar} className="flex gap-2 mt-2">
              <input
                className="input-campo"
                placeholder="O escribe una dirección o lugar (ej. Plaza Ballivián)"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button type="submit" className="boton-secundario-sm shrink-0">Buscar</button>
            </form>
            {resultados && resultados.length > 0 && (
              <ul className="mt-2 rounded-xl border border-morado-100 divide-y divide-morado-50 text-sm">
                {resultados.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-morado-50"
                      onClick={() => {
                        setOrigen([r.lat, r.lng]);
                        setResultados(null);
                      }}
                    >
                      <Icono nombre="map-pin" /> {r.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {cargando && <p className="text-sm text-morado-500 mt-2">Calculando la ruta…</p>}
        {aviso && <p className="text-sm text-amber-700 mt-2">{aviso}</p>}
        {llegaste && <p className="text-sm font-semibold text-green-700 mt-2"><Icono nombre="party-popper" /> ¡Llegaste a {nombre}!</p>}

        {ruta && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-morado-900 mr-auto">
                <strong>{textoDistancia(ruta.distancia)}</strong> · {textoDuracion(ruta.duracion)} {modo === 'pie' ? 'a pie' : 'en auto'}
              </p>
              {!guiando ? (
                <button type="button" onClick={iniciarGuia} className="boton-primario-sm">
                  <Icono nombre="play" /> Iniciar guía
                </button>
              ) : (
                <button type="button" onClick={detenerGuia} className="boton-secundario-sm !text-red-700">
                  ■ Detener guía
                </button>
              )}
              <label className="text-xs text-morado-700 flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="accent-morado-700" checked={voz} onChange={(e) => setVoz(e.target.checked)} />
                <Icono nombre="volume-2" /> Voz
              </label>
              {!guiando && (
                <button type="button" onClick={quitarRuta} className="text-xs boton-texto">
                  Quitar ruta
                </button>
              )}
            </div>
            <ol className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-morado-100 divide-y divide-morado-50">
              {ruta.pasos.map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => verPaso(i)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm hover:bg-morado-50 ${
                      guiando && i === Math.max(pasoActual, 1) ? 'bg-morado-100 font-semibold' : ''
                    }`}
                  >
                    <Icono nombre={p.icono} className="h-5 w-5 shrink-0" />
                    <span className="flex-1 text-morado-900">{p.texto}</span>
                    {p.distancia > 0 && <span className="text-xs text-morado-500 shrink-0">{textoDistancia(p.distancia)}</span>}
                  </button>
                </li>
              ))}
            </ol>
            <p className="text-[11px] text-morado-400 mt-1">
              Rutas: OSRM / OpenStreetMap. La guía usa el GPS de tu celular y necesita abrir la página con https o en localhost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
