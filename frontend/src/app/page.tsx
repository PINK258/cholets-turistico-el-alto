'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Local, Zona } from '@/lib/types';
import LocalCard from '@/components/LocalCard';
import CarruselInicio from '@/components/CarruselInicio';
import Link from 'next/link';
import Contadores from '@/components/inicio/Contadores';
import TituloSeccion from '@/components/ui/TituloSeccion';
import Revelar from '@/components/ui/Revelar';
import EsqueletoTarjeta from '@/components/ui/EsqueletoTarjeta';
import Icono from '@/components/Icono';

// useSearchParams necesita un limite de Suspense en Next 16.
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <Inicio />
    </Suspense>
  );
}

function Inicio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // La zona elegida vive en la URL (/?zona=<id>): asi el chatbot puede abrir
  // "los locales de Rio Seco" y el enlace se puede compartir.
  const zonaSeleccionada = searchParams.get('zona') ?? '';
  const setZonaSeleccionada = (id: string) =>
    router.replace(id ? `/?zona=${encodeURIComponent(id)}` : '/', { scroll: false });
  const filtrosRef = useRef<HTMLDivElement>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Fotos de portada de los locales (para la diapositiva de bienvenida).
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);
  // Todos los locales (sin filtro de zona), para las cifras de la portada.
  const [todosLocales, setTodosLocales] = useState<Local[] | null>(null);

  useEffect(() => {
    api<Zona[]>('/zonas').then(setZonas).catch(() => {});
    api<Local[]>('/locales')
      .then((todos) => {
        setTodosLocales(todos);
        setFotosLocales(todos.flatMap((l) => (l.fotos[0] ? [l.fotos[0].url] : [])));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    setError('');
    const query = zonaSeleccionada ? `?zonaId=${encodeURIComponent(zonaSeleccionada)}` : '';
    api<Local[]>(`/locales${query}`)
      .then(setLocales)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [zonaSeleccionada]);

  // Al llegar con una zona (p. ej. desde el chatbot) se baja hasta los filtros y
  // se centra el boton de esa zona, que puede estar fuera de vista a la derecha.
  useEffect(() => {
    if (!zonaSeleccionada || zonas.length === 0) return;
    filtrosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    filtrosRef.current
      ?.querySelector<HTMLElement>(`[data-zona="${CSS.escape(zonaSeleccionada)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [zonaSeleccionada, zonas.length]);

  return (
    <div>
      {/* Bienvenida + eventos de la cartelera, con animacion tipo cine.
          letra-sistema: el hero conserva su tipografia original. */}
      <div className="letra-sistema">
        <CarruselInicio
          fotosLocales={fotosLocales}
          alExplorar={() => filtrosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>

      {/* Presentacion corta + cifras reales de la plataforma. */}
      <section className="py-16 sm:py-24">
        <div className="contenedor grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <Revelar>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-dorado-600 mb-3">Cholets Turístico El Alto</p>
            <h2 className="font-titulo text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] text-morado-900">
              El lugar para tu próxima fiesta está en El Alto.
            </h2>
            <span className="linea-acento visible" aria-hidden />
            <p className="mt-5 text-lg text-morado-700/80 max-w-xl">
              Salones y cholets verificados por el G.A.M.E.A., con fotos, servicios, capacidad y cómo llegar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cartelera" className="boton-primario">
                Ver la cartelera <span className="flecha" aria-hidden>→</span>
              </Link>
              <Link href="/registrar-local" className="boton-secundario">
                Registra tu local
              </Link>
            </div>
          </Revelar>
          <Revelar retraso={120}>
            <Contadores locales={todosLocales} zonas={zonas} />
          </Revelar>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="contenedor scroll-mt-24" ref={filtrosRef}>
          <TituloSeccion
            etiqueta="Explora El Alto"
            titulo="Locales y cholets"
            descripcion="Elige una zona para ver los salones, cholets y puntos turísticos verificados por el G.A.M.E.A."
          />
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
            <button
              onClick={() => setZonaSeleccionada('')}
              className={`chip-zona ${zonaSeleccionada === '' ? 'chip-zona-activa' : ''}`}
            >
              Todas las zonas
            </button>
            {zonas.map((z) => (
              <button
                key={z.id}
                data-zona={z.id}
                onClick={() => setZonaSeleccionada(z.id)}
                className={`chip-zona ${zonaSeleccionada === z.id ? 'chip-zona-activa' : ''}`}
              >
                D{z.distritoNumero} · {z.nombreZonaPrincipal}
              </button>
            ))}
          </div>

          {error && <p className="text-red-600">{error}</p>}
          {!cargando && locales.length === 0 && !error && (
            <div className="text-center py-14">
              <span className="flotar inline-flex w-16 h-16 rounded-2xl bg-morado-100 text-morado-700 items-center justify-center mb-4">
                <Icono nombre="building-complex" className="h-8 w-8" />
              </span>
              <p className="font-titulo text-lg font-bold text-morado-900">Todavía no hay locales en esta zona</p>
              <p className="text-morado-600 mt-1">Prueba con otra zona o vuelve pronto: se suman locales cada semana.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {cargando
              ? Array.from({ length: 4 }, (_, i) => <EsqueletoTarjeta key={i} />)
              : locales.map((local, i) => (
                  <Revelar key={local.id} retraso={(i % 4) * 70}>
                    <LocalCard local={local} />
                  </Revelar>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
