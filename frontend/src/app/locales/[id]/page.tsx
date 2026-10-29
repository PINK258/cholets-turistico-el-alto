'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Local } from '@/lib/types';
import GaleriaFotos from '@/components/GaleriaFotos';
import CategoriasLocal from '@/components/CategoriasLocal';
import { textoTiposLocal } from '@/lib/tiposLocal';
import AvatarUsuario from '@/components/AvatarUsuario';
import { esDelGamea } from '@/components/LocalCard';
import ResenasLocal from '@/components/ResenasLocal';
import { Estrellas } from '@/components/Estrellas';
import UbicacionLocal from '@/components/UbicacionLocal';
import { urlArchivo } from '@/lib/api';
import BotonFavorito from '@/components/BotonFavorito';
import { DenunciarLocal, LoQueOfrece, Paseo360, TarjetaAnfitrion, VideoLocal } from '@/components/FichaLocal';
import { useAuth } from '@/context/AuthContext';
import Icono from '@/components/Icono';


export default function DetalleLocalPage() {
  const { id } = useParams<{ id: string }>();
  const [local, setLocal] = useState<Local | null>(null);
  const [error, setError] = useState('');
  const { usuario } = useAuth();

  useEffect(() => {
    api<Local>(`/locales/${id}`)
      .then(setLocal)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="contenedor py-10 text-red-600">{error}</div>;
  if (!local) return <div className="contenedor py-10 text-morado-500">Cargando…</div>;

  return (
    <div className="contenedor py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <GaleriaFotos fotos={local.fotos} nombre={local.nombre} />

        <div className="mt-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-morado-900">{local.nombre}</h1>
                <BotonFavorito localId={local.id} />
              </div>
              <a href="#resenas" className="inline-flex items-center gap-1.5 mt-1 text-sm text-morado-700 hover:underline">
                <Estrellas valor={local.calificacion?.promedio ?? 0} tamano={15} />
                {local.calificacion?.total ? (
                  <>
                    <span className="font-semibold text-morado-900">{local.calificacion.promedio?.toFixed(1)}</span>
                    <span className="text-morado-500">
                      ({local.calificacion.total} reseña{local.calificacion.total > 1 ? 's' : ''})
                    </span>
                  </>
                ) : (
                  <span className="text-morado-500">Sé el primero en calificar</span>
                )}
              </a>
              {/* Foto del dueño justo debajo del nombre del local. */}
              <div className="flex items-center gap-2 mt-1.5">
                {esDelGamea(local) ? (
                  <span className="w-10 h-10 rounded-full bg-morado-100 border border-morado-200 flex items-center justify-center text-lg" aria-hidden>
                    <Icono nombre="landmark" />
                  </span>
                ) : (
                  <AvatarUsuario
                    url={local.anfitrion.avatarUrl}
                    nombre={local.anfitrion.nombre}
                    apellido={local.anfitrion.apellidoPaterno}
                    tamano="w-10 h-10 text-sm"
                  />
                )}
                <p className="text-sm text-morado-700 leading-tight">
                  <span className="block text-[11px] text-morado-500">{esDelGamea(local) ? 'Publicado por' : 'Anfitrión'}</span>
                  <span className="font-semibold text-morado-900">
                    {esDelGamea(local) ? 'G.A.M.E.A. (Gobierno Autónomo Municipal de El Alto)' : `${local.anfitrion.nombre} ${local.anfitrion.apellidoPaterno}`}
                  </span>
                  {local.anfitrion.datosVerificadosEn && (
                    <span
                      className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 align-middle"
                      title="El Operador G.A.M.E.A. revisó los datos de este anfitrión"
                    >
                      <Icono nombre="shield-check" /> Verificado
                    </span>
                  )}
                </p>
              </div>
              <p className="text-morado-600 mt-2">{textoTiposLocal(local.tiposLocal, esDelGamea(local))}</p>
            </div>
            <span className="text-xs font-medium bg-morado-100 text-morado-800 px-3 py-1 rounded-full">
              <Icono nombre="map-pin" /> Distrito {local.zona.distritoNumero} · {local.zona.nombreZonaPrincipal}
            </span>
          </div>

          <p className="mt-4 text-morado-900 leading-relaxed whitespace-pre-wrap">{local.descripcion}</p>

          {local.historia && (
            <section className="mt-6 rounded-2xl border border-dorado-400/50 bg-gradient-to-br from-dorado-400/15 to-white p-5">
              <h2 className="text-lg font-bold text-morado-900 flex items-center gap-2">
                <span aria-hidden><Icono nombre="scroll-text" /></span> Historia del cholet
              </h2>
              <p className="text-xs text-morado-500 mb-2">Contada por su dueño</p>
              <p className="text-morado-900 leading-relaxed whitespace-pre-wrap">{local.historia}</p>
            </section>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-morado-500">Dirección</p>
              <p className="text-morado-900 font-medium">{local.direccion}</p>
            </div>
            <div>
              <p className="text-morado-500 flex items-center gap-1"><Icono nombre="clock" /> Horario</p>
              <p className="text-morado-900 font-medium">{local.horarioFuncionamiento || 'No especificado'}</p>
            </div>
          </div>

          <a href="#ubicacion" className="mt-4 boton-secundario-sm">
            <Icono nombre="map-pin" /> Ver ubicación en el mapa
          </a>
        </div>

        {/* Ficha completa (como Airbnb y la pagina oficial de Cholets). */}
        <LoQueOfrece aforo={local.aforo} servicios={local.servicios} />
        {local.foto360Url && <Paseo360 url={local.foto360Url} nombre={local.nombre} />}
        {local.videoUrl && <VideoLocal url={local.videoUrl} nombre={local.nombre} />}
        <TarjetaAnfitrion local={local} delGamea={esDelGamea(local)} />

        <div className="mt-8">
          <UbicacionLocal
            lat={local.latitud}
            lng={local.longitud}
            nombre={local.nombre}
            direccion={local.direccion}
            zona={local.zona}
            foto={(() => {
              const portada = local.fotos.find((f) => f.esPortada) ?? local.fotos[0];
              return portada ? urlArchivo(portada.url) : null;
            })()}
          />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-morado-900 mb-3">Eventos que realiza</h2>
          <CategoriasLocal categorias={local.categorias ?? []} />
        </div>

        <div className="mt-8">
          <ResenasLocal
            localId={local.id}
            anfitrionId={local.anfitrion.id}
            onResumen={(calificacion) => setLocal((l) => (l ? { ...l, calificacion } : l))}
          />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-morado-900 mb-3">Próximos eventos publicados</h2>
          {local.eventos.length === 0 && (
            <p className="text-morado-500 text-sm">Este local todavía no publicó eventos.</p>
          )}
          <div className="space-y-3">
            {local.eventos.map((e) => (
              <div key={e.id} className="border border-morado-100 rounded-xl p-4 flex gap-4">
                {e.aficheUrl && (
                  <a href={urlArchivo(e.aficheUrl)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlArchivo(e.aficheUrl)} alt={`Afiche de ${e.titulo}`} className="w-24 h-32 object-cover rounded-lg border border-morado-100" />
                  </a>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-morado-900">{e.titulo}</p>
                  <p className="text-xs text-morado-500 mb-1">
                    {new Date(e.fechaInicio).toLocaleString('es-BO')}
                    {e.fechaFin ? ` – ${new Date(e.fechaFin).toLocaleString('es-BO')}` : ''}
                  </p>
                  <p className="text-sm text-morado-700 whitespace-pre-wrap">{e.descripcion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen fijo a la derecha (en celular, al final) */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-2xl border border-morado-100 bg-white p-4 shadow-card space-y-3 text-sm">
          <div>
            <p className="text-morado-500 text-xs">Dirección</p>
            <p className="text-morado-900 font-medium">{local.direccion}</p>
            <p className="text-morado-600 text-xs">
              Distrito {local.zona.distritoNumero} · {local.zona.nombreZonaPrincipal}
            </p>
          </div>
          <div>
            <p className="text-morado-500 text-xs flex items-center gap-1"><Icono nombre="clock" /> Horario</p>
            <p className="text-morado-900 font-medium">{local.horarioFuncionamiento || 'No especificado'}</p>
          </div>
          {local.aforo ? (
            <div>
              <p className="text-morado-500 text-xs">Capacidad</p>
              <p className="text-morado-900 font-medium"><Icono nombre="users" /> {local.aforo.toLocaleString('es-BO')} personas</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 pt-1">
            <a href="#ubicacion" className="boton-secundario-sm w-full"><Icono nombre="map-pin" /> Ver ubicación</a>
            <a href="#como-llegar" className="boton-primario-sm w-full">
              <Icono nombre="compass" /> Cómo llegar
            </a>
          </div>
          <div className="pt-1 text-center">
            <DenunciarLocal localId={local.id} esDelUsuario={usuario?.id === local.anfitrion.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
