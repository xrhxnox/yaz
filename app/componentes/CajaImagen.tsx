"use client";

import { useCallback, useEffect, useState } from "react";

export type Rect = { left: number; top: number; width: number; height: number };

// Dónde queda la foto dentro de su contenedor cuando se muestra con object-contain
// (para poner el texto de la historia en el mismo punto de la foto en cualquier pantalla)
export function useCajaImagen() {
  // El contenedor llega por ref de función (contenedor={…}) y se guarda en estado
  const [elemento, contenedor] = useState<HTMLDivElement | null>(null);
  const [tamano, setTamano] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = elemento;
    if (!el) return;
    const medir = () => setTamano({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, [elemento]);

  const alCargar = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  let rect: Rect = { left: 0, top: 0, width: tamano.w, height: tamano.h };
  if (natural.w && natural.h && tamano.w && tamano.h) {
    const escala = Math.min(tamano.w / natural.w, tamano.h / natural.h);
    const width = natural.w * escala;
    const height = natural.h * escala;
    rect = { left: (tamano.w - width) / 2, top: (tamano.h - height) / 2, width, height };
  }
  return { contenedor, elemento, alCargar, rect };
}

// Posición (0 a 1 sobre la foto) → estilo absoluto dentro del contenedor
export function posicionEn(rect: Rect, x: number, y: number): React.CSSProperties {
  return { left: rect.left + x * rect.width, top: rect.top + y * rect.height };
}
