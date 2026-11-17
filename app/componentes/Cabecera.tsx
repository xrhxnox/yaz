"use client";

import { FECHA_INICIO, NOMBRES } from "@/lib/config";
import type { Ubicacion } from "@/lib/cliente";

// Días desde que empezamos (el "número de edición" del diario)
export function diasJuntos(ahora: Date) {
  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((hoy.getTime() - new Date(a, m - 1, d).getTime()) / 864e5);
}

export default function Cabecera({
  ahora,
  ubicaciones,
  enPerfil,
}: {
  ahora: Date;
  ubicaciones?: { a: Ubicacion | null; b: Ubicacion | null };
  enPerfil: boolean;
}) {
  const fecha = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const ruta = ubicaciones?.a && ubicaciones?.b ? `${ubicaciones.b.ciudad} — ${ubicaciones.a.ciudad}` : null;

  return (
    <header className="pb-1">
      <div className="flex items-center justify-between text-[11px] tracking-wide text-suave">
        <span>
          Núm. <span className="font-serif text-sm text-acento-texto">{diasJuntos(ahora)}</span>
        </span>
        <a
          href={enPerfil ? "#inicio" : "#perfil"}
          aria-label={enPerfil ? "Volver al inicio" : "Perfiles"}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
            enPerfil ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:text-texto"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </a>
      </div>
      <h1 className="mt-1 text-center font-serif text-[2.6rem] leading-none tracking-tight">
        {NOMBRES.b} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.a}
      </h1>
      <div className="mt-3 flex justify-between gap-2 border-y border-borde py-1.5 text-[11px] tracking-wide text-suave">
        <span className="first-letter:uppercase">{fecha}</span>
        {ruta && <span className="truncate">{ruta}</span>}
      </div>
    </header>
  );
}
