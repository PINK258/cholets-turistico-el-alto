'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type ValorCaptcha = { captchaId: string; captchaRespuesta: string };

// Codigo de verificacion (CAPTCHA) generado por nuestro backend. Cada vez que
// cambia "recargar" (p. ej. despues de un envio fallido) se pide un codigo
// nuevo, porque el servidor descarta el anterior al fallar.
export default function CodigoCaptcha({
  valor,
  onCambiar,
  recargar = 0,
}: {
  valor: ValorCaptcha;
  onCambiar: (valor: ValorCaptcha) => void;
  recargar?: number;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const pedir = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const c = await api<{ id: string; svg: string }>('/captcha');
      setSvg(c.svg);
      onCambiar({ captchaId: c.id, captchaRespuesta: '' });
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el código.');
    } finally {
      setCargando(false);
    }
    // onCambiar es un setState del padre; solo importa cuando pedir otro codigo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pedir();
  }, [pedir, recargar]);

  return (
    <div className="rounded-xl border border-morado-200 bg-morado-50/40 p-3">
      <p className="etiqueta-campo mb-1.5">Código de verificación</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-14 w-40 rounded-lg overflow-hidden border border-morado-200 bg-white flex items-center justify-center">
          {svg ? (
            // Se muestra como imagen (no como HTML) para no insertar marcado en la pagina.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
              alt="Código de verificación: escribe los caracteres que ves"
              className={`w-full h-full ${cargando ? 'opacity-40' : ''}`}
            />
          ) : (
            <span className="text-xs text-morado-400">{cargando ? 'Cargando…' : '—'}</span>
          )}
        </div>
        <button
          type="button"
          onClick={pedir}
          disabled={cargando}
          className="text-xs font-semibold text-morado-700 hover:text-morado-900 inline-flex items-center gap-1"
          title="Pedir otro código"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Otro código
        </button>
        <input
          className="input-campo flex-1 min-w-[10rem] tracking-[0.3em]"
          placeholder="Escribe el código"
          value={valor.captchaRespuesta}
          onChange={(e) => onCambiar({ ...valor, captchaRespuesta: e.target.value })}
          maxLength={10}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
        />
      </div>
      <p className="text-[11px] text-morado-500 mt-1.5">
        Escribe las 5 letras o números de la imagen (no importan las mayúsculas). Así sabemos que no eres un robot.
      </p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
