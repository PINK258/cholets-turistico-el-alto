'use client';

import { useState } from 'react';
import { ConIconos } from '@/components/Icono';

// Campo de contraseña con un boton 👁 para mostrarla u ocultarla y revisar si
// se escribio bien.
export default function CampoContrasena({
  value,
  onChange,
  placeholder = 'Contraseña',
  autoComplete = 'current-password',
  minLength,
}: {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  const texto = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        className="input-campo pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        autoComplete={autoComplete}
        // Sin autocorrector ni mayuscula automatica cuando se ve como texto.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={texto}
        aria-label={texto}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-morado-500 hover:text-morado-800"
      >
        {visible ? (
          // Ojo tachado
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          // Ojo
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Lista que se va marcando mientras se escribe: reglas de la contraseña y si
// las dos contraseñas coinciden.
export function RevisionContrasena({ password, repetida }: { password: string; repetida: string }) {
  if (!password && !repetida) return null;
  const reglas = [
    { ok: password.length >= 8 && password.length <= 72, texto: 'Mínimo 8 caracteres' },
    { ok: /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password), texto: 'Al menos una letra' },
    { ok: /\d/.test(password), texto: 'Al menos un número' },
  ];
  return (
    <ul className="text-xs space-y-0.5" aria-live="polite">
      {reglas.map((r) => (
        <li key={r.texto} className={r.ok ? 'text-green-700' : 'text-morado-500'}>
          <ConIconos texto={r.ok ? '✔' : '○'} /> {r.texto}
        </li>
      ))}
      {repetida && (
        <li className={password === repetida ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
          <ConIconos texto={password === repetida ? '✔ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'} />
        </li>
      )}
    </ul>
  );
}
