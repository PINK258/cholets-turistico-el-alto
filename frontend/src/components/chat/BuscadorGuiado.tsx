'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SERVICIOS } from '@/lib/servicios';
import Icono, { ConIconos } from '@/components/Icono';

type Categoria = { id: string; grupo: string; nombre: string };
type Zona = { id: string; distritoNumero: number; nombreZonaPrincipal: string };

// Como se escribe cada servicio en la pregunta: el backend los reconoce con
// estas frases (backend/src/chatbot/consultas.ts).
const PALABRA_SERVICIO: Record<string, string> = {
  ESTACIONAMIENTO: 'estacionamiento',
  SONIDO: 'sonido',
  ILUMINACION: 'iluminación',
  ESCENARIO: 'escenario',
  PISTA_BAILE: 'pista de baile',
  COCINA: 'cocina',
  CATERING: 'catering',
  MOBILIARIO: 'mesas y sillas',
  WIFI: 'wifi',
  BANOS: 'baños',
  ACCESIBILIDAD: 'acceso para silla de ruedas',
  SEGURIDAD: 'seguridad',
  CALEFACCION: 'calefacción',
  AREA_INFANTIL: 'área para niños',
};

const INVITADOS = [50, 100, 200, 300, 500, 1000];
const PASOS = ['¿Qué vas a celebrar?', '¿En qué zona?', '¿Cuántos invitados?', '¿Qué necesitas?'];

// Se cargan una sola vez por visita.
let cacheCategorias: Categoria[] | null = null;
let cacheZonas: Zona[] | null = null;

const chip = (activo: boolean) =>
  `text-xs px-2.5 py-1.5 rounded-xl border transition-colors text-left ${
    activo ? 'bg-morado-700 text-white border-morado-700' : 'bg-white text-morado-700 border-morado-200 hover:bg-morado-50 hover:border-morado-400'
  }`;

// Buscador paso a paso dentro del chat: el usuario elige con botones el tipo de
// evento, la zona, los invitados y los servicios, y se arma la pregunta.
export default function BuscadorGuiado({ onBuscar, onCerrar }: { onBuscar: (pregunta: string) => void; onCerrar: () => void }) {
  const [paso, setPaso] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>(cacheCategorias ?? []);
  const [zonas, setZonas] = useState<Zona[]>(cacheZonas ?? []);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [zona, setZona] = useState<Zona | null>(null);
  const [invitados, setInvitados] = useState<number | null>(null);
  const [servicios, setServicios] = useState<string[]>([]);

  useEffect(() => {
    if (!cacheCategorias) api<Categoria[]>('/categorias').then((c) => setCategorias((cacheCategorias = c))).catch(() => {});
    if (!cacheZonas) api<Zona[]>('/zonas').then((z) => setZonas((cacheZonas = z))).catch(() => {});
  }, []);

  const grupos = [...new Set(categorias.map((c) => c.grupo))];

  const buscar = () => {
    let pregunta = '¿Qué locales hay';
    if (zona) pregunta += ` en el Distrito ${zona.distritoNumero}`;
    if (categoria) pregunta += ` para ${categoria.nombre}`;
    if (invitados) pregunta += ` para ${invitados} personas`;
    if (servicios.length > 0) {
      const palabras = servicios.map((s) => PALABRA_SERVICIO[s]);
      pregunta += ` con ${palabras.length === 1 ? palabras[0] : `${palabras.slice(0, -1).join(', ')} y ${palabras[palabras.length - 1]}`}`;
    }
    onBuscar(pregunta === '¿Qué locales hay' ? '¿Qué locales me recomiendas?' : `${pregunta}?`);
  };

  const elegido = [
    categoria && `🎊 ${categoria.nombre}`,
    zona && `📍 D${zona.distritoNumero}`,
    invitados && `👥 ${invitados}+`,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-morado-100 bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-semibold text-morado-500">
          <Icono nombre="search" /> Buscar un local · Paso {paso + 1} de {PASOS.length}
        </p>
        <button type="button" onClick={onCerrar} className="text-[11px] text-morado-600 hover:underline">
          Cancelar
        </button>
      </div>
      <div className="h-1 rounded-full bg-morado-100 mb-2 overflow-hidden">
        <div className="h-full bg-morado-600 transition-all" style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} />
      </div>
      <p className="text-sm font-semibold text-morado-900 mb-2">{PASOS[paso]}</p>
      {elegido.length > 0 && <p className="text-[11px] text-morado-500 mb-2"><ConIconos texto={elegido.join(' · ')} /></p>}

      {paso === 0 && (
        <div className="max-h-44 overflow-y-auto pr-1 space-y-2">
          {categorias.length === 0 && <p className="text-xs text-morado-400">Cargando…</p>}
          {grupos.map((g) => (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-wide text-morado-400 mb-1">{g}</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias
                  .filter((c) => c.grupo === g)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={chip(categoria?.id === c.id)}
                      onClick={() => {
                        setCategoria(c);
                        setPaso(1);
                      }}
                    >
                      {c.nombre}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {paso === 1 && (
        <div className="max-h-44 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5">
          {zonas.map((z) => (
            <button
              key={z.id}
              type="button"
              className={chip(zona?.id === z.id)}
              onClick={() => {
                setZona(z);
                setPaso(2);
              }}
            >
              <span className="font-semibold">D{z.distritoNumero}</span> · {z.nombreZonaPrincipal}
            </button>
          ))}
        </div>
      )}

      {paso === 2 && (
        <div className="grid grid-cols-3 gap-1.5">
          {INVITADOS.map((n) => (
            <button
              key={n}
              type="button"
              className={chip(invitados === n)}
              onClick={() => {
                setInvitados(n);
                setPaso(3);
              }}
            >
              <Icono nombre="users" /> {n}
              {n === 1000 ? '+' : ''}
            </button>
          ))}
        </div>
      )}

      {paso === 3 && (
        <div className="max-h-44 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
          {SERVICIOS.map((s) => {
            const activo = servicios.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={activo}
                className={chip(activo)}
                onClick={() => setServicios((v) => (activo ? v.filter((x) => x !== s.id) : [...v, s.id]))}
              >
                <ConIconos texto={s.icono} /> {s.nombre}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2.5">
        <button
          type="button"
          onClick={() => setPaso((p) => p - 1)}
          disabled={paso === 0}
          className="text-xs text-morado-600 hover:underline disabled:opacity-0"
        >
          ← Atrás
        </button>
        {paso < 3 ? (
          <button
            type="button"
            onClick={() => {
              // "Me da igual": se salta el paso sin elegir.
              if (paso === 0) setCategoria(null);
              if (paso === 1) setZona(null);
              if (paso === 2) setInvitados(null);
              setPaso((p) => p + 1);
            }}
            className="text-xs px-2.5 py-1 rounded-full border border-morado-200 text-morado-600 hover:bg-morado-50"
          >
            {paso === 0 ? 'Cualquier evento' : paso === 1 ? 'Cualquier zona' : 'No sé todavía'} →
          </button>
        ) : (
          <button type="button" onClick={buscar} className="boton-primario-sm !py-1.5">
            <Icono nombre="search" /> Buscar locales
          </button>
        )}
      </div>
    </div>
  );
}
