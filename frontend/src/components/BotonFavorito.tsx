'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFavoritos } from '@/context/FavoritosContext';

// Corazon para guardar un local en favoritos. Sin sesion, lleva a iniciar sesion.
// "flotante": circulo blanco sobre la foto de la tarjeta; si no, boton con texto.
export default function BotonFavorito({ localId, flotante = false }: { localId: string; flotante?: boolean }) {
  const { disponible, esFavorito, alternar } = useFavoritos();
  const router = useRouter();
  const activo = esFavorito(localId);
  const texto = activo ? 'Quitar de favoritos' : 'Guardar en favoritos';
  // Cambia cada vez que se guarda: reinicia la animacion de rebote del corazon.
  const [rebote, setRebote] = useState(0);

  const pulsar = async (e: React.MouseEvent) => {
    // La tarjeta entera es un enlace: el clic en el corazon no debe abrir el local.
    e.preventDefault();
    e.stopPropagation();
    if (!activo) setRebote((n) => n + 1);
    const conSesion = await alternar(localId);
    if (!conSesion) router.push(`/login?siguiente=${encodeURIComponent(window.location.pathname)}`);
  };

  const corazon = (
    <svg
      key={rebote}
      className={rebote ? 'latido' : ''}
      width={flotante ? 18 : 16}
      height={flotante ? 18 : 16}
      viewBox="0 0 24 24"
      fill={activo ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.3 3.3 4.5 7 4.5c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 3.7 0 5.9 3.8 4.5 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );

  // Administrador Turístico y Operador G.A.M.E.A.: sin corazon.
  if (!disponible) return null;

  if (flotante) {
    return (
      <button
        type="button"
        onClick={pulsar}
        title={texto}
        aria-label={texto}
        aria-pressed={activo}
        className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/75 backdrop-blur shadow flex items-center justify-center transition-transform hover:scale-110 ${
          activo ? 'text-rose-600' : 'text-morado-800'
        }`}
      >
        {corazon}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={pulsar}
      aria-pressed={activo}
      className={`boton-secundario-sm ${activo ? '!text-rose-600 !border-rose-300 hover:!text-white' : ''}`}
    >
      {corazon}
      {activo ? 'En favoritos' : 'Guardar'}
    </button>
  );
}
