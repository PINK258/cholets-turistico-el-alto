'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Icono, { ConIconos } from '@/components/Icono';

type Denuncia = {
  id: string;
  motivo: string;
  detalle: string | null;
  estado: 'PENDIENTE' | 'REVISADA' | 'DESCARTADA';
  notaRevision: string | null;
  revisadoEn: string | null;
  creadoEn: string;
  local: {
    id: string;
    nombre: string;
    estado: string;
    zona: { distritoNumero: number; nombreZonaPrincipal: string };
    anfitrion: { nombre: string; apellidoPaterno: string; correo: string };
  };
  usuario: { nombre: string; apellidoPaterno: string; correo: string } | null;
  revisor: { nombre: string; apellidoPaterno: string } | null;
};

export const MOTIVO_DENUNCIA: Record<string, string> = {
  FALSO: 'El local no existe o es falso',
  INFORMACION_ENGANOSA: 'Información o fotos engañosas',
  CONTENIDO_INAPROPIADO: 'Contenido inapropiado u ofensivo',
  FRAUDE: 'Intento de estafa o cobro indebido',
  CERRADO: 'El local cerró definitivamente',
  OTRO: 'Otro motivo',
};

const ESTADO = {
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-800' },
  REVISADA: { texto: 'Revisada', clase: 'bg-green-100 text-green-800' },
  DESCARTADA: { texto: 'Descartada', clase: 'bg-morado-100 text-morado-700' },
};

// Bandeja de denuncias del Operador G.A.M.E.A.: las revisa o las descarta,
// con una nota de lo que se hizo.
export default function BandejaDenuncias({ token, onCambio }: { token: string | null; onCambio?: () => void }) {
  const [filtro, setFiltro] = useState<'PENDIENTE' | ''>('PENDIENTE');
  const [lista, setLista] = useState<Denuncia[]>([]);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [atendiendo, setAtendiendo] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    api<Denuncia[]>(`/operador/denuncias${filtro ? `?estado=${filtro}` : ''}`, { token })
      .then(setLista)
      .catch((e) => setError(e.message));
  }, [filtro, token]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  const atender = async (d: Denuncia, estado: 'REVISADA' | 'DESCARTADA') => {
    setAtendiendo(d.id);
    setError('');
    try {
      await api(`/operador/denuncias/${d.id}`, { method: 'PATCH', token, body: JSON.stringify({ estado, nota: notas[d.id]?.trim() || undefined }) });
      cargar();
      onCambio?.();
    } catch (e: any) {
      setError(e.message || 'No se pudo atender la denuncia.');
    } finally {
      setAtendiendo(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-morado-100 bg-white p-4">
        <div>
          <h2 className="font-bold text-morado-900"><Icono nombre="flag" className="h-5 w-5 text-red-600" /> Denuncias de locales</h2>
          <p className="text-xs text-morado-600">Avisos de los visitantes sobre locales falsos, engañosos o inapropiados. El dueño no sabe quién denunció.</p>
        </div>
        <div className="inline-flex rounded-full bg-morado-50 p-1 border border-morado-100 text-xs font-semibold">
          {(
            [
              ['PENDIENTE', 'Pendientes'],
              ['', 'Todas'],
            ] as const
          ).map(([v, t]) => (
            <button key={t} type="button" onClick={() => setFiltro(v)} className={`px-3 py-1.5 rounded-full ${filtro === v ? 'bg-morado-700 text-white' : 'text-morado-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lista.length === 0 && <p className="text-sm text-morado-500 text-center py-8"><ConIconos texto={filtro ? 'No hay denuncias pendientes. ✔' : 'Todavía no hay denuncias.'} /></p>}
      <ul className="space-y-3">
        {lista.map((d) => (
          <li key={d.id} className="rounded-2xl border border-morado-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-morado-900">
                  {d.local.nombre}{' '}
                  <span className="text-xs font-normal text-morado-500">
                    · D{d.local.zona.distritoNumero} {d.local.zona.nombreZonaPrincipal}
                  </span>
                </p>
                <p className="text-xs text-morado-600">
                  Dueño: {d.local.anfitrion.nombre} {d.local.anfitrion.apellidoPaterno} ({d.local.anfitrion.correo})
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO[d.estado].clase}`}>{ESTADO[d.estado].texto}</span>
            </div>
            <p className="mt-2 text-sm text-red-800 font-semibold"><Icono nombre="triangle-alert" /> {MOTIVO_DENUNCIA[d.motivo] ?? d.motivo}</p>
            {d.detalle && <p className="text-sm text-morado-800 mt-1 whitespace-pre-wrap">“{d.detalle}”</p>}
            <p className="text-[11px] text-morado-500 mt-1">
              Denunciado por {d.usuario ? `${d.usuario.nombre} ${d.usuario.apellidoPaterno} (${d.usuario.correo})` : 'una cuenta eliminada'} el{' '}
              {new Date(d.creadoEn).toLocaleString('es-BO')}
            </p>
            {d.estado === 'PENDIENTE' ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="input-campo !py-1.5 flex-1 min-w-[12rem]"
                  placeholder="Nota de lo que se hizo (opcional)"
                  value={notas[d.id] ?? ''}
                  onChange={(e) => setNotas((n) => ({ ...n, [d.id]: e.target.value }))}
                />
                <button type="button" onClick={() => atender(d, 'REVISADA')} disabled={atendiendo === d.id} className="boton-primario-sm !bg-green-700 hover:!bg-green-800">
                  <Icono nombre="check" /> Revisada
                </button>
                <button type="button" onClick={() => atender(d, 'DESCARTADA')} disabled={atendiendo === d.id} className="boton-secundario-sm">
                  Descartar
                </button>
                {d.local.estado === 'APROBADO' && (
                  <Link href={`/locales/${d.local.id}`} target="_blank" className="text-xs boton-texto">
                    Ver el local <Icono nombre="external-link" />
                  </Link>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-morado-600">
                {ESTADO[d.estado].texto} por {d.revisor ? `${d.revisor.nombre} ${d.revisor.apellidoPaterno}` : '—'}
                {d.revisadoEn && ` el ${new Date(d.revisadoEn).toLocaleString('es-BO')}`}
                {d.notaRevision && ` · Nota: ${d.notaRevision}`}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
