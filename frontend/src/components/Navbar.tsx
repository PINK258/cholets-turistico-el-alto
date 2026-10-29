"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AvatarUsuario from "@/components/AvatarUsuario";
import { useFavoritos } from "@/context/FavoritosContext";
import InstalarApp from '@/components/InstalarApp';
import Icono from '@/components/Icono';
import { useEffect, useState } from "react";

// Enlace de la barra: subrayado amarillo que se dibuja al pasar el cursor y
// queda fijo en la pagina actual.
const claseEnlace = (activo: boolean) =>
  `relative py-1 transition-colors hover:text-morado-600 after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:rounded-full after:bg-dorado-500 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100 ${
    activo ? "text-morado-700 font-semibold after:scale-x-100" : "after:scale-x-0"
  }`;

export default function Navbar() {
  const { usuario, logout, cargando } = useAuth();
  const { ids } = useFavoritos();
  const router = useRouter();

  const [menuMovil, setMenuMovil] = useState(false);
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href));
  // Al bajar la pagina la barra gana una sombra suave.
  const [conSombra, setConSombra] = useState(false);
  useEffect(() => {
    const alMover = () => setConSombra(window.scrollY > 8);
    alMover();
    window.addEventListener("scroll", alMover, { passive: true });
    return () => window.removeEventListener("scroll", alMover);
  }, []);

  const cerrarSesion = () => {
    logout();
    router.push("/");
  };

  // Mismos enlaces que la barra de escritorio, segun el rol.
  const enlaces: [string, string][] = [
    ["/", "Explorar"],
    ["/cartelera", "Cartelera"],
  ];
  if (!cargando && (!usuario || usuario.rol === "TURISTA")) enlaces.push(["/registrar-local", "Registra tu local"]);
  if (usuario?.rol === "TURISTA") enlaces.push(["/favoritos", "Mis favoritos"]);
  if (usuario && (usuario.rol === "ANFITRION" || usuario.rol === "ADMIN")) enlaces.push(["/anfitrion", "Administrador Turístico"]);
  if (usuario && (usuario.rol === "OPERADOR" || usuario.rol === "ADMIN")) enlaces.push(["/operador", "Operador G.A.M.E.A."]);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur transition-all duration-300 ${
        conSombra ? "bg-white/95 shadow-[0_6px_24px_-12px_rgba(58,15,102,0.25)]" : "bg-white border-b border-morado-100"
      }`}
    >
      <div className="contenedor flex items-center justify-between h-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Icono recortado del logo real (public/imagenes/logos/logo-icono.png).
              El logo completo (icono + texto) vive en logo-principal.png y se usa
              en lugares mas grandes (login, registro) donde el texto se lee bien. */}
          <span className="shrink-0 group-hover:scale-105 transition-transform">
            <Image
              src="/imagenes/logos/logo-icono.png"
              alt="Logo Cholets Turístico El Alto"
              width={79}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </span>
          <span className="leading-tight hidden min-[420px]:block">
            <span className="font-titulo block font-extrabold text-lg text-morado-900 tracking-tight">
              Cholets Turístico
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-widest text-dorado-600">
              El Alto · Bolivia
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[0.95rem] font-medium text-morado-900">
          <Link href="/" className={claseEnlace(activo("/"))}>
            Explorar
          </Link>
          <Link href="/cartelera" className={claseEnlace(activo("/cartelera"))}>
            Cartelera
          </Link>
          {/* Solo para visitantes sin cuenta y usuarios turísticos: el Administrador
              Turístico ya registró su local (desde su panel puede agregar otro) y el
              Operador G.A.M.E.A. no registra locales. Mientras carga la sesión no se
              muestra, para que no aparezca y desaparezca. */}
          {!cargando && (!usuario || usuario.rol === "TURISTA") && (
            <Link href="/registrar-local" className="boton-secundario-sm">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
              </svg>
              Registra tu local
            </Link>
          )}
          {usuario &&
            (usuario.rol === "ANFITRION" || usuario.rol === "ADMIN") && (
              <Link href="/anfitrion" className={claseEnlace(activo("/anfitrion"))}>
                Administrador Turístico
              </Link>
            )}
          {usuario &&
            (usuario.rol === "OPERADOR" || usuario.rol === "ADMIN") && (
              <Link href="/operador" className={claseEnlace(activo("/operador"))}>
                Operador G.A.M.E.A.
              </Link>
            )}
        </nav>

        <div className="flex items-center gap-3">
          <InstalarApp />
          {!cargando && !usuario && (
            <>
              <Link href="/login" className="boton-secundario-sm">
                <Icono nombre="log-in" />
                <span className="hidden sm:inline">Iniciar sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
              <Link href="/registro" className="boton-primario-sm">
                Registrarse
              </Link>
            </>
          )}
          {!cargando && usuario && (
            <div className="flex items-center gap-3">
              {usuario.rol === "TURISTA" && (
                <Link
                  href="/favoritos"
                  title="Mis favoritos"
                  aria-label={`Mis favoritos (${ids.size})`}
                  className="relative inline-flex items-center gap-1.5 text-sm font-medium text-morado-900 hover:text-rose-600 transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={ids.size ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={ids.size ? "text-rose-600" : ""}
                    aria-hidden
                  >
                    <path d="M12 21s-7.5-4.6-9.5-9.3C1.1 8.3 3.3 4.5 7 4.5c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 3.7 0 5.9 3.8 4.5 7.2C19.5 16.4 12 21 12 21z" />
                  </svg>
                  <span className="hidden lg:inline">Favoritos</span>
                  {ids.size > 0 && (
                    <span className="absolute -top-1.5 left-3 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 text-center">
                      {ids.size}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href="/perfil"
                title="Mi perfil"
                className="inline-flex items-center gap-2 text-sm text-morado-900 rounded-full pr-1 hover:text-morado-600 transition-colors"
              >
                <AvatarUsuario
                  url={usuario.avatarUrl}
                  nombre={usuario.nombre}
                  apellido={usuario.apellidoPaterno}
                  tamano="w-8 h-8 text-[11px]"
                />
                <span className="hidden sm:inline">Hola, {usuario.nombre}</span>
              </Link>
              <button onClick={cerrarSesion} className="boton-secundario-sm">
                {/* No hay icono log-out: es el de log-in en espejo (flecha hacia afuera). */}
                <Icono nombre="log-in" className="h-[1.1em] w-[1.1em] -scale-x-100" />
                Salir
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuMovil((v) => !v)}
            className="md:hidden w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-morado-900 hover:bg-morado-50"
            aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuMovil}
          >
            <Icono nombre={menuMovil ? 'x' : 'menu'} className="h-6 w-6" />
          </button>
        </div>
      </div>
      {/* En celulares los enlaces de arriba no caben: se muestran en este menu. */}
      {menuMovil && (
        <nav className="md:hidden border-t border-morado-100 bg-white" onClick={() => setMenuMovil(false)}>
          <div className="contenedor flex flex-col py-2 text-sm font-medium text-morado-900">
            {enlaces.map(([ruta, texto]) => (
              <Link key={ruta} href={ruta} className="py-2.5 border-b border-morado-50 last:border-0 hover:text-morado-600">
                {texto}
              </Link>
            ))}
          </div>
        </nav>
      )}
      <div className="franja-andina" />
    </header>
  );
}
