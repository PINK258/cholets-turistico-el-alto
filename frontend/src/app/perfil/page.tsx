'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import SubirFotoPerfil from '@/components/SubirFotoPerfil';
import { Estrellas } from '@/components/Estrellas';
import CamposPersonales, { DatosPersonales, PERSONALES_VACIOS, datosPersonalesCompletos } from '@/components/CamposPersonales';
import Icono from '@/components/Icono';

type MiResena = {
  id: string;
  calificacion: number;
  comentario: string | null;
  actualizadoEn: string;
  local: { id: string; nombre: string };
};

const NOMBRE_ROL: Record<string, string> = {
  TURISTA: 'Visitante',
  ANFITRION: 'Administrador turístico (dueño de local)',
  OPERADOR: 'Operador G.A.M.E.A.',
  ADMIN: 'Administrador',
};

// useSearchParams necesita un limite de Suspense en Next 16.
export default function PerfilPage() {
  return (
    <Suspense fallback={null}>
      <Perfil />
    </Suspense>
  );
}

function Perfil() {
  const { usuario, token, cargando, loginConToken } = useAuth();
  const router = useRouter();
  // Llega con ?foto=error si la foto elegida al registrarse no se pudo subir.
  const fotoFallo = useSearchParams().get('foto') === 'error';
  const [resenas, setResenas] = useState<MiResena[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  // Datos personales (genero, nacimiento, procedencia): se completan o cambian aqui.
  const [personales, setPersonales] = useState<DatosPersonales>(PERSONALES_VACIOS);
  const [telefono, setTelefono] = useState('');
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [avisoDatos, setAvisoDatos] = useState('');
  const [errorDatos, setErrorDatos] = useState('');

  useEffect(() => {
    if (!usuario) return;
    setPersonales({
      genero: usuario.genero ?? '',
      fechaNacimiento: usuario.fechaNacimiento ? usuario.fechaNacimiento.slice(0, 10) : '',
      pais: usuario.pais ?? 'Bolivia',
      ciudad: usuario.ciudad ?? '',
    });
    setTelefono(usuario.telefono ?? '');
  }, [usuario]);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.push('/login');
      return;
    }
    api<MiResena[]>('/resenas/mias', { token })
      .then(setResenas)
      .catch(() => setResenas([]));
  }, [cargando, usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cargando || !usuario) return null;

  const faltanDatos = !usuario.genero || !usuario.fechaNacimiento || !usuario.pais || !usuario.ciudad;

  const guardarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorDatos('');
    setAvisoDatos('');
    if (!datosPersonalesCompletos(personales)) return setErrorDatos('Completa tu género, fecha de nacimiento, país y ciudad.');
    setGuardandoDatos(true);
    try {
      await api('/auth/perfil', {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          genero: personales.genero,
          fechaNacimiento: personales.fechaNacimiento,
          pais: personales.pais.trim(),
          ciudad: personales.ciudad.trim(),
          ...(telefono.trim() && { telefono: telefono.trim() }),
        }),
      });
      await loginConToken(token);
      setAvisoDatos('Tus datos se guardaron.');
    } catch (err: any) {
      setErrorDatos(err.message || 'No se pudieron guardar tus datos.');
    } finally {
      setGuardandoDatos(false);
    }
  };

  const cambiarFoto = async (archivo: File | null) => {
    if (!archivo || !token) return;
    setError('');
    setAviso('');
    setSubiendo(true);
    try {
      const body = new FormData();
      body.append('fotoPerfil', archivo);
      await api('/auth/perfil/foto', { method: 'POST', token, body });
      await loginConToken(token); // recarga el usuario para ver la foto nueva en todo el sitio
      setAviso('Tu foto de perfil se actualizó.');
    } catch (e: any) {
      setError(e.message || 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="contenedor py-10 max-w-2xl">
      <h1 className="text-2xl font-bold text-morado-900 mb-6">Mi perfil</h1>

      <section className="rounded-2xl border border-morado-100 bg-white p-5 shadow-card">
        {fotoFallo && !aviso && (
          <p className="mb-4 text-sm text-dorado-600 bg-dorado-400/10 border border-dorado-400/40 rounded-lg px-3 py-2">
            Tu cuenta se creó, pero la foto no se pudo subir. Elígela otra vez aquí.
          </p>
        )}
        <SubirFotoPerfil archivo={null} urlActual={usuario.avatarUrl} onElegir={cambiarFoto} tamano="w-28 h-28" />
        {subiendo && <p className="text-xs text-morado-500 mt-2">Subiendo foto…</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {aviso && <p className="text-sm text-green-700 mt-2">{aviso}</p>}

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-morado-500">Nombre</dt>
            <dd className="font-semibold text-morado-900">
              {usuario.nombre} {usuario.apellidoPaterno} {usuario.apellidoMaterno}
            </dd>
          </div>
          <div>
            <dt className="text-morado-500">Correo</dt>
            <dd className="font-semibold text-morado-900 break-all"><Icono nombre="mail" /> {usuario.correo}</dd>
          </div>
          <div>
            <dt className="text-morado-500">Tipo de cuenta</dt>
            <dd className="font-semibold text-morado-900">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</dd>
          </div>
          <div>
            <dt className="text-morado-500">Inicias sesión con</dt>
            <dd className="font-semibold text-morado-900">{usuario.proveedorAuth === 'GOOGLE' ? 'Google' : 'Correo y contraseña'}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 mt-5">
          {(usuario.rol === 'ANFITRION' || usuario.rol === 'ADMIN') && (
            <Link href="/anfitrion" className="boton-secundario-sm">Administrador Turístico</Link>
          )}
          {usuario.rol === 'TURISTA' && (
            <Link href="/registrar-local" className="boton-secundario-sm"><Icono nombre="house" /> Registrar mi local</Link>
          )}
        </div>
      </section>

      {/* Datos personales: obligatorios para las estadisticas del G.A.M.E.A. */}
      <section id="datos" className="mt-8 rounded-2xl border border-morado-100 bg-white p-5 shadow-card scroll-mt-24">
        <h2 className="text-lg font-bold text-morado-900">Mis datos personales</h2>
        {faltanDatos && (
          <p className="mt-2 text-sm text-dorado-600 bg-dorado-400/10 border border-dorado-400/40 rounded-lg px-3 py-2">
            Te faltan algunos datos. Complétalos para ayudar al G.A.M.E.A. con las estadísticas de turismo de El Alto.
          </p>
        )}
        <form onSubmit={guardarDatos} className="mt-3 space-y-3">
          <CamposPersonales valor={personales} onCambiar={setPersonales} />
          <label className="block text-[11px] text-morado-600 max-w-xs">
            Teléfono (opcional)
            <input className="input-campo" value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" maxLength={20} />
          </label>
          {errorDatos && <p className="text-sm text-red-600">{errorDatos}</p>}
          {avisoDatos && <p className="text-sm text-green-700">{avisoDatos}</p>}
          <button type="submit" className="boton-primario-sm" disabled={guardandoDatos}>
            {guardandoDatos ? 'Guardando…' : 'Guardar mis datos'}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-morado-900 mb-3">Mis reseñas</h2>
        {resenas === null && <p className="text-sm text-morado-500">Cargando…</p>}
        {resenas?.length === 0 && (
          <p className="text-sm text-morado-500">
            Todavía no calificaste ningún local. <Link href="/" className="boton-texto">Explora los locales</Link> y
            deja tu opinión.
          </p>
        )}
        <ul className="space-y-3">
          {resenas?.map((r) => (
            <li key={r.id} className="rounded-2xl border border-morado-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/locales/${r.local.id}#resenas`} className="font-semibold text-morado-900 hover:underline">
                  {r.local.nombre}
                </Link>
                <Estrellas valor={r.calificacion} tamano={15} />
              </div>
              {r.comentario && <p className="text-sm text-morado-700 mt-1 whitespace-pre-wrap break-words">{r.comentario}</p>}
              <p className="text-[11px] text-morado-400 mt-1">
                {new Date(r.actualizadoEn).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
