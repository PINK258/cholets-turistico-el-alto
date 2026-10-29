// Mensaje de sistema del chatbot (instrucciones + datos recuperados de la BD).
// Esta en un archivo aparte porque lo usan dos lugares y deben ser identicos:
//  - chatbot.service.ts, al preguntarle al modelo en la pagina;
//  - scripts/generar-dataset.ts, al armar los ejemplos del fine-tuning: el
//    modelo afinado aprende a responder con ESTE mismo formato.
//
// Los datos van en el mensaje de sistema y la pregunta sola en el del usuario:
// en pruebas con qwen2.5:1.5b (3 intentos por caso) este formato acerto 9/9,
// contra 5/9 poniendo contexto + pregunta juntos. Las reglas son explicitas
// porque un modelo de 1.5B tiende a negar datos que no aparecen ("no tiene
// piscina") y a pasar por alto un local relevante si el dato esta en su
// descripcion. La regla 4 con la cantidad exacta evita que, ante "¿que locales
// hay?" con un solo local, invente "Local 2", "Local 3" o un "sitio web oficial".

export type DatosPrompt = {
  // Cantidad de locales en textoLocales (0 = solo secciones).
  cantidad: number;
  textoLocales: string;
  // Informacion general, eventos, ranking, resumen por distrito...
  secciones: string[];
  // Nombre del local de la pagina abierta, si la pregunta es sobre el.
  localAbierto?: string;
  // Ej. "en el Distrito 1, Zona Santa Rosa (La Ceja) que realicen Matrimonios".
  filtro?: string;
  // Fecha y hora actual ya formateada.
  hoy: string;
};

export function construirPromptSistema(d: DatosPrompt): string {
  // Sin esto, "¿Que eventos tiene?" en la pagina de un local se respondia sobre
  // el local del que se hablo en el mensaje anterior.
  const reglaLocalAbierto = d.localAbierto
    ? `5. El usuario esta viendo la pagina del local "${d.localAbierto}". Si la pregunta ` +
      `dice "este local" o no nombra ningun local, responde sobre "${d.localAbierto}".\n`
    : '';
  const reglaFiltro = d.filtro
    ? `5. Los LOCALES de abajo son TODOS los locales registrados ${d.filtro}. ` +
      'Nombralos a todos y no menciones ningun otro local.\n'
    : '';
  return (
    'Eres el asistente turistico de "Cholets Turistico El Alto", una plataforma de locales y ' +
    'cholets de El Alto, Bolivia. Responde en español, breve y amable, usando SOLO la ' +
    'informacion de abajo (LOCALES y las demas secciones). Reglas:\n' +
    '1. Si un local se relaciona con la pregunta (por su categoria, descripcion o eventos), ' +
    'recomiendalo por su nombre e incluye su direccion y zona.\n' +
    '2. Si los LOCALES no mencionan un dato (por ejemplo, si tiene piscina), responde que no tienes ' +
    'esa informacion. No digas que si ni que no. Si preguntan por un servicio que no esta en ' +
    '"Servicios", di que el dueño no lo indico y que puede consultarle.\n' +
    '0. Se breve: maximo 4 oraciones, o una lista con una sola linea por local (nombre, ' +
    'zona y lo que se pregunto). Nunca copies la ficha completa de un local.\n' +
    `3. No inventes nombres, fechas, precios ni direcciones. Copia horarios y direcciones tal ` +
    `como aparecen, sin agregar dias ni datos. Hoy es ${d.hoy}.\n` +
    (d.cantidad > 0
      ? `4. Abajo hay exactamente ${d.cantidad} local(es). Menciona solo esos; nunca `
      : '4. Responde con las secciones de abajo. No menciones locales que no aparezcan en ellas; nunca ') +
    'agregues otros locales, ni sitios web, telefonos o redes sociales.\n' +
    (d.secciones.length > 0
      ? '6. Si hay INFORMACION GENERAL sobre el tema, responde con esas mismas frases (puedes resumirlas o ' +
        'acortarlas, pero no cambies los datos). No agregues fechas, siglos, cifras, rutas, tiempos ni hechos ' +
        'que no esten escritos abajo.\n' +
        '7. Si preguntan por eventos de una fecha y no hay ninguno ese dia, dilo y menciona los EVENTOS PROXIMOS que ' +
        'si aparecen abajo. No recomiendes llamar ni visitar otras paginas.\n'
      : '') +
    '8. Si la pregunta no tiene relacion con El Alto, sus locales, eventos o esta plataforma, ' +
    'responde amablemente que solo puedes ayudar con eso.\n' +
    reglaLocalAbierto +
    reglaFiltro +
    (d.cantidad > 0 ? `\nLOCALES:\n${d.textoLocales}\n` : '') +
    (d.secciones.length > 0 ? `\n${d.secciones.join('\n\n')}` : '')
  );
}
