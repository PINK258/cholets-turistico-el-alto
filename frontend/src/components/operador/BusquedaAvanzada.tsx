'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { TIPOS_LOCAL } from '@/lib/tiposLocal';
import { SERVICIOS, servicio } from '@/lib/servicios';
import { FilaBusqueda, pdfFichaLocal, pdfResultadosBusqueda } from '@/lib/pdfFichaLocal';
import type { CategoriaEvento, Local, Zona } from '@/lib/types';
import Icono, { ConIconos } from '@/components/Icono';

type Resultado = { total: number; pagina: number; porPagina: number; filas: FilaBusqueda[] };

const ESTADOS = [
  { id: 'APROBADO', nombre: 'Aprobados', clase: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'PENDIENTE', nombre: 'En revisión', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'CORRECCION', nombre: 'En corrección', clase: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'RECHAZADO', nombre: 'Rechazados', clase: 'bg-red-50 text-red-700 border-red-200' },
];
const estadoDe = (id: string) => ESTADOS.find((e) => e.id === id);

type Filtros = {
  texto: string;
  distritos: number[];
  estados: string[];
  tipos: string[];
  categorias: string[];
  servicios: string[];
  aforoMin: string;
  licencia: '' | 'si' | 'no';
  desde: string;
  hasta: string;
  orden: 'reciente' | 'antiguo' | 'nombre';
};
const VACIOS: Filtros = { texto: '', distritos: [], estados: [], tipos: [], categorias: [], servicios: [], aforoMin: '', licencia: '', desde: '', hasta: '', orden: 'reciente' };

// Casillas como las de "Tipo de contratación" del buscador de SICOES.
function Casillas<T extends string | number>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { id: T; nombre: string }[];
  valor: T[];
  onCambiar: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {opciones.map((o) => (
        <label key={String(o.id)} className="inline-flex items-center gap-1.5 text-xs text-morado-800 cursor-pointer">
          <input
            type="checkbox"
            checked={valor.includes(o.id)}
            onChange={(e) => onCambiar(e.target.checked ? [...valor, o.id] : valor.filter((v) => v !== o.id))}
          />
          <ConIconos texto={o.nombre} />
        </label>
      ))}
    </div>
  );
}

// Busqueda avanzada de locales del Operador G.A.M.E.A. (como el buscador de
// convocatorias de SICOES): modo simple o avanzado, filtros combinables,
// tabla de resultados, "Ver ficha" en PDF y exportacion de la lista.
export default function BusquedaAvanzada({ token }: { token: string | null }) {
  const [modo, setModo] = useState<'simple' | 'avanzada'>('simple');
  const [filtros, setFiltros] = useState<Filtros>(VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(VACIOS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [generandoFicha, setGenerandoFicha] = useState<string | null>(null);

  useEffect(() => {
    api<Zona[]>('/zonas').then(setZonas).catch(() => {});
    api<CategoriaEvento[]>('/categorias').then(setCategorias).catch(() => {});
  }, []);

  const consulta = (f: Filtros, p: number) => {
    const q = new URLSearchParams({ pagina: String(p), orden: f.orden });
    if (f.texto.trim()) q.set('texto', f.texto.trim());
    if (f.distritos.length) q.set('distritos', f.distritos.join(','));
    if (f.estados.length) q.set('estados', f.estados.join(','));
    if (f.tipos.length) q.set('tipos', f.tipos.join(','));
    if (f.categorias.length) q.set('categorias', f.categorias.join(','));
    if (f.servicios.length) q.set('servicios', f.servicios.join(','));
    if (Number(f.aforoMin) > 0) q.set('aforoMin', f.aforoMin);
    if (f.licencia) q.set('licencia', f.licencia);
    if (f.desde) q.set('desde', f.desde);
    if (f.hasta) q.set('hasta', f.hasta);
    return q.toString();
  };

  const buscar = useCallback(
    async (f: Filtros, p: number) => {
      setCargando(true);
      setError('');
      try {
        setResultado(await api<Resultado>(`/operador/locales/busqueda?${consulta(f, p)}`, { token }));
      } catch (e: any) {
        setError(e.message || 'No se pudo buscar.');
      } finally {
        setCargando(false);
      }
    },
    [token],
  );

  useEffect(() => {
    buscar(aplicados, pagina);
  }, [aplicados, pagina, buscar]);

  const cambiar = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((f) => ({ ...f, [k]: v }));
  const aplicar = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPagina(1);
    setAplicados(filtros);
  };
  const limpiar = () => {
    setFiltros(VACIOS);
    setPagina(1);
    setAplicados(VACIOS);
  };

  // Texto con los filtros usados (para el PDF).
  const resumenFiltros = () =>
    [
      aplicados.texto && `texto "${aplicados.texto}"`,
      aplicados.distritos.length && `distritos ${aplicados.distritos.map((d) => `D${d}`).join(', ')}`,
      aplicados.estados.length && `estado ${aplicados.estados.map((e) => estadoDe(e)?.nombre).join(', ')}`,
      aplicados.tipos.length && `tipo ${aplicados.tipos.join(', ')}`,
      aplicados.categorias.length && `${aplicados.categorias.length} categoría(s)`,
      aplicados.servicios.length && `servicios ${aplicados.servicios.map((s) => servicio(s)?.nombre).join(', ')}`,
      aplicados.aforoMin && `aforo desde ${aplicados.aforoMin}`,
      aplicados.licencia && `licencia ${aplicados.licencia === 'si' ? 'subida' : 'sin subir'}`,
      (aplicados.desde || aplicados.hasta) && `registrados ${aplicados.desde || '…'} a ${aplicados.hasta || 'hoy'}`,
    ]
      .filter(Boolean)
      .join('; ');

  const verFicha = async (fila: FilaBusqueda) => {
    setGenerandoFicha(fila.id);
    try {
      const detalle = await api<Local>(`/locales/${fila.id}`).catch(() => null);
      pdfFichaLocal(fila, detalle);
    } finally {
      setGenerandoFicha(null);
    }
  };

  const exportar = async () => {
    if (!resultado) return;
    // Todas las paginas (hasta 500 locales).
    const todas: FilaBusqueda[] = [];
    for (let p = 1; p <= Math.min(20, Math.ceil(resultado.total / resultado.porPagina)); p++) {
      const r = await api<Resultado>(`/operador/locales/busqueda?${consulta(aplicados, p)}`, { token });
      todas.push(...r.filas);
    }
    pdfResultadosBusqueda(todas, resumenFiltros(), resultado.total);
  };

  const paginas = resultado ? Math.max(1, Math.ceil(resultado.total / resultado.porPagina)) : 1;
  const grupos = [...new Set(categorias.map((c) => c.grupo))];

  return (
    <div className="space-y-4">
      <form onSubmit={aplicar} className="rounded-2xl border border-morado-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-morado-100">
          <h2 className="font-bold text-morado-900"><Icono nombre="search" /> Búsqueda de locales</h2>
          <div className="inline-flex rounded-lg border border-morado-200 overflow-hidden text-xs font-semibold">
            {(['simple', 'avanzada'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModo(m)} className={`px-3 py-1.5 ${modo === m ? 'bg-morado-700 text-white' : 'bg-white text-morado-700'}`}>
                {m === 'simple' ? 'Simple' : 'Avanzada'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <label className="text-xs text-morado-600 md:col-span-2">
            Nombre del local, dirección, dueño, correo o CI
            <input className="input-campo" value={filtros.texto} onChange={(e) => cambiar('texto', e.target.value)} placeholder="Ej.: Titan, Av. 6 de Marzo, Mamani…" />
          </label>
          <div>
            <p className="text-xs text-morado-600 mb-1">Estado</p>
            <Casillas opciones={ESTADOS} valor={filtros.estados} onCambiar={(v) => cambiar('estados', v)} />
          </div>
          <div>
            <p className="text-xs text-morado-600 mb-1">Distrito</p>
            <Casillas
              opciones={[...new Set(zonas.map((z) => z.distritoNumero))].sort((a, b) => a - b).map((d) => ({ id: d, nombre: `D${d}` }))}
              valor={filtros.distritos}
              onCambiar={(v) => cambiar('distritos', v)}
            />
          </div>

          {modo === 'avanzada' && (
            <>
              <div className="md:col-span-2">
                <p className="text-xs text-morado-600 mb-1">Tipo de local agrupado</p>
                <Casillas opciones={TIPOS_LOCAL.map((t) => ({ id: t, nombre: t }))} valor={filtros.tipos} onCambiar={(v) => cambiar('tipos', v)} />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-morado-600 mb-1">Categoría de eventos que realiza</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {grupos.map((g) => (
                    <div key={g}>
                      <p className="text-[11px] font-semibold text-morado-500">{g}</p>
                      <Casillas opciones={categorias.filter((c) => c.grupo === g).map((c) => ({ id: c.id, nombre: c.nombre }))} valor={filtros.categorias} onCambiar={(v) => cambiar('categorias', v)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-morado-600 mb-1">Servicios (debe tener todos los marcados)</p>
                <Casillas opciones={SERVICIOS.map((s) => ({ id: s.id, nombre: `${s.icono} ${s.nombre}` }))} valor={filtros.servicios} onCambiar={(v) => cambiar('servicios', v)} />
              </div>
              <label className="text-xs text-morado-600">
                Aforo mínimo (personas)
                <input type="number" min={1} className="input-campo" value={filtros.aforoMin} onChange={(e) => cambiar('aforoMin', e.target.value)} placeholder="Ej.: 200" />
              </label>
              <div>
                <p className="text-xs text-morado-600 mb-1">Licencia de funcionamiento</p>
                <div className="flex gap-3 text-xs text-morado-800">
                  {[
                    ['', 'Todos'],
                    ['si', 'Subida'],
                    ['no', 'Sin subir'],
                  ].map(([v, t]) => (
                    <label key={v} className="inline-flex items-center gap-1.5">
                      <input type="radio" name="licencia" checked={filtros.licencia === v} onChange={() => cambiar('licencia', v as Filtros['licencia'])} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs text-morado-600">
                  Fecha de registro: desde
                  <input type="date" className="input-campo" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar('desde', e.target.value)} />
                </label>
                <label className="text-xs text-morado-600">
                  hasta
                  <input type="date" className="input-campo" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar('hasta', e.target.value)} />
                </label>
                <label className="text-xs text-morado-600">
                  Ordenar por
                  <select className="input-campo" value={filtros.orden} onChange={(e) => cambiar('orden', e.target.value as Filtros['orden'])}>
                    <option value="reciente">Más recientes</option>
                    <option value="antiguo">Más antiguos</option>
                    <option value="nombre">Nombre (A-Z)</option>
                  </select>
                </label>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button type="button" onClick={limpiar} className="boton-secundario-sm">
            Limpiar
          </button>
          <button type="submit" className="boton-primario-sm" disabled={cargando}>
            {cargando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {resultado && (
        <section className="rounded-2xl border border-morado-100 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-morado-100">
            <p className="text-sm text-morado-700">
              <b className="text-morado-900">{resultado.total.toLocaleString('es-BO')}</b> local(es) encontrado(s)
            </p>
            <button type="button" onClick={exportar} disabled={resultado.total === 0} className="boton-secundario-sm">
              <Icono nombre="file-text" /> Exportar resultados (PDF)
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#3a87c4] text-white text-left">
                <tr>
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Distrito</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Aforo</th>
                  <th className="px-3 py-2">Registro</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Archivos</th>
                  <th className="px-3 py-2">Reportes</th>
                </tr>
              </thead>
              <tbody>
                {resultado.filas.map((f, i) => (
                  <tr key={f.id} className="border-b border-morado-50 align-top odd:bg-white even:bg-morado-50/30">
                    <td className="px-3 py-2 tabular-nums text-morado-500">{(resultado.pagina - 1) * resultado.porPagina + i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-morado-900">{f.nombre}</p>
                      <p className="text-[11px] text-morado-500">{f.anfitrion.nombre} {f.anfitrion.apellidoPaterno}</p>
                      {f._count.denuncias > 0 && <p className="text-[11px] font-semibold text-red-700"><Icono nombre="flag" /> {f._count.denuncias} denuncia(s) pendiente(s)</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">D{f.zona.distritoNumero}</td>
                    <td className="px-3 py-2">{f.tiposLocal.join(', ') || '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{f.aforo ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Date(f.creadoEn).toLocaleDateString('es-BO')}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full border whitespace-nowrap ${estadoDe(f.estado)?.clase ?? ''}`}>{estadoDe(f.estado)?.nombre ?? f.estado}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-morado-700 space-y-0.5">
                      <p>{f.documentoFuncionamientoUrl ? <><Icono nombre="file-text" /> Licencia</> : <span className="text-morado-400">Sin licencia</span>}</p>
                      <p><Icono nombre="camera" /> {f._count.fotos} foto(s)</p>
                      {f.foto360Url && <p><Icono nombre="rotate-3d" /> Foto 360°</p>}
                      {f.videoUrl && <p><Icono nombre="video" /> Video</p>}
                    </td>
                    <td className="px-3 py-2 space-y-1 whitespace-nowrap">
                      <button type="button" onClick={() => verFicha(f)} className="block text-[#2a78d6] hover:underline" disabled={generandoFicha === f.id}>
                        {generandoFicha === f.id ? 'Generando…' : 'Ver ficha'}
                      </button>
                      {f.estado === 'APROBADO' && (
                        <Link href={`/locales/${f.id}`} target="_blank" className="block text-[#2a78d6] hover:underline">
                          Página pública <Icono nombre="external-link" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {resultado.filas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-morado-400">
                      Ningún local cumple con estos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-xs text-morado-600">
            <span>
              Página {resultado.pagina} de {paginas}
            </span>
            <div className="flex gap-2">
              <button type="button" className="boton-secundario-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                ← Anterior
              </button>
              <button type="button" className="boton-secundario-sm" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
                Siguiente →
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
