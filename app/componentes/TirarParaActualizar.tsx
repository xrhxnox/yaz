"use client";

import { useEffect, useRef, useState } from "react";

const UMBRAL = 90; // pixeles (ya amortiguados) para que se actualice al soltar

// Recarga la app; en la versión instalada también busca una versión nueva primero
export async function actualizarApp() {
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    await registro?.update();
  } catch {}
  window.location.reload();
}

// En el celular: jalar hacia abajo desde arriba de la página para actualizar
export default function TirarParaActualizar() {
  const [tiron, setTiron] = useState(0);
  const [actualizando, setActualizando] = useState(false);
  const inicio = useRef<number | null>(null);
  const actual = useRef(0);

  useEffect(() => {
    // No se activa con algo abierto encima (historias, crear, actividad…) ni si la página no está hasta arriba
    const libre = () => window.scrollY <= 0 && !document.querySelector('[role="dialog"]') && document.body.style.overflow !== "hidden";

    const empezar = (e: TouchEvent) => {
      inicio.current = libre() && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const mover = (e: TouchEvent) => {
      if (inicio.current === null) return;
      const dy = e.touches[0].clientY - inicio.current;
      if (dy <= 0 || window.scrollY > 0) {
        actual.current = 0;
        setTiron(0);
        return;
      }
      // Amortiguado: cuesta más mientras más se jala
      actual.current = Math.min(140, dy * 0.5);
      setTiron(actual.current);
    };
    const soltar = () => {
      if (inicio.current === null) return;
      inicio.current = null;
      if (actual.current >= UMBRAL) {
        setActualizando(true);
        actualizarApp();
      } else setTiron(0);
      actual.current = 0;
    };

    window.addEventListener("touchstart", empezar, { passive: true });
    window.addEventListener("touchmove", mover, { passive: true });
    window.addEventListener("touchend", soltar);
    window.addEventListener("touchcancel", soltar);
    return () => {
      window.removeEventListener("touchstart", empezar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
      window.removeEventListener("touchcancel", soltar);
    };
  }, []);

  if (!tiron && !actualizando) return null;
  const listo = actualizando || tiron >= UMBRAL;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[65] flex justify-center lg:hidden"
      style={{ top: `calc(env(safe-area-inset-top) + ${Math.min(tiron, UMBRAL) * 0.6}px)` }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-borde bg-tarjeta text-acento-texto shadow-lg">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={actualizando ? "animate-spin" : ""}
          style={actualizando ? undefined : { transform: `rotate(${(tiron / UMBRAL) * 270}deg)`, opacity: listo ? 1 : 0.6 }}
          aria-label={actualizando ? "Actualizando" : listo ? "Suelta para actualizar" : "Jala para actualizar"}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </span>
    </div>
  );
}
