'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FotoLocal } from '@/lib/types';
import { urlArchivo } from '@/lib/api';

// Requisito 3: "poder ver la foto en tiempo real de cada local" -> resuelto
// como galeria de fotos que el anfitrion mantiene actualizada desde su panel
// (ver decision registrada en el chat: instalar camaras IP reales no es viable
// para este proyecto).
export default function GaleriaFotos({ fotos, nombre }: { fotos: FotoLocal[]; nombre: string }) {
  const [activa, setActiva] = useState(0);

  if (fotos.length === 0) {
    return (
      <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-morado-100">
        <Image src="/imagenes/locales/sin-foto.svg" alt={`${nombre} sin fotos todavía`} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div>
      <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-morado-100">
        <Image
          src={urlArchivo(fotos[activa].url)}
          alt={`${nombre} foto ${activa + 1}`}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      {fotos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {fotos.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActiva(i)}
              className={`relative w-20 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                i === activa ? 'border-morado-700' : 'border-transparent'
              }`}
            >
              <Image src={urlArchivo(f.url)} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
