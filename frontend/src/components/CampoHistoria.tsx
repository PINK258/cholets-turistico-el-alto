'use client';
import Icono from '@/components/Icono';

const MAXIMO = 3000;

// "Historia del cholet" (opcional): el dueño cuenta como se construyo su local,
// por que y cual es su tematica. Se usa al registrar el local y en el panel.
export default function CampoHistoria({ valor, onCambiar }: { valor: string; onCambiar: (texto: string) => void }) {
  return (
    <div className="rounded-xl border border-dorado-400/50 bg-dorado-400/10 p-3">
      <label htmlFor="historia-cholet" className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-morado-900"><Icono nombre="scroll-text" /> Historia del cholet</span>
        <span className="text-[11px] font-medium text-morado-500 bg-white/70 rounded-full px-2 py-0.5">Opcional</span>
      </label>
      <p className="text-xs text-morado-600 mt-1 mb-2">
        Cuéntales a los visitantes la historia de tu local. Puedes hablar de:
      </p>
      <ul className="text-xs text-morado-700 mb-2 space-y-0.5">
        <li><Icono nombre="building-complex" /> <b>Cómo se construyó:</b> cuándo empezó, quién lo diseñó, cuánto tardó.</li>
        <li><Icono nombre="messages-circle" /> <b>Por qué:</b> el sueño o la razón de levantarlo.</li>
        <li><Icono nombre="image" /> <b>Su temática:</b> los colores, las figuras andinas, lo que representa.</li>
      </ul>
      <textarea
        id="historia-cholet"
        className="input-campo"
        rows={5}
        maxLength={MAXIMO}
        placeholder="Ej.: Mi padre empezó a construir el cholet en 2012 con el arquitecto Freddy Mamani. Quería un salón donde las fraternidades celebren sus fiestas…"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
      />
      <p className="text-[11px] text-morado-500 text-right mt-1">
        {valor.length} / {MAXIMO}
      </p>
    </div>
  );
}
