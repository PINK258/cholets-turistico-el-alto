import { Fragment, ReactNode } from 'react';
import { ConIconos } from '@/components/Icono';

// El modelo responde con Markdown basico (**negritas**, listas con "-" o "1.").
// Se convierte a elementos de React (nunca con dangerouslySetInnerHTML), asi un
// texto que venga de la base de datos no puede inyectar HTML.

// Los emoji conocidos (📍, 🎉...) se muestran como iconos de la pagina.
function conNegritas(texto: string): ReactNode[] {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-morado-900">
        <ConIconos texto={parte} />
      </strong>
    ) : (
      <Fragment key={i}>
        <ConIconos texto={parte} />
      </Fragment>
    ),
  );
}

const VINETA = /^(\s*)[-*•]\s+(.*)$/;
const NUMERADA = /^(\s*)(\d+)[.)]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;

export default function TextoFormateado({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r/g, '').split('\n');

  return (
    <div className="space-y-1">
      {lineas.map((linea, i) => {
        if (!linea.trim()) return <div key={i} className="h-1" />;

        const titulo = linea.match(TITULO);
        if (titulo) {
          return (
            <p key={i} className="font-semibold text-morado-900">
              {conNegritas(titulo[1])}
            </p>
          );
        }

        const vineta = linea.match(VINETA);
        const numerada = linea.match(NUMERADA);
        if (vineta || numerada) {
          const sangria = (vineta?.[1] ?? numerada?.[1] ?? '').length >= 2;
          const marcador = numerada ? `${numerada[2]}.` : '•';
          const contenido = vineta ? vineta[2] : numerada![3];
          return (
            <div key={i} className={`flex gap-1.5 ${sangria ? 'pl-4' : ''}`}>
              <span className={`shrink-0 ${numerada ? 'font-semibold text-morado-700' : 'text-dorado-600'}`}>
                {marcador}
              </span>
              <span>{conNegritas(contenido)}</span>
            </div>
          );
        }

        return <p key={i}>{conNegritas(linea)}</p>;
      })}
    </div>
  );
}
