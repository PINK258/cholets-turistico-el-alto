'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CategoriaEvento, Zona } from '@/lib/types';
import { componerHorario, DIAS_SEMANA, HORA_APERTURA_DEFECTO, HORA_CIERRE_DEFECTO } from '@/lib/horario';
import { textoTiposLocal } from '@/lib/tiposLocal';
import SelectorCategorias from '@/components/SelectorCategorias';
import SelectorTiposLocal from '@/components/SelectorTiposLocal';
import SelectorHorario from '@/components/SelectorHorario';
import SubirFotoPerfil from '@/components/SubirFotoPerfil';
import CodigoCaptcha, { ValorCaptcha } from '@/components/CodigoCaptcha';
import { VistaPreviaDocumento, VistaPreviaFotos } from '@/components/VistaPreviaArchivos';
import type { DetalleDireccion } from '@/components/SeleccionarUbicacionMapa';
import { detectarDistrito, textoDeteccion } from '@/lib/distritosElAlto';
import { buscarLugar, mensajeUbicacion, obtenerUbicacion, ResultadoBusqueda } from '@/lib/ubicacion';
import { AYUDA_CONTRASENA, errorContrasena } from '@/lib/contrasena';
import CampoContrasena, { RevisionContrasena } from '@/components/CampoContrasena';
import CampoHistoria from '@/components/CampoHistoria';
import CamposPersonales, { DatosPersonales, PERSONALES_VACIOS, datosPersonalesCompletos } from '@/components/CamposPersonales';
import { SelectorServicios } from '@/components/FichaLocal';
import { servicio } from '@/lib/servicios';
import Icono, { ConIconos } from '@/components/Icono';

const SeleccionarUbicacionMapa = dynamic(() => import('@/components/SeleccionarUbicacionMapa'), {
  ssr: false,
});

// Centro por defecto: La Ceja, El Alto.
const CENTRO_DEFECTO = { lat: -16.5027, lng: -68.1716 };
const MAXIMO_FOTOS = 10;

const CLASE_INPUT_ARCHIVO =
  'input-campo file:mr-3 file:rounded-md file:border-0 file:bg-morado-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-morado-700';

const PASOS = [
  { numero: 1, titulo: 'Tus datos', detalle: 'Dueño del local' },
  { numero: 2, titulo: 'Tu local', detalle: 'Horario, ubicación y eventos' },
  { numero: 3, titulo: 'Fotos y envío', detalle: 'Fotos y verificación' },
] as const;

type Paso = 1 | 2 | 3;

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-bold uppercase tracking-wider text-dorado-600 mb-1.5">{titulo}</legend>
      {children}
    </fieldset>
  );
}

// Barra 1 — 2 — 3. Los pasos ya completados se pueden tocar para volver.
function IndicadorPasos({ paso, onIr }: { paso: Paso; onIr: (p: Paso) => void }) {
  return (
    <ol className="flex items-start mb-8">
      {PASOS.map((p, i) => {
        const hecho = p.numero < paso;
        const actual = p.numero === paso;
        return (
          <li key={p.numero} className="flex-1 flex flex-col items-center text-center relative">
            {i > 0 && (
              <span
                className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${p.numero <= paso ? 'bg-morado-600' : 'bg-morado-100'}`}
                aria-hidden
              />
            )}
            <button
              type="button"
              disabled={!hecho}
              onClick={() => onIr(p.numero)}
              aria-current={actual ? 'step' : undefined}
              className={`relative z-10 w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center border-2 transition-colors ${
                actual
                  ? 'bg-morado-700 border-morado-700 text-white shadow-boton'
                  : hecho
                    ? 'bg-morado-100 border-morado-600 text-morado-700 hover:bg-morado-200'
                    : 'bg-white border-morado-200 text-morado-300'
              }`}
            >
              {hecho ? <Icono nombre="check" /> : p.numero}
            </button>
            <span className={`mt-1.5 text-xs font-semibold ${actual ? 'text-morado-900' : 'text-morado-500'}`}>{p.titulo}</span>
            <span className="hidden sm:block text-[11px] text-morado-400">{p.detalle}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Navegacion({
  onAtras,
  textoSiguiente,
  deshabilitado,
  error,
}: {
  onAtras?: () => void;
  textoSiguiente: string;
  deshabilitado?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-3 pt-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        {onAtras ? (
          <button type="button" onClick={onAtras} className="boton-secundario-sm">
            ← Atrás
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className="boton-primario-sm" disabled={deshabilitado}>
          <ConIconos texto={textoSiguiente} />
        </button>
      </div>
    </div>
  );
}

// Formulario "Registra tu local" en 3 pasos: 1) datos del dueño, 2) datos del
// local, 3) fotos, codigo de verificacion y envio. Si la persona todavia no
// tiene cuenta, el paso 1 pide tambien una contraseña y, antes de seguir, se
// verifica su correo con un codigo de 6 numeros: recien entonces se crea la
// cuenta (queda la sesion iniciada) y se pasa al paso 2.
type SesionCorreo = { accessToken: string; permisoContrasena?: string };

export default function FormularioRegistroLocal() {
  const { usuario, token, cargando: cargandoAuth, loginConToken } = useAuth();
  const router = useRouter();
  const inicioRef = useRef<HTMLDivElement>(null);

  const [paso, setPaso] = useState<Paso>(1);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEvento[]>([]);
  const [categoriasElegidas, setCategoriasElegidas] = useState<Set<string>>(new Set());
  const [errorCategorias, setErrorCategorias] = useState(false);
  const [tiposLocal, setTiposLocal] = useState<string[]>([]);
  const [servicios, setServicios] = useState<string[]>([]);
  const [dias, setDias] = useState<string[]>(DIAS_SEMANA);
  const [horaApertura, setHoraApertura] = useState(HORA_APERTURA_DEFECTO);
  const [horaCierre, setHoraCierre] = useState(HORA_CIERRE_DEFECTO);
  const [ubicacion, setUbicacionInterna] = useState(CENTRO_DEFECTO);
  const [direccionMapa, setDireccionMapa] = useState<string | null>(null);
  const [detalleMapa, setDetalleMapa] = useState<DetalleDireccion | null>(null);
  // El pin arranca en un punto de referencia (La Ceja): hay que moverlo al local.
  const [pinMovido, setPinMovido] = useState(false);
  const [ubicacionConfirmada, setUbicacionConfirmada] = useState(false);
  const [enfoqueMapa, setEnfoqueMapa] = useState(0);
  const [buscandoGps, setBuscandoGps] = useState(false);
  // Precision (m) de la ultima lectura del GPS: circulo en el mapa y texto del boton.
  const [precisionGps, setPrecisionGps] = useState<number | null>(null);
  const [avisoGps, setAvisoGps] = useState('');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ResultadoBusqueda[] | null>(null);
  const [buscandoLugar, setBuscandoLugar] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [documento, setDocumento] = useState<File | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<File | null>(null);
  const [captcha, setCaptcha] = useState<ValorCaptcha>({ captchaId: '', captchaRespuesta: '' });
  const [recargarCaptcha, setRecargarCaptcha] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [personales, setPersonales] = useState<DatosPersonales>(PERSONALES_VACIOS);
  // Verificacion del correo del dueño (paso 1, solo si no tiene cuenta).
  const [ventanaCodigo, setVentanaCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [modoPrueba, setModoPrueba] = useState(false);
  const [espera, setEspera] = useState(0);
  const [errorCodigo, setErrorCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const [form, setForm] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    ci: '',
    correo: '',
    nombreLocal: '',
    descripcion: '',
    historia: '',
    aforo: '',
    whatsapp: '',
    reglas: '',
    videoUrl: '',
    direccion: '',
    zonaId: '',
  });

  useEffect(() => {
    api<Zona[]>('/zonas')
      .then((z) => {
        setZonas(z);
        if (z[0]) setForm((f) => ({ ...f, zonaId: z[0].id }));
      })
      .catch((e) => setError(`No se pudieron cargar las zonas: ${e.message}`));
    api<CategoriaEvento[]>('/categorias')
      .then(setCategorias)
      .catch(() => setErrorCategorias(true));
  }, []);

  // Con sesion iniciada se completan los datos de la cuenta. Lo que la persona
  // ya escribio se respeta: al crear la cuenta en el envio, el usuario aparece
  // recien entonces y no debe borrar, por ejemplo, el CI que ya escribio.
  useEffect(() => {
    if (usuario) {
      setForm((f) => ({
        ...f,
        nombre: f.nombre || usuario.nombre,
        apellidoPaterno: f.apellidoPaterno || usuario.apellidoPaterno,
        apellidoMaterno: f.apellidoMaterno || usuario.apellidoMaterno || '',
        ci: f.ci || usuario.ci || '',
        correo: f.correo || usuario.correo,
      }));
    }
  }, [usuario]);

  // Cada movimiento del pin detecta el distrito y elige su zona (aunque antes
  // se haya elegido otra a mano) y pide volver a confirmar la ubicacion.
  const setUbicacion = (u: { lat: number; lng: number }) => {
    setUbicacionInterna(u);
    setPinMovido(true);
    setUbicacionConfirmada(false);
    const d = detectarDistrito(u.lat, u.lng);
    const z = d ? zonas.find((x) => x.distritoNumero === d.numero) : undefined;
    if (z) setForm((f) => ({ ...f, zonaId: z.id }));
  };

  // Distrito segun el GPS (limite oficial o centro mas cercano).
  const deteccion = useMemo(() => detectarDistrito(ubicacion.lat, ubicacion.lng), [ubicacion]);
  const zonaDetectada = deteccion ? zonas.find((z) => z.distritoNumero === deteccion.numero) : undefined;
  const zonaElegida = zonas.find((z) => z.id === form.zonaId);


  // GPS del celular o la computadora (ver lib/mapaBase.ts: mensajes claros y
  // reintento con la ubicacion aproximada por WiFi).
  const usarMiUbicacion = async () => {
    setAvisoGps('');
    setBuscandoGps(true);
    setPrecisionGps(null);
    try {
      // Mientras afina, el boton muestra la precision que va logrando.
      const u = await obtenerUbicacion({ onProgreso: (p) => setPrecisionGps(p.precision) });
      const dentro = detectarDistrito(u.lat, u.lng) !== null;
      // Fuera de El Alto (tipico del WiFi de una computadora) no se mueve el pin.
      if (dentro) {
        setUbicacion({ lat: u.lat, lng: u.lng });
        setEnfoqueMapa((n) => n + 1);
        setPrecisionGps(u.precision);
      } else {
        setPrecisionGps(null);
      }
      setAvisoGps(mensajeUbicacion(u.precision, dentro));
    } catch (e: any) {
      setPrecisionGps(null);
      setAvisoGps(e.message);
    } finally {
      setBuscandoGps(false);
    }
  };

  // Buscar la direccion escrita (funciona aunque el GPS no este disponible).
  const buscarDireccion = async () => {
    if (!textoBusqueda.trim()) return;
    setAvisoGps('');
    setBuscandoLugar(true);
    try {
      const r = await buscarLugar(textoBusqueda.trim());
      setResultadosBusqueda(r);
      if (r.length === 0) setAvisoGps('No encontramos esa dirección en El Alto. Prueba con otra referencia o marca el lugar en el mapa.');
    } catch (e: any) {
      setAvisoGps(e.message);
    } finally {
      setBuscandoLugar(false);
    }
  };

  const cambiar = (campo: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  // Cada eleccion se suma a las anteriores (se pueden elegir fotos en varias veces).
  // Se copia a un arreglo YA: el FileList es "vivo" y se vacia cuando el input se limpia.
  const agregarFotos = (lista: FileList | null) => {
    if (!lista) return;
    const nuevas = Array.from(lista);
    setFotos((actuales) => [...actuales, ...nuevas].slice(0, MAXIMO_FOTOS));
  };

  const irA = (p: Paso) => {
    setError('');
    setPaso(p);
    inicioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Cada paso es su propio <form>: asi el navegador solo revisa los campos
  // "required" que estan a la vista, y aqui se revisa lo que no es un input.
  const terminarPaso1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usuario) return irA(2);
    const errorClave = errorContrasena(password, password2);
    if (errorClave) return setError(errorClave);
    if (!datosPersonalesCompletos(personales)) return setError('Completa tu género, fecha de nacimiento, país y ciudad.');
    await enviarCodigo();
  };

  // Sin cuenta: se envia un codigo al correo (el correo no debe tener cuenta).
  const enviarCodigo = async () => {
    setError('');
    setErrorCodigo('');
    setVerificando(true);
    try {
      const r = await api<{ modoPrueba: boolean }>('/auth/correo/enviar', {
        method: 'POST',
        body: JSON.stringify({ correo: form.correo.trim(), registro: true }),
      });
      setModoPrueba(r.modoPrueba);
      setCodigo('');
      setEspera(30);
      setVentanaCodigo(true);
    } catch (err: any) {
      if (ventanaCodigo) setErrorCodigo(err.message || 'No se pudo enviar el código.');
      else setError(err.message || 'No se pudo enviar el código a tu correo.');
    } finally {
      setVerificando(false);
    }
  };

  // Codigo correcto: se crea la cuenta del dueño con su contraseña y se inicia
  // la sesion. El rol de Administrador Turístico lo recibe al enviar el local.
  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCodigo('');
    setVerificando(true);
    try {
      const creada = await api<SesionCorreo>('/auth/correo/verificar', {
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
      const final = creada.permisoContrasena
        ? await api<SesionCorreo>('/auth/contrasena/restablecer', {
            method: 'POST',
            body: JSON.stringify({ permiso: creada.permisoContrasena, password }),
          })
        : creada;
      await loginConToken(final.accessToken);
      setVentanaCodigo(false);
      irA(2);
    } catch (err: any) {
      setErrorCodigo(err.message || 'No se pudo verificar el código.');
    } finally {
      setVerificando(false);
    }
  };

  const terminarPaso2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (tiposLocal.length === 0) return setError('Elige al menos un tipo de local.');
    if (dias.length === 0) return setError('Elige al menos un día de funcionamiento.');
    if (!horaApertura || !horaCierre) return setError('Indica la hora de apertura y de cierre.');
    if (!form.zonaId) return setError('Elige la zona de tu local.');
    if (!pinMovido) return setError('Mueve el pin del mapa al lugar exacto de tu local (o usa tu ubicación actual).');
    if (!ubicacionConfirmada) return setError('Confirma la ubicación de tu local marcando la casilla.');
    if (categoriasElegidas.size === 0) {
      return setError('Elige al menos una categoría de eventos que realiza tu local.');
    }
    irA(3);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (fotos.length === 0) return setError('Sube al menos una foto de tu local.');
    if (!captcha.captchaRespuesta.trim()) return setError('Escribe el código de verificación.');

    setEnviando(true);
    try {
      // La cuenta ya existe: se creo en el paso 1 al verificar el correo.
      if (!token) {
        irA(1);
        return setError('Primero verifica tu correo en el paso 1.');
      }
      const tokenEnvio = token;

      const body = new FormData();
      Object.entries(form).forEach(([clave, valor]) => body.append(clave, valor));
      body.append('latitud', String(ubicacion.lat));
      body.append('longitud', String(ubicacion.lng));
      body.append('horaApertura', horaApertura);
      body.append('horaCierre', horaCierre);
      body.append('captchaId', captcha.captchaId);
      body.append('captchaRespuesta', captcha.captchaRespuesta);
      dias.forEach((d) => body.append('diasFuncionamiento', d));
      tiposLocal.forEach((t) => body.append('tiposLocal', t));
      categoriasElegidas.forEach((id) => body.append('categoriaIds', id));
      servicios.forEach((s) => body.append('servicios', s));
      fotos.forEach((f) => body.append('fotos', f));
      if (documento) body.append('documentoFuncionamiento', documento);
      if (fotoPerfil) body.append('fotoPerfil', fotoPerfil);

      await api('/locales', { method: 'POST', token: tokenEnvio, body });
      setExito(true);
    } catch (err: any) {
      const mensaje: string = err.message || 'No se pudo registrar el local.';
      // El servidor descarta el codigo al fallar: se muestra uno nuevo.
      setRecargarCaptcha((n) => n + 1);
      // Si el problema es de los datos del dueño (correo o CI repetidos), se
      // vuelve al paso 1 para corregirlo alli.
      if (/correo|carnet|\bCI\b|contraseña/i.test(mensaje)) {
        irA(1);
      } else if (/categor|zona|tipo de local|horario|día|hora/i.test(mensaje)) {
        irA(2);
      }
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoAuth) return null;

  if (exito) {
    return (
      <div className="py-10 max-w-lg mx-auto text-center">
        <p className="text-4xl mb-3"><Icono nombre="circle-check" /></p>
        <h1 className="text-2xl font-bold text-morado-900 mb-2">¡Local enviado a revisión!</h1>
        <p className="text-morado-600 mb-6">
          El Operador G.A.M.E.A. va a verificar tus datos. Te llegará una notificación cuando tu local sea
          aprobado y aparezca públicamente.
        </p>
        <button className="boton-primario-sm" onClick={() => router.push('/anfitrion')}>
          Ir a Administrador Turístico
        </button>
      </div>
    );
  }

  const zona = zonas.find((z) => z.id === form.zonaId);

  return (
    <div ref={inicioRef} className="scroll-mt-24">
      <IndicadorPasos paso={paso} onIr={irA} />

      {paso === 1 && (
        <form onSubmit={terminarPaso1} className="space-y-6">
          <Seccion titulo="Paso 1 · Tus datos (dueño del local)">
            <SubirFotoPerfil archivo={fotoPerfil} urlActual={usuario?.avatarUrl} onElegir={setFotoPerfil} />
            <input className="input-campo" placeholder="Nombre" value={form.nombre} onChange={cambiar('nombre')} required />
            <div className="grid grid-cols-2 gap-2">
              <input className="input-campo" placeholder="Apellido paterno" value={form.apellidoPaterno} onChange={cambiar('apellidoPaterno')} required />
              <input className="input-campo" placeholder="Apellido materno" value={form.apellidoMaterno} onChange={cambiar('apellidoMaterno')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input-campo" placeholder="Carnet de identidad (CI)" value={form.ci} onChange={cambiar('ci')} required />
              <input type="email" className="input-campo" placeholder="Correo electrónico" value={form.correo} onChange={cambiar('correo')} required />
            </div>
            {!usuario && (
              <>
                <CamposPersonales valor={personales} onCambiar={setPersonales} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CampoContrasena value={password} onChange={setPassword} placeholder="Contraseña (mín. 8, letras y números)" autoComplete="new-password" minLength={8} />
                  <CampoContrasena value={password2} onChange={setPassword2} placeholder="Repite la contraseña" autoComplete="new-password" minLength={8} />
                </div>
                <RevisionContrasena password={password} repetida={password2} />
                <p className="text-xs text-morado-500">
                  <Icono nombre="lock" /> {AYUDA_CONTRASENA} Toca el 👁 para ver lo que escribiste. Se guarda cifrada. Al continuar te
                  enviaremos un código a tu correo para verificarlo y crear tu cuenta. ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="boton-texto">Inicia sesión</Link>
                </p>
              </>
            )}
          </Seccion>
          <Navegacion
            textoSiguiente={usuario ? 'Siguiente: tu local →' : verificando ? 'Enviando código…' : 'Verificar mi correo y seguir →'}
            deshabilitado={verificando}
            error={error}
          />
        </form>
      )}

      {/* Ventana del codigo enviado al correo del dueño (paso 1). */}
      {ventanaCodigo && (
        <div
          className="fixed inset-0 z-[1100] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => !verificando && setVentanaCodigo(false)}
        >
          <form
            onSubmit={verificarCodigo}
            role="dialog"
            aria-modal="true"
            aria-label="Verifica tu correo"
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 my-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVentanaCodigo(false)}
              disabled={verificando}
              className="absolute top-3 right-3 w-8 h-8 rounded-full text-morado-500 hover:bg-morado-50 hover:text-morado-800"
              aria-label="Cerrar"
            >
              <Icono nombre="x" className="h-4 w-4" />
            </button>
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
            {errorCodigo && <p className="text-red-600 text-sm">{errorCodigo}</p>}
            <button type="submit" className="boton-primario w-full" disabled={verificando || codigo.length !== 6}>
              <ConIconos texto={verificando ? 'Verificando…' : '✔ Verificar y continuar'} />
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className="boton-texto" onClick={() => setVentanaCodigo(false)} disabled={verificando}>
                ← Corregir mis datos
              </button>
              <button type="button" className="boton-texto disabled:opacity-50" disabled={espera > 0 || verificando} onClick={enviarCodigo}>
                {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar código'}
              </button>
            </div>
          </form>
        </div>
      )}

      {paso === 2 && (
        <form onSubmit={terminarPaso2} className="space-y-6">
          <Seccion titulo="Paso 2 · Datos del local">
            <input className="input-campo" placeholder="Nombre del local (ej. Local Iroman)" value={form.nombreLocal} onChange={cambiar('nombreLocal')} required />
            <textarea className="input-campo" placeholder="Descripción breve" rows={3} value={form.descripcion} onChange={cambiar('descripcion')} required />
            <CampoHistoria valor={form.historia} onCambiar={(historia) => setForm((f) => ({ ...f, historia }))} />
            <div className="rounded-xl border border-morado-100 bg-morado-50/40 p-3 space-y-3">
              <p className="text-sm font-semibold text-morado-900">
                Lo que tu local ofrece <span className="text-[11px] font-normal text-morado-500">(opcional, lo verán los visitantes)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] text-morado-600">
                  Capacidad (personas)
                  <input type="number" min={1} max={20000} className="input-campo" placeholder="Ej.: 300" value={form.aforo} onChange={cambiar('aforo')} />
                </label>
                <label className="text-[11px] text-morado-600">
                  WhatsApp para consultas
                  <input className="input-campo" inputMode="tel" placeholder="Ej.: 71234567" value={form.whatsapp} onChange={cambiar('whatsapp')} />
                </label>
              </div>
              <SelectorServicios valor={servicios} onCambiar={setServicios} />
              <label className="block text-[11px] text-morado-600">
                Reglas del local («Lo que debes saber»)
                <textarea className="input-campo" rows={2} maxLength={1500} placeholder="Ej.: No se permite ingresar con bebidas propias. Garantía por daños." value={form.reglas} onChange={cambiar('reglas')} />
              </label>
              <label className="block text-[11px] text-morado-600">
                Video de tu local (enlace de YouTube o TikTok)
                <input className="input-campo" placeholder="https://www.youtube.com/watch?v=…" value={form.videoUrl} onChange={cambiar('videoUrl')} />
              </label>
            </div>
            <div>
              <p className="etiqueta-campo">Tipo de local (puedes marcar varios)</p>
              <SelectorTiposLocal seleccionados={tiposLocal} onCambiar={setTiposLocal} />
            </div>
          </Seccion>

          <Seccion titulo="Horario de atención">
            <SelectorHorario
              dias={dias}
              onDias={setDias}
              apertura={horaApertura}
              onApertura={setHoraApertura}
              cierre={horaCierre}
              onCierre={setHoraCierre}
            />
          </Seccion>

          <Seccion titulo="Ubicación exacta">
            <p className="text-xs text-morado-600">
              Haz clic en el mapa o arrastra el pin hasta la puerta de tu local. Si estás en el local, usa tu
              ubicación actual.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={usarMiUbicacion} disabled={buscandoGps} className="boton-secundario-sm">
                {buscandoGps
                  ? precisionGps
                    ? `Afinando el GPS… ±${Math.round(precisionGps)} m`
                    : 'Buscando tu ubicación…'
                  : <><Icono nombre="locate-fixed" /> Usar mi ubicación actual</>}
              </button>
            </div>
            {/* Busqueda de direccion: no es un <form> porque ya esta dentro del formulario del paso 2. */}
            <div className="flex gap-2">
              <input
                className="input-campo"
                placeholder="Busca la dirección o una referencia (ej. Av. 6 de Marzo, Plaza Ballivián)"
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarDireccion();
                  }
                }}
              />
              <button type="button" onClick={buscarDireccion} disabled={buscandoLugar} className="boton-secundario-sm shrink-0">
                <ConIconos texto={buscandoLugar ? 'Buscando…' : '🔎 Buscar'} />
              </button>
            </div>
            {resultadosBusqueda && resultadosBusqueda.length > 0 && (
              <ul className="rounded-xl border border-morado-100 divide-y divide-morado-50 text-sm bg-white">
                {resultadosBusqueda.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-morado-50"
                      onClick={() => {
                        setPrecisionGps(null);
                        setUbicacion({ lat: r.lat, lng: r.lng });
                        setEnfoqueMapa((n) => n + 1);
                        setResultadosBusqueda(null);
                        setAvisoGps('Pusimos el pin en esa dirección. Arrástralo hasta la puerta exacta de tu local.');
                      }}
                    >
                      <Icono nombre="map-pin" /> {r.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {avisoGps && <p className="text-xs text-morado-600"><ConIconos texto={avisoGps} /></p>}

            <SeleccionarUbicacionMapa
              lat={ubicacion.lat}
              lng={ubicacion.lng}
              onCambiar={(lat, lng) => {
                // Si la persona mueve el pin a mano, el circulo del GPS ya no aplica.
                setPrecisionGps(null);
                setUbicacion({ lat, lng });
              }}
              onDireccion={setDireccionMapa}
              onDetalle={setDetalleMapa}
              enfoque={enfoqueMapa}
              alto={400}
              precision={buscandoGps ? null : precisionGps}
            />
            {!pinMovido && (
              <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                El pin está en un punto de referencia (La Ceja). Muévelo al lugar exacto de tu local.
              </p>
            )}


            {/* Lo que el sistema reconoce del punto marcado */}
            <dl className="rounded-xl border border-morado-100 bg-morado-50/40 p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div>
                <dt className="text-[11px] text-morado-500">Calle</dt>
                <dd className="text-morado-900">{detalleMapa ? detalleMapa.calle || 'Sin nombre en el mapa' : 'Buscando…'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-morado-500">Barrio / zona (según el mapa)</dt>
                <dd className="text-morado-900">{detalleMapa ? detalleMapa.barrio || '—' : 'Buscando…'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-morado-500">Distrito (según el GPS)</dt>
                <dd className={deteccion ? 'text-morado-900 font-semibold' : 'text-amber-700'}>{textoDeteccion(deteccion)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-morado-500">Coordenadas</dt>
                <dd className="text-morado-900">
                  {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}
                </dd>
              </div>
            </dl>

            <div>
              <p className="etiqueta-campo">Zona y distrito (subalcaldía)</p>
              <select
                className="input-campo"
                value={form.zonaId}
                onChange={(e) => {
                  setUbicacionConfirmada(false);
                  cambiar('zonaId')(e);
                }}
                required
              >
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    D{z.distritoNumero} · {z.nombreZonaPrincipal}
                  </option>
                ))}
              </select>
              {pinMovido && zonaDetectada && zonaDetectada.id !== form.zonaId && (
                <p className="mt-1 text-xs text-amber-700">
                  <Icono nombre="triangle-alert" /> El pin parece estar en el Distrito {zonaDetectada.distritoNumero}, pero elegiste otra zona.{' '}
                  <button
                    type="button"
                    className="boton-texto"
                    onClick={() => setForm((f) => ({ ...f, zonaId: zonaDetectada.id }))}
                  >
                    Cambiar a D{zonaDetectada.distritoNumero} · {zonaDetectada.nombreZonaPrincipal}
                  </button>
                </p>
              )}
              {pinMovido && deteccion && zonaDetectada?.id === form.zonaId && (
                <p className="mt-1 text-xs text-green-700">
                  <Icono nombre="check" /> Detectado automáticamente según el pin: Distrito {deteccion.numero}
                  {deteccion.precision === 'exacta' ? ' (límite oficial)' : ' (aproximado)'}
                </p>
              )}
              {pinMovido && !deteccion && (
                <p className="mt-1 text-xs text-amber-700">
                  No se pudo detectar el distrito en ese punto (¿está fuera de El Alto?). Revisa el pin o elige la zona.
                </p>
              )}
            </div>

            <div>
              <p className="etiqueta-campo">Dirección</p>
              <input className="input-campo" placeholder="Dirección (calle, número, referencia)" value={form.direccion} onChange={cambiar('direccion')} required />
              {direccionMapa && direccionMapa !== form.direccion && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, direccion: direccionMapa }))}
                  className="mt-1 text-xs boton-texto"
                >
                  <Icono nombre="map-pin" /> Usar la dirección del mapa: “{direccionMapa}”
                </button>
              )}
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-morado-200 bg-white p-3 text-sm text-morado-800 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 accent-morado-700"
                checked={ubicacionConfirmada}
                onChange={(e) => setUbicacionConfirmada(e.target.checked)}
              />
              <span>
                Confirmo que el pin está en el lugar exacto de mi local, en{' '}
                <strong>{zonaElegida ? `D${zonaElegida.distritoNumero} · ${zonaElegida.nombreZonaPrincipal}` : 'la zona elegida'}</strong>.
              </span>
            </label>
          </Seccion>

          <Seccion titulo="Categorías de eventos que realiza">
            <p className="text-xs text-morado-600">
              Marca todos los tipos de eventos que se pueden hacer en tu local (mínimo uno).
              {categoriasElegidas.size > 0 && (
                <span className="font-semibold text-morado-800"> · {categoriasElegidas.size} elegida(s)</span>
              )}
            </p>
            {errorCategorias ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                No se pudo cargar la lista de categorías. Verifica que el backend esté actualizado y
                corriendo, y vuelve a cargar la página.
              </p>
            ) : (
              <SelectorCategorias
                categorias={categorias}
                seleccionadas={categoriasElegidas}
                onCambiar={setCategoriasElegidas}
              />
            )}
          </Seccion>
          <Navegacion onAtras={() => irA(1)} textoSiguiente="Siguiente: fotos y envío →" error={error} />
        </form>
      )}

      {paso === 3 && (
        <form onSubmit={enviar} className="space-y-6">
          <Seccion titulo="Paso 3 · Fotos y documentos">
            {/* Archivos a la izquierda y vista previa grande al costado (en celular, abajo). */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="etiqueta-campo">
                    Fotos del local (mínimo 1, máximo {MAXIMO_FOTOS})
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className={CLASE_INPUT_ARCHIVO}
                    disabled={fotos.length >= MAXIMO_FOTOS}
                    onChange={(e) => {
                      agregarFotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
                <div>
                  <label className="etiqueta-campo">Registro de funcionamiento (opcional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className={CLASE_INPUT_ARCHIVO}
                    onChange={(e) => {
                      setDocumento(e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                  />
                </div>
                {documento && <VistaPreviaDocumento documento={documento} onQuitar={() => setDocumento(null)} />}
              </div>
              <VistaPreviaFotos
                fotos={fotos}
                onQuitar={(i) => setFotos((actuales) => actuales.filter((_, k) => k !== i))}
              />
            </div>
          </Seccion>

          <Seccion titulo="Revisa antes de enviar">
            <dl className="rounded-xl border border-morado-100 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-morado-500 text-xs">Dueño</dt>
                <dd className="text-morado-900 font-medium">
                  {form.nombre} {form.apellidoPaterno} {form.apellidoMaterno} · CI {form.ci}
                </dd>
                <dd className="text-morado-600 text-xs">{form.correo}</dd>
              </div>
              <div>
                <dt className="text-morado-500 text-xs">Local</dt>
                <dd className="text-morado-900 font-medium">{form.nombreLocal}</dd>
                <dd className="text-morado-600 text-xs">{textoTiposLocal(tiposLocal)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-morado-500 text-xs">Lo que ofrece</dt>
                <dd className="text-morado-900 text-sm">
                  {[form.aforo && `${form.aforo} personas`, ...servicios.map((id) => servicio(id)?.nombre)].filter(Boolean).join(' · ') || (
                    <span className="text-morado-400">Sin indicar (opcional)</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-morado-500 text-xs">Historia del cholet</dt>
                <dd className="text-morado-900 text-sm whitespace-pre-wrap line-clamp-3">
                  {form.historia.trim() || <span className="text-morado-400">No la contaste (es opcional; puedes agregarla después).</span>}
                </dd>
              </div>
              <div>
                <dt className="text-morado-500 text-xs">Horario</dt>
                <dd className="text-morado-900">{componerHorario(dias, horaApertura, horaCierre)}</dd>
              </div>
              <div>
                <dt className="text-morado-500 text-xs">Ubicación</dt>
                <dd className="text-morado-900">{form.direccion}</dd>
                {zona && <dd className="text-morado-600 text-xs">D{zona.distritoNumero} · {zona.nombreZonaPrincipal}</dd>}
                <dd className="text-morado-500 text-[11px]">GPS: {textoDeteccion(deteccion)}</dd>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="text-morado-600">
                  {categoriasElegidas.size} categoría(s) de eventos · {fotos.length} foto(s)
                  {documento ? ' · con registro de funcionamiento' : ''}
                </span>
                <button type="button" onClick={() => irA(1)} className="boton-texto">Editar tus datos</button>
                <button type="button" onClick={() => irA(2)} className="boton-texto">Editar el local</button>
              </div>
            </dl>
          </Seccion>

          <CodigoCaptcha valor={captcha} onCambiar={setCaptcha} recargar={recargarCaptcha} />

          <Navegacion
            onAtras={() => irA(2)}
            textoSiguiente={enviando ? 'Enviando…' : usuario ? '📩 Enviar para revisión' : '📩 Crear cuenta y enviar'}
            deshabilitado={enviando}
            error={error}
          />
        </form>
      )}
    </div>
  );
}
