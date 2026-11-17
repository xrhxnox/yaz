"use client";

import { useState } from "react";
import { FECHA_INICIO } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
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
  const NOMBRES = useNombres();
  const enPerfil = seccion === "perfil";
  const [actualizando, setActualizando] = useState(false);

  // Recarga la app; en la versión instalada también busca una versión nueva primero
  async function actualizar() {
    setActualizando(true);
    try {
      const registro = await navigator.serviceWorker?.getRegistration();
      await registro?.update();
    } catch {}
    window.location.reload();
  }
  const fecha = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const ruta = ubicaciones?.a && ubicaciones?.b ? `${ubicaciones.b.ciudad} — ${ubicaciones.a.ciudad}` : null;

  return (
    <header className="pb-1 lg:pb-2">
      <div className="flex items-center justify-between text-[11px] tracking-wide text-suave lg:text-xs">
        <span>
          Núm. <span className="font-serif text-sm text-acento-texto lg:text-base">{diasJuntos(ahora)}</span>
        </span>
        <div className="flex items-center gap-2">
        <a
          href={seccion === "buscar" ? "#inicio" : "#buscar"}
          aria-label={seccion === "buscar" ? "Cerrar búsqueda" : "Buscar"}
          title="Buscar"
          className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition lg:h-9 lg:px-4 lg:text-sm ${
            seccion === "buscar" ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:text-texto"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="hidden sm:inline">Buscar</span>
        </a>
        <button
          onClick={actualizar}
          aria-label="Actualizar"
          title="Actualizar"
          disabled={actualizando}
          className="flex h-7 items-center gap-1.5 rounded-full border border-borde px-2.5 text-xs transition hover:text-texto disabled:opacity-50 sm:px-3 lg:h-9 lg:px-4 lg:text-sm"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={actualizando ? "animate-spin" : ""}
            aria-hidden
          >
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          <span className="hidden sm:inline">Actualizar</span>
        </button>
        <a
          href={enPerfil ? "#inicio" : "#perfil"}
          className={`flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs transition lg:h-9 lg:px-4 lg:text-sm ${
            enPerfil ? "border-acento bg-acento text-sobre-acento" : "border-borde hover:text-texto"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          {enPerfil ? "Volver" : "Perfil"}
        </a>
        </div>
      </div>
      <h1 className="mt-5 text-center font-serif text-[2.6rem] leading-none tracking-tight lg:mt-0 lg:text-[5.5rem]">
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
