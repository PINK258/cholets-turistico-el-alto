'use client';

// Datos personales para los reportes del Operador G.A.M.E.A.: genero, fecha de
// nacimiento (edad) y procedencia. Se usan al registrarse y en "Mi perfil".
export type DatosPersonales = { genero: string; fechaNacimiento: string; pais: string; ciudad: string };

export const PERSONALES_VACIOS: DatosPersonales = { genero: '', fechaNacimiento: '', pais: 'Bolivia', ciudad: '' };

export const GENEROS = [
  { id: 'FEMENINO', nombre: 'Femenino' },
  { id: 'MASCULINO', nombre: 'Masculino' },
  { id: 'OTRO', nombre: 'Otro' },
  { id: 'PREFIERO_NO_DECIR', nombre: 'Prefiero no decir' },
];

const PAISES = [
  'Bolivia', 'Perú', 'Chile', 'Argentina', 'Brasil', 'Paraguay', 'Colombia', 'Ecuador', 'Venezuela', 'Uruguay',
  'México', 'Estados Unidos', 'España', 'Alemania', 'Francia', 'Italia', 'China', 'Japón', 'Corea del Sur',
];
const CIUDADES_BOLIVIA = ['El Alto', 'La Paz', 'Cochabamba', 'Santa Cruz de la Sierra', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Trinidad', 'Cobija'];
const OTRO = '__otro__';

// Fecha maxima: 10 años atras (la misma regla del backend).
const fechaMaxima = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d.toISOString().slice(0, 10);
};

export function datosPersonalesCompletos(d: DatosPersonales) {
  return !!(d.genero && d.fechaNacimiento && d.pais.trim() && d.ciudad.trim());
}

export default function CamposPersonales({
  valor,
  onCambiar,
}: {
  valor: DatosPersonales;
  onCambiar: (d: DatosPersonales) => void;
}) {
  const cambiar = (campo: keyof DatosPersonales, v: string) => onCambiar({ ...valor, [campo]: v });
  const paisEnLista = PAISES.includes(valor.pais);
  const enBolivia = valor.pais === 'Bolivia';
  const ciudadEnLista = CIUDADES_BOLIVIA.includes(valor.ciudad);

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-morado-700 mb-1">Datos para las estadísticas de turismo de El Alto</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[11px] text-morado-600">
          Género
          <select className="input-campo" value={valor.genero} onChange={(e) => cambiar('genero', e.target.value)} required>
            <option value="" disabled>
              Elige…
            </option>
            {GENEROS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-morado-600">
          Fecha de nacimiento
          <input
            type="date"
            className="input-campo"
            value={valor.fechaNacimiento}
            min="1916-01-01"
            max={fechaMaxima()}
            onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
            required
          />
        </label>
        <label className="text-[11px] text-morado-600">
          País de procedencia
          <select
            className="input-campo"
            value={paisEnLista ? valor.pais : OTRO}
            onChange={(e) => onCambiar({ ...valor, pais: e.target.value === OTRO ? '' : e.target.value, ciudad: '' })}
            required
          >
            {PAISES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={OTRO}>Otro país…</option>
          </select>
        </label>
        {!paisEnLista && (
          <label className="text-[11px] text-morado-600">
            ¿Qué país?
            <input className="input-campo" value={valor.pais} maxLength={60} onChange={(e) => cambiar('pais', e.target.value)} required />
          </label>
        )}
        <label className="text-[11px] text-morado-600">
          Ciudad
          {enBolivia ? (
            <select
              className="input-campo"
              value={ciudadEnLista ? valor.ciudad : valor.ciudad ? OTRO : ''}
              onChange={(e) => cambiar('ciudad', e.target.value === OTRO ? ' ' : e.target.value)}
              required
            >
              <option value="" disabled>
                Elige…
              </option>
              {CIUDADES_BOLIVIA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTRO}>Otra ciudad…</option>
            </select>
          ) : (
            <input className="input-campo" value={valor.ciudad} maxLength={80} onChange={(e) => cambiar('ciudad', e.target.value)} required />
          )}
        </label>
        {enBolivia && valor.ciudad !== '' && !ciudadEnLista && (
          <label className="text-[11px] text-morado-600">
            ¿Qué ciudad?
            <input
              className="input-campo"
              value={valor.ciudad.trim()}
              maxLength={80}
              onChange={(e) => cambiar('ciudad', e.target.value || ' ')}
              required
              autoFocus
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}
