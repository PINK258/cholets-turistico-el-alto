// Consultas sobre la ficha de los locales: servicios ("¿que locales tienen
// estacionamiento?"), capacidad ("para 300 personas"), contacto y reglas.
// Los patrones se evaluan sobre el texto normalizado (minusculas, sin tildes)
// y son frases concretas: con palabras sueltas, "fiesta para niños" filtraba
// tambien por "Área para niños".

export const SERVICIOS_CHAT: { id: string; nombre: string; patron: RegExp }[] = [
  { id: 'ESTACIONAMIENTO', nombre: 'estacionamiento', patron: /\b(estacionamiento|parqueos?|garaje|parking)\b/ },
  { id: 'SONIDO', nombre: 'equipo de sonido', patron: /\b(sonido|amplificacion|parlantes)\b/ },
  { id: 'ILUMINACION', nombre: 'iluminación', patron: /\b(iluminacion|luces)\b/ },
  { id: 'ESCENARIO', nombre: 'escenario', patron: /\b(escenario|tarima)\b/ },
  { id: 'PISTA_BAILE', nombre: 'pista de baile', patron: /\bpista( de baile)?\b/ },
  { id: 'COCINA', nombre: 'cocina', patron: /\bcocina\b/ },
  { id: 'CATERING', nombre: 'servicio de comida (catering)', patron: /\b(catering|buffet|banquete|servicio de comida)\b/ },
  { id: 'MOBILIARIO', nombre: 'mesas y sillas', patron: /\b(mesas|mobiliario)\b/ },
  { id: 'WIFI', nombre: 'wifi', patron: /\b(wifi|wi fi|internet)\b/ },
  { id: 'BANOS', nombre: 'baños', patron: /\b(banos?|sanitarios?)\b/ },
  { id: 'ACCESIBILIDAD', nombre: 'acceso para silla de ruedas', patron: /\b(silla de ruedas|accesib\w*|discapacidad|rampa)\b/ },
  { id: 'SEGURIDAD', nombre: 'seguridad', patron: /\b(seguridad|vigilancia|guardias?)\b/ },
  { id: 'CALEFACCION', nombre: 'calefacción', patron: /\b(calefaccion|calefactor\w*)\b/ },
  { id: 'AREA_INFANTIL', nombre: 'área para niños', patron: /\b(area (para ninos|infantil)|juegos para ninos|parque infantil)\b/ },
];

export const nombreServicio = (id: string) => SERVICIOS_CHAT.find((s) => s.id === id)?.nombre ?? id.toLowerCase();

export function serviciosMencionados(preguntaNormal: string) {
  // "¿es seguro visitar El Alto?" no pide locales con "Seguridad".
  return SERVICIOS_CHAT.filter((s) => s.patron.test(preguntaNormal));
}

// "para 300 personas", "unos 150 invitados", "aforo de 500" -> 300 / 150 / 500.
export function aforoPedido(preguntaNormal: string): number | undefined {
  const m =
    /\b(\d{2,5})\s*(personas|invitados|asistentes|gente|pax)\b/.exec(preguntaNormal) ??
    /\b(?:aforo|capacidad)\s*(?:de|para)?\s*(\d{2,5})\b/.exec(preguntaNormal);
  const n = m ? Number(m[1]) : NaN;
  return n >= 10 && n <= 20000 ? n : undefined;
}

// Preguntas sobre la ficha de UN local (el de la pagina abierta o uno nombrado).
export const PIDE_SERVICIOS = /\b(servicios?|que ofrece|que incluye|que tiene el local|comodidades)\b/;
export const PIDE_AFORO = /\b(capacidad|aforo|cuantas personas|cuantos invitados|cuanta gente|entran|caben)\b/;
export const PIDE_CONTACTO = /\b(whatsapp|contact\w*|telefono|celular|numero|llamar|reserv\w*|precios?|cuanto cuesta|cuanto cobra\w*|cobran|alquil\w*|cotiza\w*)\b/;
export const PIDE_REGLAS = /\b(reglas|normas|prohibid\w*|permitid\w*|lo que debo saber|condiciones|garantia)\b/;
export const PIDE_MULTIMEDIA = /\b(video|360|panoramica|recorrido virtual|paseo virtual|fotos?)\b/;
// "¿Que historia tiene este local?" (no "la historia de El Alto").
export const PIDE_HISTORIA_LOCAL = /\b(historia|origen|como (nacio|surgio|empezo))\b/;
export const HABLA_DE_LA_CIUDAD = /\b(el alto|la ciudad|bolivia|los cholets)\b/;
