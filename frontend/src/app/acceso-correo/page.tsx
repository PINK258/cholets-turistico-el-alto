'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import CampoContrasena, { RevisionContrasena } from '@/components/CampoContrasena';
import SubirFotoPerfil from '@/components/SubirFotoPerfil';
import { errorContrasena } from '@/lib/contrasena';
import CamposPersonales, { DatosPersonales, PERSONALES_VACIOS, datosPersonalesCompletos } from '@/components/CamposPersonales';
import Icono, { ConIconos } from '@/components/Icono';

type Paso = 'correo' | 'codigo' | 'nombre' | 'contrasena';
type Sesion = { accessToken: string; permisoContrasena?: string; usuario?: { tieneContrasena?: boolean } };

// "Continuar con correo" (como ChatGPT): 1) escribe tu correo, 2) escribe el
// codigo de 6 numeros que te llega a Gmail, 3) solo la primera vez, tu nombre,
// 4) crear (o cambiar, si la olvidaste) tu contraseña; se puede omitir.
export default function AccesoCorreoPage() {
  const { loginConToken } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [personales, setPersonales] = useState<DatosPersonales>(PERSONALES_VACIOS);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modoPrueba, setModoPrueba] = useState(false);
  const [espera, setEspera] = useState(0); // segundos para poder reenviar
  const codigoRef = useRef<HTMLInputElement>(null);
  // Sesion lista tras el codigo, mientras se decide si se crea contraseña.
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  useEffect(() => {
    if (paso === 'codigo') codigoRef.current?.focus();
  }, [paso]);

  // Desde "Iniciar sesión" llega con ?correo=...&enviar=1: el codigo se envia
  // solo, sin volver a escribir el correo.
  const yaEnvio = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const delLogin = params.get('correo');
    if (!delLogin) return;
    setCorreo(delLogin);
    if (params.get('enviar') === '1' && !yaEnvio.current) {
      yaEnvio.current = true;
      enviarCodigo(undefined, delLogin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviarCodigo = async (e?: React.FormEvent, correoInicial?: string) => {
    e?.preventDefault();
    const destino = (correoInicial ?? correo).trim();
    setError('');
    setCargando(true);
    try {
      const r = await api<{ enviado: boolean; modoPrueba: boolean }>('/auth/correo/enviar', {
        method: 'POST',
        body: JSON.stringify({ correo: destino }),
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

  const entrar = async (sesion: Sesion) => {
    await loginConToken(sesion.accessToken);
    // Vuelve a la pagina desde donde vino (solo rutas internas).
    const siguiente = new URLSearchParams(window.location.search).get('siguiente');
    router.push(siguiente && /^\/(?!\/)/.test(siguiente) ? siguiente : '/');
  };

  const verificar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await api<Sesion | { nuevo: true }>('/auth/correo/verificar', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.trim(), codigo }),
      });
      if ('nuevo' in r) setPaso('nombre');
      else if (r.permisoContrasena) {
        // Codigo correcto: se ofrece crear o cambiar la contraseña.
        setSesion(r);
        setPaso('contrasena');
      } else await entrar(r);
    } catch (err: any) {
      setError(err.message || 'No se pudo verificar el código.');
    } finally {
      setCargando(false);
    }
  };

  // Cuenta nueva por correo: con el codigo ya verificado se crea la cuenta con
  // nombre y apellidos, se sube la foto y se guarda la contraseña.
  const crearCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const problema = errorContrasena(clave, clave2);
    if (problema) return setError(problema);
    if (!datosPersonalesCompletos(personales)) return setError('Completa tu género, fecha de nacimiento, país y ciudad.');
    setError('');
    setCargando(true);
    try {
      const creada = await api<Sesion>('/auth/correo/verificar', {
        method: 'POST',
        body: JSON.stringify({
          correo: correo.trim(),
          codigo,
          nombre: nombre.trim(),
          apellidoPaterno: apellido.trim(),
          apellidoMaterno: apellidoMaterno.trim() || undefined,
          genero: personales.genero,
          fechaNacimiento: personales.fechaNacimiento,
          pais: personales.pais.trim(),
          ciudad: personales.ciudad.trim(),
        }),
      });
      if (fotoPerfil) {
        // Si la foto falla, la cuenta igual queda creada (se cambia desde "Mi perfil").
        const body = new FormData();
        body.append('fotoPerfil', fotoPerfil);
        await api('/auth/perfil/foto', { method: 'POST', token: creada.accessToken, body }).catch(() => undefined);
      }
      const final = creada.permisoContrasena
        ? await api<Sesion>('/auth/contrasena/restablecer', {
            method: 'POST',
            body: JSON.stringify({ permiso: creada.permisoContrasena, password: clave }),
          })
        : creada;
      await entrar(final);
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  const guardarContrasena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesion?.permisoContrasena) return;
    const problema = errorContrasena(clave, clave2);
    if (problema) return setError(problema);
    setError('');
    setCargando(true);
    try {
      const r = await api<Sesion>('/auth/contrasena/restablecer', {
        method: 'POST',
        body: JSON.stringify({ permiso: sesion.permisoContrasena, password: clave }),
      });
      await entrar(r);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="contenedor py-12 max-w-md">
      <Image
        src="/imagenes/logos/logo-principal.png"
        alt="Cholets Turístico El Alto"
        width={353}
        height={316}
        className="h-24 w-auto mx-auto mb-6"
        priority
      />

      {paso === 'correo' && (
        <form onSubmit={enviarCodigo} className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-morado-900">Continuar con correo</h1>
            <p className="text-morado-600 text-sm mt-1">Te enviaremos un código de 6 números a tu correo. Sin contraseñas.</p>
          </div>
          <input
            type="email"
            className="input-campo"
            placeholder="Correo electrónico"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="boton-primario w-full" disabled={cargando}>
            {cargando ? 'Enviando código…' : 'Continuar'}
          </button>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={verificar} className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-morado-900">Revisa tu correo</h1>
            <p className="text-morado-600 text-sm mt-1">
              Enviamos un código a <b className="text-morado-900 break-all">{correo.trim()}</b>. Vence en 10 minutos.
            </p>
            <p className="text-xs text-morado-500 mt-1">Si no lo ves, revisa la carpeta de Spam o Promociones.</p>
          </div>
          {modoPrueba && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Modo de prueba: el envío por Gmail aún no está configurado, así que el código aparece en la consola del
              backend (VS Code).
            </p>
          )}
          <input
            ref={codigoRef}
            className="input-campo text-center text-2xl font-bold tracking-[0.5em]"
            placeholder="000000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Código de 6 números"
            required
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="boton-primario w-full" disabled={cargando || codigo.length !== 6}>
            {cargando ? 'Verificando…' : 'Verificar código'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="boton-texto"
              onClick={() => {
                setPaso('correo');
                setError('');
              }}
            >
              ← Cambiar correo
            </button>
            <button type="button" className="boton-texto disabled:opacity-50" disabled={espera > 0 || cargando} onClick={() => enviarCodigo()}>
              {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      {paso === 'nombre' && (
        <form onSubmit={crearCuenta} className="space-y-3">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-morado-900">¡Bienvenido! <Icono nombre="hand" /></h1>
            <p className="text-morado-600 text-sm mt-1">
              <Icono nombre="check" /> Correo verificado. Completa tus datos para crear tu cuenta de Usuario Turístico.
            </p>
          </div>
          <SubirFotoPerfil archivo={fotoPerfil} onElegir={setFotoPerfil} />
          <input className="input-campo" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus required minLength={2} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input-campo" placeholder="Apellido paterno" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
            <input className="input-campo" placeholder="Apellido materno" value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} />
          </div>
          <div className="input-campo !bg-morado-50/60 text-morado-700 truncate" title="Correo verificado">
            <Icono nombre="mail" /> {correo.trim()}
          </div>
          <CamposPersonales valor={personales} onCambiar={setPersonales} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoContrasena value={clave} onChange={setClave} placeholder="Contraseña (mín. 8)" autoComplete="new-password" minLength={8} />
            <CampoContrasena value={clave2} onChange={setClave2} placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} />
          </div>
          <RevisionContrasena password={clave} repetida={clave2} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="boton-primario w-full" disabled={cargando}>
            <ConIconos texto={cargando ? 'Creando cuenta…' : '✨ Crear mi cuenta'} />
          </button>
        </form>
      )}

      {paso === 'contrasena' && sesion && (
        <form onSubmit={guardarContrasena} className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-morado-900">
              {sesion.usuario?.tieneContrasena ? 'Crea una contraseña nueva' : 'Crea tu contraseña'}
            </h1>
            <p className="text-morado-600 text-sm mt-1">
              <Icono nombre="check" /> Correo verificado.{' '}
              {sesion.usuario?.tieneContrasena
                ? 'Si olvidaste tu contraseña, escribe una nueva. La anterior dejará de servir.'
                : 'Así la próxima vez podrás entrar con tu correo y contraseña, sin esperar el código.'}
            </p>
          </div>
          <CampoContrasena value={clave} onChange={setClave} placeholder="Contraseña nueva (mín. 8)" autoComplete="new-password" minLength={8} />
          <CampoContrasena value={clave2} onChange={setClave2} placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} />
          <RevisionContrasena password={clave} repetida={clave2} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="boton-primario w-full" disabled={cargando}>
            {cargando ? 'Guardando…' : 'Guardar contraseña y entrar'}
          </button>
          <button type="button" className="boton-texto w-full text-sm" disabled={cargando} onClick={() => entrar(sesion)}>
            Ahora no, solo entrar
          </button>
        </form>
      )}

      <p className="text-center text-sm text-morado-600 mt-6">
        <Link href="/login" className="boton-texto">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
