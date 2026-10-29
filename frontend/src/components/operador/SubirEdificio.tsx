'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { api, urlArchivo } from '@/lib/api';
import { CategoriaEvento, Local, Zona } from '@/lib/types';
import { DIAS_SEMANA, HORA_APERTURA_DEFECTO, HORA_CIERRE_DEFECTO } from '@/lib/horario';
import { detectarDistrito, textoDeteccion } from '@/lib/distritosElAlto';
import { buscarLugar, mensajeUbicacion, obtenerUbicacion, ResultadoBusqueda } from '@/lib/ubicacion';
import SelectorHorario from '@/components/SelectorHorario';
import SelectorCategorias from '@/components/SelectorCategorias';
import { VistaPreviaFotos } from '@/components/VistaPreviaArchivos';
import type { DetalleDireccion } from '@/components/SeleccionarUbicacionMapa';
import Icono, { ConIconos } from '@/components/Icono';

const SeleccionarUbicacionMapa = dynamic(() => import('@/components/SeleccionarUbicacionMapa'), { ssr: false });

const CENTRO = { lat: -16.5027, lng: -68.1716 };
const MAXIMO_FOTOS = 10;
const VACIO = { nombreLocal: '', descripcion: '', direccion: '', zonaId: '' };

// Zona del distrito donde cae el punto (o la primera si no se detecta).
function zonaDelPunto(lat: number, lng: number, zonas: Zona[]) {
  const d = detectarDistrito(lat, lng);
  return (d && zonas.find((z) => z.distritoNumero === d.numero)?.id) || zonas[0]?.id || '';
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-wider text-dorado-600 mb-1">{titulo}</legend>
      {children}
    </fieldset>
  );
}

// "Subir edificio": el Operador G.A.M.E.A. carga sus propios locales o
// edificios. Se publican de una vez (sin revision) y los puede editar o borrar.
export default function SubirEdificio({ token }: { token: string | null }) {
  const [edificios, setEdificios] = useState<Local[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [catalogo, setCatalogo] = useState<CategoriaEvento[]>([]);
  const [form, setForm] = useState(VACIO);
  const [dias, setDias] = useState<string[]>(DIAS_SEMANA);
  const [apertura, setApertura] = useState(HORA_APERTURA_DEFECTO);
  const [cierre, setCierre] = useState(HORA_CIERRE_DEFECTO);
  const [categorias, setCategorias] = useState<Set<string>>(new Set());
  const [ubicacion, setUbicacion] = useState(CENTRO);
  const [enfoque, setEnfoque] = useState(0);
  const [detalleMapa, setDetalleMapa] = useState<DetalleDireccion | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [editando, setEditando] = useState<Local | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [avisoUbicacion, setAvisoUbicacion] = useState('');
  const [precisionGps, setPrecisionGps] = useState<number | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const cargar = useCallback(() => {
    api<Local[]>('/operador/edificios', { token }).then(setEdificios).catch(() => {});
  }, [token]);

  useEffect(() => {
    cargar();
    api<Zona[]>('/zonas').then((z) => {
      setZonas(z);
      setForm((f) => (f.zonaId ? f : { ...f, zonaId: zonaDelPunto(CENTRO.lat, CENTRO.lng, z) }));
    });
    api<CategoriaEvento[]>('/categorias').then(setCatalogo).catch(() => {});
  }, [cargar]);

  // Distrito segun el pin (limite oficial o area aproximada).
  const deteccion = useMemo(() => detectarDistrito(ubicacion.lat, ubicacion.lng), [ubicacion]);
  const zonaDetectada = deteccion ? zonas.find((x) => x.distritoNumero === deteccion.numero) : undefined;

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  // Cada vez que se mueve el pin se detecta el distrito y se elige su zona,
  // aunque antes se haya elegido otra a mano. Al abrir un edificio para
  // editarlo (detectar = false) se respeta la zona que ya tenia guardada.
  const moverPin = (lat: number, lng: number, acercar = false, detectar = true) => {
    setUbicacion({ lat, lng });
    if (acercar) setEnfoque((n) => n + 1);
    if (!detectar) return;
    const d = detectarDistrito(lat, lng);
    const z = d ? zonas.find((x) => x.distritoNumero === d.numero) : undefined;
    if (z) setForm((f) => ({ ...f, zonaId: z.id }));
  };

  const limpiar = () => {
    setForm({ ...VACIO, zonaId: zonaDelPunto(CENTRO.lat, CENTRO.lng, zonas) });
    setDias(DIAS_SEMANA);
    setApertura(HORA_APERTURA_DEFECTO);
    setCierre(HORA_CIERRE_DEFECTO);
    setCategorias(new Set());
    setUbicacion(CENTRO);
    setEnfoque((n) => n + 1);
    setFotos([]);
    setEditando(null);
    setError('');
  };

  const editar = (l: Local) => {
    setEditando(l);
    setForm({ nombreLocal: l.nombre, descripcion: l.descripcion, direccion: l.direccion, zonaId: l.zona.id });
    setDias(l.diasFuncionamiento?.length ? l.diasFuncionamiento : DIAS_SEMANA);
    setApertura(l.horaApertura || HORA_APERTURA_DEFECTO);
    setCierre(l.horaCierre || HORA_CIERRE_DEFECTO);
    setCategorias(new Set((l.categorias ?? []).map((c) => c.categoria.id)));
    moverPin(l.latitud, l.longitud, true, false);
    setFotos([]);
    setError('');
    setAviso('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const usarMiUbicacion = async () => {
    setAvisoUbicacion('');
    setPrecisionGps(null);
    setBuscandoGps(true);
    try {
      const u = await obtenerUbicacion({ onProgreso: (p) => setPrecisionGps(p.precision) });
      const dentro = detectarDistrito(u.lat, u.lng) !== null;
      if (dentro) {
        moverPin(u.lat, u.lng, true);
        setPrecisionGps(u.precision);
      } else {
        setPrecisionGps(null);
      }
      setAvisoUbicacion(mensajeUbicacion(u.precision, dentro));
    } catch (e: any) {
      setPrecisionGps(null);
      setAvisoUbicacion(e.message);
    } finally {
      setBuscandoGps(false);
    }
  };

  const buscar = async () => {
    if (!busqueda.trim()) return;
    setAvisoUbicacion('');
    try {
      const r = await buscarLugar(busqueda.trim());
      setResultados(r);
      if (r.length === 0) setAvisoUbicacion('No encontramos esa dirección en El Alto.');
    } catch (e: any) {
      setAvisoUbicacion(e.message);
    }
  };

  const quitarFotoGuardada = async (fotoId: string) => {
    if (!editando || !confirm('¿Quitar esta foto del edificio?')) return;
    try {
      const actualizado = await api<Local>(`/locales/${editando.id}/fotos/${fotoId}`, { method: 'DELETE', token });
      setEditando(actualizado);
      cargar();
    } catch (e: any) {
      setError(e.message || 'No se pudo quitar la foto.');
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAviso('');
    if (dias.length === 0) return setError('Elige al menos un día de atención.');
    if (!editando && fotos.length === 0) return setError('Sube al menos una foto del edificio.');
    setGuardando(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      body.append('latitud', String(ubicacion.lat));
      body.append('longitud', String(ubicacion.lng));
      body.append('horaApertura', apertura);
      body.append('horaCierre', cierre);
      dias.forEach((d) => body.append('diasFuncionamiento', d));
      categorias.forEach((c) => body.append('categoriaIds', c));
      fotos.forEach((f) => body.append('fotos', f));
      await api(editando ? `/operador/edificios/${editando.id}` : '/operador/edificios', {
        method: editando ? 'PUT' : 'POST',
        token,
        body,
      });
      setAviso(editando ? 'Edificio actualizado.' : 'Edificio publicado: ya aparece en la página principal.');
      limpiar();
      cargar();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el edificio.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (l: Local) => {
    if (!confirm(`¿Eliminar "${l.nombre}"? Se borran también sus fotos y eventos.`)) return;
    try {
      await api(`/operador/edificios/${l.id}`, { method: 'DELETE', token });
      if (editando?.id === l.id) limpiar();
      cargar();
    } catch (e: any) {
      setError(e.message || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
      <form ref={formRef} onSubmit={guardar} className="bg-white border border-morado-100 rounded-2xl shadow-card p-4 space-y-5 scroll-mt-24">
        <div>
          <h2 className="font-bold text-morado-900"><ConIconos texto={editando ? `✏️ Editar: ${editando.nombre}` : '🏢 Subir edificio'} /></h2>
          <p className="text-xs text-morado-500">
            Los edificios del G.A.M.E.A. se publican de inmediato, sin pasar por revisión.
          </p>
        </div>

        <Seccion titulo="Datos del edificio o espacio municipal">
          <input className="input-campo" placeholder="Nombre (ej. Casa de la Cultura, Edificio de la Subalcaldía D1)" value={form.nombreLocal} onChange={cambiar('nombreLocal')} required />
          <textarea className="input-campo" rows={3} placeholder="Descripción" value={form.descripcion} onChange={cambiar('descripcion')} required />
        </Seccion>

        <Seccion titulo="Horario de atención">
          <SelectorHorario dias={dias} onDias={setDias} apertura={apertura} onApertura={setApertura} cierre={cierre} onCierre={setCierre} />
        </Seccion>

        <Seccion titulo="Ubicación">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={usarMiUbicacion} disabled={buscandoGps} className="boton-secundario-sm">
              {buscandoGps
                ? precisionGps
                  ? `Afinando el GPS… ±${Math.round(precisionGps)} m`
                  : 'Buscando tu ubicación…'
                : <><Icono nombre="locate-fixed" /> Usar mi ubicación</>}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className="input-campo"
              placeholder="Buscar dirección o referencia"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  buscar();
                }
              }}
            />
            <button type="button" onClick={buscar} className="boton-secundario-sm shrink-0"><Icono nombre="search" /> Buscar</button>
          </div>
          {resultados && resultados.length > 0 && (
            <ul className="rounded-xl border border-morado-100 divide-y divide-morado-50 text-sm">
              {resultados.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-morado-50"
                    onClick={() => {
                      moverPin(r.lat, r.lng, true);
                      setResultados(null);
                    }}
                  >
                    <Icono nombre="map-pin" /> {r.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {avisoUbicacion && <p className="text-xs text-amber-700"><ConIconos texto={avisoUbicacion} /></p>}
          <SeleccionarUbicacionMapa
            lat={ubicacion.lat}
            lng={ubicacion.lng}
            onCambiar={(lat, lng) => {
              setPrecisionGps(null);
              moverPin(lat, lng);
            }}
            onDireccion={() => {}}
            onDetalle={setDetalleMapa}
            enfoque={enfoque}
            alto={340}
            precision={buscandoGps ? null : precisionGps}
          />
          <p className="text-xs text-morado-600">
            {detalleMapa?.calle ? `${detalleMapa.calle} · ` : ''}
            {detalleMapa?.barrio ? `${detalleMapa.barrio} · ` : ''}
            <strong>{textoDeteccion(deteccion)}</strong>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="input-campo"
              value={form.zonaId}
              onChange={cambiar('zonaId')}
              required
            >
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  D{z.distritoNumero} · {z.nombreZonaPrincipal}
                </option>
              ))}
            </select>
            <input className="input-campo" placeholder="Dirección (calle, número, referencia)" value={form.direccion} onChange={cambiar('direccion')} required />
          </div>
          {deteccion && zonaDetectada?.id === form.zonaId && (
            <p className="mt-1 text-xs text-green-700">
              <Icono nombre="check" /> Detectado automáticamente según el pin: Distrito {deteccion.numero}
              {deteccion.precision === 'exacta' ? ' (límite oficial)' : ' (aproximado)'}
            </p>
          )}
          {!deteccion && (
            <p className="mt-1 text-xs text-amber-700">
              No se pudo detectar el distrito en ese punto (¿está fuera de El Alto?). Revisa el pin o elige la zona.
            </p>
          )}
          {zonaDetectada && zonaDetectada.id !== form.zonaId && (
            <p className="text-xs text-amber-700">
              <Icono nombre="triangle-alert" /> El pin está en el Distrito {zonaDetectada.distritoNumero}, pero la zona elegida es otra.{' '}
              <button type="button" className="boton-texto" onClick={() => setForm((f) => ({ ...f, zonaId: zonaDetectada.id }))}>
                Cambiar a D{zonaDetectada.distritoNumero}
              </button>
            </p>
          )}
          {detalleMapa?.texto && detalleMapa.texto !== form.direccion && (
            <button type="button" className="text-xs boton-texto" onClick={() => setForm((f) => ({ ...f, direccion: detalleMapa.texto! }))}>
              <Icono nombre="map-pin" /> Usar la dirección del mapa: “{detalleMapa.texto}”
            </button>
          )}
        </Seccion>

        <Seccion titulo="Eventos que se realizan (opcional)">
          <p className="text-xs text-morado-500">
            Márcalos solo si el espacio se usa para eventos; para oficinas puedes dejarlo vacío.
          </p>
          <SelectorCategorias categorias={catalogo} seleccionadas={categorias} onCambiar={setCategorias} />
        </Seccion>

        <Seccion titulo="Fotos">
          {editando && editando.fotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {editando.fotos.map((f) => (
                <div key={f.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlArchivo(f.url)} alt="" className="w-20 h-20 object-cover rounded-lg border border-morado-100" />
                  <button
                    type="button"
                    onClick={() => quitarFotoGuardada(f.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs"
                    aria-label="Quitar foto"
                  >
                    <Icono nombre="x" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="input-campo file:mr-3 file:rounded-md file:border-0 file:bg-morado-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-morado-700"
            onChange={(e) => {
              const nuevas = Array.from(e.target.files ?? []);
              setFotos((a) => [...a, ...nuevas].slice(0, MAXIMO_FOTOS));
              e.target.value = '';
            }}
          />
          <VistaPreviaFotos fotos={fotos} onQuitar={(i) => setFotos((a) => a.filter((_, k) => k !== i))} />
        </Seccion>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {aviso && <p className="text-sm text-green-700">{aviso}</p>}
        <div className="flex justify-end gap-2">
          {editando && (
            <button type="button" onClick={limpiar} className="boton-secundario-sm">Cancelar</button>
          )}
          <button type="submit" disabled={guardando} className="boton-primario-sm">
            <ConIconos texto={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '🏢 Publicar edificio'} />
          </button>
        </div>
      </form>

      <aside className="bg-white border border-morado-100 rounded-2xl shadow-card">
        <h2 className="px-4 py-3 border-b border-morado-100 font-bold text-morado-900 text-sm">
          Edificios del G.A.M.E.A. ({edificios.length})
        </h2>
        {edificios.length === 0 && <p className="px-4 py-4 text-sm text-morado-500">Todavía no subiste ningún edificio.</p>}
        <ul className="divide-y divide-morado-50">
          {edificios.map((l) => (
            <li key={l.id} className={`p-3 flex gap-3 ${editando?.id === l.id ? 'bg-morado-50' : ''}`}>
              {l.fotos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlArchivo(l.fotos[0].url)} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              ) : (
                <span className="w-16 h-16 rounded-lg bg-morado-50 flex items-center justify-center text-2xl shrink-0" aria-hidden><Icono nombre="building-complex" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-morado-900 truncate">{l.nombre}</p>
                <p className="text-[11px] text-morado-500 truncate">D{l.zona.distritoNumero} · {l.zona.nombreZonaPrincipal}</p>
                <div className="flex gap-3 mt-1 text-xs">
                  <button type="button" onClick={() => editar(l)} className="boton-texto"><Icono nombre="pencil" /> Editar</button>
                  <Link href={`/locales/${l.id}`} className="boton-texto">Ver</Link>
                  <button type="button" onClick={() => eliminar(l)} className="text-red-600 hover:underline">Eliminar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
