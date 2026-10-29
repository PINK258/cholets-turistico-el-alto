'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, urlArchivo } from '@/lib/api';
import { Local } from '@/lib/types';
import ImagenEvento from '@/components/ImagenEvento';
import SelectorCategoriaEvento from '@/components/SelectorCategoriaEvento';
import type { CategoriaEvento } from '@/lib/types';
import Icono, { ConIconos } from '@/components/Icono';

type EventoOperador = {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string | null;
  lugar: string | null;
  aficheUrl: string | null;
  bannerUrl: string | null;
  categoria?: { id: string; nombre: string } | null;
  publicarDesde: string | null;
  publicarHasta: string | null;
  creadoPor: string | null;
  local: { id: string; nombre: string; zona: { distritoNumero: number; nombreZonaPrincipal: string } } | null;
  autor: { nombre: string; apellidoPaterno: string } | null;
};

const VACIO = {
  titulo: '',
  categoriaId: '',
  descripcion: '',
  localId: '',
  lugar: '',
  fechaInicio: '',
  fechaFin: '',
  publicarDesde: '',
  publicarHasta: '',
};

// <input type="datetime-local"> trabaja en hora local sin zona: se convierte
// a/desde ISO (UTC) para el servidor.
const aCampo = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const aIso = (campo: string) => (campo ? new Date(campo).toISOString() : '');
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const sumarHoras = (campo: string, horas: number) => aCampo(new Date(new Date(campo).getTime() + horas * 3600000).toISOString());

type Filtro = 'todos' | 'programados' | 'publicados';

// Panel del operador: publicar eventos en la cartelera (de un local o de un
// lugar cualquiera), con foto y programacion: aparecen y desaparecen solos
// (al desaparecer se borran). Se pueden editar cuantas veces se quiera.
export default function GestionEventos({ token }: { token: string | null }) {
  const [eventos, setEventos] = useState<EventoOperador[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState<EventoOperador | null>(null);
  // Afiche vertical (cartelera) e imagen horizontal (carrusel de la portada).
  const [foto, setFoto] = useState<File | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [banner, setBanner] = useState<File | null>(null);
  const [quitarBanner, setQuitarBanner] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [ahora, setAhora] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);

  const cargar = useCallback(() => {
    api<EventoOperador[]>('/operador/eventos', { token }).then(setEventos).catch(() => {});
  }, [token]);

  useEffect(() => {
    cargar();
    api<Local[]>('/locales').then(setLocales).catch(() => {});
    api<CategoriaEvento[]>('/categorias').then(setCategorias).catch(() => {});
    // Refresca la lista cada minuto: los vencidos desaparecen solos.
    const t = setInterval(() => {
      setAhora(Date.now());
      cargar();
    }, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const limpiar = () => {
    setForm(VACIO);
    setEditando(null);
    setFoto(null);
    setQuitarFoto(false);
    setBanner(null);
    setQuitarBanner(false);
    setError('');
  };

  const editar = (e: EventoOperador) => {
    setEditando(e);
    setForm({
      titulo: e.titulo,
      descripcion: e.descripcion,
      localId: e.local?.id ?? '',
      lugar: e.lugar ?? '',
      categoriaId: e.categoria?.id ?? '',
      fechaInicio: aCampo(e.fechaInicio),
      fechaFin: aCampo(e.fechaFin),
      publicarDesde: aCampo(e.publicarDesde),
      publicarHasta: aCampo(e.publicarHasta),
    });
    setFoto(null);
    setQuitarFoto(false);
    setBanner(null);
    setQuitarBanner(false);
    setError('');
    setAviso('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Atajos para la fecha en que desaparece.
  const finDelEvento = form.fechaFin || (form.fechaInicio ? sumarHoras(form.fechaInicio, 6) : '');
  const atajos: [string, string][] = form.fechaInicio
    ? [
        ['Al terminar el evento', finDelEvento],
        ['1 día después', sumarHoras(finDelEvento, 24)],
        ['1 semana después', sumarHoras(finDelEvento, 24 * 7)],
      ]
    : [];

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAviso('');
    if (!form.localId && !form.lugar.trim()) return setError('Elige un local o escribe el lugar del evento.');
    setGuardando(true);
    try {
      const body = new FormData();
      body.append('titulo', form.titulo);
      body.append('descripcion', form.descripcion);
      body.append('fechaInicio', aIso(form.fechaInicio));
      body.append('fechaFin', aIso(form.fechaFin));
      body.append('localId', form.localId);
      body.append('lugar', form.lugar);
      body.append('categoriaId', form.categoriaId);
      body.append('publicarDesde', aIso(form.publicarDesde));
      body.append('publicarHasta', aIso(form.publicarHasta));
      if (foto) body.append('afiche', foto);
      if (editando && quitarFoto && !foto) body.append('quitarAfiche', 'true');
      if (banner) body.append('banner', banner);
      if (editando && quitarBanner && !banner) body.append('quitarBanner', 'true');
      await api(editando ? `/operador/eventos/${editando.id}` : '/operador/eventos', {
        method: editando ? 'PATCH' : 'POST',
        token,
        body,
      });
      setAviso(editando ? 'Evento actualizado.' : 'Evento guardado.');
      limpiar();
      cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el evento.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (e: EventoOperador) => {
    if (!confirm(`¿Eliminar el evento "${e.titulo}"? Se borra también su foto.`)) return;
    try {
      await api(`/operador/eventos/${e.id}`, { method: 'DELETE', token });
      if (editando?.id === e.id) limpiar();
      cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar.');
    }
  };

  const estado = (e: EventoOperador) => {
    if (e.publicarDesde && new Date(e.publicarDesde).getTime() > ahora) {
      return { clave: 'programados' as const, texto: `⏳ Programado: aparece el ${fechaHora(e.publicarDesde)}`, clase: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    return { clave: 'publicados' as const, texto: '🟢 Publicado', clase: 'bg-green-50 text-green-800 border-green-200' };
  };

  const visibles = useMemo(
    () => eventos.filter((e) => filtro === 'todos' || estado(e).clave === filtro),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventos, filtro, ahora],
  );


  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,26rem)_1fr] gap-6 items-start">
      <form ref={formRef} onSubmit={guardar} className="bg-white border border-morado-100 rounded-2xl shadow-card p-4 space-y-3 scroll-mt-24">
        <h2 className="font-bold text-morado-900"><ConIconos texto={editando ? '✏️ Editar evento' : '➕ Nuevo evento para la cartelera'} /></h2>
        <input className="input-campo" placeholder="Título del evento" value={form.titulo} onChange={cambiar('titulo')} required maxLength={160} />
        <label className="block text-xs text-morado-600">
          Categoría del evento (opcional)
          <SelectorCategoriaEvento categorias={categorias} valor={form.categoriaId} onCambiar={(id) => setForm((f) => ({ ...f, categoriaId: id }))} />
        </label>
        <textarea className="input-campo" rows={3} placeholder="Descripción (grupos, precio, detalles…)" value={form.descripcion} onChange={cambiar('descripcion')} required />

        <div>
          <label className="etiqueta-campo">¿Dónde es?</label>
          <select className="input-campo" value={form.localId} onChange={cambiar('localId')}>
            <option value="">Sin local registrado (escribo el lugar)</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} · D{l.zona.distritoNumero}
              </option>
            ))}
          </select>
          <input
            className="input-campo mt-2"
            placeholder={form.localId ? 'Detalle del lugar (opcional, ej. salón principal)' : 'Lugar (ej. Plaza Ballivián, El Alto)'}
            value={form.lugar}
            onChange={cambiar('lugar')}
            required={!form.localId}
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-morado-600">
            Empieza
            <input type="datetime-local" className="input-campo" value={form.fechaInicio} onChange={cambiar('fechaInicio')} required />
          </label>
          <label className="text-xs text-morado-600">
            Termina (opcional)
            <input type="datetime-local" className="input-campo" value={form.fechaFin} onChange={cambiar('fechaFin')} />
          </label>
        </div>

        <div className="rounded-xl border border-morado-100 bg-morado-50/50 p-3 space-y-2">
          <p className="text-xs font-bold text-morado-800"><Icono nombre="calendar" /> Programar publicación</p>
          <label className="block text-xs text-morado-600">
            Aparece en la cartelera desde (vacío = enseguida)
            <input type="datetime-local" className="input-campo" value={form.publicarDesde} onChange={cambiar('publicarDesde')} />
          </label>
          <label className="block text-xs text-morado-600">
            Desaparece y se borra el (vacío = se oculta solo al terminar el evento)
            <input type="datetime-local" className="input-campo" value={form.publicarHasta} onChange={cambiar('publicarHasta')} />
          </label>
          {atajos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {atajos.map(([texto, valor]) => (
                <button
                  key={texto}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, publicarHasta: valor }))}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-morado-200 bg-white text-morado-700 hover:border-morado-400"
                >
                  {texto}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ImagenEvento
            forma="vertical"
            archivo={foto}
            urlActual={editando?.aficheUrl && !quitarFoto ? urlArchivo(editando.aficheUrl) : null}
            onElegir={(f) => {
              setFoto(f);
              setQuitarFoto(false);
            }}
            onQuitar={() => {
              setFoto(null);
              setQuitarFoto(true);
            }}
          />
          <ImagenEvento
            forma="horizontal"
            archivo={banner}
            urlActual={editando?.bannerUrl && !quitarBanner ? urlArchivo(editando.bannerUrl) : null}
            onElegir={(f) => {
              setBanner(f);
              setQuitarBanner(false);
            }}
            onQuitar={() => {
              setBanner(null);
              setQuitarBanner(true);
            }}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {aviso && <p className="text-sm text-green-700">{aviso}</p>}
        <div className="flex gap-2 justify-end">
          {editando && (
            <button type="button" onClick={limpiar} className="boton-secundario-sm">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={guardando} className="boton-primario-sm">
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar evento'}
          </button>
        </div>
      </form>

      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-bold text-morado-900 mr-auto">Eventos ({eventos.length})</h2>
          {(
            [
              ['todos', 'Todos'],
              ['programados', 'Programados'],
              ['publicados', 'Publicados'],
            ] as const
          ).map(([clave, texto]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setFiltro(clave)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${filtro === clave ? 'bg-morado-700 text-white' : 'bg-morado-50 text-morado-700'}`}
            >
              {texto}
            </button>
          ))}
        </div>
        {visibles.length === 0 && <p className="text-sm text-morado-500">No hay eventos en esta lista.</p>}
        <ul className="space-y-3">
          {visibles.map((e) => {
            const est = estado(e);
            return (
              <li key={e.id} className={`flex gap-3 rounded-2xl border bg-white p-3 ${editando?.id === e.id ? 'border-morado-400 ring-2 ring-morado-200' : 'border-morado-100'}`}>
                {e.aficheUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlArchivo(e.aficheUrl)} alt="" className="w-16 h-20 object-cover rounded-lg border border-morado-100 shrink-0" />
                ) : (
                  <span className="w-16 h-20 rounded-lg bg-morado-50 border border-dashed border-morado-200 flex items-center justify-center text-2xl shrink-0" aria-hidden>
                    <Icono nombre="party-popper" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-morado-900">{e.titulo}</p>
                  {e.categoria && <p className="text-[11px] text-morado-600"><Icono nombre="tag" /> {e.categoria.nombre}</p>}
                  <p className="text-xs text-morado-600">
                    {fechaHora(e.fechaInicio)} · <Icono nombre="map-pin" /> {e.local ? e.local.nombre : e.lugar}
                    {e.local && e.lugar ? ` (${e.lugar})` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${est.clase}`}><ConIconos texto={est.texto} /></span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border border-morado-100 bg-morado-50 text-morado-700">
                      <ConIconos texto={e.publicarHasta ? `🗑️ Se borra el ${fechaHora(e.publicarHasta)}` : 'Se oculta al terminar'} />
                    </span>
                  </div>
                  <p className="text-[11px] text-morado-400 mt-1">
                    {e.autor ? `Publicado por ${e.autor.nombre} ${e.autor.apellidoPaterno}` : 'Publicado por el dueño del local'}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs">
                    <button type="button" onClick={() => editar(e)} className="boton-texto">
                      <Icono nombre="pencil" /> Editar
                    </button>
                    <button type="button" onClick={() => eliminar(e)} className="text-red-600 hover:underline">
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
