// Piezas comunes de los mapas (todos con Leaflet, gratis y sin clave de API).
import L from 'leaflet';

// Capas base sin clave de API, con un selector arriba a la derecha:
// "Mapa" (calles de Esri, mas limpio), "Satélite" (imagenes de Esri) y
// "OpenStreetMap". (Los mapas de CARTO ahora piden clave: no usarlos.)
export function agregarCapasBase(mapa: L.Map) {
  const calles = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Mapa &copy; Esri, HERE, Garmin, &copy; OpenStreetMap', maxZoom: 19 },
  );
  const satelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Imágenes &copy; Esri', maxZoom: 19 },
  );
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });
  calles.addTo(mapa);
  L.control
    .layers({ Mapa: calles, Satélite: satelite, OpenStreetMap: osm }, undefined, { position: 'topright' })
    .addTo(mapa);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapa);
}

// Pin morado con el color de la marca (SVG, sin imagenes externas).
export function iconoPin(color = '#6117ab') {
  return L.divIcon({
    className: '',
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    popupAnchor: [0, -36],
    tooltipAnchor: [0, -38],
    html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 41 16 41s15-14.1 15-25.2C31 7.6 24.3 1 16 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>`,
  });
}

// Pin con la foto del cholet: circulo con la foto, borde blanco, aro morado y
// punta hacia el lugar exacto (estilos en globals.css, ".pin-foto").
// Si la foto no carga, queda el circulo morado con el icono 🏠.
export function iconoFoto(url: string) {
  // La URL va dentro de un atributo de estilo: se codifican comillas, parentesis y espacios.
  const segura = url.replace(/["'()\\\s<>]/g, (c) => encodeURIComponent(c));
  return L.divIcon({
    className: '',
    iconSize: [64, 76],
    iconAnchor: [32, 75],
    popupAnchor: [0, -70],
    tooltipAnchor: [0, -72],
    html: `<div class="pin-foto"><span class="pin-foto__img" style="background-image:url('${segura}')"></span></div>`,
  });
}

// Punto azul de "tu ubicación".
export const iconoMiUbicacion = L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 1px 4px rgba(0,0,0,.4)"></span>',
});
