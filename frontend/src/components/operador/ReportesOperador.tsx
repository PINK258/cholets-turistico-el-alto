'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { pdfReporteGeneral } from '@/lib/pdfReportes';
import {
  NOMBRE_ESTADO,
  NOMBRE_GENERO,
  RANGOS_EDAD,
  ReporteGeneral,
  nombreMes,
  traducir,
} from '@/lib/reportes';
import { BarrasHorizontales, Indicador, Lineas, Panel, TablaCruzada } from '@/components/operador/Graficos';
import Icono, { ConIconos } from '@/components/Icono';

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000).toISOString().slice(0, 10);

const PERIODOS = [
  { nombre: 'Últimos 30 días', desde: () => haceDias(30) },
  { nombre: 'Últimos 6 meses', desde: () => haceDias(182) },
  { nombre: 'Último año', desde: () => haceDias(365) },
  { nombre: 'Este año', desde: () => `${new Date().getFullYear()}-01-01` },
];

// Pestaña "Reportes" del Operador G.A.M.E.A.: indicadores, graficos y tablas
// CRUZADAS para el informe, con filtro de fechas, actualizacion automatica y PDF.
export default function ReportesOperador({ token }: { token: string | null }) {
  const [desde, setDesde] = useState(haceDias(365));
  const [hasta, setHasta] = useState(hoy());
  const [reporte, setReporte] = useState<ReporteGeneral | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setReporte(await api<ReporteGeneral>(`/operador/reportes?desde=${desde}&hasta=${hasta}`, { token }));
    } catch (e: any) {
      setError(e.message || 'No se pudo generar el reporte.');
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Se actualiza solo cada minuto (los datos cambian mientras el sistema se usa).
  useEffect(() => {
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  const r = reporte;
  const meses = r ? [...new Set(r.usuarios.registrosMes.map((x) => x.mes))].sort() : [];
  const serieRol = (rol: string) => meses.map((m) => r!.usuarios.registrosMes.find((x) => x.mes === m && x.rol === rol)?.total ?? 0);

  return (
    <div className="space-y-5">
      {/* Filtros en una sola fila */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-morado-100 bg-white p-3">
        <label className="text-xs text-morado-600">
          Desde
          <input type="date" className="input-campo !py-1.5" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="text-xs text-morado-600">
          Hasta
          <input type="date" className="input-campo !py-1.5" value={hasta} min={desde} max={hoy()} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.nombre}
              type="button"
              className="text-xs px-2.5 py-1.5 rounded-full border border-morado-200 text-morado-700 hover:bg-morado-50"
              onClick={() => {
                setDesde(p.desde());
                setHasta(hoy());
              }}
            >
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {r && (
            <span className="text-[11px] text-morado-500">
              Actualizado: {new Date(r.generadoEn).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button type="button" onClick={cargar} disabled={cargando} className="boton-secundario-sm">
            <ConIconos texto={cargando ? 'Actualizando…' : '🔃 Actualizar'} />
          </button>
          <button type="button" onClick={() => r && pdfReporteGeneral(r)} disabled={!r} className="boton-primario-sm">
            <Icono nombre="file-text" /> Descargar PDF
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!r && cargando && <p className="text-morado-500">Generando reporte…</p>}

      {r && (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Indicador titulo="Usuarios Turísticos" valor={r.resumen.turistas} detalle="registrados en el periodo" />
            <Indicador titulo="Administradores Turísticos" valor={r.resumen.anfitriones} detalle="registrados en el periodo" />
            <Indicador
              titulo="Locales aprobados"
              valor={r.resumen.localesAprobados}
              detalle={`${r.resumen.localesEnRevision} en revisión · ${r.resumen.localesRechazados} rechazados`}
            />
            <Indicador titulo="Eventos publicados" valor={r.resumen.eventos} />
            <Indicador titulo="Movimientos" valor={r.resumen.movimientos} detalle="acciones en la bitácora" />
            <Indicador titulo="Reseñas" valor={r.resumen.resenas} />
            <Indicador titulo="Favoritos" valor={r.resumen.favoritos} detalle="locales guardados" />
            <Indicador titulo="Consultas al chatbot" valor={r.resumen.consultasChatbot} />
          </div>

          {/* ---- Usuarios ---- */}
          <h2 className="text-lg font-bold text-morado-900 pt-2"><Icono nombre="users" /> Usuarios</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel titulo="Usuarios por género" ayuda="Usuarios Turísticos y Administradores registrados en el periodo.">
              <BarrasHorizontales datos={r.usuarios.genero.map((g) => ({ etiqueta: NOMBRE_GENERO[g.genero] ?? g.genero, valor: g.total }))} />
            </Panel>
            <Panel titulo="Usuarios por rango de edad" ayuda="Edad calculada con la fecha de nacimiento.">
              <BarrasHorizontales
                datos={RANGOS_EDAD.map((rango) => ({ etiqueta: rango, valor: r.usuarios.edad.find((e) => e.rango === rango)?.total ?? 0 }))}
              />
            </Panel>
          </div>
          <Panel titulo="Reporte cruzado: género × rango de edad" ayuda="Cuántos usuarios hay de cada género en cada rango de edad. Pasa el mouse por una celda para ver el detalle.">
            <TablaCruzada datos={r.cruces.generoEdad} nombreFilas="Género" nombreColumnas="Edad" traducir={traducir} ordenColumnas={RANGOS_EDAD} />
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Panel titulo="Registros por mes" ayuda="Cuentas nuevas de cada tipo, mes a mes.">
                <Lineas
                  etiquetas={meses.map(nombreMes)}
                  series={[
                    { nombre: 'Usuarios Turísticos', valores: serieRol('TURISTA') },
                    { nombre: 'Administradores Turísticos', valores: serieRol('ANFITRION') },
                  ]}
                />
              </Panel>
            </div>
            <Panel titulo="Procedencia (países)">
              <BarrasHorizontales datos={r.usuarios.paises.map((p) => ({ etiqueta: p.pais, valor: p.total }))} />
            </Panel>
          </div>
          <Panel titulo="Procedencia (ciudades)" ayuda="Las 10 ciudades de donde vienen más usuarios.">
            <BarrasHorizontales datos={r.usuarios.ciudades.map((c) => ({ etiqueta: c.ciudad, valor: c.total }))} />
          </Panel>

          {/* ---- Locales y categorias ---- */}
          <h2 className="text-lg font-bold text-morado-900 pt-2"><Icono nombre="house" /> Locales y categorías</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel titulo="Locales por estado">
              <BarrasHorizontales datos={r.locales.estado.map((e) => ({ etiqueta: NOMBRE_ESTADO[e.estado] ?? e.estado, valor: e.total }))} />
            </Panel>
            <Panel titulo="Locales por categoría de eventos" ayuda="Las categorías de eventos que más locales realizan.">
              <BarrasHorizontales datos={r.locales.categorias.map((c) => ({ etiqueta: c.categoria, valor: c.total }))} />
            </Panel>
          </div>
          <Panel titulo="Reporte cruzado: distrito × tipo de local" ayuda="Locales (sin contar rechazados) de cada tipo en cada distrito. Un local puede tener varios tipos.">
            <TablaCruzada datos={r.cruces.distritoTipo} nombreFilas="Distrito" nombreColumnas="Tipo" />
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel titulo="Calificación promedio por distrito" ayuda="Promedio de estrellas (1 a 5) de las reseñas del periodo.">
              <BarrasHorizontales
                datos={r.locales.calificacionDistrito.map((c) => ({ etiqueta: `${c.distrito} (${c.resenas} reseñas)`, valor: c.promedio }))}
              />
            </Panel>
            <Panel titulo="Locales más guardados en favoritos">
              <BarrasHorizontales datos={r.locales.favoritosTop.map((f) => ({ etiqueta: f.local, valor: f.total }))} />
            </Panel>
          </div>

          {/* ---- Cartelera ---- */}
          <h2 className="text-lg font-bold text-morado-900 pt-2"><Icono nombre="party-popper" /> Cartelera</h2>
          <Panel titulo="Reporte cruzado: mes × categoría de evento" ayuda="Eventos publicados en el periodo, según el mes en que se realizan y su categoría.">
            <TablaCruzada datos={r.cruces.eventosMesCategoria} nombreFilas="Mes" nombreColumnas="Categoría" traducir={traducir} />
          </Panel>

          {/* ---- Movimientos ---- */}
          <h2 className="text-lg font-bold text-morado-900 pt-2"><Icono nombre="receipt-text" /> Movimientos del sistema</h2>
          <Panel titulo="Movimientos por día (últimos 30 días)" ayuda="Acciones registradas en la bitácora; los fallidos son intentos sin permiso o inicios de sesión incorrectos.">
            <Lineas
              etiquetas={r.movimientos.porDia.map((d) => d.dia)}
              series={[
                { nombre: 'Movimientos', valores: r.movimientos.porDia.map((d) => d.total) },
                { nombre: 'Fallidos', valores: r.movimientos.porDia.map((d) => d.fallidos) },
              ]}
            />
          </Panel>
          <Panel titulo="Reporte cruzado: módulo × mes" ayuda="Cuántos movimientos hubo en cada parte del sistema, mes a mes.">
            <TablaCruzada datos={r.cruces.movimientosModuloMes} nombreFilas="Módulo" nombreColumnas="Mes" traducir={traducir} />
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel titulo="Acciones más frecuentes">
              <BarrasHorizontales datos={r.movimientos.accionesFrecuentes.map((a) => ({ etiqueta: a.accion, valor: a.total }))} />
            </Panel>
            <Panel titulo="Usuarios con más movimientos">
              <BarrasHorizontales datos={r.movimientos.usuariosActivos.map((u) => ({ etiqueta: u.usuario, valor: u.total }))} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
