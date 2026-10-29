'use client';

import { useEffect, useState } from 'react';

// Boton cuadrado oscuro (abajo a la izquierda) que aparece al bajar la pagina
// y vuelve arriba.
export default function BotonSubir() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alMover = () => setVisible(window.scrollY > 700);
    alMover();
    window.addEventListener('scroll', alMover, { passive: true });
    return () => window.removeEventListener('scroll', alMover);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Volver arriba"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 left-5 z-40 w-12 h-12 rounded-xl bg-morado-900 text-white text-xl shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-morado-700 active:scale-95 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      ↑
    </button>
  );
}
