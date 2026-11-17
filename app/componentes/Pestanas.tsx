"use client";

import { useEffect, useRef } from "react";

// Pestañas estilo periódico: texto serif con subrayado en el color de acento
export default function Pestanas<T extends string>({
  opciones,
  actual,
  alCambiar,
  etiqueta,
}: {
  opciones: readonly { id: T; nombre: string; cuantos?: number }[];
  actual: T;
  alCambiar: (id: T) => void;
  etiqueta: string;
}) {
  const lista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const activa = lista.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const caja = lista.current;
    if (!activa || !caja || caja.scrollWidth <= caja.clientWidth) return;
    caja.scrollTo({ left: activa.offsetLeft - caja.offsetLeft - 20, behavior: "smooth" });
  }, [actual]);

  return (
    <div ref={lista} role="tablist" aria-label={etiqueta} className="-mx-5 flex gap-6 overflow-x-auto border-b border-borde px-5 [scrollbar-width:none] lg:mx-0 lg:px-0">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={actual === o.id}
          onClick={() => alCambiar(o.id)}
          className={`-mb-px flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2 font-serif text-lg transition ${
            actual === o.id ? "border-acento-texto text-texto" : "border-transparent text-suave hover:text-texto"
          }`}
        >
          {o.nombre}
          {!!o.cuantos && <span className="font-sans text-xs text-acento-texto">{o.cuantos}</span>}
        </button>
      ))}
    </div>
  );
}
