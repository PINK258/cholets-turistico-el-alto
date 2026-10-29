'use client';

import { useEffect, useState } from 'react';
import { useVisibleUnaVez } from '@/components/ui/Revelar';

// Cuenta de 0 al valor real la primera vez que entra en pantalla.
export default function ContadorAnimado({ valor, duracion = 1200 }: { valor: number; duracion?: number }) {
  const { ref, visible } = useVisibleUnaVez<HTMLSpanElement>();
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setActual(valor);
    let cuadro = 0;
    const inicio = performance.now();
    const paso = (t: number) => {
      const avance = Math.min((t - inicio) / duracion, 1);
      // easeOut: rapido al principio, suave al final
      setActual(Math.round(valor * (1 - Math.pow(1 - avance, 3))));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [visible, valor, duracion]);

  return (
    <span ref={ref} className="tabular-nums">
      {actual.toLocaleString('es-BO')}
    </span>
  );
}
