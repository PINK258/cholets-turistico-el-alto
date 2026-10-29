'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface FavoritosContextValor {
  // Favoritos solo para visitantes: sin sesion (para invitarlos a entrar) o
  // con cuenta de Usuario Turístico. No para anfitriones ni el operador.
  disponible: boolean;
  // Ids de los locales que el usuario guardo con el corazon.
  ids: Set<string>;
  esFavorito: (localId: string) => boolean;
  // Agrega o quita; devuelve false si no hay sesion (hay que iniciar sesion).
  alternar: (localId: string) => Promise<boolean>;
}

const FavoritosContext = createContext<FavoritosContextValor | undefined>(undefined);

// Los favoritos se guardan en el backend (tabla favoritos), asi se ven en
// cualquier dispositivo. Aqui solo se guardan los ids para pintar los corazones
// de todas las tarjetas a la vez.
export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { usuario, token } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const esTurista = usuario?.rol === 'TURISTA';
  const disponible = !usuario || esTurista;

  useEffect(() => {
    if (!usuario || !token || !esTurista) {
      setIds(new Set());
      return;
    }
    api<string[]>('/favoritos/ids', { token })
      .then((lista) => setIds(new Set(lista)))
      .catch(() => setIds(new Set()));
  }, [usuario, token, esTurista]);

  const alternar = useCallback(
    async (localId: string) => {
      if (!token || !esTurista) return false;
      const era = ids.has(localId);
      // Cambio inmediato en pantalla; si el servidor falla, se deshace.
      const cambiar = (agregar: boolean) =>
        setIds((actual) => {
          const nuevo = new Set(actual);
          if (agregar) nuevo.add(localId);
          else nuevo.delete(localId);
          return nuevo;
        });
      cambiar(!era);
      try {
        await api(`/favoritos/${localId}`, { method: era ? 'DELETE' : 'POST', token });
      } catch {
        cambiar(era);
      }
      return true;
    },
    [ids, token, esTurista],
  );

  const esFavorito = useCallback((localId: string) => ids.has(localId), [ids]);

  return <FavoritosContext.Provider value={{ disponible, ids, esFavorito, alternar }}>{children}</FavoritosContext.Provider>;
}

export function useFavoritos() {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritos debe usarse dentro de FavoritosProvider');
  return ctx;
}
