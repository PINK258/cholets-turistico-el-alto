// "npm run dev:https" (para probar desde el celular) usa su propia carpeta de
// compilacion, para no mezclar cache con "npm run dev". Next solo permite UN
// servidor de desarrollo a la vez: hay que detener uno para iniciar el otro.
const modoHttps = process.argv.includes('--experimental-https');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: modoHttps ? '.next-https' : '.next',
  // Puente al backend: en modo https el navegador pide /servidor/... a esta
  // misma pagina y Next lo reenvia al backend (http://localhost:3001). Asi no se
  // mezcla https con http, que el navegador bloquearia. Ver src/lib/api.ts.
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [{ source: '/servidor/:ruta*', destination: `${backend}/:ruta*` }];
  },
  experimental: {
    // El puente corta los envios de mas de 10 MB por defecto; un local puede
    // subir hasta 10 fotos de 8 MB a la vez (ver backend common/multer.config.ts).
    proxyClientMaxBodySize: '100mb',
  },
  // En desarrollo Next solo sirve su JavaScript a "localhost". Sin esto, abrir
  // la web como 127.0.0.1:3000 o con la IP de red (la URL "Network" que muestra
  // la terminal) deja la pagina congelada en "Cargando locales…".
  allowedDevOrigins: ['127.0.0.1', '192.168.*.*', '10.*.*.*'],
  // El service worker de la PWA (public/sw.js) nunca se guarda en cache: asi
  // cada cambio llega enseguida a quien tiene la app instalada.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
