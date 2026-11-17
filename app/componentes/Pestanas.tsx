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
  const montada = useRef(false);
  useEffect(() => {
    // Recorre la fila lo justo para que la pestaña activa se vea completa
    // Al tocar una pestaña se desliza suave; al abrir o al cambiar de tamaño, directo
    const acomodar = (suave = false) => {
      const caja = lista.current;
      const activa = caja?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!caja || !activa || caja.scrollWidth <= caja.clientWidth) return;
      const c = caja.getBoundingClientRect();
      const a = activa.getBoundingClientRect();
      const margen = 20;
      if (a.right > c.right - margen) caja.scrollBy({ left: a.right - c.right + margen, behavior: suave ? "smooth" : "auto" });
      else if (a.left < c.left + margen) caja.scrollBy({ left: a.left - c.left - margen, behavior: suave ? "smooth" : "auto" });
    };
    acomodar(montada.current);
    montada.current = true;
    // Si cambian de tamaño (por ejemplo, cuando termina de cargar la letra), se vuelve a acomodar
    const observador = new ResizeObserver(() => acomodar());
    if (lista.current) for (const hijo of lista.current.children) observador.observe(hijo);
    return () => observador.disconnect();
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
