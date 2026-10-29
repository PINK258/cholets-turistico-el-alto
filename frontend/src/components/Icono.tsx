import { Fragment } from 'react';

// Iconos de linea de Lucide (public/iconos/*.png). Se pintan con una mascara CSS,
// asi toman el color del texto (currentColor) y el tamaño de la letra, como un emoji.
export type NombreIcono =
  | 'accessibility'
  | 'armchair'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-left'
  | 'arrow-up-right'
  | 'arrow-up'
  | 'baby'
  | 'bath'
  | 'bell'
  | 'building-complex'
  | 'calendar'
  | 'camera'
  | 'car'
  | 'chart-column'
  | 'check'
  | 'circle-check'
  | 'circle-letter-p'
  | 'circle-question-mark'
  | 'circle-x'
  | 'clipboard-list'
  | 'clock'
  | 'compass'
  | 'cooking-pot'
  | 'corner-up-left'
  | 'corner-up-right'
  | 'database'
  | 'drama'
  | 'eighth-notes'
  | 'external-link'
  | 'file-text'
  | 'flag'
  | 'flame'
  | 'footprints'
  | 'hand-coins'
  | 'hand'
  | 'handshake'
  | 'heart'
  | 'hourglass'
  | 'house'
  | 'image'
  | 'landmark'
  | 'lightbulb'
  | 'list'
  | 'locate-fixed'
  | 'lock'
  | 'log-in'
  | 'luggage'
  | 'mail'
  | 'map-pin'
  | 'map'
  | 'maximize'
  | 'megaphone'
  | 'menu'
  | 'messages-circle'
  | 'mic-vocal'
  | 'mouse-pointer-click'
  | 'party-popper'
  | 'pause'
  | 'pencil'
  | 'phone'
  | 'play'
  | 'plus'
  | 'receipt-text'
  | 'refresh-cw'
  | 'rotate-3d'
  | 'rotate-cw'
  | 'scroll-text'
  | 'search'
  | 'send'
  | 'share-2'
  | 'shield-check'
  | 'shield'
  | 'smartphone'
  | 'sparkles'
  | 'speaker'
  | 'star'
  | 'tag'
  | 'timer'
  | 'trash'
  | 'triangle-alert'
  | 'user-round'
  | 'users'
  | 'utensils'
  | 'video'
  | 'volume-2'
  | 'wifi-off'
  | 'wifi'
  | 'x';

export default function Icono({ nombre, className = 'h-[1.1em] w-[1.1em]' }: { nombre: NombreIcono; className?: string }) {
  const url = `url(/iconos/${nombre}.png)`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current align-[-0.2em] ${className}`}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

// Emoji de los textos -> icono. Los textos y listas (servicios, menu del chatbot,
// estados...) siguen escritos con emoji; al mostrarlos se cambian por el icono.
const EMOJI: Record<string, NombreIcono> = {
  '✔': 'check',
  '✓': 'check',
  '✅': 'circle-check',
  '🟢': 'circle-check',
  '✕': 'x',
  '✖': 'circle-x',
  '🎉': 'party-popper',
  '🎊': 'sparkles',
  '✨': 'sparkles',
  '🏠': 'house',
  '🏢': 'building-complex',
  '🏗': 'building-complex',
  '🏛': 'landmark',
  '✏': 'pencil',
  '📝': 'pencil',
  '📄': 'file-text',
  '📍': 'map-pin',
  '🔎': 'search',
  '🔍': 'search',
  '🔒': 'lock',
  '🧭': 'compass',
  '⚠': 'triangle-alert',
  '➕': 'plus',
  '↗': 'external-link',
  '🔄': 'rotate-3d',
  '🔃': 'refresh-cw',
  '📡': 'locate-fixed',
  '👋': 'hand',
  '⏳': 'hourglass',
  '🕕': 'clock',
  '🕗': 'clock',
  '🕛': 'clock',
  '🧾': 'receipt-text',
  '📋': 'clipboard-list',
  '👥': 'users',
  '👤': 'user-round',
  '📢': 'megaphone',
  '📤': 'share-2',
  '📩': 'send',
  '🗑': 'trash',
  '📜': 'scroll-text',
  '🚩': 'flag',
  '🧳': 'luggage',
  '💬': 'messages-circle',
  '💭': 'messages-circle',
  '🎬': 'video',
  '🎥': 'video',
  '🔊': 'speaker',
  '🏷': 'tag',
  '🎭': 'drama',
  '⏱': 'timer',
  '🤍': 'heart',
  '❤': 'heart',
  '🗺': 'map',
  '📊': 'chart-column',
  '🎨': 'image',
  '🖼': 'image',
  '🌅': 'image',
  '❓': 'circle-question-mark',
  '⭐': 'star',
  '➜': 'arrow-right',
  '⏸': 'pause',
  '▶': 'play',
  '⛶': 'maximize',
  '🚶': 'footprints',
  '🚗': 'car',
  '🖱': 'mouse-pointer-click',
  '🗄': 'database',
  '📷': 'camera',
  '⬆': 'arrow-up',
  '💡': 'lightbulb',
  '🎤': 'mic-vocal',
  '💃': 'eighth-notes',
  '🎶': 'eighth-notes',
  '🍳': 'cooking-pot',
  '🍽': 'utensils',
  '🪑': 'armchair',
  '📶': 'wifi',
  '🚻': 'bath',
  '♿': 'accessibility',
  '🛡': 'shield',
  '🔥': 'flame',
  '🧸': 'baby',
  '🤝': 'handshake',
  '💰': 'hand-coins',
  '🅿': 'circle-letter-p',
  '📲': 'smartphone',
  '✉': 'mail',
  '📅': 'calendar',
  '🗓': 'calendar',
  '🔔': 'bell',
};

const PATRON = new RegExp(`(${Object.keys(EMOJI).join('|')})️?`, 'gu');

export function iconoDeEmoji(emoji: string): NombreIcono | undefined {
  return EMOJI[emoji.replace(/️/g, '')];
}

// Muestra un texto cambiando sus emoji conocidos por iconos ("🗑 Eliminar").
export function ConIconos({ texto, className }: { texto: string | false | null | undefined; className?: string }) {
  if (!texto) return null;
  const partes = texto.split(PATRON);
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? <Icono key={i} nombre={EMOJI[p]} className={className} /> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
