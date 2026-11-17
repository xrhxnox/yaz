"use client";

import type { Persona } from "@/lib/config";
import { usePareja } from "@/lib/pareja";

// Foto de perfil redonda; si no hay foto, la inicial del nombre
export default function Avatar({ persona, size = 28, className = "" }: { persona: Persona; size?: number; className?: string }) {
  const { nombres, avatares } = usePareja();
  const url = avatares[persona];
  const estilo = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nombres[persona]} style={estilo} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      style={{ ...estilo, fontSize: size * 0.45 }}
      aria-label={nombres[persona]}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-relleno font-serif text-acento-texto ${className}`}
    >
      {nombres[persona].slice(0, 1).toUpperCase()}
    </span>
  );
}
