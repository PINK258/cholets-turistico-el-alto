'use client';

import { useEffect, useState } from 'react';
import Icono from '@/components/Icono';

// Evento de Chrome/Edge/Android que permite mostrar "Instalar" con un boton propio.
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// Registra el service worker (public/sw.js) y muestra el boton "📲 Instalar app":
//  - Android / Chrome / Edge: abre el dialogo de instalacion del navegador.
//  - iPhone (Safari no tiene ese dialogo): explica "Compartir > Agregar a inicio".
// No se muestra si la app ya esta instalada (abierta a pantalla completa).
export default function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [instalada, setInstalada] = useState(true);
  const [ayudaIOS, setAyudaIOS] = useState(false);

  useEffect(() => {
    // El service worker solo funciona en localhost o https.
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
    }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setInstalada(standalone);
    setEsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const alOfrecer = (e: Event) => {
      e.preventDefault(); // se guarda para lanzarlo con nuestro boton
      setEvento(e as EventoInstalar);
    };
    const alInstalar = () => {
      setInstalada(true);
      setEvento(null);
    };
    window.addEventListener('beforeinstallprompt', alOfrecer);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  if (instalada || (!evento && !esIOS)) return null;

  const instalar = async () => {
    if (evento) {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      if (outcome === 'accepted') setInstalada(true);
      setEvento(null);
    } else {
      setAyudaIOS(true);
    }
  };

  return (
    <>
      <button type="button" onClick={instalar} className="boton-secundario-sm" title="Instalar Cholets Turístico como app">
        <Icono nombre="smartphone" /> <span className="hidden sm:inline">Instalar app</span>
      </button>

      {ayudaIOS && (
        <div className="fixed inset-0 z-[1100] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setAyudaIOS(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Instalar en iPhone"
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 text-morado-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Instalar en tu iPhone</h2>
            <ol className="mt-3 space-y-2 text-sm text-morado-700 list-decimal list-inside">
              <li>
                Toca el botón <b>Compartir</b> <span aria-hidden><Icono nombre="arrow-up" /></span> de Safari (abajo).
              </li>
              <li>
                Elige <b>«Agregar a inicio»</b> <span aria-hidden><Icono nombre="plus" /></span>.
              </li>
              <li>
                Pulsa <b>Agregar</b>: el ícono de Cholets aparecerá en tu pantalla.
              </li>
            </ol>
            <button type="button" className="boton-primario w-full mt-4" onClick={() => setAyudaIOS(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
