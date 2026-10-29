'use client';

import { useMemo, useState } from 'react';

// Graficos de los reportes del Operador G.A.M.E.A. (SVG propio, sin librerias).
// Paleta validada (azul y naranja: pasan contraste y daltonismo) y escala
// secuencial de un solo tono (azul) para los mapas de calor.
export const SERIE = ['#2a78d6', '#eb6834'];
const SECUENCIAL = ['#eef4fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const TEXTO = '#2e1065';
const TEXTO_SUAVE = '#6b5b8a';
const REJILLA = '#ece7f3';

const formato = (n: number) => n.toLocaleString('es-BO');

// ---------------------------------------------------------------------------
// Tarjeta de un numero (KPI)
export function Indicador({ titulo, valor, detalle }: { titulo: string; valor: number | string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-morado-100 bg-white p-4">
      <p className="text-xs font-medium text-morado-500">{titulo}</p>
      <p className="text-3xl font-extrabold text-morado-900 mt-1 tabular-nums">{typeof valor === 'number' ? formato(valor) : valor}</p>
      {detalle && <p className="text-[11px] text-morado-500 mt-0.5">{detalle}</p>}
    </div>
  );
}

// Contenedor de cada grafico: titulo, ayuda y (opcional) tabla de datos.
export function Panel({
  titulo,
  ayuda,
  children,
  id,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="rounded-2xl border border-morado-100 bg-white p-4" data-grafico={id}>
      <h3 className="font-semibold text-morado-900">{titulo}</h3>
      {ayuda && <p className="text-xs text-morado-500 mb-3">{ayuda}</p>}
      {children}
    </section>
  );
}

const SinDatos = () => <p className="text-sm text-morado-400 py-6 text-center">Sin datos en este periodo.</p>;

// ---------------------------------------------------------------------------
// Barras horizontales (comparar cantidades). Un solo color; valor al final.
export function BarrasHorizontales({ datos }: { datos: { etiqueta: string; valor: number }[] }) {
  const [activa, setActiva] = useState<number | null>(null);
  if (datos.length === 0 || datos.every((d) => d.valor === 0)) return <SinDatos />;
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  return (
    <ul className="space-y-2" role="list">
      {datos.map((d, i) => (
        <li
          key={d.etiqueta}
          className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-xs"
          onMouseEnter={() => setActiva(i)}
          onMouseLeave={() => setActiva(null)}
          title={`${d.etiqueta}: ${formato(d.valor)}`}
        >
          <span className="truncate text-morado-800" title={d.etiqueta}>
            {d.etiqueta}
          </span>
          <span className="h-4 rounded-r bg-morado-50 relative">
            <span
              className="absolute inset-y-0 left-0 rounded-r transition-[width] duration-500"
              style={{
                width: `${Math.max((d.valor / maximo) * 100, d.valor > 0 ? 2 : 0)}%`,
                background: SERIE[0],
                opacity: activa === null || activa === i ? 1 : 0.45,
              }}
            />
          </span>
          <span className="tabular-nums font-semibold text-morado-900 w-8 text-right">{formato(d.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Lineas en el tiempo (1 o 2 series). Pasar el mouse muestra el valor del dia/mes.
export function Lineas({
  etiquetas,
  series,
  alto = 200,
}: {
  etiquetas: string[];
  series: { nombre: string; valores: number[] }[];
  alto?: number;
}) {
  const [indice, setIndice] = useState<number | null>(null);
  const ancho = 640;
  const margen = { izq: 34, der: 74, arr: 12, aba: 26 };
  if (etiquetas.length === 0) return <SinDatos />;
  // Con un solo punto una linea no dice nada: se muestran barras de ese periodo.
  if (etiquetas.length === 1) {
    return (
      <div>
        <p className="text-xs text-morado-500 mb-2">Solo hay datos de {etiquetas[0]}:</p>
        <BarrasHorizontales datos={series.map((s) => ({ etiqueta: s.nombre, valor: s.valores[0] ?? 0 }))} />
      </div>
    );
  }
  const maximo = Math.max(1, ...series.flatMap((s) => s.valores));
  const x = (i: number) => margen.izq + (etiquetas.length === 1 ? 0 : (i / (etiquetas.length - 1)) * (ancho - margen.izq - margen.der));
  const y = (v: number) => margen.arr + (1 - v / maximo) * (alto - margen.arr - margen.aba);
  const marcas = [...new Set([0, Math.round(maximo / 2), maximo])];
  // Altura de la etiqueta final de cada serie, separadas al menos 14 px.
  const yEtiqueta = series.map((s) => y(s.valores[s.valores.length - 1]) + 4);
  for (let i = 1; i < yEtiqueta.length; i++) {
    if (Math.abs(yEtiqueta[i] - yEtiqueta[i - 1]) < 14) yEtiqueta[i] = yEtiqueta[i - 1] + 14;
  }
  const cadaCuanto = Math.max(1, Math.ceil(etiquetas.length / 8));

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex flex-wrap gap-3 mb-1 text-xs text-morado-700">
          {series.map((s, i) => (
            <span key={s.nombre} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded" style={{ background: SERIE[i] }} />
              {s.nombre}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="w-full h-auto"
        role="img"
        aria-label={series.map((s) => s.nombre).join(' y ')}
        onMouseLeave={() => setIndice(null)}
        onMouseMove={(e) => {
          const caja = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - caja.left) / caja.width) * ancho;
          const paso = etiquetas.length === 1 ? 1 : (ancho - margen.izq - margen.der) / (etiquetas.length - 1);
          setIndice(Math.min(etiquetas.length - 1, Math.max(0, Math.round((px - margen.izq) / paso))));
        }}
      >
        {marcas.map((m) => (
          <g key={m}>
            <line x1={margen.izq} x2={ancho - margen.der} y1={y(m)} y2={y(m)} stroke={REJILLA} />
            <text x={margen.izq - 6} y={y(m) + 3} textAnchor="end" fontSize="10" fill={TEXTO_SUAVE}>
              {formato(m)}
            </text>
          </g>
        ))}
        {etiquetas.map((et, i) =>
          i % cadaCuanto === 0 || i === etiquetas.length - 1 ? (
            <text key={et} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="10" fill={TEXTO_SUAVE}>
              {et.length > 7 ? et.slice(5) : et}
            </text>
          ) : null,
        )}
        {indice !== null && <line x1={x(indice)} x2={x(indice)} y1={margen.arr} y2={alto - margen.aba} stroke="#c4b5fd" strokeDasharray="3 3" />}
        {series.map((s, si) => (
          <g key={s.nombre}>
            <polyline
              fill="none"
              stroke={SERIE[si]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
            {/* Etiqueta directa al final de cada linea */}
            <text x={x(s.valores.length - 1) + 6} y={yEtiqueta[si]} fontSize="11" fill={TEXTO}>
              {s.nombre.split(' ')[0]} {formato(s.valores[s.valores.length - 1])}
            </text>
            {indice !== null && (
              <circle cx={x(indice)} cy={y(s.valores[indice])} r="4.5" fill={SERIE[si]} stroke="#fff" strokeWidth="2" />
            )}
          </g>
        ))}
      </svg>
      {indice !== null && (
        <div
          className="pointer-events-none absolute top-6 rounded-lg bg-morado-900 text-white text-xs px-2.5 py-1.5 shadow-lg"
          style={{ left: `clamp(0px, calc(${(x(indice) / ancho) * 100}% - 60px), calc(100% - 140px))` }}
        >
          <p className="font-semibold">{etiquetas[indice]}</p>
          {series.map((s, si) => (
            <p key={s.nombre} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: SERIE[si] }} />
              {s.nombre}: <b className="tabular-nums">{formato(s.valores[indice])}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla cruzada (doble entrada) con mapa de calor y totales.
export type Cruce = { fila: string; columna: string; total: number }[];

export function TablaCruzada({
  datos,
  nombreFilas,
  nombreColumnas,
  traducir = (s) => s,
  ordenColumnas,
}: {
  datos: Cruce;
  nombreFilas: string;
  nombreColumnas: string;
  traducir?: (s: string) => string;
  ordenColumnas?: string[];
}) {
  const { filas, columnas, valor, totalFila, totalColumna, total, maximo } = useMemo(() => {
    const filas = [...new Set(datos.map((d) => d.fila))];
    let columnas = [...new Set(datos.map((d) => d.columna))];
    if (ordenColumnas) columnas = [...ordenColumnas.filter((c) => columnas.includes(c)), ...columnas.filter((c) => !ordenColumnas.includes(c))];
    else columnas.sort();
    const mapa = new Map(datos.map((d) => [`${d.fila}|${d.columna}`, d.total]));
    const valor = (f: string, c: string) => mapa.get(`${f}|${c}`) ?? 0;
    const totalFila = (f: string) => columnas.reduce((s, c) => s + valor(f, c), 0);
    const totalColumna = (c: string) => filas.reduce((s, f) => s + valor(f, c), 0);
    return {
      filas,
      columnas,
      valor,
      totalFila,
      totalColumna,
      total: datos.reduce((s, d) => s + d.total, 0),
      maximo: Math.max(1, ...datos.map((d) => d.total)),
    };
  }, [datos, ordenColumnas]);

  if (datos.length === 0) return <SinDatos />;
  const celda = (v: number) => {
    if (v === 0) return { background: '#ffffff', color: '#b9aed0' };
    const paso = Math.min(SECUENCIAL.length - 1, 1 + Math.floor((v / maximo) * (SECUENCIAL.length - 2)));
    return { background: SECUENCIAL[paso], color: paso >= 4 ? '#ffffff' : TEXTO };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="text-left font-semibold text-morado-500 px-2 py-1 align-bottom">
              {nombreFilas} ↓ / {nombreColumnas} →
            </th>
            {columnas.map((c) => (
              <th key={c} className="font-semibold text-morado-800 px-2 py-1 text-center whitespace-nowrap">
                {traducir(c)}
              </th>
            ))}
            <th className="font-bold text-morado-900 px-2 py-1 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f}>
              <th className="text-left font-semibold text-morado-800 px-2 py-1.5 whitespace-nowrap">{traducir(f)}</th>
              {columnas.map((c) => {
                const v = valor(f, c);
                return (
                  <td
                    key={c}
                    className="text-center tabular-nums rounded px-2 py-1.5 hover:outline hover:outline-2 hover:outline-morado-500"
                    style={celda(v)}
                    title={`${traducir(f)} · ${traducir(c)}: ${formato(v)}`}
                  >
                    {formato(v)}
                  </td>
                );
              })}
              <td className="text-center tabular-nums font-bold text-morado-900 bg-morado-50 rounded px-2 py-1.5">{formato(totalFila(f))}</td>
            </tr>
          ))}
          <tr>
            <th className="text-left font-bold text-morado-900 px-2 py-1.5">Total</th>
            {columnas.map((c) => (
              <td key={c} className="text-center tabular-nums font-bold text-morado-900 bg-morado-50 rounded px-2 py-1.5">
                {formato(totalColumna(c))}
              </td>
            ))}
            <td className="text-center tabular-nums font-extrabold text-white bg-morado-700 rounded px-2 py-1.5">{formato(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-morado-500">
        Menos
        {SECUENCIAL.slice(1).map((c) => (
          <span key={c} className="w-4 h-2 rounded-sm" style={{ background: c }} />
        ))}
        Más
      </div>
    </div>
  );
}
