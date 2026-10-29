'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api, urlArchivo } from '@/lib/api';
import { SERVICIOS, servicio, videoIncrustado } from '@/lib/servicios';
import AvatarUsuario from '@/components/AvatarUsuario';
import type { Local } from '@/lib/types';
import Icono, { ConIconos } from '@/components/Icono';

// ---------------------------------------------------------------------------
// Selector de servicios (registro del local y panel del Administrador Turístico).
export function SelectorServicios({ valor, onCambiar }: { valor: string[]; onCambiar: (v: string[]) => void }) {
  const alternar = (id: string) => onCambiar(valor.includes(id) ? valor.filter((s) => s !== id) : [...valor, id]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {SERVICIOS.map((s) => {
        const marcado = valor.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => alternar(s.id)}
            aria-pressed={marcado}
            className={`flex items-center gap-2 text-left text-sm px-3 py-2 rounded-xl border transition-colors ${
              marcado ? 'bg-morado-700 border-morado-700 text-white' : 'bg-white border-morado-200 text-morado-800 hover:border-morado-400'
            }`}
          >
            <ConIconos texto={s.icono} />
            {s.nombre}
            {marcado && <span className="ml-auto" aria-hidden><Icono nombre="check" /></span>}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Lo que este lugar ofrece": aforo y servicios.
export function LoQueOfrece({ aforo, servicios }: { aforo?: number | null; servicios?: string[] }) {
  if (!aforo && (!servicios || servicios.length === 0)) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-morado-900 mb-3">Lo que este lugar ofrece</h2>
      {aforo ? (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-morado-900 bg-morado-50 border border-morado-100 rounded-full px-3 py-1.5 mb-3">
          <Icono nombre="users" /> Capacidad para {aforo.toLocaleString('es-BO')} personas
        </p>
      ) : null}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(servicios ?? []).map((id) => {
          const s = servicio(id);
          return s ? (
            <li key={id} className="flex items-center gap-3 text-sm text-morado-900">
              <span className="text-xl w-7 text-center" aria-hidden>
                <ConIconos texto={s.icono} />
              </span>
              {s.nombre}
            </li>
          ) : null;
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// "Paseo por el edificio": foto panoramica 360 que se arrastra (o gira sola).
export function Paseo360({ url, nombre }: { url: string; nombre: string }) {
  const [x, setX] = useState(0);
  const [girando, setGirando] = useState(true);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const arrastre = useRef<{ inicio: number; x: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  // Giro automatico lento hasta que la persona lo toca.
  useEffect(() => {
    if (!girando) return;
    let cuadro = 0;
    const paso = () => {
      setX((v) => v - 0.4);
      cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [girando]);

  useEffect(() => {
    const salir = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', salir);
    return () => document.removeEventListener('fullscreenchange', salir);
  }, []);

  const alternarPantalla = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else caja.current?.requestFullscreen?.();
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-morado-900 mb-1"><Icono nombre="rotate-3d" /> Paseo 360° por el edificio</h2>
      <p className="text-xs text-morado-500 mb-2">Arrastra la imagen con el mouse o el dedo para mirar alrededor.</p>
      <div
        ref={caja}
        role="img"
        aria-label={`Vista panorámica 360° de ${nombre}`}
        className={`relative overflow-hidden rounded-2xl border border-morado-100 bg-morado-900 select-none touch-pan-y ${
          pantallaCompleta ? 'h-screen rounded-none' : 'h-72 sm:h-96'
        } cursor-grab active:cursor-grabbing`}
        style={{
          backgroundImage: `url(${urlArchivo(url)})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: `${x}px center`,
        }}
        onPointerDown={(e) => {
          setGirando(false);
          arrastre.current = { inicio: e.clientX, x };
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (arrastre.current) setX(arrastre.current.x + (e.clientX - arrastre.current.inicio));
        }}
        onPointerUp={() => (arrastre.current = null)}
        onPointerCancel={() => (arrastre.current = null)}
      >
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button type="button" onClick={() => { setGirando(false); setX((v) => v + 200); }} className="w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="Girar a la izquierda">
            ‹
          </button>
          <button type="button" onClick={() => setGirando((g) => !g)} className="px-3 h-9 rounded-full bg-black/50 text-white text-xs hover:bg-black/70">
            <ConIconos texto={girando ? '⏸ Pausar' : '▶ Girar'} />
          </button>
          <button type="button" onClick={() => { setGirando(false); setX((v) => v - 200); }} className="w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70" aria-label="Girar a la derecha">
            ›
          </button>
          <button type="button" onClick={alternarPantalla} className="px-3 h-9 rounded-full bg-black/50 text-white text-xs hover:bg-black/70">
            <ConIconos texto={pantallaCompleta ? '✕ Salir' : '⛶ Pantalla completa'} />
          </button>
        </div>
        <span className="absolute top-3 left-3 text-[11px] font-bold text-white bg-black/50 rounded-full px-2.5 py-1">360°</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Video del local (YouTube o TikTok).
export function VideoLocal({ url, nombre }: { url: string; nombre: string }) {
  const src = videoIncrustado(url);
  if (!src) return null;
  const esTikTok = src.includes('tiktok');
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-morado-900 mb-3"><Icono nombre="video" /> Video</h2>
      <div className={`overflow-hidden rounded-2xl border border-morado-100 bg-black ${esTikTok ? 'max-w-sm aspect-[9/16]' : 'aspect-video'}`}>
        <iframe
          src={src}
          title={`Video de ${nombre}`}
          className="w-full h-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta del anfitrion (como Airbnb): datos, WhatsApp y "Lo que debes saber".
const tiempoEnPlataforma = (iso?: string) => {
  if (!iso) return null;
  const meses = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (30.44 * 24 * 3600 * 1000)));
  if (meses < 1) return 'Nuevo en Cholets Turístico';
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'} en Cholets Turístico`;
  const anios = Math.floor(meses / 12);
  return `${anios} ${anios === 1 ? 'año' : 'años'} en Cholets Turístico`;
};

// Numero boliviano de 8 digitos (6/7...) -> con codigo de pais 591.
const enlaceWhatsapp = (numero: string, local: string) => {
  let digitos = numero.replace(/\D/g, '');
  if (digitos.length === 8) digitos = `591${digitos}`;
  const texto = encodeURIComponent(`Hola, vi "${local}" en Cholets Turístico El Alto y quisiera más información.`);
  return `https://wa.me/${digitos}?text=${texto}`;
};

export function TarjetaAnfitrion({ local, delGamea }: { local: Local; delGamea: boolean }) {
  const a = local.anfitrion;
  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-morado-100 bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-morado-900 mb-3">{delGamea ? 'Publicado por' : 'Conoce al anfitrión'}</h2>
        {delGamea ? (
          <p className="text-sm text-morado-800"><Icono nombre="landmark" /> Gobierno Autónomo Municipal de El Alto (G.A.M.E.A.)</p>
        ) : (
          <div className="flex items-center gap-3">
            <AvatarUsuario url={a?.avatarUrl ?? null} nombre={a?.nombre ?? ''} apellido={a?.apellidoPaterno ?? ''} tamano="w-14 h-14 text-lg" />
            <div>
              <p className="font-semibold text-morado-900">
                {a?.nombre} {a?.apellidoPaterno}
              </p>
              {a?.datosVerificadosEn && <p className="text-xs font-semibold text-green-700"><Icono nombre="shield-check" /> Anfitrión verificado por el G.A.M.E.A.</p>}
              {tiempoEnPlataforma(a?.creadoEn) && <p className="text-xs text-morado-500">{tiempoEnPlataforma(a?.creadoEn)}</p>}
            </div>
          </div>
        )}
        {local.whatsapp && (
          <a
            href={enlaceWhatsapp(local.whatsapp, local.nombre)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1fa855] hover:bg-[#178a45] text-white font-semibold px-4 py-2.5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" />
            </svg>
            Escribir por WhatsApp
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-morado-100 bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-morado-900 mb-3">Lo que debes saber</h2>
        <dl className="space-y-3 text-sm">
          {local.horarioFuncionamiento && (
            <div>
              <dt className="font-semibold text-morado-800"><Icono nombre="clock" /> Horario</dt>
              <dd className="text-morado-700">{local.horarioFuncionamiento}</dd>
            </div>
          )}
          {local.aforo ? (
            <div>
              <dt className="font-semibold text-morado-800"><Icono nombre="users" /> Capacidad máxima</dt>
              <dd className="text-morado-700">{local.aforo.toLocaleString('es-BO')} personas</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-morado-800"><Icono nombre="clipboard-list" /> Reglas del local</dt>
            <dd className="text-morado-700 whitespace-pre-wrap">{local.reglas || 'El anfitrión no indicó reglas especiales.'}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// "Denunciar este local": llega a la bandeja del Operador G.A.M.E.A.
const MOTIVOS = [
  { id: 'FALSO', nombre: 'El local no existe o es falso' },
  { id: 'INFORMACION_ENGANOSA', nombre: 'Información o fotos engañosas' },
  { id: 'CONTENIDO_INAPROPIADO', nombre: 'Contenido inapropiado u ofensivo' },
  { id: 'FRAUDE', nombre: 'Intento de estafa o cobro indebido' },
  { id: 'CERRADO', nombre: 'El local cerró definitivamente' },
  { id: 'OTRO', nombre: 'Otro motivo' },
];

export function DenunciarLocal({ localId, esDelUsuario }: { localId: string; esDelUsuario: boolean }) {
  const { usuario, token } = useAuth();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  if (esDelUsuario) return null;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await api(`/locales/${localId}/denuncias`, {
        method: 'POST',
        token,
        body: JSON.stringify({ motivo, detalle: detalle.trim() || undefined }),
      });
      setListo(true);
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar la denuncia.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {usuario ? (
        <button type="button" onClick={() => setAbierto(true)} className="text-xs text-morado-500 hover:text-red-700 underline underline-offset-2">
          <Icono nombre="flag" /> Denunciar este local
        </button>
      ) : (
        <Link href={`/login?siguiente=${encodeURIComponent(ruta ?? '/')}`} className="text-xs text-morado-500 hover:text-red-700 underline underline-offset-2">
          <Icono nombre="flag" /> Denunciar este local (inicia sesión)
        </Link>
      )}
      {abierto && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => !enviando && setAbierto(false)}>
          <div role="dialog" aria-modal="true" aria-label="Denunciar este local" className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setAbierto(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full text-morado-500 hover:bg-morado-50" aria-label="Cerrar">
              <Icono nombre="x" className="h-4 w-4" />
            </button>
            {listo ? (
              <div className="text-center py-4">
                <p className="text-4xl" aria-hidden><Icono nombre="circle-check" /></p>
                <h2 className="text-lg font-bold text-morado-900 mt-2">Denuncia enviada</h2>
                <p className="text-sm text-morado-600 mt-1">Gracias. El Operador G.A.M.E.A. la revisará.</p>
                <button type="button" onClick={() => setAbierto(false)} className="boton-primario-sm mt-4">
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
                <h2 className="text-lg font-bold text-morado-900"><Icono nombre="flag" className="h-5 w-5 text-red-600" /> Denunciar este local</h2>
                <p className="text-xs text-morado-600">Tu denuncia es confidencial: el dueño no sabrá quién la hizo.</p>
                <fieldset className="space-y-1.5">
                  <legend className="etiqueta-campo">¿Qué pasa con este local?</legend>
                  {MOTIVOS.map((m) => (
                    <label key={m.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border cursor-pointer ${motivo === m.id ? 'border-red-400 bg-red-50' : 'border-morado-100'}`}>
                      <input type="radio" name="motivo" value={m.id} checked={motivo === m.id} onChange={() => setMotivo(m.id)} required />
                      {m.nombre}
                    </label>
                  ))}
                </fieldset>
                <label className="block">
                  <span className="etiqueta-campo">Detalle {motivo === 'OTRO' ? '(obligatorio)' : '(opcional)'}</span>
                  <textarea className="input-campo" rows={3} maxLength={1000} value={detalle} onChange={(e) => setDetalle(e.target.value)} required={motivo === 'OTRO'} placeholder="Cuéntanos qué viste." />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" className="boton-primario w-full !bg-red-700 hover:!bg-red-800" disabled={enviando || !motivo}>
                  {enviando ? 'Enviando…' : 'Enviar denuncia'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
