'use client';

import { ElementType, ReactNode, useEffect, useRef, useState } from 'react';

// Hace aparecer su contenido (fundido + subida) la primera vez que entra en
// pantalla. Sin librerias: IntersectionObserver + CSS (.revelar en globals.css).
// "retraso" en ms sirve para las cascadas de tarjetas.
export function useVisibleUnaVez<T extends Element>(margen = '0px 0px -8% 0px') {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') return setVisible(true);
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: margen },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, margen]);
  return { ref, visible };
}

export default function Revelar({
  children,
  retraso = 0,
  className = '',
  como: Etiqueta = 'div',
}: {
  children: ReactNode;
  retraso?: number;
  className?: string;
  como?: ElementType;
}) {
  const { ref, visible } = useVisibleUnaVez<HTMLDivElement>();
  return (
    <Etiqueta
      ref={ref}
      className={`revelar ${visible ? 'visible' : ''} ${className}`}
      style={{ '--retraso': `${retraso}ms` } as React.CSSProperties}
    >
      {children}
    </Etiqueta>
  );
}
