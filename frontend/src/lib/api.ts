// Valor fijo (igual en servidor y navegador) para enlaces que se renderizan en el
// HTML inicial; si cambiara, React reportaria un error de hidratacion.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const PUERTO_API = new URL(API_URL).port || '3001';

// Para pedidos hechos desde el navegador: si la web se abrio con la IP de la red
// (http://192.168.x.x:3000) y el .env apunta a localhost, se usa esa misma IP.
// Chrome bloquea que una pagina de la red llame a "localhost", y en un celular
// "localhost" seria el propio celular.
function apiUrl() {
  if (typeof window === 'undefined') return API_URL;
  // Modo https (npm run dev:https, para el celular): todo pasa por el puente
  // /servidor de Next (ver next.config.js), sin mezclar https con http.
  if (window.location.protocol === 'https:') return `${window.location.origin}/servidor`;
  const apuntaALocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API_URL);
  const host = window.location.hostname;
  if (apuntaALocalhost && host !== 'localhost' && host !== '127.0.0.1') {
    return `${window.location.protocol}//${host}:${PUERTO_API}`;
  }
  return API_URL;
}

function urlArchivo(rutaRelativa: string) {
  if (!rutaRelativa) return rutaRelativa;
  return rutaRelativa.startsWith('http') ? rutaRelativa : `${apiUrl()}${rutaRelativa}`;
}

interface OpcionesApi extends RequestInit {
  token?: string | null;
}

async function api<T>(ruta: string, opciones: OpcionesApi = {}): Promise<T> {
  const { token, headers, ...resto } = opciones;
  const esFormData = resto.body instanceof FormData;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${apiUrl()}${ruta}`, {
      ...resto,
      headers: {
        ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté corriendo y vuelve a cargar la página.',
    );
  }

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      mensaje = cuerpo.message || mensaje;
    } catch {
      // sin cuerpo JSON
    }
    // "Cannot POST /ruta" = esa ruta no existe en el backend que esta corriendo:
    // casi siempre es un backend viejo que no se reinicio despues de compilar.
    if (respuesta.status === 404 && typeof mensaje === 'string' && /^Cannot (GET|POST|PATCH|PUT|DELETE) /.test(mensaje)) {
      mensaje = 'El servidor está desactualizado y no tiene esta función. Reinicia el backend ("Backend: iniciar") e inténtalo de nuevo.';
    }
    throw new Error(Array.isArray(mensaje) ? mensaje.join(', ') : mensaje);
  }

  if (respuesta.status === 204) return undefined as T;
  return respuesta.json();
}

export { api, API_URL, urlArchivo };
