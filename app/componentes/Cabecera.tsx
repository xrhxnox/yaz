"use client";

import { FECHA_INICIO, NOMBRES } from "@/lib/config";
import type { Ubicacion } from "@/lib/cliente";
import { NOMBRES_SECCION, SECCIONES } from "./Navegacion";

// Días desde que empezamos (el "número de edición" del diario)
export function diasJuntos(ahora: Date) {
  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((hoy.getTime() - new Date(a, m - 1, d).getTime()) / 864e5);
}

export default function Cabecera({
  ahora,
  ubicaciones,
  seccion,
}: {
  ahora: Date;
  ubicaciones?: { a: Ubicacion | null; b: Ubicacion | null };
  seccion: string;
}) {
  const enPerfil = seccion === "perfil";
  const fecha = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const ruta = ubicaciones?.a && ubicaciones?.b ? `${ubicaciones.b.ciudad} — ${ubicaciones.a.ciudad}` : null;

  return (
    <header className="pb-1 lg:pb-2">
      <div className="flex items-center justify-between text-[11px] tracking-wide text-suave lg:text-xs">
        <span>
          Núm. <span className="font-serif text-sm text-acento-texto lg:text-base">{diasJuntos(ahora)}</span>
        </span>
        <a
          href={enPerfil ? "#inicio" : "#perfil"}
          aria-label={enPerfil ? "Volver al inicio" : "Perfiles"}
          className={`flex h-7 w-7 items-center justify-center rounded-full border transition lg:h-9 lg:w-9 ${
            enPerfil ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:text-texto"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </a>
      </div>
      <h1 className="mt-1 text-center font-serif text-[2.6rem] leading-none tracking-tight lg:mt-0 lg:text-[5.5rem]">
        {NOMBRES.b} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.a}
      </h1>
      <div className="mt-3 flex items-center justify-between gap-2 border-y border-borde py-1.5 text-[11px] tracking-wide text-suave lg:mt-5 lg:py-2.5 lg:text-xs">
        <span className="first-letter:uppercase lg:w-56">{fecha}</span>
        {/* En escritorio, las secciones van aquí como en un periódico */}
        <nav className="hidden lg:flex lg:gap-8">
          {SECCIONES.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              aria-current={seccion === s ? "page" : undefined}
              className={`font-serif text-base transition ${
                seccion === s ? "text-acento-texto italic" : "text-texto hover:text-acento-texto"
              }`}
            >
              {NOMBRES_SECCION[s]}
            </a>
          ))}
        </nav>
        {ruta && <span className="truncate lg:w-56 lg:text-right">{ruta}</span>}
      </div>
    </header>
  );
}
