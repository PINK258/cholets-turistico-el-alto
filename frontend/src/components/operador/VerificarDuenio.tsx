'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { LocalEnMapa, UsuarioRegistrado } from '@/lib/types';
import AvatarUsuario from '@/components/AvatarUsuario';
import { detectarDistrito, textoDeteccion } from '@/lib/distritosElAlto';
import { pdfDuenio } from '@/lib/pdfOperador';
import VistaLicencia from '@/components/operador/VistaLicencia';
import Icono, { ConIconos } from '@/components/Icono';

const MapaDistritos = dynamic(() => import('@/components/operador/MapaDistritos'), { ssr: false });

type Verificacion = Pick<UsuarioRegistrado, 'datosVerificadosEn' | 'verificacionCompleta' | 'notaVerificacion' | 'verificadoPor'>;

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });

// Ventana del operador para revisar todos los datos de un dueño (con su
// licencia de funcionamiento a la vista) y confirmarlos UNA sola vez. Solo se
// puede volver a confirmar si en esa ocasion le faltaba alguna licencia o si
// despues subio una licencia o registro otro local.
export default function VerificarDuenio({
  duenio,
  token,
  onCerrar,
  onActualizado,
}: {
  duenio: UsuarioRegistrado;
  token: string | null;
  onCerrar: () => void;
  onActualizado: (id: string, datos: Verificacion) => void;
}) {
  const [nota, setNota] = useState(duenio.notaVerificacion ?? '');
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  // Local que se centra en el mapa de la ventana (sin abrir otra pestaña).
  const [enfoque, setEnfoque] = useState<{ lat: number; lng: number; vez: number } | null>(null);
  const localesEnMapa: LocalEnMapa[] = useMemo(
    () =>
      duenio.locales.map((l) => ({
        id: l.id,
        nombre: l.nombre,
        estado: l.estado,
        direccion: l.direccion,
        latitud: l.latitud,
        longitud: l.longitud,
        zona: l.zona,
        anfitrion: { nombre: duenio.nombre, apellidoPaterno: duenio.apellidoPaterno },
      })),
    [duenio],
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const sinLicencia = duenio.locales.filter((l) => !l.documentoFuncionamientoUrl).length;
  const yaConfirmado = !!duenio.datosVerificadosEn && duenio.verificacionCompleta;

  const guardar = async (verificado: true) => {
    setGuardando(true);
    setError('');
    try {
      const r = await api<Verificacion>(`/operador/usuarios/${duenio.id}/verificacion`, {
        method: 'POST',
        token,
        body: JSON.stringify({ verificado, nota: nota.trim() || undefined }),
      });
      onActualizado(duenio.id, r);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la verificación.');
    } finally {
      setGuardando(false);
    }
  };

  const descargar = async () => {
    setGenerando(true);
    try {
      await pdfDuenio({ ...duenio, notaVerificacion: nota || duenio.notaVerificacion });
    } finally {
      setGenerando(false);
    }
  };

  const filas: [string, string][] = [
    ['Carnet de identidad', duenio.ci || '—'],
    ['Correo', duenio.correo],
    ['Teléfono', duenio.telefono || '—'],
    ['Inicia sesión con', duenio.proveedorAuth === 'GOOGLE' ? 'Google' : 'Correo y contraseña'],
    ['Registrado el', fecha(duenio.creadoEn)],
  ];

  return (
    <div className="fixed inset-0 z-[1100] bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Verificar datos de ${duenio.nombre}`}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-5 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <AvatarUsuario url={duenio.avatarUrl} nombre={duenio.nombre} apellido={duenio.apellidoPaterno} tamano="w-20 h-20 text-xl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-morado-900">
              {duenio.nombre} {duenio.apellidoPaterno} {duenio.apellidoMaterno}
            </h2>
            {duenio.datosVerificadosEn ? (
              <p className="text-sm text-green-700 font-medium">
                <Icono nombre="check" /> Datos verificados el {fecha(duenio.datosVerificadosEn)}
                {duenio.verificadoPor && ` por ${duenio.verificadoPor.nombre} ${duenio.verificadoPor.apellidoPaterno}`}
              </p>
            ) : (
              <p className="text-sm text-amber-700 font-medium">Datos sin verificar</p>
            )}
          </div>
          <button type="button" onClick={onCerrar} className="text-morado-400 hover:text-morado-700 text-xl" aria-label="Cerrar">
            <Icono nombre="x" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {filas.map(([t, v]) => (
            <div key={t}>
              <dt className="text-[11px] text-morado-500">{t}</dt>
              <dd className="text-morado-900 font-medium break-all">{v}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-5 mb-2 text-sm font-bold text-morado-900">Locales ({duenio.locales.length})</h3>
        {duenio.locales.length > 0 && (
          <div className="mb-3">
            <MapaDistritos locales={localesEnMapa} enfoque={enfoque} alto="h-72" ajustarALocales />
            <p className="text-[11px] text-morado-500 mt-1">
              Ubicación GPS de sus locales sobre los distritos (línea continua: límite oficial; punteada: área aproximada).
            </p>
          </div>
        )}
        <ul className="space-y-2">
          {duenio.locales.map((l) => {
            const d = detectarDistrito(l.latitud, l.longitud);
            const coincide = d?.numero === l.zona.distritoNumero;
            return (
              <li key={l.id} className="rounded-xl border border-morado-100 p-3 text-sm">
                <p className="font-semibold text-morado-900">
                  {l.nombre} <span className="text-xs font-normal text-morado-500">· {l.estado.toLowerCase()}</span>
                </p>
                <p className="text-xs text-morado-700">{l.direccion}</p>
                <p className="text-xs text-morado-600">
                  Zona registrada: D{l.zona.distritoNumero} · {l.zona.nombreZonaPrincipal}
                </p>
                <p className={`text-xs font-medium ${d ? (coincide ? 'text-green-700' : 'text-amber-700') : 'text-morado-500'}`}>
                  GPS: {textoDeteccion(d)} <ConIconos texto={d && (coincide ? '· coincide ✔' : '· no coincide ⚠')} />
                </p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs">
                  <button
                    type="button"
                    className="boton-texto"
                    onClick={() => setEnfoque((e) => ({ lat: l.latitud, lng: l.longitud, vez: (e?.vez ?? 0) + 1 }))}
                  >
                    <Icono nombre="map-pin" /> Ver en el mapa
                  </button>
                </div>
                <div className="mt-2">
                  <VistaLicencia url={l.documentoFuncionamientoUrl} alto="h-56" />
                </div>
              </li>
            );
          })}
        </ul>

        {yaConfirmado ? (
          <p className="mt-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <Icono nombre="check" /> Datos ya confirmados con la licencia de funcionamiento. La confirmación se hace una sola vez.
            {duenio.notaVerificacion && <span className="block text-xs mt-1">Nota: {duenio.notaVerificacion}</span>}
          </p>
        ) : (
          <>
            {duenio.datosVerificadosEn && (
              <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Se confirmó antes, pero le faltaba alguna licencia (o después subió una licencia o un local nuevo). Revísalo y
                confírmalo otra vez.
              </p>
            )}
            {sinLicencia > 0 && (
              <p className="mt-2 text-xs text-amber-800">
                <Icono nombre="triangle-alert" /> {sinLicencia === 1 ? '1 local no tiene' : `${sinLicencia} locales no tienen`} licencia de funcionamiento: si
                confirmas ahora, podrás volver a confirmar cuando la suba.
              </p>
            )}
            <label className="block mt-4">
              <span className="etiqueta-campo">Nota de la verificación (opcional)</span>
              <textarea
                className="input-campo"
                rows={2}
                maxLength={500}
                placeholder="Ej.: CI y licencia de funcionamiento revisados; ubicación confirmada por teléfono."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </label>
          </>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" onClick={descargar} disabled={generando} className="boton-secundario-sm mr-auto">
            <ConIconos texto={generando ? 'Generando…' : '📄 Descargar PDF'} />
          </button>
          {!yaConfirmado && (
            <button type="button" onClick={() => guardar(true)} disabled={guardando} className="boton-primario-sm !bg-green-700 hover:!bg-green-800">
              <ConIconos texto={guardando ? 'Guardando…' : duenio.datosVerificadosEn ? '✔ Confirmar otra vez' : '✔ Confirmar datos del dueño'} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
