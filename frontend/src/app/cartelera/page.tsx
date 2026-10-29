'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import TarjetaEvento, { EventoCartelera } from '@/components/TarjetaEvento';

type Periodo = 'todos' | 'hoy' | 'semana' | 'mes';

const PERIODOS: { clave: Periodo; texto: string }[] = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'hoy', texto: 'Hoy' },
  { clave: 'semana', texto: 'Próximos 7 días' },
  { clave: 'mes', texto: 'Próximos 30 días' },
];

const DIA_MS = 24 * 60 * 60 * 1000;

// Fecha (AAAA-MM-DD) en hora de Bolivia, para comparar "hoy" sin errores de zona horaria.
const diaBolivia = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });

export default function CarteleraPage() {
  const [eventos, setEventos] = useState<EventoCartelera[] | null>(null);
  const [error, setError] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [distrito, setDistrito] = useState<number | 0>(0);

  useEffect(() => {
    api<EventoCartelera[]>('/eventos/cartelera')
      .then(setEventos)
      .catch((e) => setError(e.message || 'No se pudo cargar la cartelera.'));
  }, []);

  const distritos = useMemo(() => {
    const mapa = new Map<number, string>();
    eventos?.forEach((e) => e.local && mapa.set(e.local.zona.distritoNumero, e.local.zona.nombreZonaPrincipal));
    return [...mapa.entries()].sort((a, b) => a[0] - b[0]);
  }, [eventos]);

  const visibles = useMemo(() => {
    if (!eventos) return [];
    const ahora = Date.now();
    const hoy = diaBolivia(new Date());
    return eventos.filter((e) => {
      const inicio = new Date(e.fechaInicio).getTime();
      if (distrito && e.local?.zona.distritoNumero !== distrito) return false;
      if (periodo === 'hoy') return diaBolivia(new Date(e.fechaInicio)) === hoy;
      if (periodo === 'semana') return inicio <= ahora + 7 * DIA_MS;
      if (periodo === 'mes') return inicio <= ahora + 30 * DIA_MS;
      return true;
    });
  }, [eventos, periodo, distrito]);

  return (
    <div className="pb-10">
      <div className="bg-gradient-to-br from-morado-800 via-morado-700 to-morado-900 relative overflow-hidden">
        <div className="contenedor py-10 relative z-10">
          <p className="inline-block text-[11px] font-bold uppercase tracking-widest text-dorado-400 bg-white/10 rounded-full px-3 py-1 mb-3">
            Cartelera de los cholets
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">¿Qué hay para hacer en El Alto?</h1>
          <p className="text-morado-100 max-w-2xl">
            Fiestas, presentaciones de grupos, prestes y eventos de los cholets y salones verificados.
          </p>
        </div>
        <div className="franja-andina absolute bottom-0 left-0 right-0" />
      </div>

      <div className="contenedor pt-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {PERIODOS.map((p) => (
            <button
              key={p.clave}
              onClick={() => setPeriodo(p.clave)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors ${
                periodo === p.clave
                  ? 'bg-morado-700 text-white border-morado-700'
                  : 'bg-white text-morado-700 border-morado-200 hover:border-morado-400'
              }`}
            >
              {p.texto}
            </button>
          ))}
          {distritos.length > 1 && (
            <select
              className="input-campo !w-auto ml-auto"
              value={distrito}
              onChange={(e) => setDistrito(Number(e.target.value))}
              aria-label="Filtrar por distrito"
            >
              <option value={0}>Todos los distritos</option>
              {distritos.map(([n, nombre]) => (
                <option key={n} value={n}>
                  D{n} · {nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {!eventos && !error && <p className="text-morado-500">Cargando cartelera…</p>}
        {eventos && visibles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-morado-200 bg-morado-50/50 p-8 text-center text-morado-600">
            {eventos.length === 0
              ? 'Todavía no hay eventos publicados. ¡Vuelve pronto!'
              : 'No hay eventos para este filtro. Prueba con otro periodo o distrito.'}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {visibles.map((e) => (
            <TarjetaEvento key={e.id} evento={e} />
          ))}
        </div>
      </div>
    </div>
  );
}
