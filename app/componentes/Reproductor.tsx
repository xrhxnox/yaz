"use client";

import { useState } from "react";
import { embedDe } from "@/lib/embed";
import { useReproductor } from "@/lib/reproductor";

function Icono({ d, label, onClick, disabled }: { d: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-suave transition hover:bg-relleno hover:text-texto disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}

// Reproductor flotante arriba del menú: sigue sonando aunque cambies de sección
export default function Reproductor() {
  const { actual, cola, mover, cerrar } = useReproductor();
  const [chico, setChico] = useState(false);
  if (!actual) return null;
  const embed = embedDe(actual.url);
  if (!embed) return null;
  const varias = cola.length > 1;

  return (
    <div
      role="region"
      aria-label="Reproductor"
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 px-3 lg:right-6 lg:bottom-6 lg:left-auto lg:w-96 lg:px-0"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-borde bg-tarjeta shadow-xl">
        <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-medium">{actual.titulo}</p>
            <p className="truncate text-[11px] text-suave">{[actual.artista, embed.servicio].filter(Boolean).join(" · ")}</p>
          </div>
          {varias && <Icono label="Anterior" d="M19 5L9 12l10 7V5zM5 5v14" onClick={() => mover(-1)} />}
          {varias && <Icono label="Siguiente" d="M5 5l10 7-10 7V5zM19 5v14" onClick={() => mover(1)} />}
          <Icono label={chico ? "Mostrar reproductor" : "Hacer chico"} d={chico ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} onClick={() => setChico((x) => !x)} />
          <Icono label="Cerrar reproductor" d="M6 6l12 12M18 6L6 18" onClick={cerrar} />
        </div>
        {/* Al hacerlo chico solo se esconde: la música sigue */}
        <div className={chico ? "h-0 overflow-hidden" : ""}>
          <iframe
            key={embed.src}
            src={embed.src}
            title={`Reproductor: ${actual.titulo}`}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className={`block w-full border-0 ${embed.alto === "video" ? "aspect-video" : ""}`}
            style={embed.alto === "video" ? undefined : { height: Math.min(embed.alto, 232) }}
          />
        </div>
      </div>
    </div>
  );
}

// Al final de la página: deja espacio para que el reproductor no tape lo último
export function EspacioReproductor() {
  const { actual } = useReproductor();
  return actual ? <div aria-hidden className="h-56 lg:hidden" /> : null;
}
