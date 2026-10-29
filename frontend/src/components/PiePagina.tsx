import Image from 'next/image';
import Link from 'next/link';
import Icono from '@/components/Icono';

// Pie de pagina en morado oscuro con la franja andina arriba.
export default function PiePagina() {
  const anio = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-morado-900 text-morado-100">
      <div className="franja-andina" />
      <div className="contenedor py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 max-w-sm">
          <div className="flex items-center gap-3">
            <span className="bg-white rounded-xl p-1.5">
              <Image src="/imagenes/logos/logo-icono.png" alt="" width={79} height={40} className="h-8 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="font-titulo block font-extrabold text-lg text-white">Cholets Turístico</span>
              <span className="block text-[11px] font-semibold uppercase tracking-widest text-dorado-400">El Alto · Bolivia</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-morado-200 leading-relaxed">
            La guía de locales, cholets y eventos de El Alto, con locales verificados por el Gobierno Autónomo
            Municipal de El Alto (G.A.M.E.A.).
          </p>
        </div>

        <nav aria-label="Explorar">
          <p className="font-titulo font-bold text-white mb-3">Explorar</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white transition-colors">Locales y cholets</Link></li>
            <li><Link href="/cartelera" className="hover:text-white transition-colors">Cartelera de eventos</Link></li>
            <li><Link href="/favoritos" className="hover:text-white transition-colors">Mis favoritos</Link></li>
          </ul>
        </nav>

        <nav aria-label="Para dueños">
          <p className="font-titulo font-bold text-white mb-3">Para dueños</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/registrar-local" className="hover:text-white transition-colors">Registra tu local</Link></li>
            <li><Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="contenedor py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-morado-300">
          <p>© {anio} Cholets Turístico El Alto</p>
          <p className="inline-flex items-center gap-1.5">
            <Icono nombre="map-pin" /> El Alto, La Paz · Bolivia
          </p>
        </div>
      </div>
    </footer>
  );
}
