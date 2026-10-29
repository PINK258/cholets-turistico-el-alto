'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { api, urlArchivo } from '@/lib/api';
import { CategoriaEvento, Local } from '@/lib/types';
import SelectorCategorias from '@/components/SelectorCategorias';
import SelectorTiposLocal from '@/components/SelectorTiposLocal';
import SelectorHorario from '@/components/SelectorHorario';
import SubirFotoPerfil from '@/components/SubirFotoPerfil';
import VistaLicencia from '@/components/operador/VistaLicencia';
import { HORA_APERTURA_DEFECTO, HORA_CIERRE_DEFECTO } from '@/lib/horario';
import { ESTADO_LOCAL, SECCIONES_CORRECCION, SeccionCorreccion, nombreSeccion } from '@/lib/estadosLocal';
import CampoHistoria from '@/components/CampoHistoria';
import ImagenEvento from '@/components/ImagenEvento';
import SelectorCategoriaEvento from '@/components/SelectorCategoriaEvento';
import { SelectorServicios } from '@/components/FichaLocal';
import Icono, { ConIconos } from '@/components/Icono';

// El panel del local tiene dos partes separadas:
//  - "local": sus datos, cada seccion en su propia pestaña (sin bajar hasta el final).
//  - "cartelera": los eventos que publica (solo locales aprobados).
type Vista = 'local' | 'cartelera';
type Pestana = SeccionCorreccion;
const PESTANAS = SECCIONES_CORRECCION;

export default function PanelAnfitrionPage() {
  const { usuario, token, cargando: cargandoAuth, loginConToken } = useAuth();
  const router = useRouter();
  const [locales, setLocales] = useState<Local[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('local');
  const [pestana, setPestana] = useState<Pestana>('informacion');
  // En la cartelera: lista de eventos, o el formulario de un evento nuevo.
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const cargar = () => {
    api<Local[]>('/locales/mios', { token }).then((lista) => {
      setLocales(lista);
      // Al entrar se abre el primer local, para no ver el panel vacio.
      setSeleccionadoId((actual) => actual ?? lista[0]?.id ?? null);
    });
  };

  useEffect(() => {
    if (!cargandoAuth && !usuario) router.push('/login');
    if (token) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth, token]);

  const seleccionado = locales.find((l) => l.id === seleccionadoId) || null;
  const seccionesPedidas = seleccionado?.estado === 'CORRECCION' ? seleccionado.correccionSecciones ?? [] : [];

  // Que se puede modificar (el backend aplica la misma regla):
  // APROBADO todo; CORRECCION solo lo que pidio el operador; en revision o rechazado, nada.
  const editable = (seccion: SeccionCorreccion) =>
    seleccionado?.estado === 'APROBADO' || seccionesPedidas.includes(seccion);

  // Abre un local en sus datos o en su cartelera. En el celular baja hasta el panel.
  const abrir = (local: Local, enVista: Vista = 'local') => {
    setSeleccionadoId(local.id);
    setMensaje('');
    setVista(enVista);
    setCreandoEvento(false);
    const pedidas = local.estado === 'CORRECCION' ? local.correccionSecciones ?? [] : [];
    setPestana((pedidas[0] as Pestana) || 'informacion');
    // Solo en pantallas angostas (el panel queda debajo de la lista).
    if (window.innerWidth < 1024) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const [descripcion, setDescripcion] = useState('');
  const [historia, setHistoria] = useState('');
  const [dias, setDias] = useState<string[]>([]);
  const [horaApertura, setHoraApertura] = useState(HORA_APERTURA_DEFECTO);
  const [horaCierre, setHoraCierre] = useState(HORA_CIERRE_DEFECTO);
  const [tiposLocal, setTiposLocal] = useState<string[]>([]);
  // "Lo que este lugar ofrece", contacto, reglas y video.
  const [aforo, setAforo] = useState('');
  const [servicios, setServicios] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [reglas, setReglas] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [subiendo360, setSubiendo360] = useState(false);
  const [subiendoPerfil, setSubiendoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [errorInfo, setErrorInfo] = useState('');
  const [catalogo, setCatalogo] = useState<CategoriaEvento[]>([]);
  const [categoriasElegidas, setCategoriasElegidas] = useState<Set<string>>(new Set());
  const [errorCategorias, setErrorCategorias] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    api<CategoriaEvento[]>('/categorias')
      .then(setCatalogo)
      .catch(() => setErrorCategorias('No se pudo cargar la lista de categorías. Vuelve a cargar la página.'));
  }, []);

  useEffect(() => {
    if (seleccionado) {
      setDescripcion(seleccionado.descripcion);
      setHistoria(seleccionado.historia ?? '');
      setAforo(seleccionado.aforo ? String(seleccionado.aforo) : '');
      setServicios(seleccionado.servicios ?? []);
      setWhatsapp(seleccionado.whatsapp ?? '');
      setReglas(seleccionado.reglas ?? '');
      setVideoUrl(seleccionado.videoUrl ?? '');
      setDias(seleccionado.diasFuncionamiento ?? []);
      setHoraApertura(seleccionado.horaApertura || HORA_APERTURA_DEFECTO);
      setHoraCierre(seleccionado.horaCierre || HORA_CIERRE_DEFECTO);
      setTiposLocal(seleccionado.tiposLocal ?? []);
      setErrorInfo('');
      setCategoriasElegidas(new Set((seleccionado.categorias ?? []).map((c) => c.categoria.id)));
      setErrorCategorias('');
      setErrorGeneral('');
    }
  }, [seleccionado]);

  const guardarCategorias = async () => {
    if (!seleccionado) return;
    setErrorCategorias('');
    if (categoriasElegidas.size === 0) {
      setErrorCategorias('Elige al menos una categoría de eventos.');
      return;
    }
    try {
      await api(`/locales/${seleccionado.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ categoriaIds: [...categoriasElegidas] }),
      });
      setMensaje('Categorías de eventos actualizadas.');
      cargar();
    } catch (e: any) {
      setErrorCategorias(e.message || 'No se pudieron guardar las categorías.');
    }
  };

  const guardarInfo = async () => {
    if (!seleccionado) return;
    setErrorInfo('');
    if (tiposLocal.length === 0) {
      setErrorInfo('Elige al menos un tipo de local.');
      return;
    }
    if (dias.length === 0) {
      setErrorInfo('Elige al menos un día de funcionamiento.');
      return;
    }
    try {
      await api(`/locales/${seleccionado.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          descripcion,
          historia,
          aforo: aforo ? Number(aforo) : null,
          servicios,
          whatsapp,
          reglas,
          videoUrl,
          tiposLocal,
          diasFuncionamiento: dias,
          horaApertura,
          horaCierre,
        }),
      });
      setMensaje('Información actualizada.');
      cargar();
    } catch (e: any) {
      setErrorInfo(e.message || 'No se pudo guardar la información.');
    }
  };

  // El dueño termino de corregir y lo vuelve a mandar al operador.
  const reenviar = async () => {
    if (!seleccionado) return;
    if (!confirm('¿Ya corregiste todo? Al enviarlo, no podrás modificar el local hasta que el Operador G.A.M.E.A. lo revise.')) return;
    setReenviando(true);
    setErrorGeneral('');
    try {
      await api(`/locales/${seleccionado.id}/reenviar`, { method: 'POST', token });
      setMensaje('Correcciones enviadas. El Operador G.A.M.E.A. volverá a revisar tu local.');
      cargar();
    } catch (e: any) {
      setErrorGeneral(e.message || 'No se pudo enviar a revisión.');
    } finally {
      setReenviando(false);
    }
  };

  // La foto se sube apenas se elige y luego se recarga el perfil (navbar, etc.).
  const cambiarFotoPerfil = async (archivo: File | null) => {
    if (!archivo || !token) return;
    setErrorPerfil('');
    setSubiendoPerfil(true);
    try {
      const body = new FormData();
      body.append('fotoPerfil', archivo);
      await api('/auth/perfil/foto', { method: 'POST', token, body });
      await loginConToken(token);
      setMensaje('Foto de perfil actualizada.');
    } catch (e: any) {
      setErrorPerfil(e.message || 'No se pudo subir la foto de perfil.');
    } finally {
      setSubiendoPerfil(false);
    }
  };

  // Foto panoramica 360 ("Paseo por el edificio"): subir, cambiar o quitar.
  const cambiarFoto360 = async (archivo: File | null) => {
    if (!seleccionado) return;
    setErrorGeneral('');
    setSubiendo360(true);
    try {
      if (archivo) {
        const body = new FormData();
        body.append('foto360', archivo);
        await api(`/locales/${seleccionado.id}/foto360`, { method: 'POST', token, body });
        setMensaje('Foto 360° subida. Ya se ve en la página de tu local.');
      } else {
        await api(`/locales/${seleccionado.id}/foto360`, { method: 'DELETE', token });
        setMensaje('Foto 360° quitada.');
      }
      cargar();
    } catch (e: any) {
      setErrorGeneral(e.message || 'No se pudo guardar la foto 360°.');
    } finally {
      setSubiendo360(false);
    }
  };

  const subirFotos = async (archivos: FileList | null) => {
    if (!seleccionado || !archivos || archivos.length === 0) return;
    const lista = Array.from(archivos);
    setErrorGeneral('');
    try {
      const body = new FormData();
      lista.forEach((f) => body.append('fotos', f));
      await api(`/locales/${seleccionado.id}/fotos`, { method: 'POST', token, body });
      setMensaje('Fotos agregadas.');
      cargar();
    } catch (e: any) {
      setErrorGeneral(e.message || 'No se pudieron subir las fotos.');
    }
  };

  // Licencia de funcionamiento (imagen o PDF): se puede subir despues de
  // registrar el local, o cambiarla. El Operador G.A.M.E.A. la revisa.
  const [errorLicencia, setErrorLicencia] = useState('');
  const [subiendoLicencia, setSubiendoLicencia] = useState(false);
  const subirLicencia = async (archivo: File | undefined) => {
    if (!seleccionado || !archivo) return;
    setErrorLicencia('');
    setSubiendoLicencia(true);
    try {
      const body = new FormData();
      body.append('documentoFuncionamiento', archivo);
      await api(`/locales/${seleccionado.id}/documento`, { method: 'POST', token, body });
      setMensaje('Licencia de funcionamiento subida. El Operador G.A.M.E.A. la revisará.');
      cargar();
    } catch (e: any) {
      setErrorLicencia(e.message || 'No se pudo subir la licencia.');
    } finally {
      setSubiendoLicencia(false);
    }
  };

  const eliminarFoto = async (fotoId: string) => {
    if (!seleccionado) return;
    setErrorGeneral('');
    try {
      await api(`/locales/${seleccionado.id}/fotos/${fotoId}`, { method: 'DELETE', token });
      cargar();
    } catch (e: any) {
      setErrorGeneral(e.message || 'No se pudo eliminar la foto.');
    }
  };

  const [evento, setEvento] = useState({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '', categoriaId: '' });
  const [afiche, setAfiche] = useState<File | null>(null);
  const [bannerEvento, setBannerEvento] = useState<File | null>(null);
  const [errorEvento, setErrorEvento] = useState('');
  const [publicandoEvento, setPublicandoEvento] = useState(false);
  const [claveAfiche, setClaveAfiche] = useState(0);

  // tipo "afiche" = vertical (cartelera); "banner" = horizontal (carrusel de la portada).
  const subirAfiche = async (eventoId: string, archivo: File, tipo: 'afiche' | 'banner' = 'afiche') => {
    if (!seleccionado) return;
    const body = new FormData();
    body.append(tipo, archivo);
    await api(`/locales/${seleccionado.id}/eventos/${eventoId}/${tipo}`, { method: 'POST', token, body });
  };

  const crearEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleccionado) return;
    setErrorEvento('');
    setPublicandoEvento(true);
    try {
      // La fecha de fin es opcional: vacia no se envia (el backend rechaza "").
      const creado = await api<{ id: string }>(`/locales/${seleccionado.id}/eventos`, {
        method: 'POST',
        token,
        body: JSON.stringify({ ...evento, fechaFin: evento.fechaFin || undefined, categoriaId: evento.categoriaId || undefined }),
      });
      if (afiche) await subirAfiche(creado.id, afiche);
      if (bannerEvento) await subirAfiche(creado.id, bannerEvento, 'banner');
      setEvento({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '', categoriaId: '' });
      setAfiche(null);
      setBannerEvento(null);
      setClaveAfiche((n) => n + 1);
      setCreandoEvento(false);
      setMensaje('Evento publicado. Ya aparece en la cartelera.');
      cargar();
    } catch (err: any) {
      setErrorEvento(err.message || 'No se pudo publicar el evento.');
    } finally {
      setPublicandoEvento(false);
    }
  };

  // Borrar un evento de la cartelera (con sus imagenes), previa confirmacion.
  const [eliminandoEvento, setEliminandoEvento] = useState<string | null>(null);
  const eliminarEvento = async (eventoId: string, titulo: string) => {
    if (!seleccionado) return;
    if (!confirm(`¿Eliminar el evento "${titulo}" de la cartelera? También se borrarán sus imágenes. No se puede deshacer.`)) return;
    setErrorEvento('');
    setEliminandoEvento(eventoId);
    try {
      await api(`/locales/${seleccionado.id}/eventos/${eventoId}`, { method: 'DELETE', token });
      setMensaje(`Evento "${titulo}" eliminado de la cartelera.`);
      cargar();
    } catch (err: any) {
      setErrorEvento(err.message || 'No se pudo eliminar el evento.');
    } finally {
      setEliminandoEvento(null);
    }
  };

  const cambiarAfiche = async (eventoId: string, archivo: File | null, tipo: 'afiche' | 'banner' = 'afiche') => {
    if (!archivo) return;
    setErrorEvento('');
    try {
      await subirAfiche(eventoId, archivo, tipo);
      setMensaje(tipo === 'banner' ? 'Imagen horizontal actualizada.' : 'Afiche actualizado.');
      cargar();
    } catch (err: any) {
      setErrorEvento(err.message || 'No se pudo subir el afiche.');
    }
  };

  if (cargandoAuth || !usuario) return null;

  // Aviso cuando una pestaña no se puede modificar, segun el estado del local.
  const avisoBloqueo = (seccion: SeccionCorreccion) => {
    if (!seleccionado || editable(seccion)) return null;
    const texto =
      seleccionado.estado === 'PENDIENTE'
        ? '🔒 Tu local está en revisión: no puedes modificarlo hasta que el Operador G.A.M.E.A. responda.'
        : seleccionado.estado === 'RECHAZADO'
          ? '🔒 Este local fue rechazado y ya no se puede modificar.'
          : `🔒 El operador no pidió corregir esta sección. Solo puedes cambiar: ${seccionesPedidas.map(nombreSeccion).join(', ')}.`;
    return <p className="text-xs text-morado-700 bg-morado-50 border border-morado-200 rounded-lg px-3 py-2 mb-3"><ConIconos texto={texto} /></p>;
  };

  return (
    <div className="contenedor py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-morado-900">Administrador Turístico</h1>
          <p className="text-morado-600 text-sm">Gestiona tus locales, fotos y eventos de la cartelera.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Foto de perfil compacta: se abre solo si se quiere cambiar. */}
          <details className="relative">
            <summary className="boton-secundario-sm cursor-pointer list-none"><Icono nombre="user-round" /> Mi foto</summary>
            <div className="absolute right-0 z-20 mt-2 w-64 p-4 rounded-2xl border border-morado-100 bg-white shadow-card">
              <SubirFotoPerfil archivo={null} urlActual={usuario.avatarUrl} onElegir={cambiarFotoPerfil} tamano="w-20 h-20" />
              {subiendoPerfil && <p className="text-xs text-morado-500 mt-2">Subiendo foto…</p>}
              {errorPerfil && <p className="text-red-600 text-xs mt-2">{errorPerfil}</p>}
            </div>
          </details>
          {/* Para dueños con mas de un local (el boton del menu ya no se les muestra). */}
          <Link href="/registrar-local" className="boton-secundario-sm">
            <Icono nombre="plus" /> Registrar otro local
          </Link>
        </div>
      </div>

      {locales.length === 0 && (
        <p className="text-morado-500">
          Todavía no registraste ningún local. Usa el botón &quot;Registrar otro local&quot;.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ---------- Columna izquierda ---------- */}
        <div className="space-y-5 lg:sticky lg:top-4">
          {/* 1) Mis locales: la tarjeta SOLO sirve para elegir el local. */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-morado-500 mb-2">
              Mis locales ({locales.length})
            </h2>
            <div className="space-y-2">
              {locales.map((l) => {
                const estado = ESTADO_LOCAL[l.estado];
                const activo = seleccionadoId === l.id;
                const portada = l.fotos.find((f) => f.esPortada) || l.fotos[0];
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => abrir(l)}
                    aria-pressed={activo}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      activo
                        ? 'border-morado-600 bg-morado-50 ring-2 ring-morado-200'
                        : 'border-morado-100 bg-white hover:border-morado-300'
                    }`}
                  >
                    <span className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-morado-100">
                      {portada ? (
                        <Image src={urlArchivo(portada.url)} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xl" aria-hidden>
                          <Icono nombre="house" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-morado-900 truncate">{l.nombre}</span>
                      <span className="block text-xs text-morado-500 truncate">{l.zona.nombreZonaPrincipal}</span>
                      <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${estado.clase}`}><ConIconos texto={estado.texto} /></span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2) Que hacer con el local elegido: dos opciones bien separadas. */}
          {seleccionado && (
            <section className="rounded-2xl border border-morado-100 bg-white p-3 shadow-card">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-morado-500 mb-2 px-1">
                ¿Qué quieres hacer?
              </h2>
              <div className="space-y-2">
                {(
                  [
                    {
                      id: 'local',
                      icono: '✏️',
                      titulo: 'Cambiar datos del local',
                      detalle: 'Información, categorías, fotos y licencia',
                      bloqueado: false,
                    },
                    {
                      id: 'cartelera',
                      icono: '📢',
                      titulo: 'Cartelera de eventos',
                      detalle:
                        seleccionado.estado === 'APROBADO'
                          ? `${seleccionado.eventos.length} ${seleccionado.eventos.length === 1 ? 'evento publicado' : 'eventos publicados'}`
                          : 'Disponible cuando aprueben tu local',
                      bloqueado: seleccionado.estado !== 'APROBADO',
                    },
                  ] as const
                ).map((op) => {
                  const activa = vista === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => abrir(seleccionado, op.id)}
                      aria-pressed={activa}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left border transition-all ${
                        activa
                          ? op.id === 'cartelera'
                            ? 'bg-dorado-400/20 border-dorado-400 text-morado-900'
                            : 'bg-morado-700 border-morado-700 text-white'
                          : 'bg-white border-morado-100 text-morado-900 hover:border-morado-300'
                      }`}
                    >
                      <span
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg ${
                          activa && op.id === 'local' ? 'bg-white/15' : 'bg-morado-50'
                        }`}
                        aria-hidden
                      >
                        <ConIconos texto={op.icono} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {op.titulo}
                          <ConIconos texto={op.bloqueado && ' 🔒'} />
                        </span>
                        <span className={`block text-xs ${activa && op.id === 'local' ? 'text-morado-100' : 'text-morado-500'}`}>
                          {op.detalle}
                        </span>
                      </span>
                      <span aria-hidden className="text-lg opacity-60">›</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ---------- Local elegido ---------- */}
        {seleccionado && (
          <div ref={panelRef} className="lg:col-span-2 bg-white border border-morado-100 rounded-2xl shadow-card scroll-mt-4">
            <div className="p-4 border-b border-morado-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-morado-900">{seleccionado.nombre}</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_LOCAL[seleccionado.estado].clase}`}>
                    <ConIconos texto={ESTADO_LOCAL[seleccionado.estado].texto} />
                  </span>
                  {seleccionado.estado === 'APROBADO' && (
                    <Link href={`/locales/${seleccionado.id}`} className="text-xs boton-texto">
                      Ver página pública <Icono nombre="external-link" />
                    </Link>
                  )}
                </div>
              </div>

              {seleccionado.estado === 'PENDIENTE' && (
                <p className="mt-3 text-sm text-yellow-900 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                  <Icono nombre="hourglass" /> Tus datos se enviaron a revisión. Mientras el Operador G.A.M.E.A. los revisa no se pueden modificar;
                  aquí verás si lo aprueba o si te pide corregir algo.
                </p>
              )}
              {seleccionado.estado === 'RECHAZADO' && (
                <p className="mt-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <Icono nombre="x" /> Este local fue rechazado por el Operador G.A.M.E.A.
                </p>
              )}
              {seleccionado.estado === 'CORRECCION' && (
                <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 px-3 py-3">
                  <p className="text-sm font-semibold text-orange-900"><Icono nombre="pencil" /> El Operador G.A.M.E.A. te pide corregir:</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {seccionesPedidas.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPestana(s as Pestana)}
                        className="text-xs px-2.5 py-1 rounded-full bg-white border border-orange-300 text-orange-800 font-semibold hover:bg-orange-100"
                      >
                        {nombreSeccion(s)} →
                      </button>
                    ))}
                  </div>
                  {seleccionado.correccionMensaje && (
                    <blockquote className="mt-2 text-sm text-orange-900 border-l-4 border-orange-300 pl-3 italic">
                      &ldquo;{seleccionado.correccionMensaje}&rdquo;
                    </blockquote>
                  )}
                  <button
                    type="button"
                    onClick={reenviar}
                    disabled={reenviando}
                    className="boton-primario-sm mt-3 !bg-orange-600 hover:!bg-orange-700"
                  >
                    <ConIconos texto={reenviando ? 'Enviando…' : '📤 Ya corregí: enviar a revisión'} />
                  </button>
                </div>
              )}
            </div>

            {/* Titulo de lo que se esta haciendo (se elige en "¿Qué quieres hacer?"). */}
            <div className="px-4 pt-4">
              {vista === 'local' ? (
                <>
                  <h3 className="text-base font-bold text-morado-900"><Icono nombre="pencil" /> Cambiar datos del local</h3>
                  <p className="text-xs text-morado-500">
                    {seleccionado.estado === 'APROBADO'
                      ? 'Elige una pestaña, cambia lo que necesites y pulsa «Guardar». Los cambios se ven al instante en tu página pública.'
                      : 'Elige una pestaña para ver tus datos.'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-morado-900"><Icono nombre="megaphone" /> Cartelera de eventos</h3>
                  <p className="text-xs text-morado-500">Los eventos que publiques aparecen en la Cartelera de la página.</p>
                </>
              )}
            </div>

            {/* Pestañas de los datos del local: siempre a la vista. */}
            {vista === 'local' && (
              <div className="sticky top-0 z-10 bg-white border-b border-morado-100 px-2 mt-2 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {PESTANAS.map((p) => {
                    const pedida = seccionesPedidas.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPestana(p.id)}
                        className={`relative px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          pestana === p.id ? 'border-morado-700 text-morado-900' : 'border-transparent text-morado-500 hover:text-morado-800'
                        }`}
                      >
                        <ConIconos texto={p.icono} /> {p.nombre}
                        {pedida && (
                          <span className="absolute top-1.5 right-0.5 w-2 h-2 rounded-full bg-orange-500" aria-label="por corregir" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-4">
              {mensaje && (
                <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-4">{mensaje}</p>
              )}
              {errorGeneral && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{errorGeneral}</p>}

              {vista === 'local' && pestana === 'informacion' && (
                <section>
                  {avisoBloqueo('informacion')}
                  <fieldset disabled={!editable('informacion')} className="disabled:opacity-60">
                    <p className="etiqueta-campo">Tipo de local (puedes marcar varios)</p>
                    <div className="mb-3">
                      <SelectorTiposLocal seleccionados={tiposLocal} onCambiar={setTiposLocal} />
                    </div>
                    <p className="etiqueta-campo">Descripción</p>
                    <textarea className="input-campo mb-3" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                    <div className="mb-3">
                      <CampoHistoria valor={historia} onCambiar={setHistoria} />
                    </div>
                    <div className="mb-3">
            <div className="rounded-xl border border-morado-100 bg-morado-50/40 p-3 space-y-3">
              <p className="text-sm font-semibold text-morado-900">
                Lo que tu local ofrece <span className="text-[11px] font-normal text-morado-500">(opcional, lo verán los visitantes)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] text-morado-600">
                  Capacidad (personas)
                  <input type="number" min={1} max={20000} className="input-campo" placeholder="Ej.: 300" value={aforo} onChange={(e) => setAforo(e.target.value)} />
                </label>
                <label className="text-[11px] text-morado-600">
                  WhatsApp para consultas
                  <input className="input-campo" inputMode="tel" placeholder="Ej.: 71234567" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </label>
              </div>
              <SelectorServicios valor={servicios} onCambiar={setServicios} />
              <label className="block text-[11px] text-morado-600">
                Reglas del local («Lo que debes saber»)
                <textarea className="input-campo" rows={2} maxLength={1500} placeholder="Ej.: No se permite ingresar con bebidas propias. Garantía por daños." value={reglas} onChange={(e) => setReglas(e.target.value)} />
              </label>
              <label className="block text-[11px] text-morado-600">
                Video de tu local (enlace de YouTube o TikTok)
                <input className="input-campo" placeholder="https://www.youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
              </label>
            </div>
                    </div>
                    <div className="mb-3">
                      <SelectorHorario
                        dias={dias}
                        onDias={setDias}
                        apertura={horaApertura}
                        onApertura={setHoraApertura}
                        cierre={horaCierre}
                        onCierre={setHoraCierre}
                      />
                    </div>
                    {errorInfo && <p className="text-red-600 text-sm mb-2">{errorInfo}</p>}
                    <button className="boton-primario-sm" onClick={guardarInfo}>
                      Guardar información
                    </button>
                  </fieldset>
                </section>
              )}

              {vista === 'local' && pestana === 'categorias' && (
                <section>
                  {avisoBloqueo('categorias')}
                  <p className="text-xs text-morado-600 mb-2">
                    Marca todos los tipos de eventos que se pueden hacer en tu local. El chatbot usa esta información para
                    recomendar tu local.
                  </p>
                  <fieldset disabled={!editable('categorias')} className="disabled:opacity-60">
                    <SelectorCategorias categorias={catalogo} seleccionadas={categoriasElegidas} onCambiar={setCategoriasElegidas} />
                    {errorCategorias && <p className="text-red-600 text-sm mt-2">{errorCategorias}</p>}
                    <button className="boton-primario-sm mt-3" onClick={guardarCategorias}>
                      Guardar categorías
                    </button>
                  </fieldset>
                </section>
              )}

              {vista === 'local' && pestana === 'fotos' && (
                <section>
                  {avisoBloqueo('fotos')}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {seleccionado.fotos.map((f) => (
                      <div key={f.id} className="relative w-28 h-24 rounded-lg overflow-hidden group">
                        <Image src={urlArchivo(f.url)} alt="" fill className="object-cover" unoptimized />
                        {editable('fotos') && (
                          <button
                            onClick={() => eliminarFoto(f.id)}
                            className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    ))}
                    {seleccionado.fotos.length === 0 && <p className="text-sm text-morado-500">Todavía no hay fotos.</p>}
                  </div>
                  {editable('fotos') && (
                    <label className="text-sm text-morado-700">
                      Agregar fotos:{' '}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(e) => {
                          subirFotos(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {/* Paseo 360: una foto panoramica del local */}
                  <div className="mt-5 rounded-xl border border-morado-100 bg-morado-50/40 p-3">
                    <p className="text-sm font-semibold text-morado-900"><Icono nombre="rotate-3d" /> Foto 360° (opcional)</p>
                    <p className="text-[11px] text-morado-500 mb-2">
                      Una foto panorámica (modo «Panorámica» o «360°» de la cámara del celular). Los visitantes la recorren
                      arrastrándola. Hasta 20 MB.
                    </p>
                    {seleccionado.foto360Url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlArchivo(seleccionado.foto360Url)} alt="Foto 360° actual" className="w-full h-24 object-cover rounded-lg border border-morado-100 mb-2" />
                    )}
                    {editable('fotos') && (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="boton-secundario-sm cursor-pointer">
                          {subiendo360 ? 'Subiendo…' : seleccionado.foto360Url ? 'Cambiar foto 360°' : 'Subir foto 360°'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={subiendo360}
                            onChange={(e) => {
                              cambiarFoto360(e.target.files?.[0] ?? null);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {seleccionado.foto360Url && (
                          <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => cambiarFoto360(null)} disabled={subiendo360}>
                            Quitar foto 360°
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {vista === 'local' && pestana === 'licencia' && (
                <section>
                  {avisoBloqueo('licencia')}
                  <div className="max-w-md">
                    <VistaLicencia url={seleccionado.documentoFuncionamientoUrl} alto="h-56" />
                  </div>
                  {editable('licencia') && (
                    <label className="block mt-3 text-sm text-morado-700">
                      {seleccionado.documentoFuncionamientoUrl ? 'Cambiar la licencia' : 'Subir la licencia'} (imagen o PDF):{' '}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={subiendoLicencia}
                        onChange={(e) => {
                          subirLicencia(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {subiendoLicencia && <p className="text-xs text-morado-500 mt-1">Subiendo…</p>}
                  {errorLicencia && <p className="text-xs text-red-600 mt-1">{errorLicencia}</p>}
                </section>
              )}

              {vista === 'cartelera' && (
                <section>
                  {seleccionado.estado !== 'APROBADO' ? (
                    <p className="text-sm text-morado-700 bg-morado-50 border border-morado-200 rounded-lg px-3 py-2">
                      <Icono nombre="lock" /> Podrás publicar eventos en la cartelera cuando el Operador G.A.M.E.A. apruebe tu local.
                    </p>
                  ) : creandoEvento ? (
                    <form onSubmit={crearEvento} className="space-y-3 max-w-xl">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-morado-900"><Icono nombre="plus" /> Nuevo evento</h3>
                        <button type="button" onClick={() => setCreandoEvento(false)} className="boton-texto text-sm">
                          ← Volver a mis eventos
                        </button>
                      </div>
                      <label className="block">
                        <span className="etiqueta-campo">1. Título del evento</span>
                        <input
                          className="input-campo"
                          placeholder="Ej.: Noche de morenada"
                          value={evento.titulo}
                          onChange={(e) => setEvento((v) => ({ ...v, titulo: e.target.value }))}
                          required
                        />
                      </label>
                      <label className="block">
                        <span className="etiqueta-campo">Categoría del evento (opcional)</span>
                        <SelectorCategoriaEvento
                          categorias={catalogo}
                          valor={evento.categoriaId}
                          onCambiar={(id) => setEvento((v) => ({ ...v, categoriaId: id }))}
                        />
                      </label>
                      <label className="block">
                        <span className="etiqueta-campo">2. Descripción</span>
                        <textarea
                          className="input-campo"
                          placeholder="¿De qué trata? ¿Precio de entrada?"
                          rows={3}
                          value={evento.descripcion}
                          onChange={(e) => setEvento((v) => ({ ...v, descripcion: e.target.value }))}
                          required
                        />
                      </label>
                      <div>
                        <span className="etiqueta-campo">3. Fecha y hora</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className="text-[11px] text-morado-600">
                            Empieza (obligatorio)
                            <input
                              type="datetime-local"
                              className="input-campo"
                              value={evento.fechaInicio}
                              onChange={(e) => setEvento((v) => ({ ...v, fechaInicio: e.target.value }))}
                              required
                            />
                          </label>
                          <label className="text-[11px] text-morado-600">
                            Termina (opcional)
                            <input
                              type="datetime-local"
                              className="input-campo"
                              value={evento.fechaFin}
                              onChange={(e) => setEvento((v) => ({ ...v, fechaFin: e.target.value }))}
                            />
                          </label>
                        </div>
                      </div>
                      <div key={claveAfiche}>
                        <span className="etiqueta-campo">4. Imágenes del evento (opcionales)</span>
                        <div className="grid grid-cols-1 gap-2">
                          <ImagenEvento forma="vertical" archivo={afiche} onElegir={setAfiche} onQuitar={() => setAfiche(null)} />
                          <ImagenEvento forma="horizontal" archivo={bannerEvento} onElegir={setBannerEvento} onQuitar={() => setBannerEvento(null)} />
                        </div>
                      </div>
                      {errorEvento && <p className="text-sm text-red-600">{errorEvento}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button className="boton-primario" disabled={publicandoEvento}>
                          <ConIconos texto={publicandoEvento ? 'Publicando…' : '✔ Publicar evento'} />
                        </button>
                        <button type="button" onClick={() => setCreandoEvento(false)} className="boton-secundario-sm">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-morado-900">Mis eventos publicados ({seleccionado.eventos.length})</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCreandoEvento(true);
                            setErrorEvento('');
                            setMensaje('');
                          }}
                          className="boton-primario-sm"
                        >
                          <Icono nombre="plus" /> Crear evento nuevo
                        </button>
                      </div>
                      {errorEvento && <p className="text-sm text-red-600 mb-2">{errorEvento}</p>}
                      {seleccionado.eventos.length === 0 ? (
                        <div className="text-center py-10 rounded-xl border border-dashed border-morado-200 bg-morado-50/50">
                          <p className="text-3xl" aria-hidden><Icono nombre="party-popper" /></p>
                          <p className="text-sm text-morado-700 mt-1">Todavía no publicaste eventos.</p>
                          <p className="text-xs text-morado-500">Usa «<Icono nombre="plus" /> Crear evento nuevo» para el primero.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {seleccionado.eventos.map((ev) => (
                            <div key={ev.id} className="border border-morado-100 rounded-lg p-3 text-sm flex items-center gap-3">
                              {ev.aficheUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={urlArchivo(ev.aficheUrl)} alt="" className="w-12 h-16 object-cover rounded border border-morado-100" />
                              ) : (
                                <span className="w-12 h-16 rounded bg-morado-50 border border-dashed border-morado-200 flex items-center justify-center text-lg" aria-hidden>
                                  <Icono nombre="party-popper" />
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-morado-900 truncate">{ev.titulo}</p>
                                <p className="text-xs text-morado-500">{new Date(ev.fechaInicio).toLocaleString('es-BO')}</p>
                                <div className="flex flex-wrap gap-x-3 text-xs mt-0.5">
                                  <Link href={`/cartelera/${ev.id}`} className="boton-texto">
                                    Ver <Icono nombre="external-link" />
                                  </Link>
                                  <label className="boton-texto cursor-pointer" title="Imagen vertical para la Cartelera">
                                    {ev.aficheUrl ? 'Cambiar afiche' : 'Subir afiche'}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        cambiarAfiche(ev.id, e.target.files?.[0] ?? null);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <label className="boton-texto cursor-pointer" title="Imagen horizontal para el carrusel de la página principal">
                                    {ev.bannerUrl ? 'Cambiar imagen horizontal' : 'Subir imagen horizontal'}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        cambiarAfiche(ev.id, e.target.files?.[0] ?? null, 'banner');
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => eliminarEvento(ev.id, ev.titulo)}
                                    disabled={eliminandoEvento === ev.id}
                                    className="text-red-600 hover:underline disabled:opacity-50"
                                  >
                                    <ConIconos texto={eliminandoEvento === ev.id ? 'Eliminando…' : '🗑 Eliminar'} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
