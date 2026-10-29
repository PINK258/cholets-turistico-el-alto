'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import CampoContrasena from '@/components/CampoContrasena';
import Icono from '@/components/Icono';

// Iniciar sesion solo con correo: se abre una ventana aparte con correo y
// contraseña (o un codigo al correo si se olvido la contraseña).
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [ventana, setVentana] = useState(false);
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // La ventana se cierra con Esc (salvo mientras se esta entrando).
  useEffect(() => {
    if (!ventana) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && setVentana(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ventana, cargando]);

  // Pagina a la que se vuelve al entrar (ej. al guardar un favorito). Solo
  // rutas internas: "/algo", nunca "//otro-sitio".
  const siguiente = () => {
    const s = new URLSearchParams(window.location.search).get('siguiente');
    return s && /^\/(?!\/)/.test(s) ? s : null;
  };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(correo, password);
      router.push(siguiente() ?? '/');
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  // Entrar sin contraseña (o si se olvido): la pagina del codigo lo envia apenas se abre.
  const entrarConCodigo = () => {
    if (!correo.trim()) return setError('Escribe tu correo para enviarte el código.');
    const params = new URLSearchParams({ correo: correo.trim(), enviar: '1' });
    const s = siguiente();
    if (s) params.set('siguiente', s);
    router.push(`/acceso-correo?${params}`);
  };

  return (
    <div className="contenedor py-12 max-w-sm">
      <Image
        src="/imagenes/logos/logo-principal.png"
        alt="Cholets Turístico El Alto"
        width={353}
        height={316}
        className="h-24 w-auto mx-auto mb-6"
        priority
      />
      <h1 className="text-2xl font-bold text-morado-900 text-center">Iniciar sesión</h1>
      <p className="text-sm text-morado-600 mt-1 mb-6 text-center">Para guardar favoritos, comentar o registrar tu local.</p>

      <button type="button" onClick={() => { setVentana(true); setError(''); }} className="boton-secundario-sm w-full !py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
        Continuar con correo
      </button>

      <p className="text-sm text-morado-600 mt-6 text-center">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="boton-texto">
          Regístrate
        </Link>
      </p>

      {/* Ventana aparte: correo y contraseña. */}
      {ventana && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !cargando && setVentana(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Iniciar sesión con correo"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVentana(false)}
              disabled={cargando}
              className="absolute top-3 right-3 w-8 h-8 rounded-full text-morado-500 hover:bg-morado-50 hover:text-morado-800"
              aria-label="Cerrar"
            >
              <Icono nombre="x" className="h-4 w-4" />
            </button>

            <form onSubmit={entrar} className="space-y-3">
              <h2 className="text-xl font-bold text-morado-900 text-center mb-2">Inicia sesión con tu correo</h2>
              <input
                type="email"
                placeholder="Correo electrónico"
                className="input-campo"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              <CampoContrasena value={password} onChange={setPassword} />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" className="boton-primario w-full" disabled={cargando}>
                {cargando ? 'Ingresando…' : 'Iniciar sesión'}
              </button>
            </form>

            <button type="button" onClick={entrarConCodigo} className="boton-texto w-full text-sm mt-4">
              ¿Olvidaste tu contraseña? Entra con un código a tu correo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
