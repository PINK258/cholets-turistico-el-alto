'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { api, urlArchivo } from '@/lib/api';
import { EstadoVerificacion, Local, LocalEnMapa, UsuarioRegistrado, Zona } from '@/lib/types';
import CategoriasLocal from '@/components/CategoriasLocal';
import { textoTiposLocal } from '@/lib/tiposLocal';
import AvatarUsuario from '@/components/AvatarUsuario';
import VerificarDuenio from '@/components/operador/VerificarDuenio';
import VistaLicencia from '@/components/operador/VistaLicencia';
import { SECCIONES_CORRECCION } from '@/lib/estadosLocal';
import GestionEventos from '@/components/operador/GestionEventos';
import SubirEdificio from '@/components/operador/SubirEdificio';
import { COLOR_DISTRITO, detectarDistrito, textoDeteccion } from '@/lib/distritosElAlto';
import { pdfDuenio, pdfDuenios, pdfUsuario, pdfUsuarios } from '@/lib/pdfOperador';
import ReportesOperador from '@/components/operador/ReportesOperador';
import AuditoriaOperador from '@/components/operador/AuditoriaOperador';
import { NOMBRE_GENERO } from '@/lib/reportes';
import BusquedaAvanzada from '@/components/operador/BusquedaAvanzada';
import BandejaDenuncias from '@/components/operador/BandejaDenuncias';
import Icono, { ConIconos } from '@/components/Icono';

const MapaDistritos = dynamic(() => import('@/components/operador/MapaDistritos'), { ssr: false });

type ListasUsuarios = { turistas: UsuarioRegistrado[]; anfitriones: UsuarioRegistrado[] };
type Pestana = 'locales' | 'busqueda' | 'usuarios' | 'eventos' | 'mapa' | 'edificio' | 'reportes' | 'auditoria' | 'denuncias';

const COLOR_ESTADO: Record<EstadoVerificacion, string> = {
  APROBADO: 'bg-green-50 text-green-700 border-green-200',
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  RECHAZADO: 'bg-red-50 text-red-700 border-red-200',
  CORRECCION: 'bg-orange-50 text-orange-700 border-orange-200',
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Compara la zona que eligio el dueño con el distrito que indica el GPS y
// muestra el punto en un mapa aqui mismo (sin abrir otra pestaña).
function ComprobacionGps({ local }: { local: Local }) {
  const [verMapa, setVerMapa] = useState(false);
  const lat = local.latitud;
  const lng = local.longitud;
  const distritoRegistrado = local.zona.distritoNumero;
  const d = detectarDistrito(lat, lng);
  const coincide = d?.numero === distritoRegistrado;
  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
        !d ? 'border-morado-100 bg-morado-50 text-morado-600' : coincide ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <p className="font-semibold">
        <ConIconos texto={!d ? 'Ubicación sin datos de distrito' : coincide ? '✔ La ubicación coincide con la zona registrada' : '⚠ La ubicación no coincide con la zona registrada'} />
      </p>
      <p>
        Registrado: Distrito {distritoRegistrado} · GPS: {textoDeteccion(d)} · {lat.toFixed(5)}, {lng.toFixed(5)}{' '}
        <button type="button" onClick={() => setVerMapa((v) => !v)} className="underline font-medium">
          {verMapa ? 'Ocultar mapa' : <><Icono nombre="map-pin" /> Ver en el mapa</>}
        </button>
      </p>
      {verMapa && (
        <div className="mt-2">
          <MapaDistritos
            locales={[
              {
                id: local.id,
                nombre: local.nombre,
                estado: local.estado,
                direccion: local.direccion,
                latitud: lat,
                longitud: lng,
                zona: local.zona,
                anfitrion: { nombre: local.anfitrion.nombre, apellidoPaterno: local.anfitrion.apellidoPaterno },
              },
            ]}
            enfoque={null}
            alto="h-64"
            ajustarALocales
          />
        </div>
      )}
    </div>
  );
}

// Edad cumplida a partir de la fecha de nacimiento ("AAAA-MM-DD...").
const edadDe = (fecha: string) => {
  const n = new Date(fecha.slice(0, 10) + 'T00:00:00');
  const hoy = new Date();
  let edad = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) edad--;
  return edad;
};

function FilaUsuario({
  u,
  onVerificar,
  onEliminar,
}: {
  u: UsuarioRegistrado;
  onVerificar?: (u: UsuarioRegistrado) => void;
  onEliminar: (u: UsuarioRegistrado) => void;
}) {
  const esDuenio = u.rol === 'ANFITRION';
  const [generando, setGenerando] = useState(false);
  const descargar = async () => {
    setGenerando(true);
    try {
      if (esDuenio) await pdfDuenio(u);
      else pdfUsuario(u);
    } finally {
      setGenerando(false);
    }
  };
  return (
    <li className="flex items-start gap-3 py-3 border-t border-morado-50 first:border-t-0">
      <AvatarUsuario url={u.avatarUrl} nombre={u.nombre} apellido={u.apellidoPaterno} tamano="w-11 h-11 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-morado-900 truncate">
          {u.nombre} {u.apellidoPaterno} {u.apellidoMaterno}
          {esDuenio &&
            (u.datosVerificadosEn ? (
              <span className="ml-1.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 align-middle">
                <Icono nombre="shield-check" /> Verificado
              </span>
            ) : (
              <span className="ml-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 align-middle">
                Sin verificar
              </span>
            ))}
        </p>
        <p className="text-xs text-morado-600 truncate"><Icono nombre="mail" /> {u.correo}</p>
        <p className="text-[11px] text-morado-400 mt-0.5">
          Desde {fechaCorta(u.creadoEn)} · {u.proveedorAuth === 'GOOGLE' ? 'Google' : 'Correo'}
          {u.ci && ` · CI: ${u.ci}`}
          {u.rol === 'TURISTA' && ` · ${u._count.resenas} reseña${u._count.resenas === 1 ? '' : 's'}`}
        </p>
        <p className="text-[11px] text-morado-500">
          {[
            u.genero ? NOMBRE_GENERO[u.genero] ?? u.genero : null,
            u.fechaNacimiento ? `${edadDe(u.fechaNacimiento)} años` : null,
            [u.ciudad, u.pais].filter(Boolean).join(', ') || null,
          ]
            .filter(Boolean)
            .join(' · ') || <span className="text-dorado-600">Sin datos personales</span>}
        </p>
        {u.locales.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {u.locales.map((l) => (
              <span key={l.id} className={`text-[11px] px-2 py-0.5 rounded-full border ${COLOR_ESTADO[l.estado]}`}>
                {l.nombre} · {l.estado.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
          <button type="button" onClick={descargar} disabled={generando} className="boton-texto">
            <ConIconos texto={generando ? 'Generando…' : '📄 PDF'} />
          </button>
          {esDuenio && onVerificar && (
            <button type="button" onClick={() => onVerificar(u)} className="boton-texto">
              <Icono nombre="search" /> {u.datosVerificadosEn && u.verificacionCompleta ? 'Ver datos y licencia' : 'Revisar y confirmar datos'}
            </button>
          )}
          <button type="button" onClick={() => onEliminar(u)} className="boton-texto !text-red-700">
            <Icono nombre="trash" /> Eliminar cuenta
          </button>
        </div>
      </div>
    </li>
  );
}

function ListaUsuarios({
  titulo,
  icono,
  usuarios,
  vacio,
  onPdfTodos,
  textoPdf,
  onVerificar,
  onEliminar,
}: {
  titulo: string;
  icono: string;
  usuarios: UsuarioRegistrado[];
  vacio: string;
  onPdfTodos: () => void;
  textoPdf: string;
  onVerificar?: (u: UsuarioRegistrado) => void;
  onEliminar: (u: UsuarioRegistrado) => void;
}) {
  return (
    <div className="bg-white border border-morado-100 rounded-2xl shadow-card flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-morado-100 flex flex-wrap items-center gap-2">
        <h2 className="font-bold text-morado-900 mr-auto">
          <ConIconos texto={icono} /> {titulo}{' '}
          <span className="text-xs font-semibold bg-morado-100 text-morado-800 px-2 py-0.5 rounded-full align-middle">{usuarios.length}</span>
        </h2>
        <button type="button" onClick={onPdfTodos} disabled={usuarios.length === 0} className="boton-secundario-sm" title={textoPdf}>
          <Icono nombre="file-text" /> PDF de todos
        </button>
      </div>
      <p className="px-4 pt-2 text-[11px] text-morado-400">{textoPdf}</p>
      {usuarios.length === 0 ? (
        <p className="px-4 py-6 text-sm text-morado-500">{vacio}</p>
      ) : (
        <ul className="px-4 max-h-[34rem] overflow-y-auto">
          {usuarios.map((u) => (
            <FilaUsuario key={u.id} u={u} onVerificar={onVerificar} onEliminar={onEliminar} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PanelOperadorPage() {
  const { usuario, token, cargando: cargandoAuth } = useAuth();
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Local[]>([]);
  const [usuarios, setUsuarios] = useState<ListasUsuarios>({ turistas: [], anfitriones: [] });
  const [localesMapa, setLocalesMapa] = useState<LocalEnMapa[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [pestana, setPestana] = useState<Pestana>('locales');
  const [denunciasPendientes, setDenunciasPendientes] = useState(0);
  const [revisando, setRevisando] = useState<UsuarioRegistrado | null>(null);
  const [enfoque, setEnfoque] = useState<{ distrito?: number; lat?: number; lng?: number; vez: number } | null>(null);
  const [distritoFiltro, setDistritoFiltro] = useState(0);

  const cargar = () => {
    api<Local[]>('/operador/locales/pendientes', { token }).then(setPendientes);
    api<unknown[]>('/operador/denuncias?estado=PENDIENTE', { token })
      .then((l) => setDenunciasPendientes(l.length))
      .catch(() => {});
    api<ListasUsuarios>('/operador/usuarios', { token }).then(setUsuarios);
    api<LocalEnMapa[]>('/operador/locales/mapa', { token }).then(setLocalesMapa);
  };

  useEffect(() => {
    if (!cargandoAuth) {
      if (!usuario) router.push('/login');
      else if (usuario.rol !== 'OPERADOR' && usuario.rol !== 'ADMIN') router.push('/');
      else {
        cargar();
        api<Zona[]>('/zonas').then(setZonas).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth]);

  // El panel se actualiza solo cada 30 s: locales nuevos por revisar, usuarios
  // que se registran y el mapa aparecen sin recargar la pagina.
  useEffect(() => {
    if (!usuario || (usuario.rol !== 'OPERADOR' && usuario.rol !== 'ADMIN')) return;
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, token]);

  // Aprobar o rechazar se hace UNA vez: el boton se bloquea mientras se guarda
  // y el backend rechaza un segundo intento ("ya fue aprobado").
  const [decidiendo, setDecidiendo] = useState<string | null>(null);
  const verificar = async (localId: string, estado: 'APROBADO' | 'RECHAZADO') => {
    if (decidiendo) return;
    setDecidiendo(localId);
    try {
      await api(`/operador/locales/${localId}/verificar`, {
        method: 'POST',
        token,
        body: JSON.stringify({ estado, comentario: comentarios[localId] || '' }),
      });
    } catch (e: any) {
      alert(e.message || 'No se pudo guardar la decisión.');
    } finally {
      setDecidiendo(null);
      cargar();
    }
  };

  // Pedir correcciones: el operador marca las secciones y escribe que corregir
  // (en el mismo cuadro de comentario). El dueño lo ve en su panel.
  const [seccionesCorregir, setSeccionesCorregir] = useState<Record<string, string[]>>({});
  const marcarSeccion = (localId: string, seccion: string) =>
    setSeccionesCorregir((m) => {
      const actuales = m[localId] ?? [];
      return {
        ...m,
        [localId]: actuales.includes(seccion) ? actuales.filter((s) => s !== seccion) : [...actuales, seccion],
      };
    });
  const pedirCorreccion = async (localId: string) => {
    if (decidiendo) return;
    const secciones = seccionesCorregir[localId] ?? [];
    const mensaje = (comentarios[localId] || '').trim();
    if (secciones.length === 0) return alert('Marca al menos una sección que el dueño debe corregir.');
    if (mensaje.length < 5) return alert('Escribe en el comentario qué debe corregir el dueño.');
    setDecidiendo(localId);
    try {
      await api(`/operador/locales/${localId}/correccion`, {
        method: 'POST',
        token,
        body: JSON.stringify({ secciones, mensaje }),
      });
    } catch (e: any) {
      alert(e.message || 'No se pudo enviar la corrección.');
    } finally {
      setDecidiendo(null);
      cargar();
    }
  };

  // Eliminar cuentas falsas o de spam (con sus locales, reseñas y archivos).
  const eliminarUsuario = async (u: UsuarioRegistrado) => {
    const nombre = `${u.nombre} ${u.apellidoPaterno}`.trim();
    const extra =
      u.locales.length > 0
        ? `\n\nTambién se borrarán sus ${u.locales.length} local(es) con sus fotos, eventos y reseñas.`
        : '';
    if (!confirm(`¿Eliminar la cuenta de ${nombre} (${u.correo})?${extra}\n\nEsto no se puede deshacer.`)) return;
    try {
      await api(`/operador/usuarios/${u.id}`, { method: 'DELETE', token });
      setUsuarios((l) => ({
        turistas: l.turistas.filter((x) => x.id !== u.id),
        anfitriones: l.anfitriones.filter((x) => x.id !== u.id),
      }));
      setRevisando((r) => (r?.id === u.id ? null : r));
      cargar();
    } catch (e: any) {
      alert(e.message || 'No se pudo eliminar la cuenta.');
    }
  };

  // Tras verificar a un dueño se actualiza en la lista y en la ventana abierta.
  const alVerificar = useCallback(
    (id: string, datos: Pick<UsuarioRegistrado, 'datosVerificadosEn' | 'verificacionCompleta' | 'notaVerificacion' | 'verificadoPor'>) => {
      setUsuarios((l) => ({ ...l, anfitriones: l.anfitriones.map((u) => (u.id === id ? { ...u, ...datos } : u)) }));
      setRevisando((u) => (u && u.id === id ? { ...u, ...datos } : u));
    },
    [],
  );
  const cerrarRevision = useCallback(() => setRevisando(null), []);

  // Resumen por distrito para el mapa: cuantos locales y cuantos no coinciden con el GPS.
  const resumenDistritos = useMemo(
    () =>
      zonas.map((z) => {
        const suyos = localesMapa.filter((l) => l.zona.distritoNumero === z.distritoNumero);
        const noCoinciden = suyos.filter((l) => {
          const d = detectarDistrito(l.latitud, l.longitud);
          return d && d.numero !== z.distritoNumero;
        }).length;
        return { zona: z, total: suyos.length, noCoinciden };
      }),
    [zonas, localesMapa],
  );
  const localesFiltrados = distritoFiltro ? localesMapa.filter((l) => l.zona.distritoNumero === distritoFiltro) : localesMapa;

  if (cargandoAuth || !usuario) return null;

  const texto = busqueda.trim().toLowerCase();
  const filtrar = (lista: UsuarioRegistrado[]) =>
    texto
      ? lista.filter((u) =>
          [u.nombre, u.apellidoPaterno, u.apellidoMaterno, u.correo, u.ci, ...u.locales.map((l) => l.nombre)]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(texto)),
        )
      : lista;
  const totalUsuarios = usuarios.turistas.length + usuarios.anfitriones.length;
  const duenios = filtrar(usuarios.anfitriones);
  const turistas = filtrar(usuarios.turistas);

  const PESTANAS: [Pestana, string][] = [
    ['locales', `Locales pendientes (${pendientes.length})`],
    ['busqueda', '🔎 Búsqueda avanzada'],
    ['usuarios', `Usuarios registrados (${totalUsuarios})`],
    ['eventos', '🎉 Eventos'],
    ['mapa', `🗺️ Mapa de distritos (${localesMapa.length})`],
    ['edificio', '🏢 Subir edificio'],
    ['reportes', '📊 Reportes'],
    ['auditoria', '🧾 Auditoría'],
    ['denuncias', `🚩 Denuncias${denunciasPendientes ? ` (${denunciasPendientes})` : ''}`],
  ];

  return (
    <div className="contenedor py-8">
      <h1 className="text-2xl font-bold text-morado-900 mb-1">Operador G.A.M.E.A.</h1>
      <p className="text-morado-600 mb-6">
        Verifica locales y dueños, revisa usuarios, publica eventos en la cartelera y ubica cada local en su distrito.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {PESTANAS.map(([clave, etiqueta]) => (
          <button
            key={clave}
            onClick={() => setPestana(clave)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              pestana === clave ? 'bg-morado-700 text-white' : 'bg-morado-50 text-morado-700'
            }`}
          >
            <ConIconos texto={etiqueta} />
          </button>
        ))}
      </div>

      {pestana === 'locales' && (
        <div className="space-y-4">
          {pendientes.length === 0 && <p className="text-morado-500">No hay locales pendientes de revisión.</p>}
          {pendientes.map((l) => (
            <div key={l.id} className="border border-morado-100 rounded-2xl p-4 bg-white shadow-card">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex gap-2 shrink-0">
                  {l.fotos.slice(0, 3).map((f) => (
                    <div key={f.id} className="relative w-20 h-20 rounded-lg overflow-hidden">
                      <Image src={urlArchivo(f.url)} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-morado-900">{l.nombre}</h3>
                  <p className="text-sm text-morado-600">
                    {textoTiposLocal(l.tiposLocal)} · D{l.zona.distritoNumero} · {l.zona.nombreZonaPrincipal}
                  </p>
                  <p className="text-sm text-morado-700 mt-1">{l.descripcion}</p>
                  <p className="text-xs text-morado-600 mt-1"><Icono nombre="map-pin" /> {l.direccion}</p>
                  <ComprobacionGps local={l} />
                  <div className="mt-2">
                    <CategoriasLocal categorias={l.categorias ?? []} agrupadas={false} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <AvatarUsuario url={l.anfitrion.avatarUrl} nombre={l.anfitrion.nombre} apellido={l.anfitrion.apellidoPaterno} />
                    <p className="text-xs text-morado-500">
                      Dueño: {l.anfitrion.nombre} {l.anfitrion.apellidoPaterno} {l.anfitrion.apellidoMaterno} · CI:{' '}
                      {l.anfitrion.ci || 'no proporcionado'} · {l.anfitrion.correo}
                    </p>
                  </div>
                  {l.horarioFuncionamiento && <p className="text-xs text-morado-500 mt-1"><Icono nombre="clock" /> {l.horarioFuncionamiento}</p>}
                  <div className="mt-3 max-w-md">
                    <VistaLicencia url={l.documentoFuncionamientoUrl} />
                  </div>

                  <textarea
                    placeholder="Comentario para el dueño: qué debe corregir, o el motivo si rechazas"
                    className="input-campo mt-3 text-sm"
                    rows={2}
                    maxLength={500}
                    value={comentarios[l.id] || ''}
                    onChange={(e) => setComentarios((c) => ({ ...c, [l.id]: e.target.value }))}
                  />
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-morado-800 mb-1">¿Algo para corregir? Marca la sección:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SECCIONES_CORRECCION.map((s) => {
                        const marcada = (seccionesCorregir[l.id] ?? []).includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => marcarSeccion(l.id, s.id)}
                            aria-pressed={marcada}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              marcada ? 'bg-orange-100 border-orange-400 text-orange-800 font-semibold' : 'bg-white border-morado-200 text-morado-700'
                            }`}
                          >
                            <ConIconos texto={s.icono} /> {s.nombre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => verificar(l.id, 'APROBADO')} disabled={decidiendo !== null} className="boton-primario !bg-green-700 hover:!bg-green-800">
                      <ConIconos texto={decidiendo === l.id ? 'Guardando…' : '✔ Aprobar local'} />
                    </button>
                    <button
                      onClick={() => pedirCorreccion(l.id)}
                      disabled={decidiendo !== null}
                      className="boton-primario !bg-orange-600 hover:!bg-orange-700"
                      title="Le llega un aviso al dueño con las secciones marcadas y tu comentario"
                    >
                      <Icono nombre="pencil" /> Pedir corrección
                    </button>
                    <button onClick={() => verificar(l.id, 'RECHAZADO')} disabled={decidiendo !== null} className="boton-primario !bg-red-700 hover:!bg-red-800">
                      <Icono nombre="x" /> Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana === 'usuarios' && (
        <div>
          <input
            type="search"
            className="input-campo max-w-sm mb-4"
            placeholder="Buscar por nombre, correo, CI o local…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <ListaUsuarios
              titulo="Usuarios (visitantes)"
              icono="🧳"
              usuarios={turistas}
              vacio={texto ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay visitantes registrados.'}
              onPdfTodos={() => pdfUsuarios(turistas)}
              textoPdf="El PDF de los visitantes incluye solo su nombre y correo."
              onEliminar={eliminarUsuario}
            />
            <ListaUsuarios
              titulo="Dueños / anfitriones"
              icono="🏠"
              usuarios={duenios}
              vacio={texto ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay dueños de locales registrados.'}
              onPdfTodos={() => pdfDuenios(duenios)}
              textoPdf="El PDF de los dueños incluye sus datos, la verificación y sus locales."
              onVerificar={setRevisando}
              onEliminar={eliminarUsuario}
            />
          </div>
        </div>
      )}

      {pestana === 'eventos' && <GestionEventos token={token} />}

      {pestana === 'edificio' && <SubirEdificio token={token} />}

      {pestana === 'reportes' && <ReportesOperador token={token} />}

      {pestana === 'auditoria' && <AuditoriaOperador token={token} />}

      {pestana === 'busqueda' && <BusquedaAvanzada token={token} />}

      {pestana === 'denuncias' && <BandejaDenuncias token={token} onCambio={cargar} />}

      {pestana === 'mapa' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-5 items-start">
          <div>
            <MapaDistritos locales={localesFiltrados} enfoque={enfoque} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-morado-600">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-700 mr-1" />Aprobado</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 mr-1" />Pendiente</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1" />Rechazado</span>
              <span>
                <span className="inline-block w-4 border-t-2 border-morado-700 mr-1 align-middle" />
                Límite oficial (D3, D8, D9, D14)
              </span>
              <span>
                <span className="inline-block w-4 border-t-2 border-dashed border-morado-700 mr-1 align-middle" />
                Área aproximada (resto)
              </span>
              <span className="text-morado-400">Datos: OpenStreetMap · D11 (Tacachira) sin datos</span>
            </div>
          </div>
          <aside className="bg-white border border-morado-100 rounded-2xl shadow-card">
            <div className="px-4 py-3 border-b border-morado-100 flex items-center justify-between">
              <h2 className="font-bold text-morado-900 text-sm">Distritos de El Alto</h2>
              {distritoFiltro !== 0 && (
                <button type="button" className="text-xs boton-texto" onClick={() => setDistritoFiltro(0)}>
                  Ver todos
                </button>
              )}
            </div>
            <ul className="max-h-[32rem] overflow-y-auto">
              {resumenDistritos.map(({ zona, total, noCoinciden }) => (
                <li key={zona.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDistritoFiltro(zona.distritoNumero);
                      setEnfoque((e) => ({ distrito: zona.distritoNumero, vez: (e?.vez ?? 0) + 1 }));
                    }}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-morado-50 ${
                      distritoFiltro === zona.distritoNumero ? 'bg-morado-50' : ''
                    }`}
                  >
                    <span
                      className="w-7 h-7 shrink-0 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                      style={{ background: COLOR_DISTRITO[zona.distritoNumero] }}
                    >
                      D{zona.distritoNumero}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-morado-900 truncate">{zona.nombreZonaPrincipal}</span>
                      <span className="block text-[11px] text-morado-500">
                        {total} local{total === 1 ? '' : 'es'}
                        {noCoinciden > 0 && <span className="text-amber-700"> · {noCoinciden} no coincide{noCoinciden === 1 ? '' : 'n'} con el GPS</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {distritoFiltro !== 0 && localesFiltrados.length > 0 && (
              <div className="border-t border-morado-100 px-4 py-2">
                <p className="text-[11px] font-semibold text-morado-500 mb-1">Locales del distrito</p>
                {localesFiltrados.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="block text-xs boton-texto truncate"
                    onClick={() => setEnfoque((e) => ({ lat: l.latitud, lng: l.longitud, vez: (e?.vez ?? 0) + 1 }))}
                  >
                    {l.nombre}
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {revisando && <VerificarDuenio duenio={revisando} token={token} onCerrar={cerrarRevision} onActualizado={alVerificar} />}
    </div>
  );
}
