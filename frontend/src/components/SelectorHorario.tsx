'use client';

import { componerHorario, DIAS_SEMANA, ordenarDias } from '@/lib/horario';
import Icono from '@/components/Icono';

const ATAJOS: { etiqueta: string; dias: string[] }[] = [
  { etiqueta: 'Todos los días', dias: DIAS_SEMANA },
  { etiqueta: 'Lunes a viernes', dias: DIAS_SEMANA.slice(0, 5) },
  { etiqueta: 'Viernes a domingo', dias: DIAS_SEMANA.slice(4) },
  { etiqueta: 'Fines de semana', dias: DIAS_SEMANA.slice(5) },
];

const mismosDias = (a: string[], b: string[]) => a.length === b.length && a.every((d) => b.includes(d));

// Dias que abre el local + reloj (input type="time") para apertura y cierre.
export default function SelectorHorario({
  dias,
  onDias,
  apertura,
  onApertura,
  cierre,
  onCierre,
}: {
  dias: string[];
  onDias: (dias: string[]) => void;
  apertura: string;
  onApertura: (hora: string) => void;
  cierre: string;
  onCierre: (hora: string) => void;
}) {
  const alternar = (dia: string) =>
    onDias(ordenarDias(dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia]));

  const pasaMedianoche = apertura && cierre && cierre <= apertura;
  const vistaPrevia = componerHorario(dias, apertura, cierre);

  return (
    <div className="space-y-2.5">
      <div>
        <p className="etiqueta-campo">Días que funciona</p>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {ATAJOS.map((a) => (
            <button
              key={a.etiqueta}
              type="button"
              onClick={() => onDias(a.dias)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                mismosDias(dias, a.dias)
                  ? 'bg-dorado-400/25 border-dorado-500 text-morado-900'
                  : 'bg-white border-morado-200 text-morado-600 hover:border-morado-400'
              }`}
            >
              {a.etiqueta}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="group" aria-label="Días que funciona">
          {DIAS_SEMANA.map((dia) => {
            const marcado = dias.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                aria-pressed={marcado}
                title={dia}
                onClick={() => alternar(dia)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  marcado
                    ? 'bg-morado-700 border-morado-700 text-white'
                    : 'bg-white border-morado-200 text-morado-600 hover:border-morado-400'
                }`}
              >
                {dia.slice(0, 2)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="etiqueta-campo"><Icono nombre="clock" /> Abre</span>
          <input
            type="time"
            className="input-campo"
            value={apertura}
            onChange={(e) => onApertura(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="etiqueta-campo"><Icono nombre="clock" /> Cierra</span>
          <input
            type="time"
            className="input-campo"
            value={cierre}
            onChange={(e) => onCierre(e.target.value)}
            required
          />
        </label>
      </div>

      {vistaPrevia && (
        <p className="text-xs text-morado-700 bg-morado-50 border border-morado-100 rounded-lg px-3 py-2">
          Se mostrará así: <strong>{vistaPrevia}</strong>
          {pasaMedianoche && ' (cierra al día siguiente)'}
        </p>
      )}
    </div>
  );
}
