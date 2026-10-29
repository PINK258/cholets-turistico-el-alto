// Ubicacion del usuario (GPS) y busqueda de direcciones. Sin Leaflet: se puede
// importar desde paginas que Next pre-renderiza en el servidor.

export type Ubicacion = { lat: number; lng: number; precision: number };

// GPS del celular o la PC con mensajes claros. El GPS "afina" en unos
// segundos: la primera lectura suele ser la peor. Por eso se escuchan las
// lecturas hasta `tiempoMax` y se devuelve la MAS PRECISA (o la primera que
// llegue a `precisionObjetivo` metros). Si no hay GPS (computadoras), el
// navegador da la ubicacion aproximada por WiFi.
export function obtenerUbicacion(
  opciones: {
    onProgreso?: (u: Ubicacion) => void;
    precisionObjetivo?: number;
    tiempoMax?: number;
    // Combinar varias lecturas buenas (mas preciso). false = la primera que sirva.
    promediar?: boolean;
  } = {},
): Promise<Ubicacion> {
  const { onProgreso, precisionObjetivo = 20, tiempoMax = 15000, promediar = true } = opciones;
  return new Promise((resolver, rechazar) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return rechazar(new Error('Este navegador no permite usar la ubicación.'));
    }
    if (!window.isSecureContext) {
      return rechazar(
        new Error(
          'El navegador solo da la ubicación en páginas seguras: abre el sistema con http://localhost:3000 en esta ' +
            'computadora (o con https). Mientras tanto, busca la dirección o marca el lugar en el mapa.',
        ),
      );
    }
    const mensaje = (e: GeolocationPositionError) =>
      e.code === e.PERMISSION_DENIED
        ? 'No diste permiso para usar tu ubicación. Actívalo en el candado de la barra de direcciones y vuelve a intentar.'
        : e.code === e.POSITION_UNAVAILABLE
          ? 'No se pudo saber dónde estás. En Windows, activa Configuración > Privacidad > Ubicación; en el celular, enciende el GPS.'
          : 'La ubicación tardó demasiado. Vuelve a intentar o marca el lugar en el mapa.';

    const lecturas: Ubicacion[] = [];
    let mejor: Ubicacion | null = null;
    let ultimoError: GeolocationPositionError | null = null;
    let terminado = false;
    let cierre: ReturnType<typeof setTimeout> | null = null;
    const terminar = () => {
      if (terminado) return;
      terminado = true;
      navigator.geolocation.clearWatch(vigilancia);
      clearTimeout(limite);
      if (cierre) clearTimeout(cierre);
      if (mejor) resolver(promediar ? combinarLecturas(lecturas) : mejor);
      else rechazar(new Error(ultimoError ? mensaje(ultimoError) : 'La ubicación tardó demasiado. Vuelve a intentar o marca el lugar en el mapa.'));
    };
    const vigilancia = navigator.geolocation.watchPosition(
      (p) => {
        const u = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy };
        lecturas.push(u);
        if (!mejor || u.precision < mejor.precision) {
          mejor = u;
          onProgreso?.(u);
        }
        if (u.precision > precisionObjetivo) return;
        if (!promediar) return terminar();
        // Ya hay una lectura buena: se escuchan 3 s mas (o hasta 5 buenas) para
        // combinarlas y reducir el error.
        const buenas = lecturas.filter((l) => l.precision <= precisionObjetivo).length;
        if (buenas >= 5) terminar();
        else if (!cierre) cierre = setTimeout(terminar, 3000);
      },
      (e) => {
        ultimoError = e;
        // Sin permiso no tiene sentido seguir esperando.
        if (e.code === e.PERMISSION_DENIED) terminar();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: tiempoMax },
    );
    const limite = setTimeout(terminar, tiempoMax);
  });
}

// Combina las lecturas parecidas a la mejor (hasta 1.5 veces su error) con un
// promedio ponderado: cada una pesa 1/precision², asi la mas precisa manda.
// La precision informada es la de la mejor lectura (no se exagera la mejora:
// las lecturas seguidas del GPS no son del todo independientes).
export function combinarLecturas(lecturas: Ubicacion[]): Ubicacion {
  const mejor = lecturas.reduce((a, b) => (b.precision < a.precision ? b : a));
  const utiles = lecturas.filter((l) => l.precision <= mejor.precision * 1.5);
  let suma = 0;
  let lat = 0;
  let lng = 0;
  for (const l of utiles) {
    const peso = 1 / Math.max(l.precision, 1) ** 2;
    suma += peso;
    lat += l.lat * peso;
    lng += l.lng * peso;
  }
  return { lat: lat / suma, lng: lng / suma, precision: mejor.precision };
}

const METROS_POR_GRADO = 111_320;

// Filtro de Kalman sencillo para seguir a una persona en movimiento (el mismo
// metodo que usan las apps de navegacion): suaviza los saltos del GPS y da mas
// peso a las lecturas precisas. Ademas descarta lecturas malas:
//  - muy imprecisas (mas de `precisionMaxima` m) cuando ya se tiene una buena;
//  - saltos imposibles (mas rapidos que `velocidadMaxima` m/s).
export class FiltroGps {
  private lat = 0;
  private lng = 0;
  private varianza = -1; // m²; negativo = sin datos todavia
  private tiempo = 0;

  constructor(
    // Cuanto puede cambiar la posicion por segundo (m/s). Ajustado con una
    // simulacion: a pie 5 (el error baja de ~12 a ~6 m), en vehiculo 15.
    private velocidad = 5,
    private precisionMaxima = 60,
    private velocidadMaxima = 50,
  ) {}

  // Devuelve la posicion filtrada, o null si la lectura se descarto.
  procesar(lectura: Ubicacion, tiempo = Date.now()): Ubicacion | null {
    const precision = Math.max(lectura.precision, 1);
    if (this.varianza < 0) {
      this.lat = lectura.lat;
      this.lng = lectura.lng;
      this.varianza = precision ** 2;
      this.tiempo = tiempo;
      return { lat: this.lat, lng: this.lng, precision };
    }
    const segundos = Math.max((tiempo - this.tiempo) / 1000, 0.001);
    const salto = metrosEntrePuntos(this.lat, this.lng, lectura.lat, lectura.lng);
    const actual = Math.sqrt(this.varianza);
    if (precision > this.precisionMaxima && actual <= this.precisionMaxima) return null;
    if (salto > precision + actual && salto / segundos > this.velocidadMaxima) return null;

    // Prediccion: con el tiempo la incertidumbre crece segun la velocidad.
    this.varianza += segundos * this.velocidad ** 2;
    this.tiempo = tiempo;
    // Correccion: mezcla la posicion anterior y la nueva segun su confianza.
    const k = this.varianza / (this.varianza + precision ** 2);
    this.lat += k * (lectura.lat - this.lat);
    this.lng += k * (lectura.lng - this.lng);
    this.varianza = (1 - k) * this.varianza;
    return { lat: this.lat, lng: this.lng, precision: Math.sqrt(this.varianza) };
  }

  reiniciar() {
    this.varianza = -1;
  }
}

function metrosEntrePuntos(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dy = (lat2 - lat1) * METROS_POR_GRADO;
  const dx = (lng2 - lng1) * METROS_POR_GRADO * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

// Que tan confiable es la ubicacion para marcar un local de El Alto.
export type CalidadUbicacion = 'precisa' | 'aproximada' | 'mala';
export function calidadUbicacion(precision: number): CalidadUbicacion {
  return precision <= 30 ? 'precisa' : precision <= 150 ? 'aproximada' : 'mala';
}

export function mensajeUbicacion(precision: number, dentroDeElAlto: boolean) {
  const metros = Math.round(precision);
  if (!dentroDeElAlto) {
    return (
      `⚠️ Tu ubicación aparece FUERA de El Alto (precisión ±${metros} m). Pasa mucho en computadoras: no tienen GPS y ` +
      'calculan el lugar por WiFi. No movimos el pin: busca la dirección o arrastra el pin hasta tu local, ' +
      'o usa esta opción desde el celular estando en el local.'
    );
  }
  const calidad = calidadUbicacion(precision);
  if (calidad === 'precisa') return `✔ Ubicación precisa (±${metros} m). Revisa que el pin esté en la puerta de tu local.`;
  if (calidad === 'aproximada') {
    return `Ubicación aproximada (±${metros} m, el círculo del mapa). Arrastra el pin hasta la puerta exacta de tu local.`;
  }
  return (
    `⚠️ Ubicación poco precisa (±${metros} m). Este equipo no tiene buen GPS (en computadoras se calcula por WiFi). ` +
    'Arrastra el pin hasta tu local o busca la dirección; desde el celular, en el local, sale mucho mejor.'
  );
}

export type ResultadoBusqueda = { nombre: string; lat: number; lng: number };

// Buscar una direccion o lugar dentro de El Alto (Nominatim, OpenStreetMap).
export async function buscarLugar(texto: string): Promise<ResultadoBusqueda[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=bo&accept-language=es' +
    '&viewbox=-68.33,-16.26,-68.10,-16.68&bounded=1&q=' +
    encodeURIComponent(`${texto}, El Alto`);
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo buscar la dirección. Intenta de nuevo.');
  const datos: { display_name: string; lat: string; lon: string }[] = await res.json();
  return datos.map((d) => ({
    nombre: d.display_name.replace(/, (Provincia Pedro Domingo Murillo|La Paz|Bolivia)/g, ''),
    lat: Number(d.lat),
    lng: Number(d.lon),
  }));
}
