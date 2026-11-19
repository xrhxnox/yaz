"use client";

import { useState } from "react";
import { FECHA_INICIO, type Persona } from "@/lib/config";
import { useNombres } from "@/lib/pareja";
import type { Ubicacion } from "@/lib/cliente";
import { NOMBRES_SECCION, SECCIONES } from "./Navegacion";
import Campana from "./Campana";
import Avatar from "./Avatar";
import { actualizarApp } from "./TirarParaActualizar";

// Días desde que empezamos (el "número de edición" del diario)
export function diasJuntos(ahora: Date) {
  const [a, m, d] = FECHA_INICIO.split("-").map(Number);
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((hoy.getTime() - new Date(a, m - 1, d).getTime()) / 864e5);
}

// Celular: barra compacta y fija arriba (logo + buscar, actividad y tu foto).
// Escritorio: la portada de periódico de siempre, con las secciones arriba
export default function Cabecera({
  ahora,
  ubicaciones,
  seccion,
  yo,
  alCrear,
}: {
  ahora: Date;
  ubicaciones?: { a: Ubicacion | null; b: Ubicacion | null };
  seccion: string;
  yo: Persona;
  alCrear: () => void;
}) {
  const NOMBRES = useNombres();
  const enPerfil = seccion === "perfil";
  const [actualizando, setActualizando] = useState(false);

  async function actualizar() {
    setActualizando(true);
    await actualizarApp();
  }
  const fecha = ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const ruta = ubicaciones?.a && ubicaciones?.b ? `${ubicaciones.b.ciudad} — ${ubicaciones.a.ciudad}` : null;
  const icono = "flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-relleno lg:h-9 lg:w-auto lg:gap-1.5 lg:border lg:border-borde lg:px-4 lg:text-sm";

  return (
    <header className="sticky top-0 z-30 -mx-5 border-b border-borde/60 bg-fondo/85 px-5 py-2 backdrop-blur-md app:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:pb-2 lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-2 text-[11px] tracking-wide text-suave lg:text-xs">
        {/* Celular: el logo; escritorio: el número de edición */}
        <a href="#inicio" className="font-serif text-[1.6rem] leading-none tracking-tight text-texto lg:hidden">
          {NOMBRES.b} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.a}
        </a>
        <span className="hidden lg:inline">
          Núm. <span className="font-serif text-base text-acento-texto">{diasJuntos(ahora)}</span>
        </span>

        <div className="flex items-center gap-0.5 text-texto lg:gap-2 lg:text-suave">
          <a
            href={seccion === "buscar" ? "#inicio" : "#buscar"}
            aria-label={seccion === "buscar" ? "Cerrar búsqueda" : "Buscar"}
            title="Buscar"
            className={`${icono} ${seccion === "buscar" ? "bg-acento text-sobre-acento lg:border-acento" : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="hidden lg:inline">Buscar</span>
          </a>
          {/* En el celular se actualiza jalando hacia abajo */}
          <button onClick={actualizar} aria-label="Actualizar" title="Actualizar" disabled={actualizando} className={`${icono} hidden disabled:opacity-50 lg:flex`}>
            <svg
              width="16"
              height="16"
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
            Actualizar
          </button>
          <Campana yo={yo} />
          {/* Tu foto de perfil: abre tu perfil (y regresa a Hoy si ya estás ahí) */}
          <a
            href={enPerfil ? "#inicio" : "#perfil"}
            aria-label={enPerfil ? "Volver" : "Mi perfil"}
            title={enPerfil ? "Volver" : "Mi perfil"}
            className={`ml-1 rounded-full p-[2px] transition ${enPerfil ? "bg-acento" : "bg-borde hover:bg-suave"}`}
          >
            <span className="block rounded-full border-2 border-fondo">
              <Avatar persona={yo} size={26} />
            </span>
          </a>
        </div>
      </div>

      {/* Escritorio: portada de periódico */}
      <h1 className="hidden text-center font-serif text-[5.5rem] leading-none tracking-tight lg:block">
        {NOMBRES.b} <span className="text-acento-texto italic">&amp;</span> {NOMBRES.a}
      </h1>
      <div className="mt-5 hidden items-center justify-between gap-2 border-y border-borde py-2.5 text-xs tracking-wide text-suave lg:flex">
        <span className="w-56 first-letter:uppercase">{fecha}</span>
        <nav className="flex gap-8">
          {SECCIONES.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              aria-current={seccion === s ? "page" : undefined}
              className={`font-serif text-base transition ${seccion === s ? "text-acento-texto italic" : "text-texto hover:text-acento-texto"}`}
            >
              {NOMBRES_SECCION[s]}
            </a>
          ))}
          <button onClick={alCrear} className="font-serif text-base text-acento-texto transition hover:opacity-80">
            + Crear
          </button>
        </nav>
        <span className="w-56 truncate text-right">{ruta}</span>
      </div>
    </header>
  );
}
