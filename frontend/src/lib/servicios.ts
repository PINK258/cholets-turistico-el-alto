// "Lo que este lugar ofrece": la misma lista que el backend (src/locales/servicios.ts).
export const SERVICIOS: { id: string; nombre: string; icono: string }[] = [
  { id: 'ESTACIONAMIENTO', nombre: 'Estacionamiento', icono: '🅿️' },
  { id: 'SONIDO', nombre: 'Equipo de sonido', icono: '🔊' },
  { id: 'ILUMINACION', nombre: 'Iluminación y luces', icono: '💡' },
  { id: 'ESCENARIO', nombre: 'Escenario / tarima', icono: '🎤' },
  { id: 'PISTA_BAILE', nombre: 'Pista de baile', icono: '💃' },
  { id: 'COCINA', nombre: 'Cocina', icono: '🍳' },
  { id: 'CATERING', nombre: 'Servicio de comida (catering)', icono: '🍽️' },
  { id: 'MOBILIARIO', nombre: 'Mesas y sillas', icono: '🪑' },
  { id: 'WIFI', nombre: 'Wifi', icono: '📶' },
  { id: 'BANOS', nombre: 'Baños', icono: '🚻' },
  { id: 'ACCESIBILIDAD', nombre: 'Acceso para silla de ruedas', icono: '♿' },
  { id: 'SEGURIDAD', nombre: 'Seguridad / vigilancia', icono: '🛡️' },
  { id: 'CALEFACCION', nombre: 'Calefacción', icono: '🔥' },
  { id: 'AREA_INFANTIL', nombre: 'Área para niños', icono: '🧸' },
];

export const servicio = (id: string) => SERVICIOS.find((s) => s.id === id);

// Criterios de calificacion de las reseñas (backend: CRITERIOS en resenas.service).
export const CRITERIOS: { id: 'atencion' | 'limpieza' | 'ubicacion' | 'precio' | 'ambiente'; nombre: string; icono: string }[] = [
  { id: 'atencion', nombre: 'Atención', icono: '🤝' },
  { id: 'limpieza', nombre: 'Limpieza', icono: '✨' },
  { id: 'ubicacion', nombre: 'Ubicación', icono: '📍' },
  { id: 'precio', nombre: 'Precio', icono: '💰' },
  { id: 'ambiente', nombre: 'Ambiente', icono: '🎶' },
];

// Video de YouTube o TikTok -> direccion para incrustarlo (null si no se reconoce).
export function videoIncrustado(url: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const tt = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i.exec(url);
  if (tt) return `https://www.tiktok.com/embed/v2/${tt[1]}`;
  return null;
}
