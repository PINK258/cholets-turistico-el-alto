'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Ventana para ajustar la foto de perfil antes de subirla: se arrastra la imagen
// para encuadrarla y se acerca o aleja con la barra (o la rueda del mouse).
// Devuelve un JPG cuadrado; el circulo es solo la guia de como se vera.

const VISOR = 280; // lado del recuadro en pantalla (px)
const SALIDA = 400; // lado de la imagen final (px)
const ZOOM_MAXIMO = 4;

type Posicion = { x: number; y: number };

export default function RecortarFoto({
  archivo,
  onListo,
  onCancelar,
}: {
  archivo: File;
  onListo: (recortada: File) => void;
  onCancelar: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Posicion>({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const arrastre = useRef<{ inicio: Posicion; posInicial: Posicion } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(archivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [archivo]);

  // Escala con la que la imagen cubre todo el recuadro (zoom 1).
  const escalaBase = imagen ? VISOR / Math.min(imagen.naturalWidth, imagen.naturalHeight) : 1;
  const escala = escalaBase * zoom;
  const ancho = imagen ? imagen.naturalWidth * escala : VISOR;
  const alto = imagen ? imagen.naturalHeight * escala : VISOR;

  // La imagen nunca deja huecos vacios dentro del recuadro.
  const limitar = useCallback(
    (p: Posicion, w = ancho, h = alto): Posicion => ({
      x: Math.min(0, Math.max(VISOR - w, p.x)),
      y: Math.min(0, Math.max(VISOR - h, p.y)),
    }),
    [ancho, alto],
  );

  const alCargar = (img: HTMLImageElement) => {
    const base = VISOR / Math.min(img.naturalWidth, img.naturalHeight);
    setImagen(img);
    setZoom(1);
    setPos({ x: (VISOR - img.naturalWidth * base) / 2, y: (VISOR - img.naturalHeight * base) / 2 });
  };

  // Al cambiar el zoom se mantiene fijo el punto que esta en el centro del recuadro.
  const cambiarZoom = (nuevo: number) => {
    if (!imagen) return;
    const z = Math.min(ZOOM_MAXIMO, Math.max(1, nuevo));
    const nuevaEscala = escalaBase * z;
    const cx = (VISOR / 2 - pos.x) / escala;
    const cy = (VISOR / 2 - pos.y) / escala;
    setZoom(z);
    setPos(
      limitar(
        { x: VISOR / 2 - cx * nuevaEscala, y: VISOR / 2 - cy * nuevaEscala },
        imagen.naturalWidth * nuevaEscala,
        imagen.naturalHeight * nuevaEscala,
      ),
    );
  };

  const alPresionar = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { inicio: { x: e.clientX, y: e.clientY }, posInicial: pos };
  };
  const alMover = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    setPos(limitar({ x: a.posInicial.x + e.clientX - a.inicio.x, y: a.posInicial.y + e.clientY - a.inicio.y }));
  };
  const alSoltar = () => {
    arrastre.current = null;
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCancelar]);

  const confirmar = () => {
    if (!imagen) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = SALIDA;
    lienzo.height = SALIDA;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return setError('Tu navegador no permite recortar la imagen.');
    ctx.fillStyle = '#ffffff'; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, SALIDA, SALIDA);
    const lado = VISOR / escala;
    ctx.drawImage(imagen, -pos.x / escala, -pos.y / escala, lado, lado, 0, 0, SALIDA, SALIDA);
    lienzo.toBlob(
      (blob) => {
        if (!blob) return setError('No se pudo preparar la foto. Prueba con otra imagen.');
        onListo(new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/60 flex items-center justify-center p-4"
      onClick={onCancelar}
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar foto de perfil"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-morado-900">Ajusta tu foto de perfil</h3>
        <p className="text-xs text-morado-500 mb-4">Arrastra la imagen para encuadrarla y usa la barra para acercar.</p>

        <div
          className="relative mx-auto overflow-hidden rounded-xl bg-morado-50 cursor-grab active:cursor-grabbing select-none touch-none"
          style={{ width: VISOR, height: VISOR }}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onWheel={(e) => cambiarZoom(zoom - e.deltaY * 0.002)}
        >
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Foto a recortar"
              draggable={false}
              onLoad={(e) => alCargar(e.currentTarget)}
              onError={() => setError('No se pudo abrir la imagen. Usa un archivo JPG, PNG o WEBP.')}
              className="absolute max-w-none pointer-events-none"
              style={{ left: pos.x, top: pos.y, width: ancho, height: alto, visibility: imagen ? 'visible' : 'hidden' }}
            />
          )}
          {/* Guia circular: oscurece lo que queda fuera de la foto de perfil. */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none border-2 border-white/90"
            style={{ boxShadow: '0 0 0 9999px rgba(30, 10, 60, 0.45)' }}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-morado-400 text-sm" aria-hidden>−</span>
          <input
            type="range"
            min={1}
            max={ZOOM_MAXIMO}
            step={0.01}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            className="flex-1 accent-morado-700"
            aria-label="Acercar o alejar"
            disabled={!imagen}
          />
          <span className="text-morado-400 text-sm" aria-hidden>+</span>
        </div>

        {error && <p className="text-red-600 text-xs mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancelar} className="boton-secundario-sm">
            Cancelar
          </button>
          <button type="button" onClick={confirmar} className="boton-primario-sm" disabled={!imagen}>
            Usar esta foto
          </button>
        </div>
      </div>
    </div>
  );
}
