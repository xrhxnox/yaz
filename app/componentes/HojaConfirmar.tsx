"use client";

import { useEffect, useSyncExternalStore } from "react";
import { preguntaActual, suscribirPregunta } from "@/lib/confirmar";

// Hoja desde abajo para confirmar algo (borrar, salir…), como en iOS
export default function HojaConfirmar() {
  const p = useSyncExternalStore(suscribirPregunta, preguntaActual, () => null);

  useEffect(() => {
    if (!p) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && p.responder(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [p]);

  if (!p) return null;

  return (
    <div className="fondo-aparecer fixed inset-0 z-[95] flex items-end justify-center bg-black/45 lg:items-center" onClick={() => p.responder(false)} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hoja-titulo"
        onClick={(e) => e.stopPropagation()}
        className="hoja-subir w-full max-w-md space-y-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0"
      >
        <div className="overflow-hidden rounded-2xl border border-borde bg-tarjeta text-center shadow-2xl">
          <div className="px-5 pt-4 pb-3">
            <p id="hoja-titulo" className="font-medium">
              {p.titulo}
            </p>
            {p.detalle && <p className="mt-1 text-sm text-suave">{p.detalle}</p>}
          </div>
          <button
            autoFocus
            onClick={() => p.responder(true)}
            className={`w-full border-t border-borde py-3.5 text-base font-semibold transition active:bg-relleno ${p.peligro ? "text-[#e5484d]" : "text-acento-texto"}`}
          >
            {p.accion ?? "Aceptar"}
          </button>
        </div>
        <button onClick={() => p.responder(false)} className="w-full rounded-2xl border border-borde bg-tarjeta py-3.5 text-base font-medium shadow-2xl transition active:bg-relleno">
          Cancelar
        </button>
      </div>
    </div>
  );
}
