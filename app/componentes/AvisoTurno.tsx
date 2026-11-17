"use client";

import { JUEGOS, esTipoJuego } from "@/lib/juegos";

// "Te toca en Gato" en el Inicio
export default function AvisoTurno({ turnos }: { turnos?: string[] }) {
  const juegos = (turnos ?? []).filter(esTipoJuego);
  if (!juegos.length) return null;
  return (
    <div className="space-y-1">
      {juegos.map((t) => (
        <a key={t} href={`#juegos/${t}`} className="block border-l-2 border-acento-texto pl-3 font-serif text-xl italic text-acento-texto hover:underline">
          Te toca en {JUEGOS[t].nombre}
        </a>
      ))}
    </div>
  );
}
