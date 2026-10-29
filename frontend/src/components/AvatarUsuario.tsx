import { urlArchivo } from '@/lib/api';

// Foto de perfil del usuario o, si no tiene, sus iniciales en un circulo.
export default function AvatarUsuario({
  url,
  nombre,
  apellido,
  tamano = 'w-9 h-9 text-xs',
}: {
  url?: string | null;
  nombre: string;
  apellido?: string | null;
  tamano?: string;
}) {
  const iniciales = `${nombre?.[0] ?? ''}${apellido?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      className={`${tamano} shrink-0 rounded-full overflow-hidden bg-morado-100 border border-morado-200 text-morado-700 font-bold inline-flex items-center justify-center`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlArchivo(url)} alt={`Foto de ${nombre}`} className="w-full h-full object-cover" />
      ) : (
        iniciales
      )}
    </span>
  );
}
