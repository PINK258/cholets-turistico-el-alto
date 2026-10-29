'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFavoritos } from '@/context/FavoritosContext';
import { api } from '@/lib/api';
import { Local } from '@/lib/types';
import LocalCard from '@/components/LocalCard';
import Icono from '@/components/Icono';

// "Mis favoritos": los locales que el usuario guardo con el corazon.
export default function FavoritosPage() {
  const { usuario, token, cargando: cargandoAuth } = useAuth();
  const { ids } = useFavoritos();
  const router = useRouter();
  const [locales, setLocales] = useState<Local[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.push('/login?siguiente=/favoritos');
      return;
    }
    // Solo para el Usuario Turístico.
    if (usuario.rol !== 'TURISTA') {
      router.push('/');
      return;
    }
    api<Local[]>('/favoritos', { token })
      .then(setLocales)
      .catch(() => setError('No se pudieron cargar tus favoritos. Vuelve a intentarlo.'));
  }, [usuario, token, cargandoAuth, router]);

  if (cargandoAuth || !usuario || usuario.rol !== 'TURISTA') return null;

  // Al quitar el corazon en esta pagina, la tarjeta desaparece al instante.
  const visibles = (locales ?? []).filter((l) => ids.has(l.id));

  return (
    <div className="contenedor py-8">
      <h1 className="text-2xl font-bold text-morado-900"><Icono nombre="heart" className="h-6 w-6 text-rose-600" /> Mis favoritos</h1>
      <p className="text-sm text-morado-600 mt-1 mb-6">
        Los locales que guardaste con el corazón. Tócalo otra vez para quitarlos.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && locales === null && <p className="text-morado-500">Cargando…</p>}
      {locales !== null && visibles.length === 0 && (
        <div className="text-center py-16 bg-white border border-morado-100 rounded-2xl">
          <p className="text-4xl mb-2" aria-hidden><Icono nombre="heart" /></p>
          <p className="text-morado-800 font-medium">Todavía no guardaste ningún local.</p>
          <p className="text-sm text-morado-500 mt-1">Toca el corazón de un local para verlo aquí.</p>
          <Link href="/" className="boton-primario-sm mt-4 inline-flex">
            Explorar locales
          </Link>
        </div>
      )}
      {visibles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibles.map((l) => (
            <LocalCard key={l.id} local={l} />
          ))}
        </div>
      )}
    </div>
  );
}
