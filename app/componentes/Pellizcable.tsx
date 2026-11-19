"use client";

import { useEffect, useRef } from "react";

const ZOOM_MAX = 4;

// Zoom con dos dedos como en Instagram: la foto se agranda por encima de todo
// (con el fondo oscurecido) y al soltar regresa a su lugar
export default function Pellizcable({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let zoom: { d0: number; x0: number; y0: number; copia: HTMLElement; fondo: HTMLElement } | null = null;

    const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const centro = (t: TouchList) => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];

    function empezar(e: TouchEvent) {
      if (e.touches.length !== 2 || zoom || !el) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const [x0, y0] = centro(e.touches);
      // Una copia encima de todo (así no la recorta el carrusel ni la pantalla)
      const fondo = document.createElement("div");
      fondo.style.cssText = "position:fixed;inset:0;z-index:200;background:#000;opacity:0;pointer-events:none;transition:opacity .2s";
      const copia = el.cloneNode(true) as HTMLElement;
      Object.assign(copia.style, {
        position: "fixed",
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        margin: "0",
        zIndex: "201",
        pointerEvents: "none",
        transformOrigin: `${x0 - r.left}px ${y0 - r.top}px`,
        willChange: "transform",
      });
      document.body.append(fondo, copia);
      el.style.visibility = "hidden";
      zoom = { d0: distancia(e.touches) || 1, x0, y0, copia, fondo };
    }

    function mover(e: TouchEvent) {
      if (!zoom) return;
      e.preventDefault();
      if (e.touches.length < 2) return;
      const escala = Math.min(ZOOM_MAX, Math.max(1, distancia(e.touches) / zoom.d0));
      const [x, y] = centro(e.touches);
      zoom.copia.style.transform = `translate(${x - zoom.x0}px, ${y - zoom.y0}px) scale(${escala})`;
      zoom.fondo.style.opacity = String(Math.min(0.75, (escala - 1) * 0.8));
    }

    function terminar(e: TouchEvent) {
      if (!zoom || e.touches.length >= 2) return;
      const { copia, fondo } = zoom;
      zoom = null;
      copia.style.transition = "transform .25s cubic-bezier(.2,.9,.3,1)";
      copia.style.transform = "none";
      fondo.style.opacity = "0";
      setTimeout(() => {
        copia.remove();
        fondo.remove();
        if (el) el.style.visibility = "";
      }, 260);
    }

    const activo = { passive: false } as const;
    el.addEventListener("touchstart", empezar, activo);
    el.addEventListener("touchmove", mover, activo);
    el.addEventListener("touchend", terminar);
    el.addEventListener("touchcancel", terminar);
    return () => {
      el.removeEventListener("touchstart", empezar);
      el.removeEventListener("touchmove", mover);
      el.removeEventListener("touchend", terminar);
      el.removeEventListener("touchcancel", terminar);
      if (zoom) {
        zoom.copia.remove();
        zoom.fondo.remove();
      }
      el.style.visibility = "";
    };
  }, []);

  return (
    // pan-x pan-y: el navegador puede deslizar pero no hacer su propio zoom de la página
    <div ref={caja} className={className} style={{ touchAction: "pan-x pan-y" }}>
      {children}
    </div>
  );
}
