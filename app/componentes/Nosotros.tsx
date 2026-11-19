"use client";

import { useSyncExternalStore } from "react";
import type { Persona } from "@/lib/config";
import Momentos from "./Momentos";
import Visitas from "./Visitas";
import Pendientes from "./Pendientes";
import Resumenes from "./Resumenes";
import Playlist from "./Playlist";
import Cartas from "./Cartas";
import Diario from "./Diario";

// Las "carpetas" de lo que guardamos y compartimos
export const CARPETAS = [
  { id: "diario", nombre: "Diario", texto: "Qué hizo cada quien hoy", icono: "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4" },
  { id: "playlist", nombre: "Playlist", texto: "Nuestras canciones", icono: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { id: "buzon", nombre: "Buzón", texto: "Cartas para abrir", icono: "M3 5h18v14H3zM3 7l9 6 9-6" },
  { id: "pendientes", nombre: "Pendientes", texto: "Lo que queremos hacer", icono: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" },
  { id: "historia", nombre: "Historia", texto: "Nuestra línea del tiempo", icono: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" },
  { id: "visitas", nombre: "Visitas", texto: "Cada vez que nos vimos", icono: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { id: "resumenes", nombre: "Resúmenes", texto: "Cada mes, en una página", icono: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" },
] as const;
export type Carpeta = (typeof CARPETAS)[number]["id"];

function leer() {
  return window.location.hash.slice(1).split("/")[1] ?? "";
}
function suscribir(oyente: () => void) {
  window.addEventListener("hashchange", oyente);
  return () => window.removeEventListener("hashchange", oyente);
}

// Nosotros: sin pestaña elegida se ven las carpetas; con una (#nosotros/playlist) se abre esa
export default function Nosotros({ yo }: { yo: Persona }) {
  const sub = useSyncExternalStore(suscribir, leer, () => "");
  const carpeta = CARPETAS.find((c) => c.id === sub);

  if (!carpeta) {
    return (
      <div className="lg:mx-auto lg:max-w-4xl">
        <p className="font-serif text-3xl tracking-tight">Nosotros</p>
        <p className="mt-0.5 text-xs text-suave">Todo lo que guardamos y compartimos.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CARPETAS.map((c, i) => (
            <a
              key={c.id}
              href={`#nosotros/${c.id}`}
              className={`group rounded-2xl border border-borde bg-tarjeta p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-acento-suave text-acento-texto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={c.icono} />
                </svg>
              </span>
              <p className="mt-3 font-serif text-xl leading-tight">{c.nombre}</p>
              <p className="mt-0.5 text-xs text-suave">{c.texto}</p>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Ancho según lo que se muestra: dos columnas en escritorio para Diario y Pendientes
  const ancho = carpeta.id === "diario" || carpeta.id === "pendientes" ? "" : carpeta.id === "playlist" ? "lg:mx-auto lg:max-w-4xl" : "lg:mx-auto lg:max-w-2xl";

  return (
    <div className="space-y-4">
      <div className={ancho}>
        <a href="#nosotros" className="inline-flex items-center gap-1 text-sm text-suave transition hover:text-texto">
          <span aria-hidden>←</span> Nosotros
        </a>
        {/* Diario, Pendientes, Historia… ya traen su propio título; aquí el nombre de la carpeta */}
        {carpeta.id !== "playlist" && <p className="mt-1 font-serif text-3xl tracking-tight">{carpeta.nombre}</p>}
      </div>
      <div className={ancho}>
        {carpeta.id === "diario" && <Diario yo={yo} />}
        {carpeta.id === "playlist" && <Playlist yo={yo} />}
        {carpeta.id === "buzon" && <Cartas yo={yo} />}
        {carpeta.id === "pendientes" && <Pendientes />}
        {carpeta.id === "historia" && <Momentos />}
        {carpeta.id === "visitas" && <Visitas />}
        {carpeta.id === "resumenes" && <Resumenes />}
      </div>
    </div>
  );
}
