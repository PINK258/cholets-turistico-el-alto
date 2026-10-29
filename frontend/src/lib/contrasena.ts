// Misma regla que el backend (register.dto.ts): 8 a 72 caracteres, con al
// menos una letra y un numero. El backend la vuelve a validar siempre.
const CONTRASENA_SEGURA = /^(?=.*[A-Za-zÁÉÍÓÚÑáéíóúñ])(?=.*\d).{8,72}$/;

export const AYUDA_CONTRASENA = 'Mínimo 8 caracteres, con letras y números.';

export function errorContrasena(password: string, repetida: string): string | null {
  if (!CONTRASENA_SEGURA.test(password)) {
    return 'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número.';
  }
  if (password !== repetida) return 'Las contraseñas no coinciden.';
  return null;
}
