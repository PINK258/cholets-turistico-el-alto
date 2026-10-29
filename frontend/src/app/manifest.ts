import type { MetadataRoute } from 'next';

// Manifiesto de la PWA: con esto el navegador ofrece "Instalar app" y el
// sistema se abre a pantalla completa, con su icono, como una aplicacion.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cholets Turístico El Alto',
    short_name: 'Cholets El Alto',
    description: 'Descubre cholets, salones y eventos de El Alto, Bolivia.',
    lang: 'es-BO',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#6117ab',
    categories: ['travel', 'lifestyle'],
    icons: [
      { src: '/iconos/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Atajos al mantener presionado el icono (Android).
    shortcuts: [
      { name: 'Cartelera de eventos', short_name: 'Cartelera', url: '/cartelera' },
      { name: 'Mis favoritos', short_name: 'Favoritos', url: '/favoritos' },
    ],
  };
}
