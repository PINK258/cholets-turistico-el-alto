import { unlink } from 'fs/promises';
import { join } from 'path';

// Borra del disco un archivo subido por la app ("/uploads/..."). Ignora URLs
// externas (ej. la foto de perfil de Google) y archivos que ya no existen.
export async function borrarArchivoSubido(url?: string | null) {
  if (!url || !url.startsWith('/uploads/')) return;
  await unlink(join(process.cwd(), url)).catch(() => undefined);
}
