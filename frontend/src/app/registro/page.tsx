'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import SubirFotoPerfil from '@/components/SubirFotoPerfil';
import CampoContrasena, { RevisionContrasena } from '@/components/CampoContrasena';
import { AYUDA_CONTRASENA, errorContrasena } from '@/lib/contrasena';
import FormularioRegistroLocal from '@/components/FormularioRegistroLocal';
import CamposPersonales, { DatosPersonales, PERSONALES_VACIOS, datosPersonalesCompletos } from '@/components/CamposPersonales';
import Icono, { ConIconos } from '@/components/Icono';

type Tipo = 'usuario' | 'local';

const OPCIONES: { tipo: Tipo; icono: string; titulo: string; texto: string; puntos: string[] }[] = [
  {
    tipo: 'usuario',
    icono: '🧳',
    titulo: 'Regístrate Usuario Turístico',
    texto: 'Para visitantes y turistas.',
    puntos: ['Descubre cholets y eventos', 'Califica locales con estrellas', 'Deja tus comentarios'],
  },
  {
    tipo: 'local',
    icono: '🏠',
    titulo: 'Registra tu local',
    texto: 'Para dueños de cholets, salones y restaurantes.',
    puntos: ['Publica fotos, horario y ubicación', 'Muestra los eventos que realizas', 'Lo verifica el Operador G.A.M.E.A.'],
  },
];

// useSearchParams necesita un limite de Suspense en Next 16.
export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <Registro />
    </Suspense>
  );
}

function Registro() {
  const router = useRouter();
  const { usuario } = useAuth();
  const parametro = useSearchParams().get('tipo');
  // La opcion elegida vive en la URL (/registro?tipo=local): se puede enlazar
  // directo y el boton "atras" del navegador vuelve a la eleccion.
  const tipo: Tipo | null = parametro === 'usuario' || parametro === 'local' ? parametro : null;
  const elegir = (t: Tipo) => router.push(`/registro?tipo=${t}`, { scroll: false });

  return (
    <div className={`contenedor py-10 ${tipo === 'local' ? 'max-w-3xl' : tipo === 'usuario' ? 'max-w-md' : 'max-w-3xl'}`}>
      <Image
        src="/imagenes/logos/logo-principal.png"
        alt="Cholets Turístico El Alto"
        width={353}
        height={316}
        className="h-20 w-auto mx-auto mb-4"
        priority
      />
      <h1 className="text-2xl font-bold text-morado-900 mb-1 text-center">Crear cuenta</h1>

      {tipo === null ? (
        <>
          <p className="text-morado-600 mb-6 text-center">¿Cómo quieres usar Cholets Turístico El Alto?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OPCIONES.map((o) => (
              <button
                key={o.tipo}
                type="button"
                onClick={() => elegir(o.tipo)}
                className="group text-left rounded-2xl border-2 border-morado-100 bg-white p-5 shadow-card transition-all hover:border-morado-400 hover:-translate-y-0.5 focus-visible:border-morado-500"
              >
                <span className="text-3xl" aria-hidden><ConIconos texto={o.icono} /></span>
                <p className="mt-2 font-bold text-morado-900 group-hover:text-morado-700">{o.titulo}</p>
                <p className="text-xs text-morado-500 mb-3">{o.texto}</p>
                <ul className="space-y-1">
                  {o.puntos.map((p) => (
                    <li key={p} className="text-sm text-morado-700 flex gap-2">
                      <span className="text-dorado-500" aria-hidden><Icono nombre="check" /></span>
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex boton-primario-sm">Continuar →</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Cambiar de opcion sin volver al inicio */}
          <div className="flex justify-center my-5">
            <div className="inline-flex rounded-full bg-morado-50 p-1 border border-morado-100" role="tablist">
              {OPCIONES.map((o) => (
                <button
                  key={o.tipo}
                  type="button"
                  role="tab"
                  aria-selected={tipo === o.tipo}
                  onClick={() => elegir(o.tipo)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    tipo === o.tipo ? 'bg-morado-700 text-white shadow-boton' : 'text-morado-700 hover:bg-white'
                  }`}
                >
                  <ConIconos texto={o.icono} /> {o.titulo}
                </button>
              ))}
            </div>
          </div>
          {tipo === 'usuario' ? <FormularioUsuario /> : <FormularioRegistroLocal />}
        </>
      )}

      {/* En "Registra tu local" el paso 1 ya ofrece iniciar sesion. */}
      {!usuario && tipo !== 'local' && (
        <p className="text-sm text-morado-600 mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="boton-texto">
            Inicia sesión
          </Link>
        </p>
      )}
    </div>
  );
}

// Registro del Usuario Turístico (solo con correo): formulario completo
// (foto, nombre, apellidos, correo y contraseña) y luego un codigo enviado al
// correo para verificarlo. Siempre crea una cuenta de Usuario Turístico.
type Sesion = { accessToken: string; permisoContrasena?: string };

function FormularioUsuario() {
  const { usuario, loginConToken } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', correo: '' });
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [personales, setPersonales] = useState<DatosPersonales>(PERSONALES_VACIOS);
  const [paso, setPaso] = useState<'datos' | 'codigo'>('datos');
  const [codigo, setCodigo] = useState('');
  const [modoPrueba, setModoPrueba] = useState(false);
  const [espera, setEspera] = useState(0);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  // El formulario de correo va en una ventana aparte (no a la vista).
  const [ventana, setVentana] = useState(false);

  useEffect(() => {
    if (!ventana) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && setVentana(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ventana, cargando]);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const cambiar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  // Durante la creacion la cuenta ya existe (se sube la foto): se sigue
  // mostrando el formulario hasta terminar.
  if (usuario && !cargando) {
    return (
      <div className="text-center rounded-2xl border border-morado-100 bg-morado-50/50 p-5">
        <p className="text-morado-800">
          Ya tienes una cuenta como <strong>{usuario.nombre}</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <Link href="/perfil" className="boton-secundario-sm">Ir a mi perfil</Link>
          <Link href="/registro?tipo=local" className="boton-primario-sm">Registrar mi local</Link>
        </div>
      </div>
    );
  }

  // 1) Datos completos -> se envia el codigo al correo.
  const enviarCodigo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    const errorClave = errorContrasena(password, password2);
    if (errorClave) return setError(errorClave);
    if (!datosPersonalesCompletos(personales)) return setError('Completa tu género, fecha de nacimiento, país y ciudad.');
    setCargando(true);
    try {
      const r = await api<{ modoPrueba: boolean }>('/auth/correo/enviar', {
        method: 'POST',
        body: JSON.stringify({ correo: form.correo.trim(), registro: true }),
      });
      setModoPrueba(r.modoPrueba);
      setCodigo('');
      setPaso('codigo');
      setEspera(30);
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar el código.');
    } finally {
      setCargando(false);
    }
  };

  // 2) Codigo correcto -> se crea la cuenta, se sube la foto y se guarda la contraseña.
  const crearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const creada = await api<Sesion>('/auth/correo/verificar', {
        method: 'POST',
        body: JSON.stringify({
          correo: form.correo.trim(),
          codigo,
          nombre: form.nombre.trim(),
          apellidoPaterno: form.apellidoPaterno.trim(),
          apellidoMaterno: form.apellidoMaterno.trim() || undefined,
          genero: personales.genero,
          fechaNacimiento: personales.fechaNacimiento,
          pais: personales.pais.trim(),
          ciudad: personales.ciudad.trim(),
          registro: true,
        }),
      });
      let fotoFallo = false;
      if (fotoPerfil) {
        const body = new FormData();
        body.append('fotoPerfil', fotoPerfil);
        await api('/auth/perfil/foto', { method: 'POST', token: creada.accessToken, body }).catch(() => {
          fotoFallo = true;
        });
      }
      const final = creada.permisoContrasena
        ? await api<Sesion>('/auth/contrasena/restablecer', {
            method: 'POST',
            body: JSON.stringify({ permiso: creada.permisoContrasena, password }),
          })
        : creada;
      await loginConToken(final.accessToken);
      router.push(fotoFallo ? '/perfil?foto=error' : '/');
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  const formularioCodigo = (
    <form onSubmit={crearCuenta} className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-morado-900">Verifica tu correo</h2>
        <p className="text-morado-600 text-sm mt-1">
          Enviamos un código de 6 números a <b className="text-morado-900 break-all">{form.correo.trim()}</b>. Vence en 10 minutos.
        </p>
        <p className="text-xs text-morado-500 mt-1">Si no lo ves, revisa Spam o Promociones.</p>
      </div>
      {modoPrueba && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Modo de prueba: el código aparece en la consola del backend (VS Code).
        </p>
      )}
      <input
        className="input-campo text-center text-2xl font-bold tracking-[0.5em]"
        placeholder="000000"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 números"
        autoFocus
        required
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="boton-primario w-full" disabled={cargando || codigo.length !== 6}>
        <ConIconos texto={cargando ? 'Creando cuenta…' : '✨ Verificar y crear mi cuenta'} />
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="boton-texto" onClick={() => { setPaso('datos'); setError(''); }}>
          ← Corregir mis datos
        </button>
        <button type="button" className="boton-texto disabled:opacity-50" disabled={espera > 0 || cargando} onClick={() => enviarCodigo()}>
          {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );

  const formularioDatos = (
    <form onSubmit={enviarCodigo} className="space-y-3">
      <div className="text-center mb-1">
        <h2 className="text-xl font-bold text-morado-900">Regístrate con tu correo</h2>
        <p className="text-xs text-morado-500">Cuenta de Usuario Turístico</p>
      </div>
      <SubirFotoPerfil archivo={fotoPerfil} onElegir={setFotoPerfil} />
      <input placeholder="Nombre" className="input-campo" value={form.nombre} onChange={cambiar('nombre')} required minLength={2} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Apellido paterno" className="input-campo" value={form.apellidoPaterno} onChange={cambiar('apellidoPaterno')} required />
        <input placeholder="Apellido materno" className="input-campo" value={form.apellidoMaterno} onChange={cambiar('apellidoMaterno')} />
      </div>
      <input type="email" placeholder="Correo electrónico" className="input-campo" value={form.correo} onChange={cambiar('correo')} autoComplete="email" required />
      <CamposPersonales valor={personales} onCambiar={setPersonales} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoContrasena value={password} onChange={setPassword} placeholder="Contraseña (mín. 8)" autoComplete="new-password" minLength={8} />
        <CampoContrasena value={password2} onChange={setPassword2} placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} />
      </div>
      <RevisionContrasena password={password} repetida={password2} />
      <p className="text-xs text-morado-500">
        <Icono nombre="lock" /> {AYUDA_CONTRASENA} Al continuar te enviaremos un código a tu correo para verificarlo.
      </p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="boton-primario w-full" disabled={cargando}>
        {cargando ? 'Enviando código…' : 'Continuar'}
      </button>
    </form>
  );

  return (
    <div className="max-w-sm mx-auto">
      <button type="button" onClick={() => { setVentana(true); setError(''); }} className="boton-secundario-sm w-full !py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
        Registrarme con correo
      </button>

      {/* Ventana aparte con el formulario de correo (y luego el codigo). */}
      {ventana && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !cargando && setVentana(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Registrarme con correo"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8"
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
            {paso === 'codigo' ? formularioCodigo : formularioDatos}
          </div>
        </div>
      )}
    </div>
  );
}
