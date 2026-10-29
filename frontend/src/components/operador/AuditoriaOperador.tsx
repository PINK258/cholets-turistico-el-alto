'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { NOMBRE_ROL } from '@/lib/reportes';
import Icono, { ConIconos } from '@/components/Icono';

type Movimiento = {
  id: string;
  usuarioNombre: string | null;
  usuarioCorreo: string | null;
  rol: string | null;
  accion: string;
  modulo: string;
  entidadId: string | null;
  detalle: string | null;
  metodo: string | null;
  ruta: string | null;
  exito: boolean;
  ip: string | null;
  creadoEn: string;
};
type PaginaBitacora = { total: number; pagina: number; porPagina: number; modulos: string[]; filas: Movimiento[] };

type CambioBd = {
  id: string;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  registroId: string | null;
  datosAntes: Record<string, unknown> | null;
  datosDespues: Record<string, unknown> | null;
  camposCambiados: string[] | null;
  usuarioBd: string;
  creadoEn: string;
  autorNombre: string | null;
  autorRol: string | null;
  autorAccion: string | null;
};
type PaginaBd = { total: number; pagina: number; porPagina: number; tablas: string[]; filas: CambioBd[] };

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000).toISOString().slice(0, 10);
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const OPERACION: Record<CambioBd['operacion'], { texto: string; clase: string }> = {
  INSERT: { texto: 'Creó', clase: 'bg-green-100 text-green-800' },
  UPDATE: { texto: 'Modificó', clase: 'bg-blue-100 text-blue-800' },
  DELETE: { texto: 'Eliminó', clase: 'bg-red-100 text-red-800' },
};

const valorCorto = (v: unknown) => {
  if (v === null || v === undefined) return '—';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};

// Pestaña "Auditoría" del Operador G.A.M.E.A.:
//  - Bitácora: quién hizo qué en el sistema, cuándo y desde qué IP.
//  - Cambios en la base de datos: cada modificación con sus datos antes y
//    después (registrada por disparadores de PostgreSQL), con su autor.
export default function AuditoriaOperador({ token }: { token: string | null }) {
  const [vista, setVista] = useState<'bitacora' | 'bd'>('bitacora');
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoy());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-morado-100 bg-white p-4">
        <h2 className="font-bold text-morado-900"><Icono nombre="receipt-text" /> Auditoría del sistema</h2>
        <p className="text-xs text-morado-600 mt-1">
          Todo queda registrado en dos capas: la <b>bitácora</b> anota quién hizo cada acción en la página, y la{' '}
          <b>auditoría de la base de datos</b> guarda cada cambio con sus datos antes y después, incluso los hechos
          directamente en la base (fuera de la página).
        </p>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div className="inline-flex rounded-full bg-morado-50 p-1 border border-morado-100">
            {(
              [
                ['bitacora', '👤 Bitácora (quién hizo qué)'],
                ['bd', '🗄️ Cambios en la base de datos'],
              ] as const
            ).map(([id, texto]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVista(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${vista === id ? 'bg-morado-700 text-white' : 'text-morado-700'}`}
              >
                <ConIconos texto={texto} />
              </button>
            ))}
          </div>
          <label className="text-xs text-morado-600">
            Desde
            <input type="date" className="input-campo !py-1.5" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="text-xs text-morado-600">
            Hasta
            <input type="date" className="input-campo !py-1.5" value={hasta} min={desde} max={hoy()} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>
      </div>
      {vista === 'bitacora' ? (
        <Bitacora token={token} desde={desde} hasta={hasta} />
      ) : (
        <CambiosBd token={token} desde={desde} hasta={hasta} />
      )}
    </div>
  );
}

function Paginador({ pagina, total, porPagina, onIr }: { pagina: number; total: number; porPagina: number; onIr: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  return (
    <div className="flex items-center justify-between text-xs text-morado-600 mt-3">
      <span>
        {total.toLocaleString('es-BO')} registro(s) · página {pagina} de {paginas}
      </span>
      <div className="flex gap-2">
        <button type="button" className="boton-secundario-sm" disabled={pagina <= 1} onClick={() => onIr(pagina - 1)}>
          ← Anterior
        </button>
        <button type="button" className="boton-secundario-sm" disabled={pagina >= paginas} onClick={() => onIr(pagina + 1)}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function Bitacora({ token, desde, hasta }: { token: string | null; desde: string; hasta: string }) {
  const [modulo, setModulo] = useState('');
  const [texto, setTexto] = useState('');
  const [fallidos, setFallidos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaBitacora | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    const q = new URLSearchParams({ desde, hasta, pagina: String(pagina), ...(modulo && { modulo }), ...(texto.trim() && { texto: texto.trim() }), ...(fallidos && { fallidos: 'true' }) });
    try {
      setDatos(await api<PaginaBitacora>(`/operador/bitacora?${q}`, { token }));
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la bitácora.');
    }
  }, [desde, hasta, pagina, modulo, texto, fallidos, token]);

  useEffect(() => {
    const t = setTimeout(cargar, 250); // espera a que se termine de escribir
    return () => clearTimeout(t);
  }, [cargar]);

  // Se actualiza sola cada 20 s.
  useEffect(() => {
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => setPagina(1), [desde, hasta, modulo, texto, fallidos]);

  return (
    <section className="rounded-2xl border border-morado-100 bg-white p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <input className="input-campo !py-1.5 max-w-xs" placeholder="Buscar por usuario, correo o acción…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <select className="input-campo !py-1.5 max-w-[12rem]" value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="">Todos los módulos</option>
          {datos?.modulos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-morado-700">
          <input type="checkbox" checked={fallidos} onChange={(e) => setFallidos(e.target.checked)} />
          Solo intentos fallidos
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-morado-500 border-b border-morado-100">
              <th className="py-2 pr-3">Fecha y hora</th>
              <th className="py-2 pr-3">Usuario</th>
              <th className="py-2 pr-3">Acción</th>
              <th className="py-2 pr-3">Módulo</th>
              <th className="py-2 pr-3">Detalle</th>
              <th className="py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {datos?.filas.map((m) => (
              <tr key={m.id} className={`border-b border-morado-50 align-top ${m.exito ? '' : 'bg-red-50/60'}`}>
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-morado-700">{fechaHora(m.creadoEn)}</td>
                <td className="py-2 pr-3">
                  <p className="font-medium text-morado-900">{m.usuarioNombre ?? m.usuarioCorreo ?? 'Visitante sin cuenta'}</p>
                  {m.rol && <p className="text-[10px] text-morado-500">{NOMBRE_ROL[m.rol] ?? m.rol}</p>}
                </td>
                <td className="py-2 pr-3">
                  <span className={m.exito ? 'text-morado-900' : 'text-red-700 font-semibold'}>
                    <ConIconos texto={m.exito ? '✔' : '✖'} /> {m.accion}
                  </span>
                </td>
                <td className="py-2 pr-3 text-morado-700">{m.modulo}</td>
                <td className="py-2 pr-3 text-morado-600 max-w-xs break-words">{m.detalle ?? '—'}</td>
                <td className="py-2 text-morado-500 tabular-nums">{m.ip === '::1' || m.ip === '127.0.0.1' ? 'esta PC' : m.ip ?? '—'}</td>
              </tr>
            ))}
            {datos && datos.filas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-morado-400">
                  No hay movimientos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {datos && <Paginador pagina={datos.pagina} total={datos.total} porPagina={datos.porPagina} onIr={setPagina} />}
    </section>
  );
}

function CambiosBd({ token, desde, hasta }: { token: string | null; desde: string; hasta: string }) {
  const [tabla, setTabla] = useState('');
  const [operacion, setOperacion] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [datos, setDatos] = useState<PaginaBd | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    const q = new URLSearchParams({ desde, hasta, pagina: String(pagina), ...(tabla && { tabla }), ...(operacion && { operacion }) });
    try {
      setDatos(await api<PaginaBd>(`/operador/auditoria-bd?${q}`, { token }));
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la auditoría.');
    }
  }, [desde, hasta, pagina, tabla, operacion, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => setPagina(1), [desde, hasta, tabla, operacion]);

  return (
    <section className="rounded-2xl border border-morado-100 bg-white p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <select className="input-campo !py-1.5 max-w-[12rem]" value={tabla} onChange={(e) => setTabla(e.target.value)}>
          <option value="">Todas las tablas</option>
          {datos?.tablas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="input-campo !py-1.5 max-w-[12rem]" value={operacion} onChange={(e) => setOperacion(e.target.value)}>
          <option value="">Todas las operaciones</option>
          <option value="INSERT">Creaciones (INSERT)</option>
          <option value="UPDATE">Modificaciones (UPDATE)</option>
          <option value="DELETE">Eliminaciones (DELETE)</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {datos?.filas.map((c) => {
          const op = OPERACION[c.operacion];
          const campos = c.operacion === 'UPDATE' ? c.camposCambiados ?? [] : Object.keys((c.datosDespues ?? c.datosAntes) ?? {}).slice(0, 12);
          return (
            <li key={c.id} className="rounded-xl border border-morado-100">
              <button type="button" onClick={() => setAbierto(abierto === c.id ? null : c.id)} className="w-full text-left p-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="tabular-nums text-morado-600 whitespace-nowrap">{fechaHora(c.creadoEn)}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${op.clase}`}>{op.texto}</span>
                <span className="font-semibold text-morado-900">tabla {c.tabla}</span>
                {c.operacion === 'UPDATE' && <span className="text-morado-600">campos: {(c.camposCambiados ?? []).join(', ')}</span>}
                <span className="ml-auto text-morado-700">
                  {c.autorNombre ? (
                    <>
                      <Icono nombre="user-round" /> {c.autorNombre}
                      {c.autorRol && <span className="text-morado-500"> · {NOMBRE_ROL[c.autorRol] ?? c.autorRol}</span>}
                    </>
                  ) : (
                    <span className="text-amber-700 font-semibold"><Icono nombre="triangle-alert" /> Fuera de la página (usuario de BD: {c.usuarioBd})</span>
                  )}
                </span>
              </button>
              {abierto === c.id && (
                <div className="border-t border-morado-100 p-3 overflow-x-auto">
                  {c.autorAccion && <p className="text-xs text-morado-600 mb-2">Acción en la página: {c.autorAccion}</p>}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-morado-500">
                        <th className="py-1 pr-3">Campo</th>
                        {c.operacion !== 'INSERT' && <th className="py-1 pr-3">Antes</th>}
                        {c.operacion !== 'DELETE' && <th className="py-1">Después</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {campos.map((k) => (
                        <tr key={k} className="border-t border-morado-50 align-top">
                          <td className="py-1 pr-3 font-medium text-morado-800">{k}</td>
                          {c.operacion !== 'INSERT' && <td className="py-1 pr-3 text-red-700 break-all">{valorCorto(c.datosAntes?.[k])}</td>}
                          {c.operacion !== 'DELETE' && <td className="py-1 text-green-700 break-all">{valorCorto(c.datosDespues?.[k])}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-morado-400 mt-2">Las contraseñas cifradas nunca se guardan en la auditoría.</p>
                </div>
              )}
            </li>
          );
        })}
        {datos && datos.filas.length === 0 && <li className="py-6 text-center text-sm text-morado-400">No hay cambios con estos filtros.</li>}
      </ul>
      {datos && <Paginador pagina={datos.pagina} total={datos.total} porPagina={datos.porPagina} onIr={setPagina} />}
    </section>
  );
}
