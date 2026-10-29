'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Icono from '@/components/Icono';

// Franja que pide completar genero, fecha de nacimiento y procedencia a quien
// no los tiene (cuentas de Google o creadas antes de pedirlos).
export default function AvisoDatosPersonales() {
  const { usuario } = useAuth();
  const ruta = usePathname();
  if (!usuario || (usuario.rol !== 'TURISTA' && usuario.rol !== 'ANFITRION')) return null;
  if (usuario.genero && usuario.fechaNacimiento && usuario.pais && usuario.ciudad) return null;
  if (ruta?.startsWith('/perfil')) return null;
  return (
    <div className="bg-dorado-400/20 border-b border-dorado-400/50">
      <p className="contenedor py-2 text-sm text-morado-900 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span><Icono nombre="clipboard-list" /> Completa tus datos (género, fecha de nacimiento y procedencia) para las estadísticas de turismo de El Alto.</span>
        <Link href="/perfil#datos" className="font-semibold underline underline-offset-2">
          Completar ahora →
        </Link>
      </p>
    </div>
  );
}
