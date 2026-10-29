'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Resena, ResenasDeLocal } from '@/lib/types';
import AvatarUsuario from '@/components/AvatarUsuario';
import { Estrellas, SelectorEstrellas, TEXTO_CALIFICACION } from '@/components/Estrellas';
import { CRITERIOS } from '@/lib/servicios';
import { ConIconos } from '@/components/Icono';

const MAXIMO_COMENTARIO = 500;
// Cuanto hay que mantener presionado el propio comentario para editarlo.
const PRESION_LARGA_MS = 600;

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Seccion de reseñas de un local: resumen de estrellas, formulario para
// calificar (estilo chat) y los comentarios de los visitantes.
export default function ResenasLocal({
  localId,
  anfitrionId,
  onResumen,
}: {
  localId: string;
  anfitrionId: string;
  onResumen?: (resumen: { promedio: number | null; total: number }) => void;
}) {
  const { usuario, token } = useAuth();
  const [datos, setDatos] = useState<ResenasDeLocal | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState('');
  // Estrellas por criterio (0 = sin calificar ese aspecto).
  const [porCriterio, setPorCriterio] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  // La reseña propia se publica y queda fija; solo con una presion larga sobre
  // ella se vuelve a abrir el formulario para modificarla.
  const [editando, setEditando] = useState(false);
  const [presionando, setPresionando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formularioRef = useRef<HTMLFormElement>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api<ResenasDeLocal>(`/locales/${localId}/resenas`);
      setDatos(d);
      onResumen?.({ promedio: d.promedio, total: d.total });
      setErrorCarga('');
    } catch (e: any) {
      setErrorCarga(e.message || 'No se pudieron cargar las reseñas.');
    }
    // onResumen cambia en cada render del padre; solo importa el local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const mia = datos?.resenas.find((r) => r.usuario.id === usuario?.id);

  const empezarEdicion = () => {
    if (!mia) return;
    setCalificacion(mia.calificacion);
    setComentario(mia.comentario ?? '');
    setPorCriterio(Object.fromEntries(CRITERIOS.map((c) => [c.id, mia[c.id] ?? 0])));
    setError('');
    setAviso('');
    setEditando(true);
    // Se espera a que aparezca el formulario para llevarlo a la vista.
    setTimeout(() => formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const iniciarPresion = () => {
    setPresionando(true);
    temporizador.current = setTimeout(() => {
      setPresionando(false);
      empezarEdicion();
    }, PRESION_LARGA_MS);
  };
  const cancelarPresion = () => {
    setPresionando(false);
    if (temporizador.current) clearTimeout(temporizador.current);
  };
  useEffect(() => cancelarPresion, []);

  const esDuenio = usuario?.id === anfitrionId;
  const esModerador = usuario?.rol === 'OPERADOR' || usuario?.rol === 'ADMIN';

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAviso('');
    if (calificacion === 0) return setError('Elige de 1 a 5 estrellas.');
    setEnviando(true);
    try {
      await api(`/locales/${localId}/resenas`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          calificacion,
          comentario,
          // Solo los aspectos calificados.
          ...Object.fromEntries(CRITERIOS.filter((c) => (porCriterio[c.id] ?? 0) > 0).map((c) => [c.id, porCriterio[c.id]])),
        }),
      });
      setAviso(mia ? 'Tu reseña se actualizó.' : '¡Gracias! Tu reseña ya está publicada.');
      setEditando(false);
      await cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo publicar la reseña.');
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (resena: Resena) => {
    const propia = resena.usuario.id === usuario?.id;
    if (!confirm(propia ? '¿Eliminar tu reseña?' : `¿Eliminar la reseña de ${resena.usuario.nombre}?`)) return;
    setError('');
    try {
      await api(propia ? `/locales/${localId}/resenas` : `/operador/resenas/${resena.id}`, {
        method: 'DELETE',
        token,
      });
      if (propia) {
        setCalificacion(0);
        setComentario('');
        setEditando(false);
        setAviso('Eliminaste tu reseña.');
      }
      await cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar la reseña.');
    }
  };

  const maximo = Math.max(1, ...(datos?.distribucion.map((d) => d.cantidad) ?? [0]));

  return (
    <section id="resenas" className="scroll-mt-24">
      <h2 className="text-lg font-bold text-morado-900 mb-3">Calificaciones y comentarios</h2>

      {errorCarga && <p className="text-sm text-red-600">{errorCarga}</p>}

      {datos && (
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-center border border-morado-100 rounded-2xl p-4 bg-white">
          <div className="text-center sm:pr-5 sm:border-r border-morado-100">
            <p className="text-4xl font-extrabold text-morado-900 leading-none">
              {datos.promedio !== null ? datos.promedio.toFixed(1) : '—'}
            </p>
            <div className="mt-1.5">
              <Estrellas valor={datos.promedio ?? 0} tamano={18} />
            </div>
            <p className="text-xs text-morado-500 mt-1">
              {datos.total === 0 ? 'Aún sin reseñas' : `${datos.total} reseña${datos.total > 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="space-y-1">
            {datos.distribucion.map((d) => (
              <div key={d.estrellas} className="flex items-center gap-2 text-xs text-morado-700">
                <span className="w-3 text-right">{d.estrellas}</span>
                <span className="text-dorado-500" aria-hidden>★</span>
                <div className="flex-1 h-2 rounded-full bg-morado-50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-dorado-500 transition-all"
                    style={{ width: `${(d.cantidad / maximo) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-morado-500 tabular-nums">
                  {datos.total ? Math.round((d.cantidad / datos.total) * 100) : 0}% ({d.cantidad})
                </span>
              </div>
            ))}
          </div>
          {/* Promedio por criterio (solo los que tienen votos) */}
          {datos.criterios && datos.criterios.some((c) => c.votos > 0) && (
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-morado-100">
              {CRITERIOS.map((c) => {
                const dato = datos.criterios!.find((x) => x.criterio === c.id);
                return (
                  <div key={c.id} className="text-xs">
                    <p className="text-morado-600">
                      <ConIconos texto={c.icono} /> {c.nombre}
                    </p>
                    <p className="text-lg font-bold text-morado-900 tabular-nums">{dato?.promedio !== null && dato?.promedio !== undefined ? dato.promedio.toFixed(1) : '—'}</p>
                    <div className="h-1.5 rounded-full bg-morado-50 overflow-hidden">
                      <div className="h-full rounded-full bg-dorado-500" style={{ width: `${((dato?.promedio ?? 0) / 5) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Formulario para calificar */}
      <div className="mt-4">
        {!usuario ? (
          <div className="rounded-2xl border border-dashed border-morado-200 bg-morado-50/50 p-4 text-sm text-morado-700">
            <Link href="/login" className="boton-texto font-semibold">Inicia sesión</Link> o{' '}
            <Link href="/registro?tipo=usuario" className="boton-texto font-semibold">crea tu cuenta</Link> para
            calificar este local y dejar tu comentario.
          </div>
        ) : esDuenio ? (
          <p className="rounded-2xl border border-morado-100 bg-morado-50/50 p-4 text-sm text-morado-600">
            Este es tu local: aquí ves lo que opinan tus visitantes, pero no puedes calificarlo tú mismo.
          </p>
        ) : mia && !editando ? (
          <div className="space-y-1">
            {aviso && <p className="text-sm text-green-700">{aviso}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-morado-500">
              Ya calificaste este local. Mantén presionado tu comentario para modificarlo.
            </p>
          </div>
        ) : (
          <form ref={formularioRef} onSubmit={publicar} className="rounded-2xl border border-morado-200 bg-white p-4 shadow-card">
            <div className="flex items-start gap-3">
              <AvatarUsuario url={usuario.avatarUrl} nombre={usuario.nombre} apellido={usuario.apellidoPaterno} tamano="w-10 h-10 text-xs" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-semibold text-morado-900">
                  {editando ? 'Modifica tu reseña' : `${usuario.nombre}, ¿qué te pareció este local?`}
                </p>
                <SelectorEstrellas valor={calificacion} onCambiar={setCalificacion} />
                <details className="rounded-xl border border-morado-100 bg-morado-50/40 px-3 py-2">
                  <summary className="text-xs font-semibold text-morado-700 cursor-pointer">Califica por aspectos (opcional)</summary>
                  <div className="mt-2 space-y-1.5">
                    {CRITERIOS.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-xs text-morado-800">
                        <span>
                          <ConIconos texto={c.icono} /> {c.nombre}
                        </span>
                        <SelectorEstrellas valor={porCriterio[c.id] ?? 0} onCambiar={(v) => setPorCriterio((p) => ({ ...p, [c.id]: v }))} tamano={18} />
                      </div>
                    ))}
                  </div>
                </details>
                <div className="relative">
                  <textarea
                    className="input-campo pr-14"
                    rows={3}
                    maxLength={MAXIMO_COMENTARIO}
                    placeholder="Cuenta tu experiencia: atención, comida, ambiente, música… (opcional)"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-morado-400">
                    {comentario.length}/{MAXIMO_COMENTARIO}
                  </span>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {aviso && <p className="text-sm text-green-700">{aviso}</p>}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {editando && mia && (
                    <>
                      <button type="button" onClick={() => eliminar(mia)} className="mr-auto text-xs text-red-600 hover:underline">
                        Eliminar mi reseña
                      </button>
                      <button type="button" onClick={() => setEditando(false)} className="boton-secundario-sm">
                        Cancelar
                      </button>
                    </>
                  )}
                  <button type="submit" className="boton-primario-sm" disabled={enviando || calificacion === 0}>
                    {enviando ? 'Guardando…' : editando ? 'Actualizar comentario' : 'Publicar reseña'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comentarios de los visitantes, como una conversacion */}
      {datos && datos.resenas.length > 0 && (
        <ul className="mt-5 space-y-3">
          {datos.resenas.map((r) => {
            const propia = r.usuario.id === usuario?.id;
            const editada = new Date(r.actualizadoEn).getTime() - new Date(r.creadoEn).getTime() > 60_000;
            return (
              <li key={r.id} className="flex items-start gap-3">
                <AvatarUsuario url={r.usuario.avatarUrl} nombre={r.usuario.nombre} apellido={r.usuario.apellidoPaterno} tamano="w-10 h-10 text-xs" />
                <div
                  className={`flex-1 min-w-0 rounded-2xl rounded-tl-sm px-4 py-3 border transition-all ${
                    propia
                      ? `bg-morado-50 border-morado-200 cursor-pointer select-none ${
                          presionando ? 'scale-[0.98] ring-2 ring-morado-400' : ''
                        } ${editando ? 'opacity-50' : ''}`
                      : 'bg-white border-morado-100'
                  }`}
                  {...(propia && !editando
                    ? {
                        // Presion larga (mouse o dedo) para editar. Con teclado: Enter.
                        onPointerDown: iniciarPresion,
                        onPointerUp: cancelarPresion,
                        onPointerLeave: cancelarPresion,
                        onPointerCancel: cancelarPresion,
                        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                        onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && empezarEdicion(),
                        tabIndex: 0,
                        role: 'button',
                        title: 'Mantén presionado para modificar tu reseña',
                      }
                    : {})}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-semibold text-morado-900">
                      {r.usuario.nombre} {r.usuario.apellidoPaterno}
                      {propia && <span className="ml-1 text-[11px] font-medium text-morado-500">(tú)</span>}
                    </p>
                    <Estrellas valor={r.calificacion} tamano={14} />
                    <span className="text-[11px] font-medium text-dorado-600">{TEXTO_CALIFICACION[r.calificacion]}</span>
                  </div>
                  {r.comentario && (
                    <p className="text-sm text-morado-800 mt-1 whitespace-pre-wrap break-words">{r.comentario}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-morado-400">
                    <span>
                      {fecha(r.creadoEn)}
                      {editada && ' · editada'}
                    </span>
                    {propia && !editando && <span className="text-morado-400">· mantén presionado para editar</span>}
                    {!propia && esModerador && (
                      <button type="button" onClick={() => eliminar(r)} className="text-red-600 hover:underline">
                        Eliminar (moderación)
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
